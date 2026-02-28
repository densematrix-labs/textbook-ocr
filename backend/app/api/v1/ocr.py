import subprocess
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, Header, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.services.ocr import process_file
from app.services.tokens import check_and_use_token, get_token_status
from app.metrics import ocr_requests, tokens_consumed, free_trial_used
from app.config import get_settings
from app.auth import get_current_user, UserInfo

router = APIRouter(prefix="/ocr", tags=["OCR"])

ALLOWED_TYPES = {
    "application/pdf": "application/pdf",
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp"
}


class OCRResponse(BaseModel):
    success: bool
    markdown: Optional[str] = None
    error: Optional[str] = None
    tokens_remaining: int = 0


class TokenStatusResponse(BaseModel):
    device_id: Optional[str] = None
    user_id: Optional[str] = None
    phone: Optional[str] = None
    mode: str = "device"
    free_uses_remaining: int
    paid_tokens: int
    total_available: int


@router.post("/process", response_model=OCRResponse)
async def process_ocr(
    file: UploadFile = File(...),
    x_device_id: str = Header(..., alias="X-Device-Id"),
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Process a PDF or image file and return OCR results in Markdown format.
    
    Supports both device mode (guest) and user mode (logged in with JWT).
    User mode takes priority if JWT token is provided.
    """
    settings = get_settings()
    is_internal = x_internal_key == settings.internal_test_key
    
    # Get user from JWT if provided
    user = await get_current_user(authorization)
    
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Supported: PDF, JPEG, PNG, WebP"
        )
    
    # Check and use token (skip for internal testing)
    if not is_internal:
        success, message = await check_and_use_token(db, x_device_id, user)
        if not success:
            raise HTTPException(
                status_code=402,
                detail=message
            )
    
    # Track metrics
    ocr_requests.labels(tool="textbook-ocr", file_type=content_type).inc()
    if not is_internal:
        tokens_consumed.labels(tool="textbook-ocr").inc()
    
    # Get token status
    status = await get_token_status(db, x_device_id, user)
    if not is_internal and status["free_uses_remaining"] < 3:
        free_trial_used.labels(tool="textbook-ocr").inc()
    
    try:
        file_bytes = await file.read()
        
        markdown_result = await process_file(
            file_bytes,
            file.filename or "document",
            ALLOWED_TYPES[content_type]
        )
        
        return OCRResponse(
            success=True,
            markdown=markdown_result,
            tokens_remaining=status["total_available"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )


@router.get("/tokens", response_model=TokenStatusResponse)
async def get_tokens(
    x_device_id: str = Header(..., alias="X-Device-Id"),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Get token status for device or user.
    
    If JWT token is provided, returns user token status.
    Otherwise returns device token status.
    """
    user = await get_current_user(authorization)
    status = await get_token_status(db, x_device_id, user)
    return TokenStatusResponse(**status)


class ConvertDocxRequest(BaseModel):
    markdown: str


@router.post("/convert-docx")
async def convert_to_docx(request: ConvertDocxRequest):
    """Convert markdown content to Word (.docx) format using pandoc.
    
    This properly handles LaTeX math formulas by converting them to OMML format.
    """
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as md_file:
            md_file.write(request.markdown)
            md_path = md_file.name
        
        docx_path = md_path.replace('.md', '.docx')
        
        try:
            result = subprocess.run(
                ['pandoc', md_path, '-o', docx_path, '--from=markdown', '--to=docx'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"Pandoc conversion failed: {result.stderr}"
                )
            
            return FileResponse(
                docx_path,
                media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                filename='ocr-result.docx',
                background=None
            )
            
        finally:
            if os.path.exists(md_path):
                os.unlink(md_path)
                
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=500,
            detail="Conversion timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Conversion failed: {str(e)}"
        )

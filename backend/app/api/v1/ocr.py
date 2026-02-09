from fastapi import APIRouter, UploadFile, File, Header, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.services.ocr import process_file
from app.services.tokens import check_and_use_token, get_token_status
from app.metrics import ocr_requests, tokens_consumed, free_trial_used
from app.config import get_settings

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
    device_id: str
    free_uses_remaining: int
    paid_tokens: int
    total_available: int


@router.post("/process", response_model=OCRResponse)
async def process_ocr(
    file: UploadFile = File(...),
    x_device_id: str = Header(..., alias="X-Device-Id"),
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
    db: AsyncSession = Depends(get_db)
):
    """Process a PDF or image file and return OCR results in Markdown format."""
    
    settings = get_settings()
    is_internal = x_internal_key == settings.internal_test_key
    
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Supported: PDF, JPEG, PNG, WebP"
        )
    
    # Check and use token (skip for internal testing)
    if not is_internal:
        success, message = await check_and_use_token(db, x_device_id)
        if not success:
            # Get token status for response
            status = await get_token_status(db, x_device_id)
            raise HTTPException(
                status_code=402,
                detail=message
            )
    
    # Track metrics
    ocr_requests.labels(tool="textbook-ocr", file_type=content_type).inc()
    if not is_internal:
        tokens_consumed.labels(tool="textbook-ocr").inc()
    
    # Check if this was a free use
    status = await get_token_status(db, x_device_id)
    if not is_internal and status["free_uses_remaining"] < 3:  # Was a free use
        free_trial_used.labels(tool="textbook-ocr").inc()
    
    try:
        # Read file
        file_bytes = await file.read()
        
        # Process OCR
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
    db: AsyncSession = Depends(get_db)
):
    """Get token status for a device."""
    status = await get_token_status(db, x_device_id)
    return TokenStatusResponse(**status)

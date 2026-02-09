import json
import hmac
import hashlib
from fastapi import APIRouter, Request, Header, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import httpx
from datetime import datetime

from app.database import get_db
from app.models import PaymentTransaction, DeviceToken
from app.services.tokens import add_tokens, get_token_status
from app.config import get_settings
from app.metrics import payment_success, payment_revenue

router = APIRouter(prefix="/payment", tags=["Payment"])
settings = get_settings()

# Product definitions
PRODUCTS = {
    "ocr_3": {"tokens": 3, "price_cents": 299, "name": "3 OCR Credits"},
    "ocr_10": {"tokens": 10, "price_cents": 799, "name": "10 OCR Credits"},
    "ocr_30": {"tokens": 30, "price_cents": 1999, "name": "30 OCR Credits"},
}


class CheckoutRequest(BaseModel):
    product_id: str
    device_id: str
    success_url: str
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    checkout_id: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    request: CheckoutRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a Creem checkout session."""
    
    if request.product_id not in PRODUCTS:
        raise HTTPException(status_code=400, detail=f"Invalid product: {request.product_id}")
    
    product = PRODUCTS[request.product_id]
    
    # Parse product IDs from settings
    try:
        creem_product_ids = json.loads(settings.creem_product_ids)
    except json.JSONDecodeError:
        creem_product_ids = {}
    
    creem_product_id = creem_product_ids.get(request.product_id)
    if not creem_product_id:
        raise HTTPException(status_code=500, detail="Payment not configured for this product")
    
    # Create Creem checkout
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.creem.io/v1/checkouts",
            headers={
                "Authorization": f"Bearer {settings.creem_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "product_id": creem_product_id,
                "success_url": request.success_url,
                "metadata": {
                    "device_id": request.device_id,
                    "product_sku": request.product_id,
                    "tokens": product["tokens"]
                }
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to create checkout")
        
        data = response.json()
    
    # Store transaction
    transaction = PaymentTransaction(
        checkout_id=data["id"],
        device_id=request.device_id,
        product_sku=request.product_id,
        tokens_granted=product["tokens"],
        amount_cents=product["price_cents"],
        status="pending"
    )
    db.add(transaction)
    await db.commit()
    
    return CheckoutResponse(
        checkout_url=data["checkout_url"],
        checkout_id=data["id"]
    )


@router.post("/webhook")
async def handle_webhook(
    request: Request,
    creem_signature: str = Header(..., alias="Creem-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """Handle Creem webhook for payment completion."""
    
    body = await request.body()
    
    # Verify signature
    expected = hmac.new(
        settings.creem_webhook_secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected, creem_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = json.loads(body)
    
    if data.get("event") == "checkout.completed":
        checkout = data.get("data", {})
        checkout_id = checkout.get("id")
        metadata = checkout.get("metadata", {})
        
        # Find transaction
        result = await db.execute(
            select(PaymentTransaction).where(PaymentTransaction.checkout_id == checkout_id)
        )
        transaction = result.scalar_one_or_none()
        
        if transaction and transaction.status == "pending":
            # Update transaction
            transaction.status = "completed"
            transaction.completed_at = datetime.utcnow()
            
            # Add tokens to device
            await add_tokens(db, transaction.device_id, transaction.tokens_granted)
            
            await db.commit()
            
            # Track metrics
            payment_success.labels(tool="textbook-ocr", product_sku=transaction.product_sku).inc()
            payment_revenue.labels(tool="textbook-ocr").inc(transaction.amount_cents)
    
    return {"status": "ok"}


@router.get("/products")
async def list_products():
    """List available products."""
    return {
        "products": [
            {
                "id": pid,
                "name": p["name"],
                "tokens": p["tokens"],
                "price_cents": p["price_cents"],
                "price_display": f"${p['price_cents'] / 100:.2f}"
            }
            for pid, p in PRODUCTS.items()
        ]
    }


@router.get("/status/{checkout_id}")
async def get_payment_status(
    checkout_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get payment status for a checkout."""
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.checkout_id == checkout_id)
    )
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get current token status
    token_status = await get_token_status(db, transaction.device_id)
    
    return {
        "status": transaction.status,
        "tokens_granted": transaction.tokens_granted if transaction.status == "completed" else 0,
        "token_status": token_status
    }

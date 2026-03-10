import json
import hashlib
import uuid
import time
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import PlainTextResponse
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

# 虎皮椒支付网关
XUNHU_API_URL = "https://api.xunhupay.com/payment/do.html"

# Product definitions (CNY prices)
# price_fen: 分 (1 CNY = 100 分), used for internal tracking
PRODUCTS = {
    "ocr_test": {"tokens": 1, "price_fen": 100, "price_cny": "1.00", "name": "测试套餐（1 次）"},
    "ocr_3": {"tokens": 3, "price_fen": 100, "price_cny": "1.00", "name": "3 次识别"},
    "ocr_10": {"tokens": 10, "price_fen": 100, "price_cny": "1.00", "name": "10 次识别"},
    "ocr_30": {"tokens": 30, "price_fen": 100, "price_cny": "1.00", "name": "30 次识别"},
}


def generate_xunhu_hash(params: dict, secret: str) -> str:
    """虎皮椒签名算法：按 key 排序后拼接，末尾加 secret，MD5。"""
    sorted_items = sorted(params.items())
    sign_str = "&".join(f"{k}={v}" for k, v in sorted_items if v != "" and k != "hash")
    return hashlib.md5((sign_str + secret).encode("utf-8")).hexdigest()


class CheckoutRequest(BaseModel):
    product_id: str
    device_id: str
    success_url: str
    cancel_url: Optional[str] = None
    user_id: Optional[str] = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    checkout_id: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    request: CheckoutRequest,
    db: AsyncSession = Depends(get_db)
):
    """创建虎皮椒支付订单，返回支付跳转 URL。"""

    if request.product_id not in PRODUCTS:
        raise HTTPException(status_code=400, detail=f"Invalid product: {request.product_id}")

    if not settings.xunhu_appid or not settings.xunhu_secret:
        raise HTTPException(status_code=500, detail="Payment not configured")

    product = PRODUCTS[request.product_id]
    trade_order_id = f"ocr_{uuid.uuid4().hex[:20]}"

    params = {
        "version": "1.1",
        "appid": settings.xunhu_appid,
        "trade_order_id": trade_order_id,
        "total_fee": product["price_cny"],
        "title": product["name"],
        "time": str(int(time.time())),
        "notify_url": f"{settings.base_url}/api/v1/payment/webhook",
        "return_url": request.success_url,
        "nonce_str": uuid.uuid4().hex,
        "attach": json.dumps({
            "device_id": request.device_id,
            "sku": request.product_id,
        }),
    }
    params["hash"] = generate_xunhu_hash(params, settings.xunhu_secret)

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(XUNHU_API_URL, data=params)
        data = resp.json()

    if data.get("errcode") != 0:
        raise HTTPException(status_code=500, detail=data.get("errmsg", "Payment gateway error"))

    # Store transaction
    transaction = PaymentTransaction(
        checkout_id=trade_order_id,
        device_id=request.device_id,
        user_id=request.user_id,
        product_sku=request.product_id,
        tokens_granted=product["tokens"],
        amount_cents=product["price_fen"],
        currency="CNY",
        status="pending",
    )
    db.add(transaction)
    await db.commit()

    return CheckoutResponse(
        checkout_url=data["url"],
        checkout_id=trade_order_id,
    )


@router.post("/webhook")
async def handle_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """虎皮椒回调 Webhook（form-encoded POST）。"""

    form = await request.form()
    params = dict(form)

    # 验签
    received_hash = params.pop("hash", "")
    expected_hash = generate_xunhu_hash(params, settings.xunhu_secret)
    if received_hash != expected_hash:
        raise HTTPException(status_code=401, detail="Invalid signature")

    # OD = 已支付
    if params.get("status") == "OD":
        trade_order_id = params.get("trade_order_id", "")

        result = await db.execute(
            select(PaymentTransaction).where(PaymentTransaction.checkout_id == trade_order_id)
        )
        transaction = result.scalar_one_or_none()

        if transaction and transaction.status == "pending":
            transaction.status = "completed"
            transaction.completed_at = datetime.utcnow()

            # 解析 attach 获取 device_id 和 sku
            try:
                attach = json.loads(params.get("attach", "{}"))
            except json.JSONDecodeError:
                attach = {}

            device_id = attach.get("device_id") or transaction.device_id
            sku = attach.get("sku") or transaction.product_sku
            user_id = transaction.user_id  # None for guest, set for logged-in users

            # If user_id is set (logged-in user), add tokens to user account;
            # otherwise fall back to device-level tokens.
            await add_tokens(
                db,
                transaction.tokens_granted,
                device_id=device_id,
                user_id=user_id if user_id else None,
            )
            await db.commit()

            # 埋点指标
            payment_success.labels(tool="textbook-ocr", product_sku=sku).inc()
            payment_revenue.labels(tool="textbook-ocr").inc(transaction.amount_cents)

    # 虎皮椒要求必须返回纯文本 "success"
    return PlainTextResponse("success")


@router.get("/products")
async def list_products():
    """列出可购买的套餐。"""
    return {
        "products": [
            {
                "id": pid,
                "name": p["name"],
                "tokens": p["tokens"],
                "price_cents": p["price_fen"],
                "price_display": f"¥{p['price_cny']}",
            }
            for pid, p in PRODUCTS.items()
        ]
    }


@router.get("/status/{checkout_id}")
async def get_payment_status(
    checkout_id: str,
    db: AsyncSession = Depends(get_db)
):
    """查询订单支付状态。"""
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.checkout_id == checkout_id)
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    token_status = await get_token_status(db, transaction.device_id)

    return {
        "status": transaction.status,
        "tokens_granted": transaction.tokens_granted if transaction.status == "completed" else 0,
        "token_status": token_status,
    }

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base


class DeviceToken(Base):
    __tablename__ = "device_tokens"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(255), unique=True, nullable=False, index=True)
    free_uses_remaining = Column(Integer, default=3)
    paid_tokens = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    checkout_id = Column(String(255), unique=True, nullable=False, index=True)
    device_id = Column(String(255), nullable=False, index=True)
    product_sku = Column(String(100), nullable=False)
    tokens_granted = Column(Integer, nullable=False)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(10), default="USD")
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

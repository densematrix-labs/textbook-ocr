from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import DeviceToken
from app.config import get_settings

settings = get_settings()


async def get_or_create_device(db: AsyncSession, device_id: str) -> DeviceToken:
    """Get or create a device token record."""
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    
    if not device:
        device = DeviceToken(
            device_id=device_id,
            free_uses_remaining=settings.free_uses_per_device,
            paid_tokens=0
        )
        db.add(device)
        await db.commit()
        await db.refresh(device)
    
    return device


async def check_and_use_token(db: AsyncSession, device_id: str) -> tuple[bool, str]:
    """
    Check if device has available tokens and use one.
    Returns (success, message).
    """
    device = await get_or_create_device(db, device_id)
    
    # Try free uses first
    if device.free_uses_remaining > 0:
        device.free_uses_remaining -= 1
        await db.commit()
        return True, f"Free use consumed. {device.free_uses_remaining} remaining."
    
    # Try paid tokens
    if device.paid_tokens > 0:
        device.paid_tokens -= 1
        await db.commit()
        return True, f"Paid token consumed. {device.paid_tokens} remaining."
    
    return False, "No tokens available. Please purchase more."


async def get_token_status(db: AsyncSession, device_id: str) -> dict:
    """Get token status for a device."""
    device = await get_or_create_device(db, device_id)
    return {
        "device_id": device_id,
        "free_uses_remaining": device.free_uses_remaining,
        "paid_tokens": device.paid_tokens,
        "total_available": device.free_uses_remaining + device.paid_tokens
    }


async def add_tokens(db: AsyncSession, device_id: str, amount: int) -> DeviceToken:
    """Add paid tokens to a device."""
    device = await get_or_create_device(db, device_id)
    device.paid_tokens += amount
    await db.commit()
    await db.refresh(device)
    return device

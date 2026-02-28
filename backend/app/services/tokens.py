from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models import DeviceToken, UserToken
from app.config import get_settings
from app.auth import UserInfo

settings = get_settings()


# ============== Device Mode (Guest) ==============

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


async def check_and_use_device_token(db: AsyncSession, device_id: str) -> tuple[bool, str]:
    """Check if device has available tokens and use one."""
    device = await get_or_create_device(db, device_id)
    
    if device.free_uses_remaining > 0:
        device.free_uses_remaining -= 1
        await db.commit()
        return True, f"Free use consumed. {device.free_uses_remaining} remaining."
    
    if device.paid_tokens > 0:
        device.paid_tokens -= 1
        await db.commit()
        return True, f"Paid token consumed. {device.paid_tokens} remaining."
    
    return False, "No tokens available. Please purchase more."


async def get_device_token_status(db: AsyncSession, device_id: str) -> dict:
    """Get token status for a device."""
    device = await get_or_create_device(db, device_id)
    return {
        "device_id": device_id,
        "user_id": None,
        "mode": "device",
        "free_uses_remaining": device.free_uses_remaining,
        "paid_tokens": device.paid_tokens,
        "total_available": device.free_uses_remaining + device.paid_tokens
    }


async def add_device_tokens(db: AsyncSession, device_id: str, amount: int) -> DeviceToken:
    """Add paid tokens to a device."""
    device = await get_or_create_device(db, device_id)
    device.paid_tokens += amount
    await db.commit()
    await db.refresh(device)
    return device


# ============== User Mode (Logged In) ==============

async def get_or_create_user_token(db: AsyncSession, user: UserInfo) -> UserToken:
    """Get or create a user token record."""
    result = await db.execute(
        select(UserToken).where(UserToken.user_id == user.id)
    )
    user_token = result.scalar_one_or_none()
    
    if not user_token:
        user_token = UserToken(
            user_id=user.id,
            phone=user.phone,
            free_uses_remaining=settings.free_uses_per_device,  # Same free trial for users
            paid_tokens=0
        )
        db.add(user_token)
        await db.commit()
        await db.refresh(user_token)
    
    return user_token


async def check_and_use_user_token(db: AsyncSession, user: UserInfo) -> tuple[bool, str]:
    """Check if user has available tokens and use one."""
    user_token = await get_or_create_user_token(db, user)
    
    if user_token.free_uses_remaining > 0:
        user_token.free_uses_remaining -= 1
        await db.commit()
        return True, f"Free use consumed. {user_token.free_uses_remaining} remaining."
    
    if user_token.paid_tokens > 0:
        user_token.paid_tokens -= 1
        await db.commit()
        return True, f"Paid token consumed. {user_token.paid_tokens} remaining."
    
    return False, "No tokens available. Please purchase more."


async def get_user_token_status(db: AsyncSession, user: UserInfo) -> dict:
    """Get token status for a user."""
    user_token = await get_or_create_user_token(db, user)
    return {
        "device_id": None,
        "user_id": user.id,
        "phone": user_token.phone,
        "mode": "user",
        "free_uses_remaining": user_token.free_uses_remaining,
        "paid_tokens": user_token.paid_tokens,
        "total_available": user_token.free_uses_remaining + user_token.paid_tokens
    }


async def add_user_tokens(db: AsyncSession, user_id: str, amount: int) -> UserToken:
    """Add paid tokens to a user."""
    result = await db.execute(
        select(UserToken).where(UserToken.user_id == user_id)
    )
    user_token = result.scalar_one_or_none()
    
    if user_token:
        user_token.paid_tokens += amount
        await db.commit()
        await db.refresh(user_token)
        return user_token
    
    # User doesn't exist yet, create with tokens
    user_token = UserToken(
        user_id=user_id,
        free_uses_remaining=settings.free_uses_per_device,
        paid_tokens=amount
    )
    db.add(user_token)
    await db.commit()
    await db.refresh(user_token)
    return user_token


# ============== Unified Interface ==============

async def check_and_use_token(
    db: AsyncSession,
    device_id: str,
    user: Optional[UserInfo] = None
) -> tuple[bool, str]:
    """
    Check and use token - user mode takes priority.
    """
    if user:
        return await check_and_use_user_token(db, user)
    return await check_and_use_device_token(db, device_id)


async def get_token_status(
    db: AsyncSession,
    device_id: str,
    user: Optional[UserInfo] = None
) -> dict:
    """
    Get token status - user mode takes priority.
    """
    if user:
        return await get_user_token_status(db, user)
    return await get_device_token_status(db, device_id)


async def add_tokens(
    db: AsyncSession,
    amount: int,
    device_id: Optional[str] = None,
    user_id: Optional[str] = None
):
    """Add tokens to device or user."""
    if user_id:
        return await add_user_tokens(db, user_id, amount)
    if device_id:
        return await add_device_tokens(db, device_id, amount)
    raise ValueError("Either device_id or user_id must be provided")

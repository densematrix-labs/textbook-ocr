import pytest
from app.services.tokens import get_or_create_device, check_and_use_token, add_tokens, get_token_status
from app.services.ocr import pdf_to_images, image_to_base64


@pytest.mark.asyncio
async def test_get_or_create_device_new(db_session):
    device_id = "new-device-123"
    device = await get_or_create_device(db_session, device_id)
    
    assert device.device_id == device_id
    assert device.free_uses_remaining == 3
    assert device.paid_tokens == 0


@pytest.mark.asyncio
async def test_get_or_create_device_existing(db_session):
    device_id = "existing-device-456"
    
    # Create first time
    device1 = await get_or_create_device(db_session, device_id)
    device1.free_uses_remaining = 1
    await db_session.commit()
    
    # Get again - should return same device
    device2 = await get_or_create_device(db_session, device_id)
    assert device2.free_uses_remaining == 1


@pytest.mark.asyncio
async def test_check_and_use_token_free(db_session):
    device_id = "free-use-device"
    
    # First use
    success, msg = await check_and_use_token(db_session, device_id)
    assert success is True
    assert "Free use consumed" in msg
    assert "2 remaining" in msg


@pytest.mark.asyncio
async def test_check_and_use_token_exhausted(db_session):
    device_id = "exhausted-device"
    
    # Use all free tokens
    for _ in range(3):
        await check_and_use_token(db_session, device_id)
    
    # Next use should fail
    success, msg = await check_and_use_token(db_session, device_id)
    assert success is False
    assert "No tokens available" in msg


@pytest.mark.asyncio
async def test_check_and_use_token_paid(db_session):
    device_id = "paid-device"
    
    # Use all free tokens
    for _ in range(3):
        await check_and_use_token(db_session, device_id)
    
    # Add paid tokens
    await add_tokens(db_session, device_id, 5)
    
    # Should use paid token now
    success, msg = await check_and_use_token(db_session, device_id)
    assert success is True
    assert "Paid token consumed" in msg
    assert "4 remaining" in msg


@pytest.mark.asyncio
async def test_add_tokens(db_session):
    device_id = "add-tokens-device"
    
    # Create device
    await get_or_create_device(db_session, device_id)
    
    # Add tokens
    device = await add_tokens(db_session, device_id, 10)
    assert device.paid_tokens == 10
    
    # Add more tokens
    device = await add_tokens(db_session, device_id, 5)
    assert device.paid_tokens == 15


@pytest.mark.asyncio
async def test_get_token_status(db_session):
    device_id = "status-device"
    
    status = await get_token_status(db_session, device_id)
    assert status["device_id"] == device_id
    assert status["free_uses_remaining"] == 3
    assert status["paid_tokens"] == 0
    assert status["total_available"] == 3


def test_image_to_base64():
    # Simple test data
    data = b"test image data"
    result = image_to_base64(data)
    
    assert isinstance(result, str)
    assert len(result) > 0
    
    # Should be valid base64
    import base64
    decoded = base64.b64decode(result)
    assert decoded == data


def test_pdf_to_images_invalid():
    """Test PDF conversion with invalid data."""
    with pytest.raises(Exception):
        pdf_to_images(b"not a pdf")

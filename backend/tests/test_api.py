import pytest
from httpx import AsyncClient
import io


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "textbook-ocr"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_metrics(client: AsyncClient):
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert b"http_requests_total" in response.content


@pytest.mark.asyncio
async def test_get_tokens_new_device(client: AsyncClient, device_id: str):
    response = await client.get(
        "/api/v1/ocr/tokens",
        headers={"X-Device-Id": device_id}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == device_id
    assert data["free_uses_remaining"] == 3
    assert data["paid_tokens"] == 0
    assert data["total_available"] == 3


@pytest.mark.asyncio
async def test_ocr_missing_device_id(client: AsyncClient, sample_image: bytes):
    files = {"file": ("test.png", io.BytesIO(sample_image), "image/png")}
    response = await client.post("/api/v1/ocr/process", files=files)
    assert response.status_code == 422  # Missing header


@pytest.mark.asyncio
async def test_ocr_invalid_file_type(client: AsyncClient, device_id: str):
    files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    response = await client.post(
        "/api/v1/ocr/process",
        files=files,
        headers={"X-Device-Id": device_id}
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


@pytest.mark.asyncio
async def test_payment_products(client: AsyncClient):
    response = await client.get("/api/v1/payment/products")
    assert response.status_code == 200
    data = response.json()
    assert "products" in data
    assert len(data["products"]) >= 3


@pytest.mark.asyncio
async def test_payment_invalid_product(client: AsyncClient, device_id: str):
    response = await client.post(
        "/api/v1/payment/checkout",
        json={
            "product_id": "invalid_product",
            "device_id": device_id,
            "success_url": "https://example.com/success"
        }
    )
    assert response.status_code == 400
    assert "Invalid product" in response.json()["detail"]


@pytest.mark.asyncio
async def test_payment_status_not_found(client: AsyncClient):
    response = await client.get("/api/v1/payment/status/nonexistent-checkout-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_error_detail_format_402(client: AsyncClient, db_session, device_id: str):
    """Test that 402 error returns proper string detail, not object."""
    from app.models import DeviceToken
    
    # Create device with no tokens
    device = DeviceToken(
        device_id=device_id,
        free_uses_remaining=0,
        paid_tokens=0
    )
    db_session.add(device)
    await db_session.commit()
    
    files = {"file": ("test.png", io.BytesIO(b"\x89PNG\r\n\x1a\n"), "image/png")}
    response = await client.post(
        "/api/v1/ocr/process",
        files=files,
        headers={"X-Device-Id": device_id}
    )
    
    assert response.status_code == 402
    data = response.json()
    detail = data.get("detail")
    
    # Detail must be a string, not an object
    assert isinstance(detail, str), f"detail should be string, got {type(detail)}: {detail}"
    assert "[object Object]" not in str(detail)
    assert "object Object" not in str(detail)


@pytest.mark.asyncio
async def test_error_detail_format_400(client: AsyncClient, device_id: str):
    """Test that 400 error returns proper string detail."""
    files = {"file": ("test.xyz", io.BytesIO(b"data"), "application/octet-stream")}
    response = await client.post(
        "/api/v1/ocr/process",
        files=files,
        headers={"X-Device-Id": device_id}
    )
    
    assert response.status_code == 400
    data = response.json()
    detail = data.get("detail")
    
    assert isinstance(detail, str), f"detail should be string, got {type(detail)}: {detail}"

"""
JWT verification for DenseMatrix Auth integration.
"""
import httpx
from fastapi import Header, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel


class UserInfo(BaseModel):
    """User info from DenseMatrix Auth."""
    id: str
    phone: str
    organization_id: Optional[str] = None
    is_internal: bool = False


DENSEMATRIX_AUTH_URL = "https://api.densematrix.ai"


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Optional[UserInfo]:
    """
    Verify JWT token with DenseMatrix Auth.
    Returns None if no token provided (guest mode).
    Raises 401 if token is invalid.
    """
    if not authorization:
        return None
    
    if not authorization.startswith("Bearer "):
        return None
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{DENSEMATRIX_AUTH_URL}/api/auth/profile",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0
            )
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Authentication failed")
            
            data = response.json()
            return UserInfo(
                id=str(data.get("id")),
                phone=data.get("phone", ""),
                organization_id=data.get("organization_id"),
                is_internal=data.get("is_internal", False)
            )
    except httpx.RequestError:
        # Auth service unavailable, allow guest mode
        return None


async def require_auth(
    authorization: str = Header(...)
) -> UserInfo:
    """
    Require valid JWT token.
    Raises 401 if not authenticated.
    """
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

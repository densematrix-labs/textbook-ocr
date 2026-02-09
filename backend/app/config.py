from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # LLM Proxy
    llm_proxy_url: str = "https://llm-proxy.densematrix.ai"
    llm_proxy_key: str = "sk-wskhgeyawc"
    
    # OCR Models (matching Dify workflow)
    ocr_model: str = "gemini-2.5-pro"  # Main OCR model
    format_model: str = "gemini-3-flash-preview"  # LaTeX format cleanup
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./app.db"
    
    # Creem Payment
    creem_api_key: str = ""
    creem_webhook_secret: str = ""
    creem_product_ids: str = "{}"  # JSON string
    
    # App
    tool_name: str = "textbook-ocr"
    free_uses_per_device: int = 3
    
    # Internal testing (bypass token limits)
    internal_test_key: str = "dm-internal-2026"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "0Buck Backend"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "0buck")
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    # External APIs
    ALIBABA_1688_API_KEY: str = os.getenv("ALIBABA_1688_API_KEY", "")
    ALIBABA_1688_API_URL: str = os.getenv("ALIBABA_1688_API_URL", "https://api.1688.com")
    
    # Shopify
    SHOPIFY_API_KEY: str = os.getenv("SHOPIFY_API_KEY", "")
    SHOPIFY_API_SECRET: str = os.getenv("SHOPIFY_API_SECRET", "")
    SHOPIFY_SHOP_NAME: str = os.getenv("SHOPIFY_SHOP_NAME", "")
    SHOPIFY_ACCESS_TOKEN: str = os.getenv("SHOPIFY_ACCESS_TOKEN", "")
    SHOPIFY_STOREFRONT_TOKEN: str = os.getenv("SHOPIFY_STOREFRONT_TOKEN", "")
    
    # AI
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    MINIMAX_API_KEY: str = os.getenv("MINIMAX_API_KEY", "")
    EXA_API_KEY: str = os.getenv("EXA_API_KEY", "")
    NOTION_TOKEN: str = os.getenv("NOTION_TOKEN", "")
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", 6333))
    MASTER_SECRET_KEY: str = os.getenv("MASTER_SECRET_KEY", "0buck_default_master_key_for_api_keys_32")
    # For key rotation migration
    PREVIOUS_MASTER_SECRET_KEY: Optional[str] = os.getenv("PREVIOUS_MASTER_SECRET_KEY")

    # Stream Chat SDK
    STREAM_API_KEY: str = os.getenv("STREAM_API_KEY", "")
    STREAM_API_SECRET: str = os.getenv("STREAM_API_SECRET", "")

    # OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    APPLE_CLIENT_ID: str = os.getenv("APPLE_CLIENT_ID", "")
    APPLE_CLIENT_SECRET: str = os.getenv("APPLE_CLIENT_SECRET", "")
    FACEBOOK_CLIENT_ID: str = os.getenv("FACEBOOK_CLIENT_ID", "")
    FACEBOOK_CLIENT_SECRET: str = os.getenv("FACEBOOK_CLIENT_SECRET", "")
    
    # Session Secret
    SECRET_KEY: str = os.getenv("SECRET_KEY", "0buck_default_secret_key_for_sessions_32")
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "0buck_verify_token")

    # Domains & Routing
    BACKEND_URL: str = os.getenv("BACKEND_URL", "")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,https://0buck.com,https://www.0buck.com")
    STOREFRONT_DOMAIN: str = os.getenv("STOREFRONT_DOMAIN", "0buck.com")
    SHOPIFY_CHECKOUT_DOMAIN: str = os.getenv("SHOPIFY_CHECKOUT_DOMAIN", "") # e.g. shop.0buck.com

    # Pricing & Currency
    EXCHANGE_RATE: float = 0.14 # 1 CNY to USD
    EXCHANGE_BUFFER: float = 0.005 # 0.5% buffer for fluctuations

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()

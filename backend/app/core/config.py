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
    EXA_API_KEY: str = os.getenv("EXA_API_KEY", "")
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", 6333))

    # Domains & Routing
    BACKEND_URL: str = os.getenv("BACKEND_URL", "")
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

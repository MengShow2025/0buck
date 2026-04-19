import os
import secrets
from dotenv import load_dotenv
load_dotenv(".env", override=True)

from pydantic_settings import BaseSettings
from typing import Optional
from app.core.db_url import normalize_database_url_for_runtime

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
            return normalize_database_url_for_runtime(self.DATABASE_URL)
        raw = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
        return normalize_database_url_for_runtime(raw)

    # External APIs
    ALIBABA_1688_API_KEY: str = os.getenv("ALIBABA_1688_API_KEY", "")
    ALIBABA_1688_API_URL: str = os.getenv("ALIBABA_1688_API_URL", "https://api.1688.com")
    
    # Shopify
    SHOPIFY_API_KEY: str = os.getenv("SHOPIFY_API_KEY", "").strip()
    SHOPIFY_API_SECRET: str = os.getenv("SHOPIFY_API_SECRET", "").strip()
    SHOPIFY_SHOP_NAME: str = os.getenv("SHOPIFY_SHOP_NAME", os.getenv("SHOPIFY_STORE_DOMAIN", "")).strip()
    SHOPIFY_ACCESS_TOKEN: str = os.getenv("SHOPIFY_ACCESS_TOKEN", "").strip()
    SHOPIFY_STOREFRONT_TOKEN: str = os.getenv("SHOPIFY_STOREFRONT_TOKEN", "").strip()
    
    # AI
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    MINIMAX_API_KEY: str = os.getenv("MINIMAX_API_KEY", "")
    EXA_API_KEY: str = os.getenv("EXA_API_KEY", "")
    NOTION_TOKEN: str = os.getenv("NOTION_TOKEN", "")
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", 6333))
    MASTER_SECRET_KEY: str = os.getenv("MASTER_SECRET_KEY", "").strip()
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
    SECRET_KEY: str = os.getenv("SECRET_KEY", "").strip()
    
    # IM Gateway (v5.6)
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "").strip()
    
    FEISHU_APP_ID: str = os.getenv("FEISHU_APP_ID", "")
    FEISHU_APP_SECRET: str = os.getenv("FEISHU_APP_SECRET", "")
    FEISHU_VERIFY_TOKEN: str = os.getenv("FEISHU_VERIFY_TOKEN", "")
    FEISHU_ENCRYPT_KEY: str = os.getenv("FEISHU_ENCRYPT_KEY", "")

    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    DISCORD_BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN", "")
    DISCORD_CLIENT_ID: str = os.getenv("DISCORD_CLIENT_ID", "")

    # Domains & Routing
    BACKEND_URL: str = os.getenv("BACKEND_URL", "")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,https://0buck.com,https://www.0buck.com")
    STOREFRONT_DOMAIN: str = os.getenv("STOREFRONT_DOMAIN", "0buck.com")
    SHOPIFY_CHECKOUT_DOMAIN: str = os.getenv("SHOPIFY_CHECKOUT_DOMAIN", "") # e.g. shop.0buck.com

    # Pricing & Currency
    EXCHANGE_RATE: float = 0.14 # 1 CNY to USD
    EXCHANGE_BUFFER: float = 0.005 # 0.5% buffer for fluctuations

    # v4.6.6: Default Admin (Bootstrap)
    DEFAULT_ADMIN_EMAIL: str = os.getenv("DEFAULT_ADMIN_EMAIL", "")
    DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "")

    # Redis
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")

    @property
    def REDIS_URI(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # CJ Dropshipping
    CJ_ACCOUNT_ID: str = os.getenv("CJ_ACCOUNT_ID", "").strip()
    CJ_API_KEY: str = os.getenv("CJ_API_KEY", "").strip()
    CJ_EMAIL: str = os.getenv("CJ_EMAIL", "").strip()

    # Mabang ERP
    MABANG_APP_KEY: str = os.getenv("MABANG_APP_KEY", "").strip()
    MABANG_TOKEN: str = os.getenv("MABANG_TOKEN", "").strip()
    MABANG_API_URL: str = os.getenv("MABANG_API_URL", "https://open.mabangerp.com")

    # BuckyDrop API
    BUCKYDROP_APP_CODE: str = os.getenv("BUCKYDROP_APP_CODE", "").strip()
    BUCKYDROP_APP_SECRET: str = os.getenv("BUCKYDROP_APP_SECRET", "").strip()
    BUCKYDROP_DOMAIN: str = os.getenv("BUCKYDROP_DOMAIN", "https://bdopenapi.buckydrop.com")
    
    # BuckyDrop Test Credentials (Optional)
    BUCKYDROP_TEST_CODE: str = os.getenv("BUCKYDROP_TEST_CODE", "").strip()
    BUCKYDROP_TEST_SECRET: str = os.getenv("BUCKYDROP_TEST_SECRET", "").strip()
    BUCKYDROP_TEST_DOMAIN: str = os.getenv("BUCKYDROP_TEST_DOMAIN", "").strip()

    # YunExpress
    YUNEXPRESS_API_KEY: str = os.getenv("YUNEXPRESS_API_KEY", "").strip()
    YUNEXPRESS_APPID: str = os.getenv("YUNEXPRESS_APPID", "").strip()
    YUNEXPRESS_CUSTOMER_CODE: str = os.getenv("YUNEXPRESS_CUSTOMER_CODE", "").strip()
    YUNEXPRESS_SOURCE_KEY: str = os.getenv("YUNEXPRESS_SOURCE_KEY", "") # Might be needed for OAuth
    YUNEXPRESS_API_URL: str = os.getenv("YUNEXPRESS_API_URL", "https://openapi.yunexpress.cn")

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development") # "development" or "production"
    EXPOSE_INTERNAL_ERROR_DETAIL: bool = os.getenv("EXPOSE_INTERNAL_ERROR_DETAIL", "false").lower() == "true"
    COOKIE_DOMAIN: Optional[str] = os.getenv("COOKIE_DOMAIN")

    APP_VERSION: str = os.getenv("APP_VERSION", "unknown")
    GIT_SHA: str = os.getenv("GIT_SHA", "unknown")

    CELERY_ENABLED: bool = (
        os.getenv("IM_GATEWAY_ENABLE_CELERY", os.getenv("CELERY_ENABLED", "false")).lower() == "true"
    )

    def model_post_init(self, __context) -> None:
        if self.ENVIRONMENT == "production":
            if not self.SECRET_KEY:
                raise RuntimeError("SECRET_KEY must be set in production")
            if not self.MASTER_SECRET_KEY:
                raise RuntimeError("MASTER_SECRET_KEY must be set in production")
        else:
            if not self.SECRET_KEY:
                self.SECRET_KEY = secrets.token_urlsafe(32)
            if not self.MASTER_SECRET_KEY:
                self.MASTER_SECRET_KEY = secrets.token_urlsafe(32)

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()

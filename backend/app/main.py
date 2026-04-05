from fastapi import FastAPI, Depends, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import json
import asyncio
from app.core.config import settings
from app.db.session import get_db
from app.services.supply_chain import SupplyChainService
from app.services.sync_shopify import SyncShopifyService
from app.api.webhooks import router as webhooks_router
from app.api.admin import router as admin_router
from app.api.proxy import router as proxy_router
from app.api.agent import router as agent_router
from app.api.butler import router as butler_router
from app.api.rewards import router as rewards_router
from app.api.products import router as products_router
from app.api.stream import router as stream_router
from app.api.auth import router as auth_router
from app.services.rewards import RewardsService
from app.services.stream_chat import stream_chat_service

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="0Buck Backend", version="3.4")

# Set up CORS
origins = settings.ALLOWED_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# API Router
api_router = APIRouter(prefix=settings.API_V1_STR)

@api_router.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@api_router.post("/sync/1688/{product_id}")
async def sync_1688_product(product_id: str, db: Session = Depends(get_db)):
    sync_1688 = SupplyChainService(db)
    product = await sync_1688.sync_product(product_id)
    
    sync_shopify = SyncShopifyService()
    shopify_res = sync_shopify.sync_to_shopify(product)
    
    return {
        "status": "success", 
        "product": product.title_en, 
        "shopify_id": product.shopify_product_id
    }

@api_router.get("/users/{customer_id}")
async def get_user_profile(customer_id: str, db: Session = Depends(get_db)):
    rewards = RewardsService(db)
    summary = rewards.get_wallet_summary(int(customer_id))
    level_info = rewards.get_user_level(int(customer_id))
    
    return {
        "id": customer_id,
        "name": "User " + customer_id,
        "wallet_balance": summary["available"],
        "level": level_info["level"],
        "invitees": int(level_info.get("invitees") or 0),
        "total_volume": float(level_info.get("total_volume") or 0),
    }

@api_router.get("/customer/sync/{customer_id}")
async def sync_customer_to_shopify(customer_id: str, db: Session = Depends(get_db)):
    """
    Force a sync between local database and Shopify for a specific customer.
    Called when user checks balance or level to ensure 100% accuracy.
    """
    rewards = RewardsService(db)
    success = rewards.sync_customer_data_to_shopify(int(customer_id))
    
    if success:
        return {"status": "success", "message": f"Data synced for customer {customer_id}"}
    else:
        return {"status": "failed", "message": "Failed to sync data to Shopify. Check permissions."}

@app.on_event("startup")
async def startup_event():
    # v3.4 VCC: Pre-create global platform channels
    channels = [
        ("messaging", "global_commerce", "COMMERCE HUB", {"platform_role": "global"}),
        ("messaging", "global_square", "SQUARE BROADCAST", {"platform_role": "global"}),
        ("messaging", "global_lounge", "SOCIAL LOUNGE", {"platform_role": "global"})
    ]

    for c_type, c_id, name, extra in channels:
        try:
            stream_chat_service.create_channel(c_type, c_id, name, extra_data=extra)
            logger.info(f"  [VCC] Platform Channel Ready: {name} ({c_id})")
        except Exception as e:
            logger.error(f"  [VCC] Failed to create platform channel {name}: {e}")

# Include routers
app.include_router(api_router, tags=["api"])
app.include_router(agent_router, prefix=f"{settings.API_V1_STR}", tags=["agent"])
app.include_router(agent_router, prefix=f"{settings.API_V1_STR}/agent", tags=["agent"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(webhooks_router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["webhooks"])
app.include_router(butler_router, prefix=f"{settings.API_V1_STR}/butler", tags=["butler"])
app.include_router(rewards_router, prefix=f"{settings.API_V1_STR}/rewards", tags=["rewards"])
app.include_router(products_router, prefix=f"{settings.API_V1_STR}/products", tags=["products"])
app.include_router(stream_router, prefix=f"{settings.API_V1_STR}/stream", tags=["stream"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(proxy_router, prefix=f"{settings.API_V1_STR}/checkin", tags=["checkin"])

# Serve static files from React build
frontend_path = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/frontend/dist"
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=f"{frontend_path}/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # If the path looks like an API call, it's already handled by routers above.
        # Otherwise, serve index.html for React Router to handle.
        file_path = os.path.join(frontend_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_path, "index.html"))

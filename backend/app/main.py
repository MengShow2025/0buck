from fastapi import FastAPI, Depends, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.services.sync_1688 import Sync1688Service
from backend.app.services.sync_shopify import SyncShopifyService
from backend.app.api.webhooks import router as webhooks_router
from backend.app.api.admin import router as admin_router
from backend.app.api.proxy import router as proxy_router
from backend.app.services.rewards import RewardsService

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
api_router = APIRouter(prefix=settings.API_V1_STR)

@api_router.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@api_router.post("/sync/1688/{product_id}")
async def sync_1688_product(product_id: str, db: Session = Depends(get_db)):
    sync_1688 = Sync1688Service(db)
    product = await sync_1688.sync_product(product_id)
    
    sync_shopify = SyncShopifyService()
    shopify_res = sync_shopify.sync_to_shopify(product)
    
    return {
        "status": "success", 
        "product": product.title_en, 
        "shopify_id": product.shopify_product_id
    }

@api_router.post("/chat")
async def chat(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        data = {}
        
    content = data.get("content", "something interesting")
    
    # Mock AI response
    return {
        "id": "msg_" + str(datetime.now().timestamp()),
        "role": "assistant",
        "content": f"I found some items related to '{content}' with AI-optimized pricing and rewards!",
        "type": "products",
        "products": [
            {
                "id": "1688_001",
                "shopify_id": "14074199736623",
                "title": "Smart AI Glasses (2nd Gen)",
                "price": 129.99,
                "images": ["https://sc01.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png"],
                "is_reward_eligible": True
            },
            {
                "id": "1688_002",
                "shopify_id": "14074199736624",
                "title": "Rewarding Mini Projector",
                "price": 45.00,
                "images": ["https://sc01.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png"],
                "is_reward_eligible": True
            }
        ],
        "timestamp": datetime.now().isoformat()
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
        "level": level_info["level"]
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

# Include routers
app.include_router(api_router, tags=["api"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(webhooks_router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["webhooks"])
app.include_router(proxy_router, prefix=f"{settings.API_V1_STR}/checkin", tags=["checkin"])

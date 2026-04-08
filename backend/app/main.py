from fastapi import FastAPI, Depends, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import json
import asyncio
from app.core.config import settings
from app.db.session import get_db, engine
# v4.6.8: MUST import all models BEFORE calling metadata.create_all
from app.models.product import Base
from app.models.ledger import UserExt, Wallet, WalletTransaction, CheckinPlan, CheckinLog, AdminAuditLog, ReferralRelationship, GroupBuyCampaign, SystemConfig, UserStreamIdentity, ProcessedWebhookEvent, AISession, Order, AvailableCoupon, CouponIssuanceAudit, SourcingOrder, PriceWish, SquareActivity, Comment
from app.models.butler import UserMemoryFact, UserButlerProfile, PersonaTemplate, AIUsageStats, AIContribution, ShadowIDMapping, UserMemorySemantic, UserIMBinding
from app.models.rewards import PointTransaction, RenewalCard, AIUsageQuota, Points



from app.services.supply_chain import SupplyChainService
from app.services.sync_shopify import SyncShopifyService
from app.api.webhooks import router as webhooks_router
from app.api.admin import router as admin_router
from app.api.proxy import router as proxy_router
from app.api.agent import router as agent_router
from app.api.butler import router as butler_router
from app.api.rewards import router as rewards_router
from app.api.products import router as products_router
from app.api.suppliers import router as suppliers_router
from app.api.social import router as social_router
from app.api.system import router as system_router
from app.api.stream import router as stream_router
from app.api.auth import router as auth_router
from app.api.im_gateway import router as im_router
from app.services.rewards import RewardsService
from app.services.stream_chat import stream_chat_service

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def sync_db_schema():
    """
    v4.6.9: Robust Hot Schema Migration.
    Adds missing columns to existing tables by checking existence first.
    """
    from sqlalchemy import Column, Text, String, JSON, text, Float, DateTime, Numeric, Boolean, Integer, BigInteger, inspect, func
    from sqlalchemy.dialects.postgresql import JSONB
    
    # Cross-dialect column type mapping
    def get_type(col, dialect):
        if dialect.name == 'sqlite':
            if isinstance(col.type, JSONB):
                return "JSON"
            if isinstance(col.type, Numeric):
                return "FLOAT"
        return col.type.compile(dialect)

    inspector = inspect(engine)
    
    # 1. Product Table Updates
    cols_product = [
        Column("desire_hook", Text()),
        Column("desire_logic", Text()),
        Column("desire_closing", Text()),
        Column("detail_images", JSONB(), server_default=text("'[]'::jsonb")),
        Column("origin_video_url", Text()),
        Column("certificate_images", JSONB(), server_default=text("'[]'::jsonb")),
        Column("metafields", JSONB(), server_default=text("'{}'::jsonb")),
        Column("visual_fingerprint", Text()),
        Column("titles", JSONB(), server_default=text("'{}'::jsonb")),
        Column("descriptions", JSONB(), server_default=text("'{}'::jsonb")),
        Column("images", JSONB(), server_default=text("'[]'::jsonb")),
        Column("tags", JSONB(), server_default=text("'[]'::jsonb")),
        Column("variants", JSONB(), server_default=text("'[]'::jsonb")),
        Column("amazon_price", Float()),
        Column("ebay_price", Float()),
        Column("amazon_compare_at_price", Float()),
        Column("ebay_compare_at_price", Float()),
        Column("source_platform", Text(), server_default=text("'1688'")),
        Column("source_url", Text()),
        Column("backup_source_url", Text())
    ]
    
    existing_product_cols = [c['name'] for c in inspector.get_columns('products')]
    
    with engine.connect() as conn:
        for col in cols_product:
            if col.name not in existing_product_cols:
                try:
                    type_str = get_type(col, engine.dialect)
                    # v4.6.9: Use IF NOT EXISTS for extra safety in PG
                    if engine.dialect.name == 'postgresql':
                        stmt = f"ALTER TABLE products ADD COLUMN IF NOT EXISTS {col.name} {type_str}"
                    else:
                        stmt = f"ALTER TABLE products ADD COLUMN {col.name} {type_str}"
                        
                    if col.server_default is not None and engine.dialect.name == 'postgresql':
                        default_text = col.server_default.arg
                        stmt += f" DEFAULT {default_text}"
                    
                    conn.execute(text(stmt))
                    conn.commit()
                    logger.info(f"✅ Added column {col.name} to products table.")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to add {col.name} to products: {e}")
                    conn.rollback() # Ensure transaction is clean for next loop
        
        # 2. CandidateProduct Table Updates
        cols_candidate = [
            Column("desire_hook", Text()),
            Column("desire_logic", Text()),
            Column("desire_closing", Text()),
            Column("origin_video_url", Text()),
            Column("certificate_images", JSONB(), server_default=text("'[]'::jsonb")),
            Column("attributes", JSONB(), server_default=text("'[]'::jsonb")),
            Column("logistics_data", JSONB(), server_default=text("'{}'::jsonb")),
            Column("structural_data", JSONB(), server_default=text("'{}'::jsonb")),
            Column("mirror_assets", JSONB(), server_default=text("'{}'::jsonb")),
            Column("visual_fingerprint", Text()),
            Column("images", JSONB(), server_default=text("'[]'::jsonb")),
            Column("discovery_evidence", JSONB(), server_default=text("'{}'::jsonb")),
            Column("supplier_info", JSONB(), server_default=text("'{}'::jsonb")),
            Column("amazon_price", Float()),
            Column("ebay_price", Float()),
            Column("amazon_compare_at_price", Float()),
            Column("ebay_compare_at_price", Float()),
            Column("source_platform", Text(), server_default=text("'1688'")),
            Column("source_url", Text()),
            Column("backup_source_url", Text()),
            Column("alibaba_comparison_price", Float())
        ]
        
        existing_candidate_cols = [c['name'] for c in inspector.get_columns('candidate_products')]
        for col in cols_candidate:
            if col.name not in existing_candidate_cols:
                try:
                    type_str = get_type(col, engine.dialect)
                    if engine.dialect.name == 'postgresql':
                        stmt = f"ALTER TABLE candidate_products ADD COLUMN IF NOT EXISTS {col.name} {type_str}"
                    else:
                        stmt = f"ALTER TABLE candidate_products ADD COLUMN {col.name} {type_str}"
                        
                    if col.server_default is not None and engine.dialect.name == 'postgresql':
                        default_text = col.server_default.arg
                        stmt += f" DEFAULT {default_text}"
                    conn.execute(text(stmt))
                    conn.commit()
                    logger.info(f"✅ Added column {col.name} to candidate_products table.")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to add {col.name} to candidate_products: {e}")
                    conn.rollback()
         
         # 3. UserExt Table Updates
        cols_user = [
            Column("inviter_id", BigInteger()),
            Column("email", Text()),
            Column("first_name", Text()),
            Column("last_name", Text()),
            Column("referral_code", Text()),
            Column("user_type", Text(), server_default=text("'customer'")),
            Column("user_tier", Text(), server_default=text("'silver'")),
            Column("kol_status", Text(), server_default=text("'none'")),
            Column("kol_apply_reason", Text()),
            Column("kol_applied_at", DateTime()),
            Column("dist_rate", Numeric(5, 4)),
            Column("fan_rate", Numeric(5, 4)),
            Column("two_factor_secret", Text()),
            Column("is_two_factor_enabled", Boolean(), server_default=text("false")),
            Column("hashed_payment_password", Text()),
            Column("payment_pass_failed_attempts", Integer(), server_default=text("0")),
            Column("payment_pass_locked_until", DateTime()),
            Column("last_login_ip", Text()),
            Column("last_login_at", DateTime()),
            Column("is_active", Boolean(), server_default=text("true"))
        ]
        
        existing_user_cols = [c['name'] for c in inspector.get_columns('users_ext')]
        for col in cols_user:
            if col.name not in existing_user_cols:
                try:
                    type_str = get_type(col, engine.dialect)
                    if engine.dialect.name == 'postgresql':
                        stmt = f"ALTER TABLE users_ext ADD COLUMN IF NOT EXISTS {col.name} {type_str}"
                    else:
                        stmt = f"ALTER TABLE users_ext ADD COLUMN {col.name} {type_str}"
                        
                    # Handle server_default for ALTER TABLE
                    if col.server_default is not None:
                        default_val = col.server_default.arg
                        if isinstance(default_val, str):
                             stmt += f" DEFAULT {default_val}"
                    
                    conn.execute(text(stmt))
                    conn.commit()
                    logger.info(f"✅ Added column {col.name} to users_ext table.")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to add column {col.name} to users_ext: {e}")
                    conn.rollback()

        # 4. Order Table Updates
        cols_order = [
            Column("created_at", DateTime(), server_default=func.now()),
            Column("updated_at", DateTime(), server_default=func.now())
        ]
        existing_order_cols = [c['name'] for c in inspector.get_columns('orders')]
        for col in cols_order:
            if col.name not in existing_order_cols:
                try:
                    type_str = get_type(col, engine.dialect)
                    if engine.dialect.name == 'postgresql':
                        stmt = f"ALTER TABLE orders ADD COLUMN IF NOT EXISTS {col.name} {type_str}"
                    else:
                        stmt = f"ALTER TABLE orders ADD COLUMN {col.name} {type_str}"
                    
                    if engine.dialect.name == 'postgresql':
                        stmt += " DEFAULT CURRENT_TIMESTAMP"
                    
                    conn.execute(text(stmt))
                    conn.commit()
                    logger.info(f"✅ Added column {col.name} to orders table.")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to add {col.name} to orders: {e}")
                    conn.rollback()

        # 5. CheckinPlan Table Updates
        cols_checkin = [
            Column("created_at", DateTime(), server_default=func.now()),
            Column("updated_at", DateTime(), server_default=func.now())
        ]
        existing_checkin_cols = [c['name'] for c in inspector.get_columns('checkin_plans')]
        for col in cols_checkin:
            if col.name not in existing_checkin_cols:
                try:
                    type_str = get_type(col, engine.dialect)
                    if engine.dialect.name == 'postgresql':
                        stmt = f"ALTER TABLE checkin_plans ADD COLUMN IF NOT EXISTS {col.name} {type_str}"
                    else:
                        stmt = f"ALTER TABLE checkin_plans ADD COLUMN {col.name} {type_str}"
                    
                    if engine.dialect.name == 'postgresql':
                        stmt += " DEFAULT CURRENT_TIMESTAMP"
                        
                    conn.execute(text(stmt))
                    conn.commit()
                    logger.info(f"✅ Added column {col.name} to checkin_plans table.")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to add {col.name} to checkin_plans: {e}")
                    conn.rollback()

        # 6. UserButlerProfile Table Updates (v5.7.4)
        cols_butler = [
            Column("butler_name", String(100)),
            Column("user_nickname", String(100)),
            Column("active_persona_id", String(50)),
            Column("affinity_score", Integer(), server_default=text("0")),
            Column("current_vibe", String(50)),
            Column("detected_country", String(10)),
            Column("preferred_currency", String(10), server_default=text("'USD'")),
            Column("custom_vectors", JSONB(), server_default=text("'{}'::jsonb")),
            Column("personality", JSONB(), server_default=text("'{}'::jsonb")),
            Column("ai_api_key", String(255)),
            Column("byok_status", String(20), server_default=text("'none'")),
            Column("last_health_check", DateTime())
        ]
        
        existing_butler_cols = [c['name'] for c in inspector.get_columns('user_butler_profiles')]
        for col in cols_butler:
            if col.name not in existing_butler_cols:
                try:
                    type_str = get_type(col, engine.dialect)
                    if engine.dialect.name == 'postgresql':
                        stmt = f"ALTER TABLE user_butler_profiles ADD COLUMN IF NOT EXISTS {col.name} {type_str}"
                    else:
                        stmt = f"ALTER TABLE user_butler_profiles ADD COLUMN {col.name} {type_str}"
                        
                    if col.server_default is not None:
                        default_val = col.server_default.arg
                        if isinstance(default_val, str):
                             stmt += f" DEFAULT {default_val}"
                             
                    conn.execute(text(stmt))
                    conn.commit()
                    logger.info(f"✅ Added column {col.name} to user_butler_profiles table.")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to add {col.name} to user_butler_profiles: {e}")
                    conn.rollback()

        # 7. Global Cleanup: Reset invalid butler names (v5.7.15)
        try:
            bad_name = "有什么好产品推荐"
            conn.execute(text("UPDATE user_butler_profiles SET butler_name = NULL WHERE butler_name = :bad_name"), {"bad_name": bad_name})
            conn.commit()
            logger.info(f"🧹 Successfully cleared invalid butler names: {bad_name}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to cleanup butler names: {e}")

        # 8. Create GIN Indexes for JSONB fields (PostgreSQL only)
        if engine.dialect.name == 'postgresql':
            index_stmts = [
                "CREATE INDEX IF NOT EXISTS idx_product_attributes ON products USING gin (attributes)",
                "CREATE INDEX IF NOT EXISTS idx_product_structural_data ON products USING gin (structural_data)",
                "CREATE INDEX IF NOT EXISTS idx_candidate_attributes ON candidate_products USING gin (attributes)",
                "CREATE INDEX IF NOT EXISTS idx_candidate_structural_data ON candidate_products USING gin (structural_data)"
            ]
            for stmt in index_stmts:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                    print(f"✅ Executed index statement: {stmt}")
                except Exception as e:
                    print(f"⚠️ Index creation failed (might already exist): {e}")

sync_db_schema()

app = FastAPI(title="0Buck Backend", version="3.9.7")

# Set up CORS
# v4.6.7: Explicit origins and credentials allowed for HttpOnly Cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.0buck.com",
        "https://0buck.com",
        "https://shop.0buck.com",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# API Router
api_router = APIRouter(prefix=settings.API_V1_STR)

@api_router.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@api_router.get("/diag/paths")
async def diagnostic_paths():
    """v5.7.28: Internal diagnostic to troubleshoot SPA loading."""
    import os
    return {
        "cwd": os.getcwd(),
        "base_dir": base_dir,
        "project_root": project_root,
        "frontend_path": frontend_path,
        "index_exists": os.path.exists(os.path.join(frontend_path, "index.html")),
        "assets_exists": os.path.exists(os.path.join(frontend_path, "assets")),
        "files_in_frontend": os.listdir(frontend_path) if os.path.exists(frontend_path) else [],
        "env_allowed_origins": settings.ALLOWED_ORIGINS
    }

@app.get("/healthz")
async def healthz():
    """v5.7.32: Direct health check to verify backend reachability."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

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
    # v3.5.0: Legacy endpoint, using system ID for read-only query
    rewards = RewardsService(db, current_user_id=1)
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
    rewards = RewardsService(db, current_user_id=1)
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

# Serve static files from React build
# v5.7.27: Enhanced path detection for Railway/Docker/Local
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
project_root = os.path.dirname(base_dir)

# Priority 1: backend/static (Production bundle)
# Priority 2: project_root/frontend/dist (Local dev)
# Priority 3: current_dir/static (Fallback)
frontend_path = os.path.join(base_dir, "static")
if not os.path.exists(frontend_path):
    frontend_path = os.path.join(project_root, "frontend", "dist")
if not os.path.exists(frontend_path):
    frontend_path = os.path.join(os.getcwd(), "static")

logger.info(f"📂 Frontend assets path: {frontend_path}")

# --- 1. RAILWAY NATIVE SPA ROUTING (v5.7.33) ---
@app.middleware("http")
async def railway_spa_interceptor(request: Request, call_next):
    path = request.url.path
    method = request.method
    
    # v5.7.33: Explicitly bypass all backend/system routes
    is_backend = (
        path.startswith(settings.API_V1_STR) or 
        path.startswith("/api/") or 
        path.startswith("/v1/") or
        path == "/healthz" or
        path == "/health" or
        path.startswith("/diag/")
    )
    
    if is_backend or method != "GET":
        return await call_next(request)
    
    # Static assets (files with extensions) pass through
    if "." in path.split("/")[-1]:
        return await call_next(request)
        
    # Everything else is an SPA route -> serve index.html
    target_index = os.path.join(frontend_path, "index.html")
    if os.path.exists(target_index):
        return FileResponse(target_index)
            
    # Emergency fallback
    container_index = "/app/static/index.html"
    if os.path.exists(container_index):
        return FileResponse(container_index)
            
    return await call_next(request)

# --- 2. RAILWAY SPA FALLBACK (v5.7.31) ---
# High-reliability fallback for Railway.
@app.get("/auth/bind")
@app.get("/chat")
@app.get("/me")
@app.get("/login")
@app.get("/register")
async def railway_fallback(request: Request):
    # Railway Docker image structure: backend in /app, static in /app/static
    # We search the most likely places in the container.
    possible_indices = [
        "/app/static/index.html",
        os.path.join(frontend_path, "index.html"),
        "static/index.html"
    ]
    for loc in possible_indices:
        if os.path.exists(loc):
            return FileResponse(loc)
            
    # If the file is physically missing, we give a clear error.
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=f"""
        <html>
            <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff; text-align: center;">
                <div>
                    <h1 style="color: #ef4444;">0Buck System Error</h1>
                    <p>Static assets are missing in the Railway container.</p>
                    <p>Current path: {os.getcwd()}</p>
                    <p>Static path: {frontend_path}</p>
                </div>
            </body>
        </html>
    """, status_code=500)

@app.get("/")
async def root_spa():
    """v5.7.32: Explicit root handler for Railway SPA."""
    target_index = os.path.join(frontend_path, "index.html")
    if os.path.exists(target_index):
        return FileResponse(target_index)
    return FileResponse("/app/static/index.html")

# Include routers
app.include_router(api_router, tags=["api"])
app.include_router(agent_router, prefix=f"{settings.API_V1_STR}", tags=["agent"])
app.include_router(agent_router, prefix=f"{settings.API_V1_STR}/agent", tags=["agent"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(webhooks_router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["webhooks"])
app.include_router(butler_router, prefix=f"{settings.API_V1_STR}/butler", tags=["butler"])
app.include_router(rewards_router, prefix=f"{settings.API_V1_STR}/rewards", tags=["rewards"])
app.include_router(products_router, prefix=f"{settings.API_V1_STR}/products", tags=["products"])
app.include_router(suppliers_router, prefix=f"{settings.API_V1_STR}/suppliers", tags=["suppliers"])
app.include_router(social_router, prefix=f"{settings.API_V1_STR}/social", tags=["social"])
app.include_router(system_router, prefix=f"{settings.API_V1_STR}/system", tags=["system"])
app.include_router(stream_router, prefix=f"{settings.API_V1_STR}/stream", tags=["stream"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(im_router, prefix=f"{settings.API_V1_STR}/im", tags=["im"])
app.include_router(proxy_router, prefix=f"{settings.API_V1_STR}/checkin", tags=["checkin"])

# --- 2. STATIC ASSETS & FALLBACK (v5.7.24) ---
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    # Final catch-all to ensure any non-matched route returns index.html for SPA
    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str = None):
        # 1. Exclude API routes
        if full_path and (full_path.startswith("api/") or full_path.startswith("v1/")):
             return {"detail": "Not Found"}
             
        # 2. Check if it's a physical file in the frontend dist root (like sw.js, manifest.json)
        if full_path:
            file_path = os.path.join(frontend_path, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
        
        # 3. Serve index.html as fallback for SPA routing
        index_file = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
            
        return {"detail": "Static assets not found"}


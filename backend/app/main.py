from fastapi import FastAPI, Depends, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import StreamingResponse, Response, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from datetime import datetime
import json
import asyncio
from app.core.config import settings
from app.db.session import get_db, engine
# v4.6.8: MUST import all models BEFORE calling metadata.create_all
from app.models.product import Base
from app.models.ledger import UserExt, Wallet, WalletTransaction, CheckinPlan, CheckinLog, AdminAuditLog, ReferralRelationship, GroupBuyCampaign, SystemConfig, UserStreamIdentity, ProcessedWebhookEvent, AISession, Order, AvailableCoupon, CouponIssuanceAudit, SourcingOrder, PriceWish, SquareActivity, Comment, PromoShareLink, OrderAttribution
from app.models.butler import UserMemoryFact, UserButlerProfile, PersonaTemplate, AIUsageStats, AIContribution, ShadowIDMapping, UserMemorySemantic, UserIMBinding, BindingCode
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
from app.api.users import router as users_router
from app.api.im_gateway import router as im_router
from app.api.deps import get_current_admin, get_current_user
from app.services.rewards import RewardsService
from app.services.stream_chat import stream_chat_service

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging
import time
import uuid
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from prometheus_client import CONTENT_TYPE_LATEST
from app.core.request_context import request_id_var, traceparent_var

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path"],
)
# AI Key Exhaustion Metric (Option A)
AI_KEY_EXHAUSTION_RATE = Gauge(
    "ai_key_exhaustion_rate",
    "Ratio of AI API Keys currently in cooldown blacklist (0.0 to 1.0)",
)

# Note: DB initialization and schema migration have been moved to scripts/init_db_tables.py
# to avoid concurrency issues during multi-worker startup.

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
        "http://127.0.0.1:5173",
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
async def diagnostic_paths(admin: UserExt = Depends(get_current_admin)):
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


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

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
async def get_user_profile(customer_id: str, db: Session = Depends(get_db), admin: UserExt = Depends(get_current_admin)):
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
async def sync_customer_to_shopify(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
):
    """
    Force a sync between local database and Shopify for a specific customer.
    Called when user checks balance or level to ensure 100% accuracy.
    """
    requested_id = int(customer_id)
    if current_user.customer_id != requested_id and current_user.user_type not in ["kol", "admin"]:
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})

    rewards = RewardsService(db, current_user_id=current_user.customer_id)
    rewards.ensure_user_exists(requested_id)
    return {"status": "success", "message": f"User {customer_id} ensured"}

@app.on_event("startup")
async def startup_event():
    # Backward-compatible schema guard for environments where migrations lag behind code.
    try:
        inspector = inspect(engine)
        user_cols = {c["name"] for c in inspector.get_columns("users_ext")}
        if "backup_email" not in user_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users_ext ADD COLUMN backup_email VARCHAR"))
            logger.warning("  [DB] Added missing users_ext.backup_email column for compatibility.")
        try:
            product_cols = {c["name"] for c in inspector.get_columns("products")}
            if "source_platform" not in product_cols:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE products ADD COLUMN source_platform VARCHAR"))
                logger.warning("  [DB] Added missing products.source_platform column for compatibility.")
            if "source_url" not in product_cols:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE products ADD COLUMN source_url VARCHAR"))
                logger.warning("  [DB] Added missing products.source_url column for compatibility.")
            if "backup_source_url" not in product_cols:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE products ADD COLUMN backup_source_url VARCHAR"))
                logger.warning("  [DB] Added missing products.backup_source_url column for compatibility.")
        except Exception:
            pass
        PromoShareLink.__table__.create(bind=engine, checkfirst=True)
        OrderAttribution.__table__.create(bind=engine, checkfirst=True)
        try:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE promo_share_links ALTER COLUMN share_token TYPE VARCHAR(255)"))
            logger.warning("  [DB] Ensured promo_share_links.share_token is VARCHAR(255).")
        except Exception:
            pass
        try:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE order_attributions ALTER COLUMN share_token TYPE VARCHAR(255)"))
            logger.warning("  [DB] Ensured order_attributions.share_token is VARCHAR(255).")
        except Exception:
            pass
    except Exception as e:
        logger.error(f"  [DB] users_ext compatibility check failed: {e}")

    if not settings.STREAM_API_KEY or not settings.STREAM_API_SECRET:
        logger.warning("  [VCC] Skip platform channel bootstrap: Stream API keys missing.")
        return

    # v3.4 VCC: Pre-create global platform channels
    channels = [
        ("messaging", "global_commerce", "COMMERCE HUB", {"platform_role": "global"}),
        ("messaging", "global_square", "SQUARE BROADCAST", {"platform_role": "global"}),
        ("messaging", "global_lounge", "SOCIAL LOUNGE", {"platform_role": "global"})
    ]

    for c_type, c_id, name, extra in channels:
        try:
            await asyncio.wait_for(
                asyncio.to_thread(
                    stream_chat_service.create_channel,
                    c_type,
                    c_id,
                    name,
                    None,
                    extra,
                ),
                timeout=3.0,
            )
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

@app.middleware("http")
async def ngrok_bypass_middleware(request: Request, call_next):
    """
    Bypass ngrok's anti-phishing interstitial page for API endpoints,
    especially Webhooks that cannot click 'Visit Site'.
    """
    response = await call_next(request)
    # Add header to skip ngrok browser warning
    response.headers["ngrok-skip-browser-warning"] = "true"
    return response

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
        path == "/metrics" or
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


@app.middleware("http")
async def request_id_and_metrics(request: Request, call_next):
    start = time.perf_counter()
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    request.state.request_id = request_id
    token = request_id_var.set(request_id)
    tp_token = traceparent_var.set(request.headers.get("traceparent"))

    response = None
    status_code = 500
    try:
        response = await call_next(request)
        status_code = getattr(response, "status_code", 500)
        return response
    finally:
        request_id_var.reset(token)
        traceparent_var.reset(tp_token)
        duration = time.perf_counter() - start
        method = request.method
        route = request.scope.get("route")
        path_label = getattr(route, "path", None) or request.url.path

        HTTP_REQUESTS_TOTAL.labels(method=method, path=path_label, status=str(status_code)).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(method=method, path=path_label).observe(duration)

        logger.info(
            f"request_id={request_id} trace_id={tp_token or 'none'} method={method} path={path_label} status={status_code} duration_ms={int(duration*1000)}"
        )

        if response is not None:
            response.headers["x-request-id"] = request_id
            if tp_token:
                response.headers["x-trace-id"] = str(tp_token)

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
app.include_router(users_router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(api_router, tags=["api"])
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
             return JSONResponse(status_code=404, content={"detail": "Not Found"})
             
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

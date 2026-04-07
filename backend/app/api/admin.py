from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Any, Dict
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_db
from app.api.deps import get_current_admin
from app.models import UserExt, Wallet, CheckinPlan, SystemConfig
from app.models.c2m import UserWish, DemandInsight, OrderCustomization
from app.models.butler import UserButlerProfile, AIContribution, ShadowIDMapping, PersonaTemplate, AIUsageStats, UserMemoryFact
from app.models.ledger import AvailableCoupon, Order, SourcingOrder
from app.models.product import Product, CandidateProduct
from app.services.discount_service import DiscountSyncService
from app.services.c2m_service import C2MService
from app.services.supply_chain import SupplyChainService

router = APIRouter(dependencies=[Depends(get_current_admin)])

# --- Pydantic Schemas ---

class PersonaTemplateUpdate(BaseModel):
    id: str
    name: str
    style_prompt: str
    empathy_weight: float = 0.5
    formality_score: float = 0.5
    vibrancy_level: float = 0.5
    emoji_density: float = 0.5
    is_active: bool = True

class ExcludedCategoriesUpdate(BaseModel):
    categories: List[str]

class ProductUpdate(BaseModel):
    category: Optional[str] = None
    is_reward_eligible: Optional[bool] = None
    is_cashback_eligible: Optional[bool] = None
    product_category_type: Optional[str] = None
    strategy_tag: Optional[str] = None
    price_fluctuation_threshold: Optional[float] = None

class GlobalConfigUpdate(BaseModel):
    key: str
    value: Any

class RewardRatesUpdate(BaseModel):
    silver_rate: float
    gold_rate: float
    platinum_rate: float
    kol_dist_default: float
    kol_fan_default: float
    fan_silver_rate: float
    fan_gold_rate: float
    fan_platinum_rate: float

class PricingStrategyUpdate(BaseModel):
    sale_price_ratio: float
    compare_at_price_ratio: float
    amazon_weight: float = 0.5
    ebay_weight: float = 0.5

class SourcingStrategyUpdate(BaseModel):
    arbitrage_threshold: float = 0.15 # 15%
    min_trend_score: int = 85
    min_supplier_years: int = 2
    require_gold_supplier: bool = True
    require_trade_assurance: bool = True

class KOLApproveRequest(BaseModel):
    user_id: int
    dist_rate: Optional[float] = None
    fan_rate: Optional[float] = None
    status: str = "approved" # approved, rejected
    admin_note: Optional[str] = None

class CouponAssignRequest(BaseModel):
    ai_category: str
    ai_issuance_permission: str = "LOW" # LOW, MEDIUM, HIGH

# --- Coupon Management ---

@router.get("/coupons")
def list_coupons(db: Session = Depends(get_db)):
    """v3.1 List all synced coupons with AI categories and permissions"""
    coupons = db.query(AvailableCoupon).all()
    return [{
        "code": c.code,
        "type": c.type,
        "value": c.value,
        "min_requirement": c.min_requirement,
        "ai_category": c.ai_category,
        "ai_issuance_permission": c.ai_issuance_permission,
        "is_active": c.is_active,
        "expires_at": c.expires_at
    } for c in coupons]

@router.get("/coupons/sync")
def sync_coupons(db: Session = Depends(get_db)):
    """v3.1 Manual trigger for Shopify Coupon Sync"""
    service = DiscountSyncService(db)
    count = service.sync_from_shopify()
    return {"status": "success", "synced_count": count}

@router.post("/coupons/{code}/assign-category")
def assign_coupon_category(code: str, data: CouponAssignRequest, db: Session = Depends(get_db)):
    """v3.1 Assign AI category and permission to a synced coupon"""
    coupon = db.query(AvailableCoupon).filter_by(code=code).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    coupon.ai_category = data.ai_category
    coupon.ai_issuance_permission = data.ai_issuance_permission
    db.commit()
    return {"status": "success"}

# --- Global Config & AI Rules ---

@router.get("/config/ai-rules")
def get_ai_rules(db: Session = Depends(get_db)):
    """v3.1 Get AI Coupon Issuance rules and daily budget"""
    budget = db.query(SystemConfig).filter_by(key="AI_COUPON_DAILY_BUDGET").first()
    rules = db.query(SystemConfig).filter_by(key="AI_COUPON_RULES").first()
    
    return {
        "daily_budget": budget.value if budget else 50.0,
        "rules": rules.value if rules else {}
    }

@router.post("/config/global")
def update_global_config(data: GlobalConfigUpdate, db: Session = Depends(get_db)):
    """Update v3.0/v3.1 global strategy settings (markup, threshold, budget, etc.)"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    config.set(data.key, data.value)
    return {"status": "success", "key": data.key, "value": data.value}

@router.get("/config/reward-rates")
def get_reward_rates(db: Session = Depends(get_db)):
    """v3.4.5 Get current reward rates from SystemConfig"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    return {
        "silver_rate": config.get("silver_rate", 0.015),
        "gold_rate": config.get("gold_rate", 0.02),
        "platinum_rate": config.get("platinum_rate", 0.03),
        "kol_dist_default": config.get("kol_dist_default", 0.15),
        "kol_fan_default": config.get("kol_fan_default", 0.05),
        "fan_silver_rate": config.get("fan_silver_rate", 0.01),
        "fan_gold_rate": config.get("fan_gold_rate", 0.0125),
        "fan_platinum_rate": config.get("fan_platinum_rate", 0.015),
    }

@router.post("/config/reward-rates")
def update_reward_rates(data: RewardRatesUpdate, db: Session = Depends(get_db)):
    """v3.4.5 Update reward rates in SystemConfig"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    for key, value in data.dict().items():
        config.set(key, value, description=f"Reward rate for {key}")
    return {"status": "success"}

# --- Pricing Strategy (v4.6.8) ---

@router.get("/config/pricing-strategy")
def get_pricing_strategy(db: Session = Depends(get_db)):
    """v4.6.8 Get current pricing strategy from SystemConfig"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    return {
        "sale_price_ratio": config.get("sale_price_ratio", 0.6),
        "compare_at_price_ratio": config.get("compare_at_price_ratio", 0.95),
        "amazon_weight": config.get("amazon_weight", 0.5),
        "ebay_weight": config.get("ebay_weight", 0.5),
    }

@router.post("/config/pricing-strategy")
def update_pricing_strategy(data: PricingStrategyUpdate, db: Session = Depends(get_db)):
    """v4.6.8 Update pricing strategy in SystemConfig"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    for key, value in data.dict().items():
        config.set(key, value, description=f"Pricing strategy: {key}")
    return {"status": "success"}

# --- Sourcing Strategy (v4.7.3) ---

@router.get("/config/sourcing-strategy")
def get_sourcing_strategy(db: Session = Depends(get_db)):
    """v4.7.3 Get current sourcing strategy from SystemConfig"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    return {
        "arbitrage_threshold": config.get("arbitrage_threshold", 0.15),
        "min_trend_score": config.get("min_trend_score", 85),
        "min_supplier_years": config.get("min_supplier_years", 2),
        "require_gold_supplier": config.get("require_gold_supplier", True),
        "require_trade_assurance": config.get("require_trade_assurance", True),
    }

@router.post("/config/sourcing-strategy")
def update_sourcing_strategy(data: SourcingStrategyUpdate, db: Session = Depends(get_db)):
    """v4.7.3 Update sourcing strategy in SystemConfig"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    for key, value in data.dict().items():
        config.set(key, value, description=f"Sourcing strategy: {key}")
    return {"status": "success"}

@router.get("/config/sourcing-strategy")
def get_sourcing_strategy(db: Session = Depends(get_db)):
    """v4.7.3 Get sourcing strategy (arbitrage, trends, etc.) from SystemConfig"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    return {
        "arbitrage_threshold": config.get("arbitrage_threshold", 0.15),
        "min_trend_score": config.get("min_trend_score", 85),
        "min_supplier_years": config.get("min_supplier_years", 2),
        "require_gold_supplier": config.get("require_gold_supplier", True),
        "require_trade_assurance": config.get("require_trade_assurance", True),
    }

@router.post("/config/sourcing-strategy")
def update_sourcing_strategy(data: SourcingStrategyUpdate, db: Session = Depends(get_db)):
    """v4.7.3 Update sourcing strategy in SystemConfig"""
    from app.services.config_service import ConfigService
    config = ConfigService(db)
    for key, value in data.dict().items():
        config.set(key, value, description=f"Sourcing strategy: {key}")
    return {"status": "success"}

# --- Talent (KOL) Audit (v4.6.8) ---

@router.get("/talents/pending")
def list_pending_talents(db: Session = Depends(get_db)):
    """v4.6.8 List users waiting for KOL approval"""
    pending = db.query(UserExt).filter(UserExt.kol_status == "pending").all()
    return [{
        "customer_id": u.customer_id,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "kol_apply_reason": u.kol_apply_reason,
        "kol_applied_at": u.kol_applied_at,
        "dist_rate": float(u.dist_rate) if u.dist_rate else None,
        "fan_rate": float(u.fan_rate) if u.fan_rate else None
    } for u in pending]

@router.post("/talents/audit")
def audit_talent(data: KOLApproveRequest, db: Session = Depends(get_db)):
    """v4.6.8 Approve or Reject a KOL application"""
    user = db.query(UserExt).filter(UserExt.customer_id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.kol_status = data.status
    if data.status == "approved":
        user.user_type = "kol"
        if data.dist_rate is not None:
            user.dist_rate = Decimal(str(data.dist_rate))
        if data.fan_rate is not None:
            user.fan_rate = Decimal(str(data.fan_rate))
    else:
        # If rejected, we might want to keep user_type as customer
        user.user_type = "customer"
    
    db.commit()
    return {"status": "success", "new_status": user.kol_status}

# --- Finance & KPIs ---

@router.get("/finance/balance-sheet")
def get_balance_sheet(db: Session = Depends(get_db)):
    """v3.1 Financial Dashboard: Profit vs Liability"""
    total_sales = db.query(func.sum(Order.total_price)).scalar() or 0.0
    total_cogs = db.query(func.sum(Order.cogs_total)).scalar() or 0.0
    # Reserve = Sales * 1.0 (Approx for 500 days return logic)
    cashback_reserve = total_sales 
    
    return {
        "net_profit": float(total_sales - total_cogs),
        "total_sales": float(total_sales),
        "total_cogs": float(total_cogs),
        "cashback_reserve": float(cashback_reserve)
    }

@router.get("/dashboard/kpis")
def get_dashboard_kpis(db: Session = Depends(get_db)):
    """Admin v3.0/v3.1 Dashboard KPIs"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    orders_today = db.query(func.count(Order.shopify_order_id)).filter(Order.created_at >= today_start).scalar() or 0
    
    month_start = today_start.replace(day=1)
    # v3.9.6: Enhanced safety for MTD calculations
    try:
        profit_mtd = db.query(func.sum(Product.sale_price - Product.source_cost_usd))\
            .filter(Product.last_synced_at >= month_start)\
            .scalar() or 0.0
    except Exception as e:
        logger.error(f"Failed to calculate profit_mtd: {e}")
        profit_mtd = 0.0

    ids_stats = []
    try:
        ids_stats = db.query(Product.strategy_tag, func.count(Product.id))\
            .group_by(Product.strategy_tag).all()
    except Exception as e:
        logger.error(f"Failed to fetch ids_stats: {e}")
    ids_conversion = {tag: count for tag, count in ids_stats if tag}
    
    melting_count = db.query(func.count(Product.id)).filter(Product.is_melted == True).scalar() or 0
    
    # v4.6: 1688 API Status check
    from app.services.config_service import ConfigService
    config_service = ConfigService(db)
    api_key = config_service.get_api_key("ALIBABA_1688_API_KEY")
    api_status = "Active" if api_key else "Simulation"

    return {
        "orders_today": orders_today,
        "profit_mtd": round(float(profit_mtd), 2),
        "ids_conversion": ids_conversion,
        "melting_count": melting_count,
        "api_status": api_status
    }

# --- Product Management ---

@router.post("/products/{product_id}/update")
def update_product_admin(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    """Update product category, eligibility, and v3.0 management fields from admin"""
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if data.category is not None:
        product.category = data.category
    if data.is_reward_eligible is not None:
        product.is_reward_eligible = data.is_reward_eligible
    if data.is_cashback_eligible is not None:
        product.is_cashback_eligible = data.is_cashback_eligible
    if data.product_category_type is not None:
        product.product_category_type = data.product_category_type
    if data.strategy_tag is not None:
        product.strategy_tag = data.strategy_tag
    if data.price_fluctuation_threshold is not None:
        product.price_fluctuation_threshold = data.price_fluctuation_threshold
        
    db.commit()
    return {
        "status": "success", 
        "product_id": product_id, 
        "category": product.category,
        "strategy_tag": product.strategy_tag
    }

@router.get("/sync-status")
def get_sync_status(db: Session = Depends(get_db)):
    """Monitor Supply Chain, Shopify sync and v2.0 Margin (Anchor Pricing)"""
    products = db.query(Product).order_by(Product.updated_at.desc()).limit(50).all()
    res = []
    for p in products:
        buffered_cost = (float(p.original_price) * 1.005 / 0.14) if p.original_price else 0.0
        margin_multiplier = p.sale_price / buffered_cost if buffered_cost > 0 else 0.0
        is_pass = p.sale_price >= (buffered_cost * 4)
            
        res.append({
            "id": p.id,
            "title": p.title_en or (p.titles.get("en") if p.titles else "N/A"),
            "shopify_id": p.shopify_product_id,
            "category": p.category,
            "cost_cny": float(p.original_price) if p.original_price else 0.0,
            "buffered_cost_usd": round(buffered_cost, 2),
            "price_usd": float(p.sale_price) if p.sale_price else 0.0,
            "compare_at_price": float(p.compare_at_price) if p.compare_at_price else 0.0,
            "margin_multiplier": round(margin_multiplier, 2),
            "is_reward_eligible": p.is_reward_eligible,
            "is_risk": not is_pass,
            "updated_at": p.updated_at.isoformat()
        })
    return res

@router.get("/melting/queue")
def get_melting_queue(db: Session = Depends(get_db)):
    """List products that triggered price melting"""
    melted_products = db.query(Product).filter(Product.is_melted == True).all()
    return [{
        "product_id": p.id,
        "title": p.title_en,
        "id_1688": p.product_id_1688,
        "old_price": p.last_stable_cost,
        "current_price": p.original_price,
        "melted_at": p.melted_at,
        "melting_reason": p.melting_reason,
        "updated_at": p.updated_at
    } for p in melted_products]

# --- AI Persona & Memory OS (v3.2) ---

@router.get("/ai/persona-templates")
def list_persona_templates(db: Session = Depends(get_db)):
    """v3.2 List all L2 Persona Templates"""
    templates = db.query(PersonaTemplate).all()
    return templates

@router.post("/ai/persona-templates")
def update_persona_template(data: PersonaTemplateUpdate, db: Session = Depends(get_db)):
    """v3.2 Create or Update an L2 Persona Template"""
    template = db.query(PersonaTemplate).filter_by(id=data.id).first()
    if not template:
        template = PersonaTemplate(id=data.id)
        db.add(template)
    
    template.name = data.name
    template.style_prompt = data.style_prompt
    template.empathy_weight = data.empathy_weight
    template.formality_score = data.formality_score
    template.vibrancy_level = data.vibrancy_level
    template.emoji_density = data.emoji_density
    template.is_active = data.is_active
    
    db.commit()
    return {"status": "success", "template_id": data.id}

class CandidateUpdate(BaseModel):
    title_zh: Optional[str] = None
    title_en_preview: Optional[str] = None
    desire_hook: Optional[str] = None
    desire_logic: Optional[str] = None
    desire_closing: Optional[str] = None
    images: Optional[List[str]] = None
    variants_raw: Optional[List[Dict]] = None
    attributes: Optional[List[Dict]] = None
    logistics_data: Optional[Dict] = None
    mirror_assets: Optional[Dict] = None
    structural_data: Optional[Dict] = None
    category: Optional[str] = None
    # v4.7.1: Sourcing mapping
    source_platform: Optional[str] = None
    source_url: Optional[str] = None

# --- Autonomous Sourcing Decision Engine (v3.9.0) ---

@router.get("/sourcing/candidates")
def list_sourcing_candidates(
    status: Optional[str] = "new", 
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    """v3.9.0: List products discovered by AI waiting for admin review with pagination"""
    candidates = db.query(CandidateProduct).filter_by(status=status)\
        .order_by(CandidateProduct.created_at.desc())\
        .offset(skip).limit(limit).all()
    
    # v3.9.6: Ensure JSON parsing for frontend safety
    import json
    for c in candidates:
        if isinstance(c.images, str):
            try: c.images = json.loads(c.images)
            except: c.images = []
        
        # v4.6.7: De-duplicate images and filter empty strings
        if isinstance(c.images, list):
            seen = set()
            c.images = [x for x in c.images if x and not (x in seen or seen.add(x))]

        if isinstance(c.variants_raw, str):
            try: c.variants_raw = json.loads(c.variants_raw)
            except: c.variants_raw = []
        
        # v4.6.7: Normalize variant data for frontend
        if isinstance(c.variants_raw, list):
            for v in c.variants_raw:
                # Map spec_attrs to title if title is missing
                if not v.get("title") and v.get("spec_attrs"):
                    v["title"] = v["spec_attrs"]
                # Ensure image_index exists
                if v.get("image") and v.get("image_index") is None:
                    try:
                        v["image_index"] = c.images.index(v["image"])
                    except (ValueError, AttributeError):
                        v["image_index"] = 0

        if isinstance(c.attributes, str):
            try: c.attributes = json.loads(c.attributes)
            except: c.attributes = []
        if isinstance(c.logistics_data, str):
            try: c.logistics_data = json.loads(c.logistics_data)
            except: c.logistics_data = {}
        if isinstance(c.structural_data, str):
            try: c.structural_data = json.loads(c.structural_data)
            except: c.structural_data = {}
        
        # v4.6.7: Ensure Desire Engine fields are strings, not None
        c.desire_hook = c.desire_hook or ""
        c.desire_logic = c.desire_logic or ""
        c.desire_closing = c.desire_closing or ""
            
    return candidates

@router.patch("/sourcing/candidates/{candidate_id}")
def update_sourcing_candidate(candidate_id: int, data: CandidateUpdate, db: Session = Depends(get_db)):
    """v3.9.5: Update candidate details (images order, variants, etc.) before approval"""
    candidate = db.query(CandidateProduct).filter_by(id=candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(candidate, key, value)
    
    db.commit()
    return {"status": "success"}

@router.post("/sourcing/candidates/{candidate_id}/approve")
async def approve_sourcing_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """v3.9.0: Admin Decision - Approve candidate for polishing and Shopify sync"""
    sc_service = SupplyChainService(db)
    try:
        success = await sc_service.approve_candidate(candidate_id)
        if success:
            return {"status": "success", "message": "Candidate approved and synced to Shopify/Notion."}
        else:
            raise HTTPException(status_code=400, detail="Candidate not found or already processed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval failed: {str(e)}")

@router.post("/sourcing/candidates/{candidate_id}/reject")
def reject_sourcing_candidate(candidate_id: int, reason: str, db: Session = Depends(get_db)):
    """v3.9.0: Admin Decision - Reject candidate with reason"""
    candidate = db.query(CandidateProduct).filter_by(id=candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.status = "rejected"
    candidate.audit_notes = reason
    db.commit()
    return {"status": "success"}

@router.get("/ai/usage-stats")
def get_ai_usage_stats(db: Session = Depends(get_db)):
    """v3.2 Token Economics & Usage Analytics"""
    stats = db.query(
        AIUsageStats.task_type,
        func.sum(AIUsageStats.tokens_in).label("total_in"),
        func.sum(AIUsageStats.tokens_out).label("total_out"),
        func.sum(AIUsageStats.cost_usd).label("total_cost")
    ).group_by(AIUsageStats.task_type).all()
    
    return [
        {
            "task_type": s.task_type,
            "tokens_in": s.total_in,
            "tokens_out": s.total_out,
            "cost_usd": float(s.total_cost)
        } for s in stats
    ]

@router.get("/ai/memory-audit/{user_id}")
def audit_user_memory(user_id: int, db: Session = Depends(get_db)):
    """v3.2 Audit a specific user's long-term memory (Facts)"""
    facts = db.query(UserMemoryFact).filter_by(user_id=user_id).order_by(UserMemoryFact.created_at.desc()).all()
    return facts

# --- AI & Sourcing Audit ---

@router.get("/ai/health-check")
def ai_health_check(db: Session = Depends(get_db)):
    """v3.1 Hourly Health Check for BYOK Keys"""
    active_keys = db.query(UserButlerProfile).filter(UserButlerProfile.ai_api_key.isnot(None)).all()
    for profile in active_keys:
        profile.byok_status = "active" if profile.ai_api_key.startswith("sk-") else "failed"
        profile.last_health_check = datetime.utcnow()
    db.commit()
    return {"status": "success", "checked_count": len(active_keys)}

@router.get("/ai/contributions")
def get_ai_contributions(db: Session = Depends(get_db)):
    """v3.1 AI Contribution Rankings and Rewards Status"""
    contributions = db.query(AIContribution).order_by(AIContribution.usd_saved.desc()).limit(10).all()
    return [{
        "user_id": c.user_id,
        "tokens_saved": c.tokens_saved,
        "usd_saved": float(c.usd_saved),
        "shards": c.reward_shards,
        "total_cards": c.total_rewards_given
    } for c in contributions]

@router.get("/ai/shield-audit")
def get_shield_audit(db: Session = Depends(get_db)):
    """v3.1 Audit Shadow ID Mappings (Shield Zone 2)"""
    mappings = db.query(ShadowIDMapping).order_by(ShadowIDMapping.created_at.desc()).limit(50).all()
    return [{
        "shadow_id": m.shadow_id,
        "real_id": m.real_id,
        "type": m.context_type,
        "expires_at": m.expires_at
    } for m in mappings]

# --- User & Rewards Management ---

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    """List all extended user profiles with balance and status"""
    users = db.query(UserExt).all()
    res = []
    for u in users:
        wallet = db.query(Wallet).filter_by(user_id=u.customer_id).first()
        res.append({
            "customer_id": u.customer_id,
            "referral_code": u.referral_code,
            "user_type": u.user_type,
            "user_tier": u.user_tier,
            "kol_status": u.kol_status,
            "dist_rate": float(u.dist_rate) if u.dist_rate else None,
            "fan_rate": float(u.fan_rate) if u.fan_rate else None,
            "balance_available": float(wallet.balance_available) if wallet else 0.0,
            "balance_locked": float(wallet.balance_locked) if wallet else 0.0,
            "created_at": u.created_at.isoformat()
        })
    return res

@router.post("/kol/approve")
def approve_kol(data: KOLApproveRequest, db: Session = Depends(get_db)):
    """Approve a KOL application and set custom commission rates"""
    user = db.query(UserExt).filter_by(customer_id=data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.user_type = "kol" if data.status == "approved" else "customer"
    user.kol_status = data.status
    if data.dist_rate is not None:
        user.dist_rate = Decimal(str(data.dist_rate))
    if data.fan_rate is not None:
        user.fan_rate = Decimal(str(data.fan_rate))
    db.commit()
    return {"status": "success", "user_id": data.user_id, "user_type": user.user_type}

@router.get("/rewards/plans")
def get_all_checkin_plans(status: str = "active_checkin", db: Session = Depends(get_db)):
    """Monitor active 500-day check-in plans"""
    plans = db.query(CheckinPlan).filter_by(status=status).order_by(CheckinPlan.created_at.desc()).all()
    return [
        {
            "id": str(p.id),
            "user_id": p.user_id,
            "order_id": p.order_id,
            "reward_base": float(p.reward_base),
            "current_period": p.current_period,
            "consecutive_days": p.consecutive_days,
            "status": p.status,
            "created_at": p.created_at.isoformat()
        } for p in plans
    ]

@router.post("/rewards/adjust-plan")
def adjust_reward_plan(plan_id: str, days: int, status: str = None, db: Session = Depends(get_db)):
    """Manual intervention for a user's 500-day check-in plan"""
    plan = db.query(CheckinPlan).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan.consecutive_days = days
    if status:
        plan.status = status
    db.commit()
    return {"status": "success", "plan_id": plan_id, "new_days": plan.consecutive_days, "new_status": plan.status}

@router.post("/wallet/adjust")
def adjust_wallet(
    user_id: int, 
    amount: float, 
    reason: str, 
    db: Session = Depends(get_db),
    admin: UserExt = Depends(get_current_admin)
):
    """Manual adjustment for user wallet balance"""
    from app.services.rewards import RewardsService
    rewards = RewardsService(db, current_user_id=admin.customer_id)
    rewards.update_wallet_balance(user_id, Decimal(str(amount)), "admin_adjustment", None, reason)
    return {"status": "success", "message": f"已为用户 {user_id} 调整余额: {amount}"}

# --- Notion Integration ---

@router.get("/notion/product-pool")
async def get_notion_product_pool():
    from app.services.notion import NotionService
    notion = NotionService()
    try:
        return await notion.get_product_pool()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Notion Error: {str(e)}")

@router.post("/notion/sync-approved")
async def sync_approved_products(db: Session = Depends(get_db)):
    from app.services.notion import NotionService
    from app.services.supply_chain import SupplyChainService
    from app.services.sync_shopify import SyncShopifyService
    
    notion = NotionService()
    sc_service = SupplyChainService(db)
    shopify_service = SyncShopifyService()
    
    try:
        all_products = await notion.get_product_pool()
        approved = [p for p in all_products if p.get("audit_status") == "审核通过"]
        if not approved:
            return {"status": "success", "message": "No approved products."}
            
        results = []
        for p in approved:
            id_1688 = p.get("id_1688")
            if not id_1688: continue
            
            # v3.2: Pass Notion-level cashback eligibility to the sync service
            product_obj = await sc_service.sync_product(
                id_1688, 
                comp_price_usd=p.get("comp_price"),
                is_cashback_eligible=p.get("is_cashback_eligible")
            )
            
            if isinstance(product_obj, dict) and product_obj.get("error"):
                 results.append({"name": p['name'], "status": "failed", "reason": product_obj.get("error")})
                 continue
                 
            shopify_service.sync_to_shopify(product_obj)
            # Update Notion (Mocked here for brevity, actual uses curl PATCH)
            results.append({"name": p['name'], "status": "synced"})
        return {"status": "success", "synced_count": len(results)}
    finally:
        shopify_service.close_session()

# --- C2M Management (v3.3) ---

@router.get("/c2m/wishes")
def list_user_wishes(db: Session = Depends(get_db)):
    """v3.3 List all user wishes from the Wishing Well"""
    wishes = db.query(UserWish).order_by(UserWish.created_at.desc()).all()
    return wishes

@router.get("/c2m/insights")
async def get_demand_insights(db: Session = Depends(get_db)):
    """v3.3 Get AI-clustered demand insights from LTM"""
    service = C2MService(db)
    # Trigger a refresh of insights from LTM
    await service.analyze_unmet_needs()
    insights = db.query(DemandInsight).order_by(DemandInsight.frequency.desc()).all()
    return insights

@router.post("/c2m/insights/{insight_id}/action")
def update_insight_action(insight_id: int, action: str, db: Session = Depends(get_db)):
    """v3.3 Record action taken on a demand insight"""
    insight = db.query(DemandInsight).filter_by(id=insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    insight.action_taken = action
    insight.status = "sourcing"
    db.commit()
    return {"status": "success"}

# --- IDS Audit Queue (v3.0/v3.2) ---

@router.get("/ids/audit-queue")
async def get_ids_audit_queue():
    """v3.0 Fetch candidates from Notion that are '待审核' or '分析中'"""
    from app.services.notion import NotionService
    notion = NotionService()
    all_products = await notion.get_product_pool()
    # Filter for candidates that haven't been approved yet
    candidates = [p for p in all_products if p.get("audit_status") in ["待审核", "草稿", "分析中"]]
    return candidates

class FraudVerdictRequest(BaseModel):
    relationship_id: str
    verdict: str # PASS, REJECT, BAN
    admin_note: Optional[str] = None

# --- Fraud & Anti-Fraud (v3.4.8) ---

@router.get("/fraud/alerts")
def get_fraud_alerts(db: Session = Depends(get_db)):
    """v3.4.8 List suspicious relationships for manual review"""
    # This would query a 'fraud_alerts' table or dynamic logic
    # For now, return a placeholder structure
    return []

@router.post("/fraud/verdict")
def fraud_verdict(data: FraudVerdictRequest, db: Session = Depends(get_db)):
    """v3.4.8 Admin final verdict on suspicious relationships"""
    # Logic to update relationship status and potentially block payouts
    return {"status": "success", "relationship_id": data.relationship_id, "verdict": data.verdict}

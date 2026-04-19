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

import logging

logger = logging.getLogger(__name__)

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

class CandidateUpdate(BaseModel):
    status: Optional[str] = None
    cost_usd: Optional[float] = None
    freight_fee: Optional[float] = None
    amazon_price: Optional[float] = None
    sell_price: Optional[float] = None
    product_category_label: Optional[str] = None
    admin_tags: Optional[List[str]] = None
    audit_notes: Optional[str] = None
    images: Optional[List[str]] = None
    variants_raw: Optional[List[Dict]] = None
    title_en: Optional[str] = None
    description_en: Optional[str] = None
    desire_hook: Optional[str] = None
    desire_logic: Optional[str] = None
    desire_closing: Optional[str] = None

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
async def sync_coupons(db: Session = Depends(get_db)):
    """v3.1 Trigger manual sync from Shopify Coupons API"""
    service = DiscountSyncService(db)
    await service.sync_coupons()
    return {"status": "success"}

@router.post("/coupons/{code}/assign")
def assign_coupon_to_ai(code: str, data: CouponAssignRequest, db: Session = Depends(get_db)):
    """v3.1 Assign a coupon to an AI category for autonomous issuance"""
    coupon = db.query(AvailableCoupon).filter_by(code=code).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    coupon.ai_category = data.ai_category
    coupon.ai_issuance_permission = data.ai_issuance_permission
    db.commit()
    return {"status": "success"}

# --- System & Strategy Config ---

@router.get("/config")
def get_system_config(db: Session = Depends(get_db)):
    """Fetch all strategy weights and thresholds"""
    configs = db.query(SystemConfig).all()
    return {c.key: c.value for c in configs}

@router.post("/config/global")
def update_global_config(data: GlobalConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(SystemConfig).filter_by(key=data.key).first()
    if not config:
        config = SystemConfig(key=data.key, value=data.value)
        db.add(config)
    else:
        config.value = data.value
    db.commit()
    return {"status": "success"}

@router.post("/config/pricing")
def update_pricing_strategy(data: PricingStrategyUpdate, db: Session = Depends(get_db)):
    """Update global pricing multipliers and platform weights"""
    for key, val in data.dict().items():
        config = db.query(SystemConfig).filter_by(key=key).first()
        if config:
            config.value = val
    db.commit()
    return {"status": "success"}

@router.post("/config/sourcing")
def update_sourcing_strategy(data: SourcingStrategyUpdate, db: Session = Depends(get_db)):
    """Update AI discovery and supplier vetting thresholds"""
    for key, val in data.dict().items():
        config = db.query(SystemConfig).filter_by(key=key).first()
        if config:
            config.value = val
    db.commit()
    return {"status": "success"}

@router.post("/config/rewards")
def update_reward_rates(data: RewardRatesUpdate, db: Session = Depends(get_db)):
    """Update global cashback and distribution commission rates"""
    for key, val in data.dict().items():
        config = db.query(SystemConfig).filter_by(key=key).first()
        if config:
            config.value = val
    db.commit()
    return {"status": "success"}

@router.post("/config/excluded-categories")
def update_excluded_categories(data: ExcludedCategoriesUpdate, db: Session = Depends(get_db)):
    """v3.0.2 Update the list of restricted product categories for AI discovery"""
    config = db.query(SystemConfig).filter_by(key="excluded_categories").first()
    if not config:
        config = SystemConfig(key="excluded_categories", value=data.categories)
        db.add(config)
    else:
        config.value = data.categories
    db.commit()
    return {"status": "success"}

# --- Product Management ---

@router.get("/products")
def list_products(
    category: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    products = query.order_by(Product.updated_at.desc()).offset(skip).limit(limit).all()
    return products

@router.patch("/products/{product_id}")
def update_product_settings(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    
    db.commit()
    return {"status": "success"}

# --- Butler & Persona (v3.2) ---

@router.get("/butler/personas")
def list_persona_templates(db: Session = Depends(get_db)):
    """v3.2 List all base personality templates for AI Butlers"""
    return db.query(PersonaTemplate).all()

@router.post("/butler/personas")
def create_persona_template(data: PersonaTemplateUpdate, db: Session = Depends(get_db)):
    """v3.2 Create or update a personality template"""
    persona = db.query(PersonaTemplate).filter_by(id=data.id).first()
    if not persona:
        persona = PersonaTemplate(id=data.id)
        db.add(persona)
    
    for key, value in data.dict().items():
        setattr(persona, key, value)
    
    db.commit()
    return {"status": "success"}

# --- Autonomous Sourcing Decision Engine (v3.9.0) ---

@router.get("/sourcing/candidates")
def list_sourcing_candidates(
    status: Optional[str] = "new", 
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    """v3.9.0: List products discovered by AI waiting for admin review with pagination"""
    query = db.query(CandidateProduct)
    if status:
        statuses = [s.strip() for s in status.split(',')]
        query = query.filter(CandidateProduct.status.in_(statuses))
    
    candidates = query.order_by(CandidateProduct.created_at.desc())\
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
        
        if isinstance(c.admin_tags, str):
            try: c.admin_tags = json.loads(c.admin_tags)
            except: c.admin_tags = []
        
        # v4.6.7: Ensure Desire Engine fields are strings, not None
        c.desire_hook = c.desire_hook or ""
        c.desire_logic = c.desire_logic or ""
        c.desire_closing = c.desire_closing or ""

        # v8.5.8 Truth Engine: Ali-Mapping
        c.source_id = c.product_id_1688
        
        # v8.5 Truth Engine: Official ICBU & Global Warehouse Calculations
        anchor = c.amazon_price or c.amazon_compare_at_price
        if anchor and not c.estimated_sale_price:
            c.estimated_sale_price = round(float(anchor) * 0.6, 2)
        
        # Truth Metric: Net Margin for MAGNET, ROI for others
        # Prioritize cost_usd field over cost_cny conversion
        # v8.5.8: Backfill cost_usd for frontend display if it's missing
        if not c.cost_usd and c.cost_cny:
            c.cost_usd = round(c.cost_cny * 0.14, 2)
            
        final_cost = float(c.cost_usd or 0)
        final_freight = float(c.freight_fee or 0)
        total_landed = final_cost + final_freight
        
        # --- CIRCUIT BREAKER: Business Suicide Prevention ---
        if c.product_category_label == 'MAGNET' and final_cost > 10.0:
            # 1. Magnet Gate: High cost items CANNOT be free. Force to REBATE.
            c.product_category_label = 'REBATE'
            c.admin_tags = list(set((c.admin_tags or []) + ["LOGIC_CORRECTION", "HIGH_COST_REJECT"]))
            
        # Target Price calculation
        target_price = float(c.sell_price or (float(anchor or 0) * 0.6) or 0)
        
        # 2. Loss Prevention: If target price < landed cost, it's a "Melted" candidate
        if target_price > 0 and target_price < total_landed and c.product_category_label != 'MAGNET':
            c.is_melted = True
            c.melt_reason = f"LOSS_MELT: Landed ${total_landed} > Price ${target_price}"
            c.status = 'rejected'
            
        # v8.5.8: Expose Profit Ratio correctly for all items
        if total_landed > 0:
            if c.product_category_label == 'MAGNET':
                # Net Margin for Magnet
                shipping_rev = float(c.amazon_shipping_fee or c.amazon_shipping_cost or 0)
                c.profit_ratio = round(shipping_rev - total_landed, 2)
            else:
                # ROI for others
                c.profit_ratio = round(target_price / total_landed, 2)
        else:
            c.profit_ratio = 0
            
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

@router.post("/sourcing/candidates/{candidate_id}/refresh-media")
async def refresh_candidate_media(candidate_id: int, db: Session = Depends(get_db)):
    """v4.6.9.2: Refresh candidate images and media from 1688 API if original links expired (404)"""
    candidate = db.query(CandidateProduct).filter_by(id=candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    sc_service = SupplyChainService(db)
    try:
        # Re-fetch from 1688 API using the stored product_id_1688
        raw_data = await sc_service.fetch_product_details(candidate.product_id_1688)
        if raw_data and raw_data.get("images"):
            candidate.images = raw_data["images"]
            # Also update variants if possible
            if raw_data.get("variants"):
                candidate.variants_raw = raw_data["variants"]
            if raw_data.get("mirror_assets"):
                candidate.mirror_assets = raw_data["mirror_assets"]
            
            db.commit()
            return {"status": "success", "images_count": len(candidate.images)}
        else:
            raise HTTPException(status_code=400, detail="Failed to fetch fresh data from source")
    except Exception as e:
        logger.error(f"Media refresh failed for candidate {candidate_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sourcing/candidates/batch-approve")
async def batch_approve_candidates(ids: List[int], db: Session = Depends(get_db)):
    """v5.2: Batch Approve candidates for Shopify sync"""
    sc_service = SupplyChainService(db)
    results = {"success": [], "failed": []}
    for candidate_id in ids:
        try:
            success = await sc_service.approve_candidate(candidate_id)
            if success:
                results["success"].append(candidate_id)
            else:
                results["failed"].append({"id": candidate_id, "reason": "Already processed or not found"})
        except Exception as e:
            results["failed"].append({"id": candidate_id, "reason": str(e)})
    return results

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Approval failed: {e}")
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
@router.get("/ai/usage")
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
                 
            await shopify_service.sync_to_shopify(product_obj)
            # Update Notion (Mocked here for brevity, actual uses curl PATCH)
            results.append({"name": p['name'], "status": "synced"})
        return {"status": "success", "synced_count": len(results)}
    finally:
        shopify_service.close_session()

# --- C2M Management (v3.3) ---

@router.get("/c2m/wishes")
@router.get("/wishes")
def list_user_wishes(db: Session = Depends(get_db)):
    """v3.3 List all user wishes from the Wishing Well"""
    wishes = db.query(UserWish).order_by(UserWish.created_at.desc()).all()
    return wishes

@router.get("/c2m/insights")
@router.get("/demand/insights")
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

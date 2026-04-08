import os
import httpx
from typing import List, Dict, Any, Optional
from langchain_core.tools import tool
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.product import Product
from app.services.shield_service import ShieldService

@tool
def trigger_wishing_well(user_id: int, description: str):
    """
    Triggers the 'Wishing Well' flow. Use this when the user asks for a product 
    we don't have, or describes a specific customization they want.
    
    Args:
        user_id: The ID of the current user.
        description: A clear description of what the user is looking for.
    """
    import asyncio
    db = SessionLocal()
    try:
        from app.services.c2m_service import C2MService
        c2m = C2MService(db)
        wish = asyncio.run(c2m.add_user_wish(user_id, description))
        return {
            "status": "success",
            "message": f"Wish recorded! ID: {wish.id}. You will be notified when we find a source.",
            "wish_id": wish.id
        }
    finally:
        db.close()

@tool
def product_search(query: str):
    """Search for products in the 0buck store by name or category."""
    db = SessionLocal()
    try:
        shield = ShieldService(db)
        
        products = db.query(Product).filter(
             (Product.title_en.ilike(f"%{query}%")) | 
             (Product.category.ilike(f"%{query}%"))
         ).limit(5).all()
        
        if not products:
            return {"status": "info", "message": f"未找到与 '{query}' 相关的产品。"}
            
        results = []
        for p in products:
            shadow_id = shield.get_shadow_id(p.product_id_1688, "product")
            results.append({
                "shadow_id": shadow_id,
                "title": p.title_en,
                "price": float(p.sale_price),
                "category": p.category
            })
        return results
    except Exception as e:
        print(f"❌ Product search failed: {e}")
        return {"status": "error", "message": "暂时无法搜索产品，请稍后再试。"}
    finally:
        db.close()

async def _web_search_func(query: str) -> List[Dict[str, Any]]:
    """
    Search the web using Exa to find trending products, market prices, or supplier information.
    Supports key rotation if multiple keys are provided in settings.EXA_API_KEY (comma-separated).
    """
    if not settings.EXA_API_KEY or settings.EXA_API_KEY == "your-exa-api-key":
        print("⚠️ EXA_API_KEY is missing or invalid. Falling back to mock results.")
        return [{"title": "Market Price Placeholder", "text": "Price on Amazon: $100.00. List Price: $120.00", "url": "https://amazon.com"}]

    # v5.6.6: Multi-Key Rotation & Service Key Support
    # Note: Service Key (Admin API) allows programmatic key generation: https://admin-api.exa.ai
    keys = [k.strip() for k in settings.EXA_API_KEY.split(",") if k.strip()]
    if not keys:
        return [{"error": "No valid EXA API keys found."}]
    
    # Simple rotation using time or random (here we use random for simplicity across parallel requests)
    import random
    active_key = random.choice(keys)
    
    print(f"DEBUG: Using EXA_API_KEY: {active_key[:5]}...{active_key[-5:]}")

    url = "https://api.exa.ai/search"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "x-api-key": active_key
    }
    payload = {
        "query": query,
        "numResults": 5
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            # If 401/429 on one key, we could retry with another, but for now simple choice
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except Exception as e:
            print(f"DEBUG EXA ERROR: {e}")
            return [{"error": str(e)}]

web_search = tool(_web_search_func)

@tool
async def supply_library_search(query: str) -> List[Dict[str, Any]]:
    """
    Search for products directly in the global supply library. 
    Returns a list of potential products with their internal IDs and prices.
    Best for sourcing new items.
    """
    # This is a placeholder for actual sourcing API
    # In a real scenario, this would call ElimAPI or similar.
    # For now, we return mock data that matches the expected schema.
    return [
        {
            "id": f"SRC_{i}",
            "title": f"Library Product {i} for {query}",
            "price_cny": 50.0 + i * 10,
            "url": f"https://detail.0buck.com/offer/{123456 + i}.html",
            "image": "https://cdn.0buck.com/assets/placeholder.png"
        } for i in range(1, 4)
    ]

from app.models.butler import UserButlerProfile
from app.models.ledger import AvailableCoupon, CouponIssuanceAudit, SystemConfig
import hashlib
import time

@tool
def update_butler_settings(user_id: int, butler_name: Optional[str] = None, persona_id: Optional[str] = None):
    """
    Update the user's AI Butler settings, such as its name or active persona.
    
    Args:
        user_id: The ID of the current user.
        butler_name: (Optional) A new name for the AI Butler.
        persona_id: (Optional) The ID of the persona template to switch to (e.g., 'cute_loli', 'rigorous_expert').
    """
    db = SessionLocal()
    try:
        profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
        if not profile:
            profile = UserButlerProfile(user_id=user_id)
            db.add(profile)
        
        if butler_name:
            profile.butler_name = butler_name
        if persona_id:
            profile.active_persona_id = persona_id
            
        db.commit()
        return {"status": "success", "butler_name": profile.butler_name, "active_persona": profile.active_persona_id}
    finally:
        db.close()

@tool
def search_coupons(user_id: int, category: str, reason: str, min_spend: float = 0.0):
    """
    Search and LOG THE INTENT to issue available discount coupons.
    Use this when the user is unhappy, needs an incentive to buy, or for logistics recovery.
    
    Args:
        user_id: The ID of the current user.
        category: The AI category to search for ('SERVICE_RECOVERY', 'UPSELL', 'ABANDONED_CART').
        reason: The specific reason for granting the coupon (e.g. 'Apology for late delivery').
        min_spend: The current subtotal of the user's cart to filter by minimum requirement.
    """
    db = SessionLocal()
    try:
        # v3.1: Check Daily Budget
        budget_config = db.query(SystemConfig).filter_by(key="AI_COUPON_DAILY_BUDGET").first()
        daily_budget = float(budget_config.value) if budget_config else 50.0
        
        coupons = db.query(AvailableCoupon).filter(
            AvailableCoupon.ai_category == category,
            AvailableCoupon.is_active == True,
            AvailableCoupon.min_requirement <= min_spend
        ).all()
        
        results = []
        for c in coupons:
            # v3.2 Dispute Defense: Record the fingerprint
            fingerprint_str = f"{user_id}:{c.code}:{time.time()}"
            fingerprint = hashlib.sha256(fingerprint_str.encode()).hexdigest()[:16]
            
            audit = CouponIssuanceAudit(
                user_id=user_id,
                coupon_code=c.code,
                reason=reason,
                ai_category=category,
                fingerprint=fingerprint
            )
            db.add(audit)
            
            results.append({
                "code": c.code,
                "type": c.type,
                "value": c.value,
                "min_requirement": c.min_requirement,
                "permission": c.ai_issuance_permission,
                "fingerprint_id": fingerprint, # Return this to LLM to mention in chat if needed
                "expires_at": c.expires_at.isoformat() if c.expires_at else None
            })
        
        db.commit()
        return results
    finally:
        db.close()

@tool
def get_order_status(user_id: int, order_id: str) -> Dict[str, Any]:
    """
    Retrieve the current status of a Shopify order and its fulfillment status.
    
    Args:
        user_id: The ID of the current user (Verified by System).
        order_id: The Shopify Order ID or Order Number.
    """
    db = SessionLocal()
    try:
        from app.models.ledger import Order
        # STRICT v3.5.0: Check if order belongs to the user
        order = db.query(Order).filter(
            (Order.shopify_order_id == order_id) | (Order.order_number == order_id),
            Order.user_id == user_id
        ).first()
        
        if not order:
            return {"error": "Order not found or access denied. You can only check your own orders."}
            
        return {
            "order_id": order_id,
            "status": order.status or "processing",
            "tracking_number": order.tracking_number or "Pending",
            "carrier": order.carrier or "Standard",
            "estimated_delivery": order.delivered_at.isoformat() if order.delivered_at else "Calculating...",
            "items": [{"title": "Items in Order", "quantity": 1}] # Simplified
        }
    finally:
        db.close()

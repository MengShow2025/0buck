from typing import Any, Dict, List, Optional
import random
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.butler import UserButlerProfile
from app.models.ledger import CheckinPlan
from app.models.product import Product
from app.models.rewards import Points


class ButlerOpsService:
    def __init__(self, db: Session):
        self.db = db

    def search_supply_library(self, query: str, user_country: str = "US", preferred_currency: str = "USD", limit: int = 10) -> List[Dict[str, Any]]:
        products = (
            self.db.query(Product)
            .filter(or_(Product.title_en.ilike(f"%{query}%"), Product.title_zh.ilike(f"%{query}%")))
            .limit(limit)
            .all()
        )

        exchange_rates = {
            "USD": 1.0,
            "CNY": 7.2,
            "EUR": 0.92,
            "GBP": 0.79,
            "CAD": 1.36,
            "AUD": 1.52,
        }
        rate = exchange_rates.get(preferred_currency, 1.0)
        markup = 1.05 if user_country != "US" else 1.0

        results: List[Dict[str, Any]] = []
        for p in products:
            base_price_usd = p.sale_price or 0.0
            local_price = base_price_usd * rate * markup
            results.append(
                {
                    "product_id": p.id,
                    "title": p.title_en or p.title_zh,
                    "original_price_cny": p.original_price,
                    "sale_price_usd": base_price_usd,
                    "local_price": round(local_price, 2),
                    "currency": preferred_currency,
                    "country": user_country,
                    "images": p.images,
                    "url": f"/product/{p.shopify_product_id}" if p.shopify_product_id else None,
                }
            )
        return results

    def get_order_status(self, user_id: int, order_id: int) -> Dict[str, Any]:
        statuses = ["processing", "shipped", "delivered", "refunded"]
        status = random.choice(statuses)
        return {
            "user_id": user_id,
            "order_id": order_id,
            "status": status,
            "tracking_number": f"TRK{random.randint(10000000, 99999999)}" if status == "shipped" else None,
            "carrier": "FedEx" if status == "shipped" else None,
            "estimated_delivery": "2026-04-10" if status == "shipped" else None,
            "source": "Shopify (Mocked)",
        }

    def update_account_settings(self, user_id: int, data: Dict[str, Any]) -> bool:
        profile = self.db.query(UserButlerProfile).filter(UserButlerProfile.user_id == user_id).first()
        if not profile:
            profile = UserButlerProfile(user_id=user_id)
            self.db.add(profile)

        if "butler_name" in data:
            profile.butler_name = data["butler_name"]
        if "user_nickname" in data:
            profile.user_nickname = data["user_nickname"]
        if "preferred_currency" in data:
            profile.preferred_currency = data["preferred_currency"]
        if "personality" in data:
            if isinstance(profile.personality, dict) and isinstance(data["personality"], dict):
                merged = dict(profile.personality)
                merged.update(data["personality"])
                profile.personality = merged
            else:
                profile.personality = data["personality"]
        if "vibe" in data:
            profile.current_vibe = data["vibe"]

        self.db.commit()
        return True

    def get_reward_status(self, user_id: int) -> Dict[str, Any]:
        points_entry = self.db.query(Points).filter(Points.user_id == user_id).first()
        balance = points_entry.balance if points_entry else 0

        plan = (
            self.db.query(CheckinPlan)
            .filter(CheckinPlan.user_id == user_id, CheckinPlan.status.in_(["active_checkin", "active_groupbuy", "pending_choice"]))
            .first()
        )

        masked_roadmap: List[Dict[str, Any]] = []
        if plan and plan.plan_config:
            current_p = plan.current_period or 1
            for p in plan.plan_config:
                is_revealed = p["period"] <= current_p
                masked_roadmap.append(
                    {
                        "id": p["period"],
                        "days": p["days"] if is_revealed else "?",
                        "reward": f"{p['reward']}%" if is_revealed else "?",
                    }
                )

        profile = self.db.query(UserButlerProfile).filter(UserButlerProfile.user_id == user_id).first()
        
        return {
            "user_id": user_id,
            "butler_name": profile.butler_name if profile else None,
            "user_nickname": profile.user_nickname if profile else None,
            "ui_settings": (profile.personality or {}).get("ui_settings", {}) if profile else {},
            "points_balance": balance,
            "checkin_phase": plan.current_period if plan else 1,
            "consecutive_days": plan.consecutive_days if plan else 0,
            "plan_status": plan.status if plan else "no_active_plan",
            "total_earned": float(plan.total_earned) if plan and plan.total_earned else 0.0,
            "roadmap": masked_roadmap,
        }


async def butler_tools_dispatcher(tool_name: str, user_id: int, args: Dict[str, Any], db: Session) -> Any:
    ops = ButlerOpsService(db)

    if tool_name == "search_supply_library":
        return ops.search_supply_library(
            query=args.get("query", ""),
            user_country=args.get("user_country", "US"),
            preferred_currency=args.get("preferred_currency", "USD"),
            limit=int(args.get("limit", 10)),
        )

    if tool_name == "get_order_status":
        return ops.get_order_status(user_id=user_id, order_id=int(args.get("order_id", 0)))

    if tool_name == "update_account_settings":
        ok = ops.update_account_settings(user_id=user_id, data=args)
        return {"success": ok}

    if tool_name == "get_reward_status":
        return ops.get_reward_status(user_id=user_id)

    return {"error": f"Tool '{tool_name}' not recognized."}

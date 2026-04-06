from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.c2m import UserWish, DemandInsight, OrderCustomization
from app.models.butler import UserMemoryFact
from app.models.ledger import SystemConfig
from app.services.supply_chain import SupplyChainService
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)

class C2MService:
    def __init__(self, db: Session):
        self.db = db
        self.sc_service = SupplyChainService(db)

    async def add_user_wish(self, user_id: int, description: str, image_url: str = None) -> UserWish:
        """
        v3.3.1 Wishing Well: Add a user's wish with configurable 'Founding Team' window.
        """
        # Check if C2M is globally enabled
        is_enabled = self.db.query(SystemConfig).filter_by(key="C2M_ENABLED").first()
        if is_enabled and not is_enabled.value:
            raise Exception("C2M Wishing Well is currently disabled by administrator.")

        # Get configurable expiry (default 48h)
        expiry_config = self.db.query(SystemConfig).filter_by(key="C2M_WISH_EXPIRY_HOURS").first()
        expiry_hours = int(expiry_config.value) if expiry_config else 48

        wish = UserWish(
            user_id=user_id,
            description=description,
            image_url=image_url,
            expiry_at=datetime.utcnow() + timedelta(hours=expiry_hours),
            voters=json.dumps([user_id])
        )
        self.db.add(wish)
        self.db.commit()
        self.db.refresh(wish)
        return wish

    async def vote_for_wish(self, user_id: int, wish_id: int) -> Dict[str, Any]:
        """
        v3.3.1 Socialized Wishing Well: Vote/Support a wish.
        """
        wish = self.db.query(UserWish).filter_by(id=wish_id).with_for_update().first()
        if not wish:
            return {"status": "error", "message": "Wish not found"}
            
        voters = json.loads(wish.voters or "[]")
        if user_id in voters:
            return {"status": "error", "message": "Already voted"}
            
        voters.append(user_id)
        wish.voters = json.dumps(voters)
        wish.vote_count = len(voters)
        
        # Get configurable threshold (default 10)
        threshold_config = self.db.query(SystemConfig).filter_by(key="C2M_VOTE_THRESHOLD").first()
        threshold = int(threshold_config.value) if threshold_config else 10

        # Check for 'Founding Team' threshold
        if wish.vote_count >= threshold and datetime.utcnow() < wish.expiry_at:
            wish.status = "pre_order" # Trigger icebreaker price mode
            
        self.db.commit()
        return {"status": "success", "vote_count": wish.vote_count}

    async def analyze_unmet_needs(self) -> List[DemandInsight]:
        """
        v3.3.1 Proactive Sourcing: Scans LTM for unmet needs AND pain points.
        """
        # 1. Fetch recent facts related to needs/pain points
        facts = self.db.query(UserMemoryFact).filter(
            UserMemoryFact.key.in_(["missing_feature", "desired_product", "pain_point", "complaint"])
        ).all()
        
        insights_map = {}
        for fact in facts:
            # Simplified grouping
            val = fact.value
            is_pain = fact.key in ["pain_point", "complaint"]
            
            key = val[:100].lower() if isinstance(val, str) else str(val)
            if key not in insights_map:
                insights_map[key] = {
                    "unmet_need": val,
                    "frequency": 0,
                    "users": [],
                    "is_pain_point": is_pain
                }
            insights_map[key]["frequency"] += 1
            if fact.user_id not in insights_map[key]["users"]:
                insights_map[key]["users"].append(fact.user_id)
        
        new_insights = []
        for key, data in insights_map.items():
            existing = self.db.query(DemandInsight).filter_by(unmet_need=data["unmet_need"]).first()
            if existing:
                existing.frequency = data["frequency"]
                existing.sample_users = json.dumps(data["users"])
                existing.is_pain_point = data["is_pain_point"]
                # v3.3.1: Accumulate sentiment or keep lowest (most painful)
                existing.last_detected_at = func.now()
            else:
                insight = DemandInsight(
                    unmet_need=data["unmet_need"],
                    frequency=data["frequency"],
                    sample_users=json.dumps(data["users"]),
                    is_pain_point=data["is_pain_point"],
                    status="new"
                )
                self.db.add(insight)
                new_insights.append(insight)
        
        self.db.commit()
        return new_insights

    async def notify_wish_fulfilled(self, wish_id: int):
        """
        v3.3.1 AI Fulfillment Notification: Notify users when their wish is live.
        """
        wish = self.db.query(UserWish).get(wish_id)
        if not wish or wish.status != "found": return
        
        voters = json.loads(wish.voters or "[]")
        for uid in voters:
            # In production, this would trigger a WhatsApp or Push notification
            print(f"  📣 [AI ECHO] Notifying User {uid}: Your wish '{wish.description[:20]}...' is now LIVE with exclusive pricing!")
            # Logic to mark user as notified...

    async def find_similar_wishes(self, description: str) -> List[Dict[str, Any]]:
        """
        v3.3.1 AI Guidance: Find similar wishes to trigger 'Socialized' response.
        """
        # Simple text matching for now, could be upgraded to vector search
        desc_words = description.lower().split()
        all_wishes = self.db.query(UserWish).filter(UserWish.status != "found").all()
        
        similar = []
        for w in all_wishes:
            count = 0
            w_desc = w.description.lower()
            for word in desc_words:
                if len(word) > 3 and word in w_desc:
                    count += 1
            
            if count >= 2: # At least 2 words match
                similar.append({
                    "id": w.id,
                    "description": w.description,
                    "vote_count": w.vote_count,
                    "voters": json.loads(w.voters or "[]")
                })
        
        return sorted(similar, key=lambda x: x["vote_count"], reverse=True)

    async def match_wish_to_source(self, wish_id: int):
        """
        v3.3 C2M: Uses SupplyChainService to find 1688 matches for a user wish.
        """
        wish = self.db.query(UserWish).filter_by(id=wish_id).with_for_update().first()
        if not wish: return
        
        wish.status = "matching"
        self.db.commit()
        
        match_id = "840389952720" # Mock 1688 ID
        
        # v3.9.0: Ingest to candidate pool instead of direct Notion
        await self.sc_service.ingest_to_candidate_pool({
            "name": f"[C2M_WISH] {wish.description[:50]}",
            "id_1688": match_id,
            "strategy_tag": "C2M_WISH",
            "cost_cny": 50.0, # Mock
            "comp_price": 400.0, # Mock
            "category": "C2M Custom",
            "supplier_id_1688": "sup_c2m_123",
            "discovery_evidence": {
                "wish_id": wish.id,
                "user_id": wish.user_id,
                "vote_count": wish.vote_count
            }
        })
        
        wish.status = "found"
        wish.matching_notes = f"Matched with 1688 ID: {match_id}. Created in Notion for audit."
        self.db.commit()
        
        # Trigger AI Echo
        await self.notify_wish_fulfilled(wish_id)

    def add_customization(self, order_id: int, line_item_id: int, text: str = None) -> OrderCustomization:
        """
        v3.3 Micro-Customization: Add custom text to an order item.
        """
        cust = OrderCustomization(
            order_id=order_id,
            line_item_id=line_item_id,
            custom_text=text
        )
        self.db.add(cust)
        self.db.commit()
        return cust

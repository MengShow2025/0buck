import logging
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.ledger import PriceWish, Order
from app.models.product import Product
from app.services.shopify_payment_service import ShopifyDraftOrderService
from app.services.social_automation import SocialAutomationService

logger = logging.getLogger(__name__)

class SmartBusinessService:
    """
    v3.7.0: Smart Business Engine.
    Implements Price Radar and Churn Prevention logic.
    """
    def __init__(self, db: Session):
        self.db = db

    async def scan_price_wishes(self):
        """
        Logic 1.1: Price Radar (Hunting Mode).
        Scans active wishes and compares with real-time 1688 cost.
        """
        wishes = self.db.query(PriceWish).filter_by(status="active").all()
        payment_service = ShopifyDraftOrderService()
        social_service = SocialAutomationService(self.db)

        for wish in wishes:
            product = self.db.query(Product).filter_by(id=wish.product_id).first()
            if not product: continue

            # Calculate if wish price is profitable
            # Profit = WishPrice - (1688_Cost * ExchangeRate * (1 + Buffer))
            cost_usd = Decimal(str(product.source_cost_usd or 0))
            if cost_usd == 0: continue

            min_profitable_price = cost_usd * Decimal("1.5") # Example: 50% gross margin min
            
            if wish.wish_price >= min_profitable_price:
                logger.info(f"🎯 Price Radar Hit! Wish {wish.id} for Product {product.id} is now profitable.")
                
                # 1. Create a special Draft Order for this wish
                order_res = payment_service.create_draft_order(
                    customer_id=wish.user_id,
                    items=[{"product_id": product.id, "quantity": 1}],
                    balance_to_use=Decimal("0.0"), # User can choose later
                    email=None # Will fetch from UserExt in real flow
                )

                if order_res["status"] == "success":
                    # 2. Notify User via AI
                    await social_service.notify_abandoned_draft(wish.user_id, order_res["invoice_url"])
                    
                    # 3. Mark wish as fulfilled
                    wish.status = "fulfilled"
                    wish.notified_at = datetime.utcnow()
        
        self.db.commit()

    async def scan_churn_risk(self):
        """
        Logic 1.2: Churn Prevention (断签保险).
        Finds users who haven't checked in for 4 days.
        """
        from app.models.ledger import CheckinPlan
        from datetime import date, timedelta
        
        # In a real v3.7, we'd calculate 'days since last_checkin'
        # For prototype, we find plans where consecutive_days is high but not completed
        risky_plans = self.db.query(CheckinPlan).filter(
            CheckinPlan.status == "active_checkin",
            CheckinPlan.consecutive_days >= 4
        ).all()

        social_service = SocialAutomationService(self.db)
        for plan in risky_plans:
            # Trigger Dumbo AI Nudge
            msg = f"🆘 Emergency! Your 500-day cashback for Order {plan.order_id} is at risk. Only 24h left to save your accumulated rewards! Sign in NOW to protect your stash."
            # In real flow, send to Stream Concierge
            logger.warning(f"CHURN ALERT: {msg}")
            # await social_service.send_nudge(plan.user_id, msg)

    async def scan_abandoned_drafts(self):
        """
        Logic 1.3: Abandoned Draft Recovery (弃单挽回).
        Finds Draft Orders created > 1 hour ago that are still open.
        """
        import shopify
        payment_service = ShopifyDraftOrderService()
        social_service = SocialAutomationService(self.db)
        
        try:
            # Fetch open draft orders
            drafts = shopify.DraftOrder.find(status="open")
            now_utc = datetime.utcnow()
            
            for draft in drafts:
                created_at = datetime.fromisoformat(draft.created_at.replace("Z", "+00:00")).replace(tzinfo=None)
                # If created > 1 hour ago AND not already notified (using note_attributes as a flag)
                notified = any(attr.name == "nudge_sent" for attr in draft.note_attributes)
                
                if (now_utc - created_at) > timedelta(hours=1) and not notified:
                    user_id_attr = next((attr.value for attr in draft.note_attributes if attr.name == "0buck_user_id"), None)
                    if user_id_attr:
                        logger.info(f"🕒 Abandoned Draft Detected: {draft.id}. Triggering AI Nudge.")
                        await social_service.notify_abandoned_draft(int(user_id_attr), draft.invoice_url)
                        
                        # Mark as nudged in Shopify
                        new_attrs = draft.note_attributes
                        new_attrs.append({"name": "nudge_sent", "value": "true"})
                        draft.note_attributes = new_attrs
                        draft.save()
        finally:
            payment_service.close()

    async def scan_sourcing_candidates(self):
        """
        Logic 1.4: Autonomous Sourcing (选品嗅探).
        v4.7.3:IDS Sniffing + Alibaba Arbitrage Sniff.
        """
        from app.services.supply_chain import SupplyChainService
        from app.models.product import CandidateProduct
        
        logger.info("🕵️ Triggering IDS Sniffing & Spy Monitor...")
        sc_service = SupplyChainService(self.db)
        try:
            # 1. IDS Search (Followers/Market Trend)
            new_count = await sc_service.ids_sniffing_and_populate()
            logger.info(f"🆕 Ingested {new_count} new candidates from IDS.")
            
            # 2. v4.7.3 Alibaba Arbitrage Sniff for all pending candidates
            pending_candidates = self.db.query(CandidateProduct).filter(
                CandidateProduct.status == "pending",
                CandidateProduct.alibaba_comparison_price == None
            ).all()
            
            logger.info(f"🔎 Starting Alibaba sniff for {len(pending_candidates)} pending candidates...")
            for candidate in pending_candidates:
                try:
                    await sc_service.find_alibaba_alternative(candidate.id)
                except Exception as e:
                    logger.error(f"Failed Alibaba sniff for Candidate {candidate.id}: {e}")
            
            self.db.commit()
        except Exception as e:
            logger.error(f"Error during sourcing scan: {e}")

    async def scan_all(self):
        """Triggered every 6 hours by the Smart Scanner."""
        logger.info("🚀 Starting 6-hour Smart Business Scan...")
        await self.scan_price_wishes()
        await self.scan_churn_risk()
        await self.scan_abandoned_drafts()
        await self.scan_sourcing_candidates()
        logger.info("✅ 6-hour Smart Business Scan complete.")

    def add_price_wish(self, user_id: int, product_id: int, wish_price: float):
        """API Entry for User to hunting a price"""
        new_wish = PriceWish(
            user_id=user_id,
            product_id=product_id,
            wish_price=Decimal(str(wish_price))
        )
        self.db.add(new_wish)
        self.db.commit()
        return {"status": "success", "message": "Hunting mode activated. We will notify you when price hits target."}

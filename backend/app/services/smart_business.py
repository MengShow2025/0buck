import logging
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.ledger import PriceWish, Order
from app.models.product import Product
from app.services.shopify_payment_service import ShopifyDraftOrderService
from app.services.social_automation import SocialAutomationService
from app.services.cj_service import CJDropshippingService

logger = logging.getLogger(__name__)

class SmartBusinessService:
    """
    v3.7.0: Smart Business Engine.
    Implements Price Radar and Churn Prevention logic.
    """
    def __init__(self, db: Session):
        self.db = db

    async def scan_cj_price_and_inventory(self, batch_size: int = 20):
        """
        v7.0 Truth Engine: Monitoring Radar (Batch Parallel Mode).
        Scans active products on CJ to detect Price Spikes or Stock Outs.
        """
        active_products = self.db.query(Product).filter(
            Product.is_melted == False,
            Product.cj_pid.isnot(None)
        ).all()
        
        cj_service = CJDropshippingService()
        melted_count = 0
        
        # Parallel scanning in batches to respect CJ API rate limits
        for i in range(0, len(active_products), batch_size):
            batch = active_products[i:i + batch_size]
            tasks = [self._scan_single_cj_product(product, cj_service) for product in batch]
            results = await asyncio.gather(*tasks)
            melted_count += sum(results)
            
            # Small delay between batches to avoid 429
            await asyncio.sleep(2.0)
        
        self.db.commit()
        return melted_count

    async def _scan_single_cj_product(self, product, cj_service):
        """Helper for parallel CJ scanning."""
        try:
            cj_detail = await cj_service.get_product_detail(product.cj_pid)
            if not cj_detail:
                logger.warning(f"⚠️ CJ PID {product.cj_pid} not found. Pausing product {product.id}.")
                product.is_melted = True
                product.melt_reason = "Sourcing Lost: CJ PID Not Found"
                return 1
            
            variants = cj_detail.get("variants", [])
            total_stock = sum([int(v.get("variantInventory", 0)) for v in variants])
            
            current_min_price = 0.0
            if variants:
                current_min_price = min([float(v.get("variantSellPrice", 0.0)) for v in variants])
            
            old_cost = float(product.source_cost_usd or 0.0)
            
            is_out_of_stock = total_stock < 50
            is_price_spike = False
            if old_cost > 0 and current_min_price > 0:
                price_increase = (current_min_price - old_cost) / old_cost
                if price_increase > 0.15:
                    is_price_spike = True
            
            if is_out_of_stock or is_price_spike:
                product.is_melted = True
                product.melt_reason = f"{'Stock Out' if is_out_of_stock else 'Price Spike'}: Inv={total_stock}, Price=${current_min_price}"
                logger.error(f"❄️ MELTING Product {product.id}: {product.melt_reason}")
                return 1
            else:
                if current_min_price > 0:
                    product.source_cost_usd = current_min_price
                return 0
                        
        except Exception as e:
            logger.error(f"❌ Error scanning CJ for Product {product.id}: {e}")
            return 0

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
            # 1. IDS Search (Followers/Market Trend) - v5.4: Reduced priority for trend
            # await sc_service.ids_sniffing_and_populate()
            
            # 2. v5.4: Brute-force ROI Comparison Scan (The "Violence" Strategy)
            new_count = await sc_service.brute_force_roi_scan(page_count=1)
            logger.info(f"🆕 Ingested {new_count} candidates from Brute-force ROI Scan.")
            
            # 3. v4.7.3 Alibaba Arbitrage Sniff for all pending candidates
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

    async def scan_cj_price_and_inventory(self):
        """
        Logic 1.5: CJ Price & Inventory Monitor (v7.0 Truth Engine).
        Checks all active CJ products for price hikes or stock-outs.
        Implements Automatic Melting (Circuit Breaker).
        """
        from app.services.cj_service import CJDropshippingService
        from app.services.sync_shopify import SyncShopifyService
        
        products = self.db.query(Product).filter(
            Product.platform_tag == 'CJ',
            Product.is_melted == False
        ).all()
        
        cj_service = CJDropshippingService()
        sync_service = SyncShopifyService(self.db)
        
        logger.info(f"🕵️ Monitoring {len(products)} active CJ products...")
        
        for product in products:
            try:
                # 1. Fetch current data from CJ
                cj_data = await cj_service.get_product_detail(product.cj_pid)
                if not cj_data:
                    logger.warning(f"⚠️ CJ PID {product.cj_pid} not found in CJ API. Skipping.")
                    continue
                
                # 2. Extract current price and inventory
                # Note: CJ returns sellPrice as string
                current_price = Decimal(cj_data.get("sellPrice", "0"))
                original_cost = Decimal(str(product.source_cost_usd or 0))
                
                # Sum up inventory from all variants
                variants = cj_data.get("variants", [])
                current_inventory = sum(int(v.get("inventoryNum") or 0) for v in variants)
                
                # 3. Circuit Breaker Logic
                melt_reason = None
                
                # A. Inventory Melting (Stock < 50)
                if current_inventory < 50:
                    melt_reason = f"Inventory low: {current_inventory}"
                
                # B. Price Melting (Price hike > 15%)
                elif original_cost > 0 and current_price > (original_cost * Decimal("1.15")):
                    melt_reason = f"Price hike: ${original_cost} -> ${current_price} (>15%)"
                
                if melt_reason:
                    logger.warning(f"🚨 MELTING Product {product.id} ({product.title_en}): {melt_reason}")
                    product.is_melted = True
                    product.melt_reason = melt_reason
                    self.db.add(product)
                    
                    # 4. Sync to Shopify (Status will become 'draft' in SyncShopifyService)
                    await sync_service.sync_to_shopify(product.id)
                else:
                    # Update local inventory/price if changed but not melted
                    if current_inventory != product.inventory_total:
                        product.inventory_total = current_inventory
                        self.db.add(product)
                        
            except Exception as e:
                logger.error(f"Failed monitoring for Product {product.id}: {e}")
        
        self.db.commit()

    async def scan_all(self):
        """Triggered every 6 hours by the Smart Scanner."""
        logger.info("🚀 Starting 6-hour Smart Business Scan...")
        await self.scan_price_wishes()
        await self.scan_churn_risk()
        await self.scan_abandoned_drafts()
        await self.scan_sourcing_candidates()
        # v7.0 Truth Engine Monitoring
        await self.scan_cj_price_and_inventory()
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

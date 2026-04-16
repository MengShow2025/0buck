import logging
import asyncio
from typing import List
from sqlalchemy.orm import Session
from app.models.product import Product
from app.services.cj_service import CJDropshippingService
from app.services.sync_shopify import ShopifySyncService

logger = logging.getLogger(__name__)

class MeltingService:
    """
    v7.1 Circuit Breaker & High-Frequency Radar.
    Monitors Price Spikes and Stock Outs.
    Automatically un-lists products on Shopify if melting conditions met.
    """
    def __init__(self, db: Session):
        self.db = db
        self.cj_service = CJDropshippingService()
        self.shopify_sync = ShopifySyncService()

    async def run_radar_scan(self, batch_size: int = 50, priority: int = None):
        """
        Scans products in batches.
        """
        query = self.db.query(Product).filter(Product.is_melted == False)
        if priority:
            query = query.filter(Product.scan_priority <= priority)
        
        products = query.all()
        logger.info(f"❄️ Melting Radar: Scanning {len(products)} active products...")
        
        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            tasks = [self._monitor_single_product(p) for p in batch]
            results = await asyncio.gather(*tasks)
            # Sync back to DB every batch
            self.db.commit()
            await asyncio.sleep(2.0) # Respect CJ API limits

    async def _monitor_single_product(self, product: Product) -> bool:
        """
        Check CJ for stock and price. Trigger melting if needed.
        """
        try:
            cj_detail = await self.cj_service.get_product_detail(product.cj_pid)
            if not cj_detail:
                return await self._melt_product(product, "CJ PID Lost")
            
            variants = cj_detail.get("variants", [])
            total_stock = sum([int(v.get("variantInventory", 0)) for v in variants])
            
            # Price Spike Detection
            current_min_price = 0.0
            if variants:
                current_min_price = min([float(v.get("variantSellPrice", 0.0)) for v in variants])
            
            old_cost = float(product.source_cost_usd or 0.0)
            
            # Thresholds
            is_out_of_stock = total_stock < 50
            is_price_spike = False
            if old_cost > 0 and current_min_price > 0:
                price_increase = (current_min_price - old_cost) / old_cost
                if price_increase > 0.15: # 15% threshold
                    is_price_spike = True
            
            if is_out_of_stock or is_price_spike:
                reason = f"{'Low Stock' if is_out_of_stock else 'Price Spike'}: Inv={total_stock}, Price=${current_min_price}"
                return await self._melt_product(product, reason)
            
            # Update last monitored timestamp
            product.last_synced_at = func.now()
            return False

        except Exception as e:
            logger.error(f"❌ Melting Monitor Error for {product.id}: {e}")
            return False

    async def _melt_product(self, product: Product, reason: str) -> bool:
        """
        Physical Melting: Set is_melted=True and UNPUBLISH on Shopify.
        """
        logger.error(f"❄️ MELTING Product {product.id}: {reason}")
        product.is_melted = True
        product.melt_reason = reason
        
        # Unpublish on Shopify
        if product.shopify_product_id:
            try:
                # We can update the status to 'archived' or 'draft' on Shopify
                # Using our ShopifySyncService helper if available
                self.shopify_sync.unpublish_product(product.shopify_product_id)
                logger.info(f"   ✅ Unlisted {product.id} from Shopify.")
            except Exception as se:
                logger.error(f"   ❌ Failed to unlist {product.id} from Shopify: {se}")
        
        return True

import asyncio
import json
import logging
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.db.session import SessionLocal
from app.models.product import Product
from app.services.sync_shopify import SyncShopifyService

logging.basicConfig(level=logging.INFO)

async def sync_vanguard():
    db = SessionLocal()
    service = SyncShopifyService()
    
    # Vanguard IDs
    vanguard_ids = [18, 114, 154]
    
    try:
        for pid in vanguard_ids:
            logging.info(f"Syncing Product {pid}...")
            p = db.query(Product).filter(Product.id == pid).first()
            if not p:
                logging.error(f"Product {pid} not found in DB")
                continue
            
            # Use our specific labels
            if pid == 18:
                p.amazon_price = 15.99
                p.sale_price = 0.0
                p.product_category_label = 'MAGNET'
            elif pid == 114:
                p.amazon_price = 12.99
                p.sale_price = 0.0
                p.product_category_label = 'MAGNET'
            elif pid == 154:
                p.amazon_price = 24.99
                p.sale_price = 14.99
                p.product_category_label = 'REBATE'
                
            p.status = 'approved'
            db.commit()
            
            success = await service.sync_to_shopify(p)
            if success:
                logging.info(f"✅ Successfully synced {p.title_en} (ID: {pid})")
            else:
                logging.error(f"❌ Failed to sync {p.title_en} (ID: {pid})")
                
    except Exception as e:
        logging.error(f"Error during sync: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(sync_vanguard())

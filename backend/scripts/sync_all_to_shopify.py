import os
import sys
import logging
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.product import Product
from app.services.sync_shopify import SyncShopifyService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def sync_all_products():
    db = SessionLocal()
    shopify_service = SyncShopifyService()
    
    try:
        # Get all active products that haven't been synced or need update
        products = db.query(Product).filter(Product.is_active == True).limit(2).all()
        
        logger.info(f"Found {len(products)} products to sync to Shopify for test run.")
        
        success_count = 0
        fail_count = 0
        
        for product in products:
            try:
                logger.info(f"Syncing product: {product.titles.get('en', 'No Title')} (1688 ID: {product.product_id_1688})")
                
                # Use titles['en'] for title_en if it's missing but JSON titles exists
                if not product.title_en and product.titles and 'en' in product.titles:
                    product.title_en = product.titles['en']
                
                # Use descriptions['en'] for description_en
                if not product.description_en and product.descriptions and 'en' in product.descriptions:
                    product.description_en = product.descriptions['en']
                
                sp = shopify_service.sync_to_shopify(product)
                
                if sp:
                    product.last_synced_at = datetime.now()
                    # shopify_product_id and shopify_variant_id are updated inside sync_to_shopify 
                    # but we ensure they are committed to DB here
                    db.commit()
                    success_count += 1
                    logger.info(f"  ✅ Successfully synced: {sp.id}")
                else:
                    fail_count += 1
                    logger.error(f"  ❌ Failed to sync: {product.product_id_1688}")
                    
            except Exception as e:
                fail_count += 1
                logger.error(f"  ❌ Error syncing {product.product_id_1688}: {str(e)}")
                db.rollback()
        
        logger.info(f"Sync Complete. Success: {success_count}, Failed: {fail_count}")
        
    except Exception as e:
        logger.error(f"Critical error during sync: {str(e)}")
    finally:
        shopify_service.close_session()
        db.close()

if __name__ == "__main__":
    sync_all_products()

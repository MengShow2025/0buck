import sys
import os
from sqlalchemy.orm import Session
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.app.db.session import SessionLocal
from backend.app.models.product import Product
from backend.app.services.sync_shopify import SyncShopifyService
from backend.app.services.sync_1688 import Sync1688Service

from backend.app.core.config import settings

def fix_all_metafields():
    print(f"Using Database: {settings.SQLALCHEMY_DATABASE_URI}")
    db = SessionLocal()
    shopify_service = SyncShopifyService()
    sourcing_service = Sync1688Service(db)
    
    products = db.query(Product).all()
    print(f"Found {len(products)} products in database.")
    
    success_count = 0
    fail_count = 0
    skipped_count = 0
    
    for product in products:
        if not product.shopify_product_id:
            print(f"Skipping Product {product.product_id_1688}: No Shopify ID linked.")
            skipped_count += 1
            continue
            
        try:
            # Ensure source_cost_usd is calculated if missing
            if not product.source_cost_usd or product.source_cost_usd == 0:
                pricing = sourcing_service.calculate_price(product.original_price)
                product.source_cost_usd = pricing["cost_usd_buffered"]
                db.commit()
            
            # Update Shopify
            shopify_service.sync_to_shopify(product)
            print(f"Updated Metafields for Product: {product.title_en} ({product.shopify_product_id})")
            success_count += 1
        except Exception as e:
            print(f"Failed to update Product {product.shopify_product_id}: {str(e)}")
            fail_count += 1
            
    shopify_service.close_session()
    db.close()
    
    print("\n--- Metafield Alignment Report ---")
    print(f"Total Products: {len(products)}")
    print(f"Successfully Aligned: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"Skipped (No Link): {skipped_count}")
    print("----------------------------------")

if __name__ == "__main__":
    fix_all_metafields()

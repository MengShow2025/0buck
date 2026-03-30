import os
import json
import asyncio
import sys
from datetime import datetime
from typing import List, Dict, Any

# Adjust sys.path to include backend/app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import shopify
from app.core.config import settings
from app.services.sync_1688 import Sync1688Service
from app.services.sync_shopify import SyncShopifyService
from app.models.product import Product, Supplier, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. Setup DB
# Using local DB settings from .env
DB_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}/{settings.POSTGRES_DB}"
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base.metadata.create_all(bind=engine) # Assume tables already exist

# 2. Setup Shopify
shopify_service = SyncShopifyService()

def extract_offer_id(url: str) -> str:
    """Extract 1688 offerId from various URL formats."""
    import re
    match = re.search(r'offerId=(\d+)', url)
    if match:
        return match.group(1)
    match = re.search(r'offer/(\d+)\.html', url)
    if match:
        return match.group(1)
    # If it's some dj.1688.com redirect, we might need a better parser or use it as is
    return url.split('/')[-1].split('?')[0] # Fallback

async def sync_json_file(file_path: str, category: str):
    print(f"--- Syncing Category: {category} from {file_path} ---")
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    db = SessionLocal()
    sync_1688 = Sync1688Service(db)

    for item in data[:1]: # LIMIT TO 1 FOR TEST
        try:
            url = item.get('product_url')
            if not url: continue
            
            offer_id = extract_offer_id(url)
            print(f"Processing: {item['title']} (ID: {offer_id})")

            # 1. Fetch & Enrich (Using JSON data to override mock for realism)
            cost_cny = float(item.get('price', 0))
            if cost_cny == 0: cost_cny = 50.0 # Default fallback
            
            # Enrich with mock data based on actual JSON
            raw_data = {
                "id": offer_id,
                "title": item['title'],
                "description": f"Quality {category} item sourced from 1688.",
                "price": cost_cny,
                "images": [item.get('image_url', "")] if item.get('image_url') else [],
                "variants": [{"id": f"v_{offer_id}", "price": cost_cny, "stock": 999}],
                "category": category,
                "supplier": {
                    "id": "sup_generic_1688",
                    "name": "Trusted 1688 Factory",
                    "rating": 4.9
                }
            }

            # 2. Local DB Sync
            # We bypass the mock fetch and manually call the processing parts
            enriched = await sync_1688.translate_and_enrich(raw_data)
            pricing = sync_1688.calculate_price(cost_cny)
            
            # Simplified DB save (avoiding foreign key issues if tables not ready)
            # Find or create supplier
            supplier = db.query(Supplier).filter_by(supplier_id_1688="sup_generic_1688").first()
            if not supplier:
                supplier = Supplier(supplier_id_1688="sup_generic_1688", name="Trusted 1688 Factory", rating=4.9)
                db.add(supplier)
                db.commit()
                db.refresh(supplier)

            product = db.query(Product).filter_by(product_id_1688=offer_id).first()
            if not product:
                product = Product(product_id_1688=offer_id)
                db.add(product)
            
            product.title_zh = raw_data['title']
            product.title_en = enriched['title_en']
            product.description_zh = raw_data['description']
            product.description_en = enriched['description_en']
            product.original_price = cost_cny
            product.sale_price = pricing['sale_price']
            product.is_reward_eligible = pricing['is_reward_eligible']
            product.images = raw_data['images']
            product.variants = raw_data['variants']
            product.category = category
            product.supplier_id = supplier.id
            product.last_synced_at = datetime.utcnow()
            
            db.commit()
            
            # 3. Shopify Sync
            print(f"   -> Pushing to Shopify: ${pricing['sale_price']} (Reward: {pricing['is_reward_eligible']})")
            shopify_service.sync_to_shopify(product)
            db.commit()
            print(f"   [SUCCESS] Synced {offer_id}")

        except Exception as e:
            print(f"   [ERROR] Failed to sync {item.get('title')}: {str(e)}")
            db.rollback()
    
    db.close()

async def main():
    json_dir = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/data/1688"
    files = [
        ("smart_home.json", "Smart Home"),
        ("office_tech.json", "Office Tech"),
        ("outdoor.json", "Outdoor Life")
    ]
    
    for filename, category in files:
        await sync_json_file(os.path.join(json_dir, filename), category)

if __name__ == "__main__":
    asyncio.run(main())

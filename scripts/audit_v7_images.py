import os
import sys
import json

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from sqlalchemy import create_engine, text
import shopify
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def audit_v7_images():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, product_id_1688, title_zh, evidence FROM candidate_products WHERE status = 'synced' AND id IN (353, 357, 364)"))
        for row in res.fetchall():
            cand_id, pid_1688, title, evidence_data = row
            
            # If SQLAlchemy returned a dict, use it. Otherwise, parse.
            if isinstance(evidence_data, dict):
                evidence = evidence_data
            else:
                evidence = json.loads(evidence_data or '{}')
                
            shopify_id = evidence.get('shopify_id')
            
            if not shopify_id:
                print(f"❌ Candidate {cand_id} ({pid_1688}): No Shopify ID found in evidence.")
                continue
                
            print(f"🔍 Auditing Candidate {cand_id} ({pid_1688}) -> Shopify ID: {shopify_id}...")
            try:
                sp = shopify.Product.find(shopify_id)
                print(f"   Shopify Title: {sp.title}")
                print(f"   Images: {len(sp.images)}")
                for img in sp.images:
                    alt = getattr(img, 'alt', 'N/A')
                    print(f"     [POS {img.position}] ID: {img.id}, Alt: {alt}")
                    # Check if alt contains the correct candidate ID
                    expected_alt_prefix = f"0BUCK_AUDIT_{cand_id}_POS_"
                    if not alt or not alt.startswith(expected_alt_prefix):
                        print(f"       ⚠️ ALERT: Incorrect Alt Tag for {cand_id}. Found: {alt}")
            except Exception as e:
                print(f"   ❌ Error finding Shopify Product {shopify_id}: {e}")
            print("-" * 40)

if __name__ == "__main__":
    audit_v7_images()

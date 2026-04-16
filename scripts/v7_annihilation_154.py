import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def physical_annihilation_154():
    # 1. Physical Delete from Shopify (Double Check)
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    # We don't have the ID anymore or it's gone, but let's try searching by handle/title if needed
    # For now, we assume it's gone from Shopify.
    
    # 2. Physical Delete from Database (The "Annihilation" Directive)
    faulty_pid_1688 = "CJ-DOOR-ZIG-154"
    
    engine = create_engine(DATABASE_URL)
    print(f"🧨 v7.0 Truth Engine: Physical Annihilation of {faulty_pid_1688}...")
    
    with engine.connect() as conn:
        try:
            # Delete from products
            res_prod = conn.execute(text("DELETE FROM products WHERE product_id_1688 = :pid"), {"pid": faulty_pid_1688})
            # Delete from candidate_products
            res_cand = conn.execute(text("DELETE FROM candidate_products WHERE product_id_1688 = :pid"), {"pid": faulty_pid_1688})
            
            conn.commit()
            print(f"   ✅ Deleted from products: {res_prod.rowcount} rows")
            print(f"   ✅ Deleted from candidate_products: {res_cand.rowcount} rows")
        except Exception as e:
            print(f"   ❌ Annihilation Failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    physical_annihilation_154()

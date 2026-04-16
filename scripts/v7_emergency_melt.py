import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def emergency_melt_and_cleanup():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    # 1. Targeted Delete from Shopify
    target_ids = [14805574123823, 14805577793839, 14805576253743]
    print(f"🔥 Emergency Melt: Deleting {len(target_ids)} products from Shopify...")
    for sid in target_ids:
        try:
            p = shopify.Product.find(sid)
            if p:
                print(f"   🗑️ Deleting {sid}: {p.title}")
                p.destroy()
        except Exception as e:
            print(f"   ⚠️ Product {sid} already gone or error: {e}")

    shopify.ShopifyResource.clear_session()

    # 2. Database Cleanup (Candidate & Product Tables)
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("🧹 Database Cleanup: Clearing faulty image paths and resetting status...")
        faulty_pids = ('CJ-PRO-LED-175', 'CJ-DOOR-ZIG-154', 'CJ-MESH-SHOES-84')
        
        # Reset primary_image and status to draft for the faulty ones
        query = text("""
            UPDATE candidate_products 
            SET primary_image = NULL, 
                status = 'draft', 
                images = '[]'::jsonb,
                evidence = evidence || '{"audit_fail": "Visual mismatch: Logo/Protocol error"}'::jsonb
            WHERE product_id_1688 IN :pids
        """)
        conn.execute(query, {"pids": faulty_pids})
        
        # Also clean up the main products table if they were pushed
        conn.execute(text("DELETE FROM products WHERE product_id_1688 IN :pids"), {"pids": faulty_pids})
        
        conn.commit()
    print("✨ Emergency Cleanup Finished.")

if __name__ == "__main__":
    emergency_melt_and_cleanup()

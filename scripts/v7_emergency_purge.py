import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def physical_purge():
    # 1. Connect to Shopify
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    # Faulty Product IDs
    faulty_shopify_ids = [14805576253743, 14805575991599, 14805575729455]
    faulty_pids_1688 = ["CJ-PRO-LED-175", "CJ-DOOR-ZIG-154", "CJ-MESH-SHOES-84"]
    
    print("🔥 v7.0 Emergency Purge: Deleting faulty products from Shopify...")
    for sid in faulty_shopify_ids:
        try:
            p = shopify.Product.find(sid)
            p.destroy()
            print(f"   ✅ Deleted Shopify Product: {sid}")
        except Exception as e:
            print(f"   ⚠️ Could not delete Shopify Product {sid} (maybe already gone): {e}")

    # 2. Update Database: Melt them
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        for pid in faulty_pids_1688:
            try:
                conn.execute(text("""
                    UPDATE products 
                    SET is_melted = TRUE, 
                        melt_reason = 'V7.0 Visual Truth Failure: Incorrect parameters/logos in image assets',
                        status = 'melted'
                    WHERE product_id_1688 = :pid
                """), {"pid": pid})
                conn.execute(text("""
                    UPDATE candidate_products 
                    SET is_melted = TRUE, 
                        melt_reason = 'V7.0 Visual Truth Failure: Incorrect parameters/logos in image assets',
                        status = 'melted'
                    WHERE product_id_1688 = :pid
                """), {"pid": pid})
                print(f"   ❄️ Melted DB Entry: {pid}")
            except Exception as e:
                print(f"   ❌ DB Error for {pid}: {e}")
        conn.commit()

if __name__ == "__main__":
    physical_purge()

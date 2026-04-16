import os

import shopify
import pg8000
import ssl

# 0Buck V7.5 Ghost Cleanup Script
DATABASE_URL = "postgresql+pg8000://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOPIFY_API_VERSION = "2024-01"

def cleanup():
    # 1. Setup Shopify
    session = shopify.Session(f"{SHOPIFY_SHOP_NAME}.myshopify.com", SHOPIFY_API_VERSION, SHOPIFY_ACCESS_TOKEN)
    shopify.ShopifyResource.activate_session(session)
    
    # 2. Setup Database
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    conn = pg8000.connect(
        user="neondb_owner", password="npg_0XasvoqHEz4Y", host="ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech",
        database="neondb", port=5432, ssl_context=ssl_context
    )
    cursor = conn.cursor()
    
    print("🔍 Searching for Ghost Products (Price $0.00)...")
    products = shopify.Product.find()
    ghost_count = 0
    
    for p in products:
        is_ghost = False
        for v in p.variants:
            if float(v.price) <= 0:
                is_ghost = True
                break
        
        if is_ghost:
            print(f"   👻 Found Ghost: {p.title} (ID: {p.id})")
            # Try to find in DB to mark as melted
            # Using handle or title to match
            cursor.execute("UPDATE candidate_products SET is_melted = TRUE, melt_reason = '[CLEANUP] Ghost Product $0' WHERE title_en = %s OR shopify_product_handle = %s", (p.title, p.handle))
            
            # Delete from Shopify
            p.destroy()
            print(f"   🔥 Deleted from Shopify.")
            ghost_count += 1
            
    conn.commit()
    conn.close()
    print(f"✅ Cleanup complete. {ghost_count} ghost products removed.")

if __name__ == "__main__":
    cleanup()

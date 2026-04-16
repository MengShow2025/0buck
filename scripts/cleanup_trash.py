import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify

load_dotenv()

def cleanup_none_products():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    products = shopify.Product.find(limit=50)
    for p in products:
        # Title can be a string object from shopify
        t = str(p.title)
        if "None" in t or t == "0Buck Verified Artisan: None":
            print(f"🗑️ Deleting trash product: {p.id} - {t}")
            p.destroy()
    shopify.ShopifyResource.clear_session()

if __name__ == "__main__":
    cleanup_none_products()

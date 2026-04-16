import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify

load_dotenv()

def list_recent_products():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    # Sort by created_at descending
    products = shopify.Product.find(limit=10, order="created_at desc")
    print(f"Most Recent {len(products)} products:")
    for p in products:
        print(f"ID: {p.id}, Title: {p.title}, Created: {p.created_at}")

if __name__ == "__main__":
    list_recent_products()

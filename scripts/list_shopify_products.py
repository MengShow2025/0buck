import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify

load_dotenv()

def list_shopify_products():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    # Try getting the most recent ones
    products = shopify.Product.find(limit=10)
    print(f"Found {len(products)} products:")
    # Sort them in python if order param is tricky
    # But usually .find() returns them in a certain order.
    # Let's just list more.
    for p in products:
        print(f"ID: {p.id}, Title: {p.title}, Handle: {p.handle}")

if __name__ == "__main__":
    list_shopify_products()

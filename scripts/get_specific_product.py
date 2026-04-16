import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify

load_dotenv()

def get_specific_product():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    # Try getting the one I just pushed
    try:
        p = shopify.Product.find(14805576253743)
        print(f"Found ID: {p.id}, Title: {p.title}, Handle: {p.handle}")
        print(f"Description: {p.body_html[:500]}...")
    except Exception as e:
        print(f"Error finding product: {e}")

if __name__ == "__main__":
    get_specific_product()

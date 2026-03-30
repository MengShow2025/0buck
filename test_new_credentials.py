import shopify
import os
from dotenv import load_dotenv

# Load env from the backend folder
load_dotenv(dotenv_path="/Volumes/SAMSUNG 970/AccioWork/coder/0buck/backend/.env")

def test_credential(token, label):
    shop_url = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
    api_version = '2024-01'
    
    print(f"Testing {label}: {token[:10]}... on {shop_url}")
    session = shopify.Session(shop_url, api_version, token)
    shopify.ShopifyResource.activate_session(session)
    
    try:
        shop = shopify.Shop.current()
        print(f"Successfully connected with {label}! Shop Name: {shop.name}")
        
        # Now try customers
        try:
            customers = shopify.Customer.search(limit=1)
            print(f"Successfully read customers with {label}! Count: {len(customers)}")
        except Exception as e:
            print(f"Failed to read customers with {label}: {e}")
            
    except Exception as e:
        print(f"Failed to connect with {label}: {e}")

if __name__ == "__main__":
    # Test existing shpat_ token
    test_credential(os.getenv('SHOPIFY_ACCESS_TOKEN'), "Old shpat_ token")
    
    # Test new shpss_ secret as token
    test_credential(os.getenv('SHOPIFY_API_SECRET'), "New shpss_ secret as token")

import shopify
import os
from dotenv import load_dotenv

# Load env from the backend folder
load_dotenv(dotenv_path="/Volumes/SAMSUNG 970/AccioWork/coder/0buck/backend/.env")

def test_customer_permission():
    shop_url = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
    api_version = '2024-01'
    
    # Try with Access Token
    tokens_to_test = [
        (os.getenv('SHOPIFY_ACCESS_TOKEN'), "Current Access Token (shpat_)"),
        (os.getenv('SHOPIFY_API_SECRET'), "New API Secret (shpss_)")
    ]
    
    for token, label in tokens_to_test:
        if not token: continue
        print(f"\n--- Testing {label} on {shop_url} ---")
        session = shopify.Session(shop_url, api_version, token)
        shopify.ShopifyResource.activate_session(session)
        
        try:
            # 1. Try to fetch customers (Requires read_customers)
            customers = shopify.Customer.search(limit=1)
            print(f"[{label}] Successfully read customers. Count found: {len(customers)}")
            
            if len(customers) > 0:
                customer = customers[0]
                print(f"[{label}] Testing write access on Customer ID: {customer.id}")
                
                # 2. Try to add a test metafield (Requires write_customers)
                metafield = shopify.Metafield({
                    "namespace": "0buck_test",
                    "key": "permission_check",
                    "value": "active",
                    "type": "single_line_text_field"
                })
                customer.add_metafield(metafield)
                print(f"[{label}] Successfully wrote a test Metafield to Customer!")
                return True
            else:
                print(f"[{label}] No customers found in shop to test write permission.")
        except Exception as e:
            print(f"[{label}] Permission Check FAILED: {e}")
            
    return False

if __name__ == "__main__":
    test_customer_permission()

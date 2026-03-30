import shopify
import os
from dotenv import load_dotenv

# Load env from the backend folder
load_dotenv(dotenv_path="/Volumes/SAMSUNG 970/AccioWork/coder/0buck/backend/.env")

def verify_connection():
    shop_url = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
    access_token = os.getenv('SHOPIFY_ACCESS_TOKEN')
    api_version = '2024-01'
    
    print(f"Connecting to {shop_url}...")
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    try:
        shop = shopify.Shop.current()
        print(f"Connected successfully to shop: {shop.name}")
        return True
    except Exception as e:
        print(f"Failed to connect: {e}")
        return False

def sync_dummy_products():
    products_to_sync = [
        {"id": "1688_001", "title": "AI Smart Watch", "cost": 15.5},
        {"id": "1688_002", "title": "Portable AI Translator", "cost": 45.0},
        {"id": "1688_003", "title": "Smart Home Hub", "cost": 30.0}
    ]
    
    for p in products_to_sync:
        print(f"Syncing {p['title']}...")
        sp = shopify.Product()
        sp.title = f"0Buck {p['title']}"
        sp.body_html = f"High quality {p['title']} sourced from 1688."
        sp.vendor = "1688 Supplier"
        sp.product_type = "Electronics"
        
        # Calculate price based on rule: $5-20: x2.0, $20-50: x1.6
        cost_usd = p['cost'] * 0.14 # Rough CNY to USD
        if cost_usd <= 5: multiplier = 3.0
        elif cost_usd <= 20: multiplier = 2.0
        elif cost_usd <= 50: multiplier = 1.6
        else: multiplier = 1.4
        
        sale_price = cost_usd * multiplier
        
        v = shopify.Variant()
        v.price = round(sale_price, 2)
        v.sku = f"0B-{p['id']}"
        sp.variants = [v]
        
        if sp.save():
            print(f"Saved product {p['title']} with ID {sp.id}")
            # Add Metafields
            sp.add_metafield(shopify.Metafield({
                "namespace": "0buck_sync",
                "key": "source_1688_id",
                "value": p['id'],
                "type": "single_line_text_field"
            }))
            sp.add_metafield(shopify.Metafield({
                "namespace": "0buck_sync",
                "key": "original_cost",
                "value": str(p['cost']),
                "type": "number_decimal"
            }))
            print(f"Metafields added for {p['title']}")
        else:
            print(f"Failed to save {p['title']}: {sp.errors.full_messages()}")

if __name__ == "__main__":
    if verify_connection():
        sync_dummy_products()

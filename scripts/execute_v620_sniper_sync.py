import os, sys, json, requests
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
from app.db.session import SessionLocal
from app.models.product import CandidateProduct
from dotenv import load_dotenv

load_dotenv()

SHOP_URL = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
API_VERSION = "2024-01"

def update_shopify_final(shopify_id, title_suffix, new_price, cost_usd):
    url = f"https://{SHOP_URL}/admin/api/{API_VERSION}/products/{shopify_id}.json"
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    
    get_resp = requests.get(url, headers=headers)
    if get_resp.status_code != 200:
        print(f"❌ Product {shopify_id} not found.")
        return False
    
    product = get_resp.json()['product']
    variant_id = product['variants'][0]['id']
    current_title = product['title']
    
    # Update Payload
    new_title = f"{current_title} - {title_suffix}" if title_suffix else current_title
    
    update_payload = {
        "product": {
            "id": shopify_id,
            "title": new_title,
            "variants": [
                {
                    "id": variant_id,
                    "price": f"{new_price:.2f}",
                    "inventory_item_id": product['variants'][0]['inventory_item_id']
                }
            ]
        }
    }
    
    # Separate call for Cost per item (requires inventory_item_id)
    inv_item_id = product['variants'][0]['inventory_item_id']
    cost_payload = {
        "inventory_item": {
            "id": inv_item_id,
            "cost": f"{cost_usd:.2f}"
        }
    }
    
    # 1. Update Title/Price
    requests.put(url, headers=headers, json=update_payload)
    # 2. Update Cost
    requests.put(f"https://{SHOP_URL}/admin/api/{API_VERSION}/inventory_items/{inv_item_id}.json", headers=headers, json=cost_payload)
    
    print(f"✅ ID {shopify_id} updated: Title+Price+Cost.")
    return True

def execute_sync():
    db = SessionLocal()
    
    # 1. T-Shirt (ID 271) - 6-Pack Bundle
    p271 = db.query(CandidateProduct).get(271)
    if p271 and 'shopify_id' in (p271.evidence or {}):
        update_shopify_final(p271.evidence['shopify_id'], "(6-Pack Bundle)", 65.99, 30.40)
        p271.estimated_sale_price = 65.99
    
    # 2. Smart Alarm (ID 154)
    p154 = db.query(CandidateProduct).get(154)
    if p154 and 'shopify_id' in (p154.evidence or {}):
        update_shopify_final(p154.evidence['shopify_id'], None, 35.59, 15.00)
        p154.estimated_sale_price = 35.59

    # 3. LED Mask (ID 175) - Already set but re-syncing cost
    p175 = db.query(CandidateProduct).get(175)
    if p175 and 'shopify_id' in (p175.evidence or {}):
        update_shopify_final(p175.evidence['shopify_id'], " (Pro High-Performance)", 29.55, 19.70)

    db.commit()
    db.close()

if __name__ == "__main__":
    execute_sync()

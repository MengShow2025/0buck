import os, sys, json, requests
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
from app.db.session import SessionLocal
from app.models.product import CandidateProduct
from app.core.config import settings
from dotenv import load_dotenv

load_dotenv()

# Shopify credentials
SHOP_URL = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
API_VERSION = "2024-01"

def update_shopify_price(shopify_id, new_price, cost):
    url = f"https://{SHOP_URL}/admin/api/{API_VERSION}/products/{shopify_id}.json"
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    
    # Get current product to find variant ID
    get_resp = requests.get(url, headers=headers)
    if get_resp.status_code != 200:
        print(f"❌ Failed to get Shopify product {shopify_id}: {get_resp.text}")
        return False
    
    product = get_resp.json().get('product')
    if not product or not product.get('variants'):
        print(f"❌ No variants found for Shopify product {shopify_id}")
        return False
    
    variant_id = product['variants'][0]['id']
    
    # Update variant price and cost
    update_payload = {
        "product": {
            "id": shopify_id,
            "variants": [
                {
                    "id": variant_id,
                    "price": f"{new_price:.2f}",
                    "cost": f"{cost:.2f}" if cost > 0 else None
                }
            ]
        }
    }
    
    put_resp = requests.put(url, headers=headers, json=update_payload)
    if put_resp.status_code == 200:
        print(f"✅ Shopify Product {shopify_id} updated to ${new_price}")
        return True
    else:
        print(f"❌ Failed to update Shopify price: {put_resp.text}")
        return False

def sync_expert_audit():
    db = SessionLocal()
    # Target: LED Mask ID 175
    p = db.query(CandidateProduct).get(175)
    
    if p and p.evidence and 'shopify_id' in p.evidence:
        shopify_id = p.evidence['shopify_id']
        new_price = 29.55
        cost_rmb = 80.0
        cost_usd = cost_rmb / 7.2
        
        # Update DB
        p.estimated_sale_price = new_price
        p.cost_cny = cost_rmb
        p.structural_data['real_cost_rmb'] = cost_rmb
        db.commit()
        print(f"✅ DB ID 175 updated to ${new_price}")
        
        # Update Shopify
        update_shopify_price(shopify_id, new_price, cost_usd)
    else:
        print(f"❓ Could not find published LED Mask (ID 175) or Shopify ID missing.")
    
    db.close()

if __name__ == "__main__":
    sync_expert_audit()

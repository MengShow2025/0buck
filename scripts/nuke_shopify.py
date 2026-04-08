import os
import requests
from dotenv import load_dotenv

load_dotenv()

SHOP_URL = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
API_VERSION = "2024-01"

def nuke_shopify():
    url = f"https://{SHOP_URL}/admin/api/{API_VERSION}/products.json?limit=250"
    headers = {"X-Shopify-Access-Token": ACCESS_TOKEN}
    
    resp = requests.get(url, headers=headers)
    products = resp.json().get('products', [])
    print(f"🧹 Found {len(products)} products to delete.")
    
    for p in products:
        del_url = f"https://{SHOP_URL}/admin/api/{API_VERSION}/products/{p['id']}.json"
        requests.delete(del_url, headers=headers)
        print(f"✅ Deleted: {p['title']}")

if __name__ == "__main__":
    nuke_shopify()

import os
import requests
import json

# Shopify Credentials
ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP_URL = "pxjkad-zt.myshopify.com"
API_VERSION = "2026-01"

def fix_titles():
    url = f"https://{SHOP_URL}/admin/api/{API_VERSION}/products.json?limit=50&status=active"
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch products: {response.status_code}")
        return
        
    products = response.json().get("products", [])
    fixed_count = 0
    
    for p in products:
        title = p.get("title", "")
        if "0Buck Veried Artisan" in title:
            new_title = title.replace("0Buck Veried Artisan", "0Buck Verified Artisan")
            product_id = p.get("id")
            
            update_url = f"https://{SHOP_URL}/admin/api/{API_VERSION}/products/{product_id}.json"
            payload = {
                "product": {
                    "id": product_id,
                    "title": new_title
                }
            }
            
            up_res = requests.put(update_url, headers=headers, json=payload)
            if up_res.status_code == 200:
                print(f"✅ Fixed: {new_title}")
                fixed_count += 1
            else:
                print(f"❌ Failed to fix {product_id}: {up_res.status_code}")
                
    print(f"\n✨ Total titles fixed: {fixed_count}")

if __name__ == "__main__":
    fix_titles()

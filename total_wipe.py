import os
import requests
import time

SHOP_NAME = "pxjkad-zt"
ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
API_VERSION = "2024-01"

def clean_reboot():
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    
    while True:
        # Get up to 250 products
        url = f"https://{SHOP_NAME}.myshopify.com/admin/api/{API_VERSION}/products.json?fields=id&limit=250"
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Error fetching: {response.status_code}")
            break
            
        products = response.json().get('products', [])
        if not products:
            print("Store is empty. Clean reboot successful.")
            break
            
        print(f"Deleting {len(products)} products...")
        for p in products:
            p_id = p['id']
            del_url = f"https://{SHOP_NAME}.myshopify.com/admin/api/{API_VERSION}/products/{p_id}.json"
            del_res = requests.delete(del_url, headers=headers)
            if del_res.status_code == 200:
                print(f"Deleted {p_id}")
            else:
                print(f"Failed {p_id}: {del_res.status_code}")
            time.sleep(0.5)

if __name__ == "__main__":
    clean_reboot()

import os
import requests
import json
import time

SHOP_NAME = "pxjkad-zt"
ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
API_VERSION = "2024-01"

def delete_all_products():
    while True:
        url = f"https://{SHOP_NAME}.myshopify.com/admin/api/{API_VERSION}/products.json?fields=id&limit=250"
        headers = {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
            "Content-Type": "application/json"
        }
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Error fetching products: {response.status_code}")
            break
            
        products = response.json().get('products', [])
        if not products:
            print("No more products to delete.")
            break
            
        print(f"Found {len(products)} products. Deleting...")
        for product in products:
            product_id = product['id']
            del_url = f"https://{SHOP_NAME}.myshopify.com/admin/api/{API_VERSION}/products/{product_id}.json"
            del_res = requests.delete(del_url, headers=headers)
            if del_res.status_code == 200:
                print(f"Deleted product {product_id}")
            else:
                print(f"Failed to delete {product_id}: {del_res.status_code}")
            # Respect rate limits
            time.sleep(0.5)

if __name__ == "__main__":
    delete_all_products()

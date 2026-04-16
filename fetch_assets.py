import os
import requests
import json

SHOP_NAME = "pxjkad-zt"
ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
THEME_ID = "184524603695"
API_VERSION = "2024-01"

def get_asset(key):
    url = f"https://{SHOP_NAME}.myshopify.com/admin/api/{API_VERSION}/themes/{THEME_ID}/assets.json?asset[key]={key}"
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Accept": "application/json"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json().get('asset', {}).get('value')
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None

if __name__ == "__main__":
    # Get product-information.liquid
    val = get_asset("sections/product-information.liquid")
    if val:
        with open("product-information.liquid", "w") as f:
            f.write(val)
        print("Successfully saved product-information.liquid")
    
    # Get templates/product.json
    val = get_asset("templates/product.json")
    if val:
        with open("product.json", "w") as f:
            f.write(val)
        print("Successfully saved product.json")

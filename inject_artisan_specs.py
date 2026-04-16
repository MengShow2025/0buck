import os
import json
import requests
import time

ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP_URL = "https://pxjkad-zt.myshopify.com/admin/api/2026-01"

updates = {
    14767250211119: "152 颗大功率灯珠 (Pro版) + 柔性硅胶材质",
    14767246311727: "MD 缓冲大底 + 记忆棉内里 (物理对标 Skechers)",
    14767235137839: "240g 精梳棉 (重磅质感) - 专家审计品质",
    14767077949743: "Zigbee 3.0 协议 + CE/RoHS 工业级认证"
}

def get_product(product_id):
    url = f"{SHOP_URL}/products/{product_id}.json"
    headers = {"X-Shopify-Access-Token": ACCESS_TOKEN}
    response = requests.get(url, headers=headers)
    return response.json().get('product')

def update_product_body(product_id, body_html):
    url = f"{SHOP_URL}/products/{product_id}.json"
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    payload = {"product": {"id": product_id, "body_html": body_html}}
    response = requests.put(url, headers=headers, json=payload)
    return response.status_code

for pid, spec in updates.items():
    product = get_product(pid)
    if product and 'body_html' in product:
        old_body = product['body_html']
        # Replace the placeholder "Net Weight 0.0 kg (Artisan Standard)" with real specs
        new_body = old_body.replace("Net Weight 0.0 kg (Artisan Standard)", spec)
        
        # Also ensure the title in the body_html matches the actual title (sometimes they get de-synced in the template)
        # But we'll skip that for now to avoid breaking the HTML structure if it varies.
        
        if new_body != old_body:
            print(f"Injecting spec into {pid}...")
            update_product_body(pid, new_body)
            time.sleep(0.5)

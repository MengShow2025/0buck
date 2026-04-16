import os

import asyncio
import httpx

SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

async def list_1688_products():
    url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?limit=250"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers)
        products = resp.json().get("products", [])
        
        target_ids = []
        for p in products:
            tags = p.get("tags", "").lower()
            vendor = p.get("vendor", "").lower()
            if "1688" in tags or "1688" in vendor:
                print(f"Found 1688 product: {p['title']} (ID: {p['id']})")
                target_ids.append(p['id'])
        
        return target_ids

async def delete_products(ids):
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    async with httpx.AsyncClient(timeout=30.0) as client:
        for p_id in ids:
            url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products/{p_id}.json"
            resp = await client.delete(url, headers=headers)
            if resp.status_code == 200:
                print(f"Deleted product {p_id}")
            else:
                print(f"Failed to delete {p_id}: {resp.status_code}")

if __name__ == "__main__":
    ids = asyncio.run(list_1688_products())
    if ids:
        print(f"Deleting {len(ids)} products...")
        asyncio.run(delete_products(ids))
    else:
        print("No 1688 products found on Shopify.")

import os
import httpx
import asyncio

SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP_NAME = "pxjkad-zt"

async def wipe():
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Get all products
        resp = await client.get(f"https://{SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?limit=250&fields=id", headers=headers)
        products = resp.json().get("products", [])
        print(f"Deleting {len(products)} products...")
        for p in products:
            await client.delete(f"https://{SHOP_NAME}.myshopify.com/admin/api/2024-01/products/{p['id']}.json", headers=headers)
            print(f"Deleted {p['id']}")
            await asyncio.sleep(0.5)

if __name__ == "__main__":
    asyncio.run(wipe())

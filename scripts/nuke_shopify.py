import httpx
import asyncio

import os
shop_name = "pxjkad-zt"
access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
headers = {"X-Shopify-Access-Token": access_token}

async def delete_all():
    async with httpx.AsyncClient() as client:
        while True:
            resp = await client.get(f"https://{shop_name}.myshopify.com/admin/api/2024-01/products.json?limit=250", headers=headers)
            products = resp.json().get("products", [])
            if not products:
                break
            print(f"Deleting {len(products)} products...")
            tasks = [client.delete(f"https://{shop_name}.myshopify.com/admin/api/2024-01/products/{p['id']}.json", headers=headers) for p in products]
            await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(delete_all())

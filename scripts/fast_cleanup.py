import asyncio
import httpx
import os

SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

async def delete_product(client, base_url, headers, p_id, title):
    try:
        resp = await client.delete(f"{base_url}/products/{p_id}.json", headers=headers)
        if resp.status_code == 200:
            print(f"🗑️ Deleted: {title}")
        else:
            print(f"❌ Fail: {title} ({resp.status_code})")
    except Exception as e:
        print(f"⚠️ Error: {title} - {e}")

async def fast_cleanup():
    base_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(f"{base_url}/products.json?limit=250", headers=headers)
        products = resp.json().get("products", [])
        print(f"🔍 Found {len(products)} to delete.")
        
        # Parallel deletion with 5 concurrent tasks to avoid 429
        semaphore = asyncio.Semaphore(5)
        async def sem_delete(p):
            async with semaphore:
                await delete_product(client, base_url, headers, p["id"], p["title"])
                await asyncio.sleep(1.0)

        await asyncio.gather(*[sem_delete(p) for p in products])

if __name__ == "__main__":
    asyncio.run(fast_cleanup())

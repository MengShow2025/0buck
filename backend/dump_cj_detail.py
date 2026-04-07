import asyncio
import sys
import os
import json

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_root = os.path.join(project_root, 'backend')
if backend_root not in sys.path:
    sys.path.append(backend_root)

from app.services.cj_service import CJDropshippingService

async def dump_cj_detail():
    service = CJDropshippingService()
    # Use a known PID from previous dump if possible, or just search one
    products = await service.search_products(size=1)
    if not products:
        print("No products found.")
        return
        
    pid = products[0].get("id") or products[0].get("pid")
    print(f"Fetching detail for PID: {pid}")
    
    url = f"{service.BASE_URL}/product/detail"
    headers = await service._get_headers()
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, params={"pid": pid})
        data = resp.json()
        print(json.dumps(data, indent=2))

if __name__ == "__main__":
    asyncio.run(dump_cj_detail())

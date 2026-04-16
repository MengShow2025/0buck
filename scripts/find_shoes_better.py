
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_shoes_better():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # Try multiple keywords
    keywords = [
        "Breathable Mesh Sneakers Women",
        "Lightweight Walking Shoes Women",
        "Slip On Sneakers Mesh"
    ]
    
    results = {}
    async with httpx.AsyncClient() as client:
        for kw in keywords:
            r = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": kw, "pageSize": 5})
            data = r.json()
            if data.get("success"):
                results[kw] = data["data"]["list"]
        
    print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(find_shoes_better())

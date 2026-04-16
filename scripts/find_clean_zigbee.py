
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_clean_zigbee():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # 1. Search for a specific Zigbee 3.0 Door Sensor on CJ
    url = f"{cj.BASE_URL}/product/list"
    params = {"productNameEn": "Zigbee 3.0 Tuya Smart Door Window Sensor", "pageNum": 1, "pageSize": 15}
    
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, params=params)
        data = r.json()
        if data.get("success"):
            products = data.get("data", {}).get("list", [])
            print(json.dumps(products))

if __name__ == "__main__":
    asyncio.run(find_clean_zigbee())


import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_zd06_zigbee():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    async with httpx.AsyncClient() as client:
        # Search for ZD06 Zigbee
        r = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "ZD06 Zigbee", "pageSize": 5})
        print(json.dumps(r.json()))

if __name__ == "__main__":
    asyncio.run(find_zd06_zigbee())

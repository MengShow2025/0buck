
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_any_zigbee_door_sensor():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    async with httpx.AsyncClient() as client:
        # Search for "Zigbee"
        url = f"{cj.BASE_URL}/product/list"
        params = {"productNameEn": "Zigbee", "pageSize": 100}
        
        r = await client.get(url, headers=headers, params=params)
        data = r.json().get("data", {}).get("list", [])
        
        results = []
        for c in data:
            title = c["productNameEn"].lower()
            if "door" in title:
                results.append(c)
        print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(find_any_zigbee_door_sensor())

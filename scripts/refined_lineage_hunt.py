
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def refined_lineage_hunt():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    async with httpx.AsyncClient() as client:
        # Search for pure Zigbee 3.0 door sensor
        r154 = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "Zigbee Door Sensor", "pageSize": 10})
        res154 = r154.json()
        l154 = res154.get("data", {}).get("list", []) if res154.get("data") else []
        
        # Search for clean mesh shoes
        r84 = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "Walking Shoes Women", "pageSize": 10})
        res84 = r84.json()
        l84 = res84.get("data", {}).get("list", []) if res84.get("data") else []
        
        # Mask already confirmed PID: 1455046891434807296
        
        print(json.dumps({
            "154": l154,
            "84": l84
        }))

if __name__ == "__main__":
    asyncio.run(refined_lineage_hunt())


import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def precise_lineage_hunt():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # Target PIDs
    mask_pid = "1455046891434807296" # LED Mask
    
    # 1. Search for Door Sensor by very precise keywords to find a PURE Zigbee PID
    # 2. Search for clean shoes
    
    async with httpx.AsyncClient() as client:
        # Search #154 - Door Window Sensor
        r154 = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "Zigbee Door Window Sensor", "pageSize": 20})
        r154_data = r154.json().get("data")
        l154 = r154_data.get("list", []) if r154_data else []
        
        # Search #84 - Walking Shoes
        r84 = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "Breathable Mesh Walking Shoes", "pageSize": 20})
        r84_data = r84.json().get("data")
        l84 = r84_data.get("list", []) if r84_data else []
        
        # Get Mask details
        r175 = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": mask_pid})
        d175 = r175.json().get("data", {})

        print(json.dumps({
            "154_list": l154,
            "175_data": d175,
            "84_list": l84
        }))

if __name__ == "__main__":
    asyncio.run(precise_lineage_hunt())

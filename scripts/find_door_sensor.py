
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_door_sensor():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    async with httpx.AsyncClient() as client:
        # Search for any Tuya Smart Door Sensor
        url = f"{cj.BASE_URL}/product/list"
        params = {"productNameEn": "Tuya Door Sensor", "pageSize": 50}
        
        r = await client.get(url, headers=headers, params=params)
        data = r.json().get("data", {}).get("list", [])
        
        results = []
        for c in data:
            title = c["productNameEn"].lower()
            if "zigbee" in title:
                # Confirm it's NOT a combo
                detail_r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": c["pid"]})
                detail_data = detail_r.json().get("data", {})
                variants = detail_data.get("variants", [])
                
                is_pure_zigbee = True
                for v in variants:
                    v_name = (v.get("variantNameEn") or "").lower()
                    if "wifi" in v_name:
                        is_pure_zigbee = False
                        break
                
                if is_pure_zigbee:
                    results.append({
                        "pid": c["pid"],
                        "title": c["productNameEn"],
                        "images": json.loads(detail_data.get("productImage", "[]"))
                    })
                    
        print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(find_door_sensor())

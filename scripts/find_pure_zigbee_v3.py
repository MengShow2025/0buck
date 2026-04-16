
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_pure_zigbee_sensor_v3():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    async with httpx.AsyncClient() as client:
        # Search for Tuya Zigbee Door Sensor in category "Alarm & Sensor"
        # Category ID: 0598E853-9BF7-4939-A571-2407E819C91E
        url = f"{cj.BASE_URL}/product/list"
        params = {"categoryId": "0598E853-9BF7-4939-A571-2407E819C91E", "productNameEn": "Zigbee", "pageSize": 50}
        
        r = await client.get(url, headers=headers, params=params)
        data = r.json().get("data", {}).get("list", [])
        
        results = []
        for c in data:
            title = c["productNameEn"].lower()
            if "door" in title and "wifi" not in title:
                # Confirm variants
                detail_r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": c["pid"]})
                detail_data = detail_r.json().get("data", {})
                variants = detail_data.get("variants", [])
                
                is_pure = True
                for v in variants:
                    v_name = (v.get("variantNameEn") or "").lower()
                    if "wifi" in v_name:
                        is_pure = False
                        break
                
                if is_pure:
                    results.append({
                        "pid": c["pid"],
                        "title": c["productNameEn"],
                        "images": json.loads(detail_data.get("productImage", "[]"))
                    })
                    if len(results) >= 3: break
                    
        print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(find_pure_zigbee_sensor_v3())

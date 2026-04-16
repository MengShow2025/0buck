
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_pure_zigbee_sensor():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    async with httpx.AsyncClient() as client:
        # Search for Tuya Zigbee Door Sensor
        r = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "Tuya Zigbee Door Sensor", "pageSize": 30})
        data = r.json()
        if not data.get("success"): return
        
        candidates = data.get("data", {}).get("list", [])
        for c in candidates:
            # Check if title has "WIFI"
            if "wifi" in c["productNameEn"].lower(): continue
            
            # Fetch variants to confirm it's ONLY Zigbee
            detail_r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": c["pid"]})
            detail_data = detail_r.json()
            if detail_data.get("success"):
                p_data = detail_data["data"]
                variants = p_data.get("variants", [])
                
                has_wifi = False
                for v in variants:
                    v_name = (v.get("variantNameEn") or "").lower()
                    if "wifi" in v_name:
                        has_wifi = True
                        break
                
                if not has_wifi:
                    print(f"✅ PURE ZIGBEE PID FOUND: {c['pid']}")
                    print(f"Title: {c['productNameEn']}")
                    img_str = p_data.get("productImage")
                    imgs = json.loads(img_str) if img_str else []
                    print(f"Images: {imgs[:2]}")
                    return # Stop at first pure match

if __name__ == "__main__":
    asyncio.run(find_pure_zigbee_sensor())

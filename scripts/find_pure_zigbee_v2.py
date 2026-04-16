
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_pure_zigbee_v2():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # Searching for a PID that is EXCLUSIVELY Zigbee 3.0
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "Tuya Zigbee 3.0 Door Window Sensor", "pageSize": 10})
        data = r.json()
        if data.get("success"):
            candidates = data.get("data", {}).get("list", [])
            results = []
            for c in candidates:
                # Check variants for each PID to ensure NO WiFi contamination
                detail_r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": c["pid"]})
                detail_data = detail_r.json()
                if detail_data.get("success"):
                    p_data = detail_data["data"]
                    title = p_data.get("productNameEn", "").lower()
                    if "wifi" in title: continue # Skip PID with WiFi in title
                    
                    variants = p_data.get("variants", [])
                    is_pure = True
                    for v in variants:
                        v_title = v.get("variantNameEn", "").lower()
                        if "wifi" in v_title: 
                            is_pure = False
                            break
                    
                    if is_pure:
                        img_str = p_data.get("productImage")
                        imgs = json.loads(img_str) if img_str else []
                        results.append({
                            "pid": c["pid"],
                            "title": p_data["productNameEn"],
                            "images": imgs,
                            "variants": variants[:2]
                        })
            print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(find_pure_zigbee_v2())

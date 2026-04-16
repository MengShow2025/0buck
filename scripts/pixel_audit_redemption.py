
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def get_refined_audit_assets():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # 1. New search for pure Zigbee sensor (No WiFi branding)
    # 2. Re-verify LED Mask internals
    # 3. Find pure Artisan shoes (No text)
    
    audit_tasks = [
        {"id": "154_NEW", "search": "Zigbee 3.0 Door Window Sensor Tuya Smart", "brand_filter": ["wifi"]},
        {"id": "175_V2", "pid": "1455046891434807296"}, # LED Mask
        {"id": "84_V2", "search": "Women Mesh Walking Shoes Solid Color No Logo"}
    ]
    
    async with httpx.AsyncClient() as client:
        # Task 1: Find pure Zigbee (Searching with Zigbee 3.0)
        url = f"{cj.BASE_URL}/product/list"
        params = {"productNameEn": "Zigbee 3.0 Door Window Sensor Tuya", "pageNum": 1, "pageSize": 5}
        r = await client.get(url, headers=headers, params=params)
        r_json = r.json()
        zigbee_candidates = r_json.get("data", {}).get("list", []) if r_json.get("data") else []
        
        # Task 2: Get Mask details (internal images)
        mask_r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": "1455046891434807296"})
        mask_json = mask_r.json()
        mask_data = mask_json.get("data", {}) if mask_json.get("data") else {}
        
        # Task 3: Find clean shoes (Searching for Breathable Mesh Walking Shoes)
        shoe_url = f"{cj.BASE_URL}/product/list"
        shoe_params = {"productNameEn": "Mesh Walking Shoes Women Breathable Flat", "pageNum": 1, "pageSize": 10}
        shoe_r = await client.get(shoe_url, headers=headers, params=shoe_params)
        shoe_json = shoe_r.json()
        shoe_candidates = shoe_json.get("data", {}).get("list", []) if shoe_json.get("data") else []

        print(json.dumps({
            "zigbee": zigbee_candidates,
            "mask_images": json.loads(mask_data.get("productImage", "[]")),
            "mask_variants": mask_data.get("variants", []),
            "shoes": shoe_candidates
        }))

if __name__ == "__main__":
    asyncio.run(get_refined_audit_assets())

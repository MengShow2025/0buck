
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def full_audit_and_fix():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # Target PIDs
    targets = {
        "154 (Sensor)": "1705462652346044416",
        "175 (Mask)": "1455046891434807296"
    }
    
    audit_data = {}
    async with httpx.AsyncClient() as client:
        for label, pid in targets.items():
            r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": pid})
            data = r.json()
            if data.get("success"):
                p_data = data["data"]
                # Capture FULL variant matrix
                variants = p_data.get("variants", [])
                
                # Capture ALL images
                images = json.loads(p_data.get("productImage", "[]"))
                
                # Capture Remark (for description)
                remark = p_data.get("remark", "")
                
                audit_data[label] = {
                    "pid": pid,
                    "title": p_data.get("productNameEn"),
                    "variant_matrix": [
                        {
                            "vid": v["vid"],
                            "sku": v["variantSku"],
                            "key": v["variantKey"],
                            "price": v["variantSellPrice"],
                            "weight": v["variantWeight"],
                            "image": v["variantImage"]
                        } for v in variants
                    ],
                    "all_images": images,
                    "raw_description": remark
                }
                
        # 3. Search for a NEW Shoe PID (Replacement for #84)
        shoe_search = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "Women Mesh Slip On Walking Shoes Comfortable", "pageSize": 5})
        audit_data["shoe_replacement_candidates"] = shoe_search.json().get("data", {}).get("list", [])
        
    print(json.dumps(audit_data))

if __name__ == "__main__":
    asyncio.run(full_audit_and_fix())

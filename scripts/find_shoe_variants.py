
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def search_and_verify_shoes():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    search_query = "Breathable Mesh Walking Shoes Women Solid Color"
    
    async with httpx.AsyncClient() as client:
        # 1. Search for active, variant-rich candidates
        r = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": search_query, "pageSize": 10})
        data = r.json()
        if not data.get("success"):
            print("Search failed")
            return

        candidates = data["data"]["list"]
        results = []
        
        for p in candidates:
            pid = p["pid"]
            # 2. Query detailed variants for each candidate
            rd = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": pid})
            d_data = rd.json()
            if d_data.get("success"):
                p_detail = d_data["data"]
                variants = p_detail.get("variants", [])
                results.append({
                    "pid": pid,
                    "name": p["productNameEn"],
                    "variant_count": len(variants),
                    "price_range": p["sellPrice"],
                    "status": p["saleStatus"],
                    "remark_length": len(p_detail.get("remark", "")),
                    "first_remark_snippet": p_detail.get("remark", "")[:200]
                })
        
        print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(search_and_verify_shoes())

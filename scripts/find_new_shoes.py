
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def find_new_shoes():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # Previous PID for Shoe #84
    old_pid = "1537243912644063232"
    
    async with httpx.AsyncClient() as client:
        # Check old PID
        r_old = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": old_pid})
        old_data = r_old.json()
        
        # New search
        r_new = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": "Breathable Mesh Walking Shoes Lightweight", "pageSize": 5})
        new_data = r_new.json()
        
    print(json.dumps({
        "old_shoe": old_data.get("data") if old_data.get("success") else old_data,
        "new_search": new_data.get("data", {}).get("list", [])
    }))

if __name__ == "__main__":
    asyncio.run(find_new_shoes())

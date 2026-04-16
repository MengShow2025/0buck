
import asyncio
import os
import sys
import json
import httpx

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.services.cj_service import CJDropshippingService

async def audit_images_and_specs():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # Target IDs
    target_ids = [58, 84, 154, 175, 271]
    
    # Mapping our IDs to CJ PIDs from DB
    pids = {
        58: "1693535817710440448",
        84: "1390227365912776704",
        154: "1573295233448816640",
        175: "1455046891434807296",
        271: "C185ED2E-D1EE-46FA-A526-F1D72AA7C41F"
    }
    
    audit_results = {}
    
    for local_id, pid in pids.items():
        print(f"🔎 Auditing CJ PID: {pid} (Local ID: {local_id})")
        url = f"{cj.BASE_URL}/product/query"
        params = {"pid": pid}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            data = response.json()
            if data.get("success"):
                p_data = data.get("data", {})
                audit_results[local_id] = {
                    "title": p_data.get("productNameEn"),
                    "image": p_data.get("productImage"),
                    "video": p_data.get("productVideo"),
                    "weight": p_data.get("productWeight"),
                    "variants": p_data.get("variants", [])[:2], # Just show 2 variants for audit
                    "desc": p_data.get("productDescription")
                }
            else:
                print(f"   ❌ Failed to fetch data for {pid}: {data.get('message')}")
                
    print("\n--- CJ Audit Results ---")
    print(json.dumps(audit_results, indent=2))

if __name__ == "__main__":
    asyncio.run(audit_images_and_specs())

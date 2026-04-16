
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def get_pure_zigbee_images():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # Target PID: 1573295233448816640 (Known Zigbee PID from previous attempt)
    pid = "1573295233448816640"
    
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": pid})
        data = r.json()
        if data.get("success"):
            p_data = data["data"]
            print(json.dumps(json.loads(p_data["productImage"])))

if __name__ == "__main__":
    asyncio.run(get_pure_zigbee_images())

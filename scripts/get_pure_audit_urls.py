
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def get_pure_audit_urls():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # 1. Doodle Smart Zigbee Door Sensor (PID 1705462652346044416)
    # 2. Zigbee Magnetic Door And Window Sensor (PID 1577886435397611520)
    pids = ["1705462652346044416", "1577886435397611520"]
    
    results = {}
    async with httpx.AsyncClient() as client:
        for pid in pids:
            r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": pid})
            data = r.json()
            if data.get("success"):
                p_data = data["data"]
                results[pid] = json.loads(p_data["productImage"])
    print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(get_pure_audit_urls())


import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def get_urls():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    pids = ["1573295233448816640", "1455046891434807296", "1390227365912776704"]
    results = {}
    async with httpx.AsyncClient() as client:
        for pid in pids:
            r = await client.get(f"{cj.BASE_URL}/product/query", headers=headers, params={"pid": pid})
            data = r.json()
            if data.get("success"):
                results[pid] = json.loads(data["data"]["productImage"])
    print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(get_urls())

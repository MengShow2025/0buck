
import asyncio
import os
import sys
import json
import httpx

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
from app.services.cj_service import CJDropshippingService

async def sniper_wave_audit():
    # Credentials from TL and grep
    AK = "071ab8aa912f4788b4db110a2e801430"
    SK = "riB9h8ljuOn2814bJXKjQ"
    
    # Target Categories
    categories = ["Laser Cat Toy", "Pet Grooming Vacuum", "Smart Pet Water Fountain", "GPS Pet Tracker", "Slow Feeder Bowl"]
    
    audit_results = {}
    
    # 1. CJ Sourcing for the categories
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    async with httpx.AsyncClient() as client:
        for cat in categories:
            r = await client.get(f"{cj.BASE_URL}/product/list", headers=headers, params={"productNameEn": cat, "pageSize": 3})
            data = r.json()
            if data.get("success"):
                audit_results[cat] = data["data"]["list"]
                
    print(json.dumps(audit_results))

if __name__ == "__main__":
    asyncio.run(sniper_wave_audit())

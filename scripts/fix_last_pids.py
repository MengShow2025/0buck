
import asyncio
import httpx
import urllib.parse as urlparse

CJ_TOKEN = "API@CJ5226663@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTIyMCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlnZU5BOEs4MWFuc3dMaEduZHdXdFZFZ2RSTTZIZGVUd25tdTZJc1Y5WnF6RFZxY0U3WllMRFBvOTZMSTVnT1RmNjg0endRM1dYc05qMVNvOTVCaXkwWElXTFRwSFRDclUxaHFPYVcyVUludUxaekdNeXdIVkVmZWdiMFNJQUpnSXBXREpPRGswWHdIMXk3ejN1cmx4OVNOcUJaR2dtZGJhemszQkZ0UXBsV3lITllScWJ0ZVZpOUhhUU9RMFJzWVRTUUlSZlZLOEJGVGppdW1YaWZCcTlPdG9yQ1hLMlVYL0o1N3hiWFdQSk94K3c5Vzg3eERPY0NodlJpOFpqNFM0SENyMDdlMEF4QlcwSksrU2ZzKy8zYz0iLCJpYXQiOjE3NzU5MTUzMzJ9.dRRfoACJgf5p-uduWQ09C2YRjCBukFt0vuezs5WeXPo"

async def search_last_pids():
    headers = {"CJ-Access-Token": CJ_TOKEN}
    targets = [
        {"id": 10, "kw": "Austar 8-Ch Programmable Hearing Aid"},
        {"id": 11, "kw": "RSH-CB01 Smart Curtain Robot"},
        {"id": 21, "kw": "Gold Huggie Half Hoop Earrings"}
    ]

    async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
        for t in targets:
            await asyncio.sleep(2.1)
            url = f"https://developers.cjdropshipping.com/api2.0/v1/product/listV2?keyWord={urlparse.quote(t['kw'])}&size=1"
            resp = await client.get(url, headers=headers)
            data = resp.json()
            if data.get("success"):
                content = data.get("data", {}).get("content", [])
                if content:
                    products = content[0].get("productList", [])
                    if products:
                        p = products[0]
                        print(f"ID {t['id']} | PID: {p.get('id')}")
    print("Done searching last PIDs.")

if __name__ == "__main__":
    asyncio.run(search_last_pids())

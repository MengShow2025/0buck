
import asyncio
import httpx
import urllib.parse as urlparse

CJ_TOKEN = "API@CJ5226663@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTIyMCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlnZU5BOEs4MWFuc3dMaEduZHdXdFZFZ2RSTTZIZGVUd25tdTZJc1Y5WnF6RFZxY0U3WllMRFBvOTZMSTVnT1RmNjg0endRM1dYc05qMVNvOTVCaXkwWElXTFRwSFRDclUxaHFPYVcyVUludUxaekdNeXdIVkVmZWdiMFNJQUpnSXBXREpPRGswWHdIMXk3ejN1cmx4OVNOcUJaR2dtZGJhemszQkZ0UXBsV3lITllScWJ0ZVZpOUhhUU9RMFJzWVRTUUlSZlZLOEJGVGppdW1YaWZCcTlPdG9yQ1hLMlVYL0o1N3hiWFdQSk94K3c5Vzg3eERPY0NodlJpOFpqNFM0SENyMDdlMEF4QlcwSksrU2ZzKy8zYz0iLCJpYXQiOjE3NzU5MTUzMzJ9.dRRfoACJgf5p-uduWQ09C2YRjCBukFt0vuezs5WeXPo"

async def search_pids():
    headers = {"CJ-Access-Token": CJ_TOKEN}
    targets = [
        {"id": 18, "kw": "Tilt Out Trash Cabinet"},
        {"id": 16, "kw": "1080P HD Camera Automatic Cat Feeder"},
        {"id": 13, "kw": "Door Sensor T31 KIT"},
        {"id": 12, "kw": "No Kings in America Sticker"},
        {"id": 14, "kw": "Silicone Cable Organizer Clip"},
        {"id": 15, "kw": "Easter Grass Basket Filler"},
        {"id": 20, "kw": "14K Gold Huggie Half Hoop Earrings"},
        {"id": 22, "kw": "License Plate Thumb Screws"},
        {"id": 23, "kw": "Cemetery Vases with Stake"},
        {"id": 24, "kw": "Beeswax Bread Bags Sourdough"},
        {"id": 25, "kw": "Pain Relief Orthotics"},
        {"id": 19, "kw": "140W GaN USB C Charger"}
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
                        print(f"ID {t['id']} | Found: {p.get('nameEn')[:50]} | PID: {p.get('id')}")
                    else:
                        print(f"ID {t['id']} | No product list found for {t['kw']}")
                else:
                    print(f"ID {t['id']} | No content found for {t['kw']}")
            else:
                print(f"ID {t['id']} | API Error: {data.get('message')}")

if __name__ == "__main__":
    asyncio.run(search_pids())

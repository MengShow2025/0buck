
import asyncio
import httpx
import time
import json
import hashlib
import hmac
from typing import Dict, Any, List

# YunExpress Credentials from settings
API_KEY = "1f369c903ef54496a37087f54750b704"
APP_ID = "dfc1ca258327"
CUSTOMER_CODE = "CN0C426905"
API_URL = "https://openapi.yunexpress.cn"

def generate_sign(method: str, uri: str, date_ms: str, body: str = "") -> str:
    params = {
        "body": body,
        "date": date_ms,
        "method": method.upper(),
        "uri": uri
    }
    sorted_keys = sorted(params.keys())
    sign_str = "&".join([f"{k}={params[k]}" for k in sorted_keys])
    
    signature = hmac.new(
        API_KEY.encode('utf-8'),
        sign_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest().upper()
    
    return signature

async def get_access_token() -> str:
    url = f"{API_URL}/openapi/oauth2/token"
    # Try multiple payloads as seen in the service
    payloads = [
        {
            "grantType": "client_credentials",
            "appId": APP_ID,
            "appSecret": API_KEY,
            "sourceKey": CUSTOMER_CODE
        },
        {
            "grant_type": "client_credentials",
            "appid": APP_ID,
            "appsecret": API_KEY,
            "sourcekey": CUSTOMER_CODE
        }
    ]
    async with httpx.AsyncClient() as client:
        # Try JSON
        for payload in payloads:
            try:
                response = await client.post(url, json=payload, timeout=10.0)
                data = response.json()
                if "accessToken" in data:
                    return data["accessToken"]
                print(f"DEBUG TOKEN (JSON): Status {response.status_code} | {data}")
            except Exception as e:
                print(f"Error JSON Token: {e}")
                continue
                
        # Try Form
        for payload in payloads:
            try:
                response = await client.post(url, data=payload, timeout=10.0)
                data = response.json()
                if "accessToken" in data:
                    return data["accessToken"]
                print(f"DEBUG TOKEN (FORM): Status {response.status_code} | {data}")
            except Exception as e:
                print(f"Error FORM Token: {e}")
                continue
                
    raise Exception("Failed to get access token")

async def get_shipping_quote(country_code: str, weight: float, length: float, width: float, height: float) -> List[Dict[str, Any]]:
    token = await get_access_token()
    uri = "/v1/price-trial/get_V2"
    url = f"{API_URL}{uri}"
    
    payload = {
        "country_code": country_code,
        "weight": weight,
        "weight_unit": "KG",
        "package_type": "C", 
        "pieces": 1,
        "length": length,
        "width": width,
        "height": height,
        "size_unit": "CM",
        "origin": "YT-SZ"
    }
    
    date_ms = str(int(time.time() * 1000))
    body_str = json.dumps(payload)
    sign = generate_sign("POST", uri, date_ms, body_str)
    
    headers = {
        "token": token,
        "date": date_ms,
        "sign": sign,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=10.0)
        return response.json().get("data", [])

async def main():
    items = [
        {"name": "Magnet Sheets", "pid": "1600119531720", "weight": 0.020, "dims": (5, 3, 0.5)},
        {"name": "Cable Organizer", "pid": "1600555031419", "weight": 0.010, "dims": (6.6, 2.8, 1)},
        {"name": "Magnetic Cable", "pid": "1601348246405", "weight": 0.050, "dims": (15, 10, 3)}
    ]
    
    results = []
    for item in items:
        print(f"📦 Fetching quote for: {item['name']}...")
        quotes = await get_shipping_quote("US", item['weight'], *item['dims'])
        
        # Find the cheapest/most relevant quote (e.g., standard small parcel)
        standard_quotes = [q for q in quotes if "Standard" in q.get("channelName", "")]
        best_quote = standard_quotes[0] if standard_quotes else (quotes[0] if quotes else None)
        
        if best_quote:
            total_fee = float(best_quote.get("totalFee", 0))
            results.append({
                "pid": item['pid'],
                "name": item['name'],
                "weight": item['weight'],
                "freight": total_fee,
                "channel": best_quote.get("channelName"),
                "delivery_days": best_quote.get("deliveryTime")
            })
        else:
            print(f"   ⚠️ No quote found for {item['name']}")
            
    print("\n🚀 FINAL LOGISTICS AUDIT RESULTS:")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(main())

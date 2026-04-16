import base64
import hmac
import hashlib
import json
import time
import requests
import os
import asyncio
import httpx
import sys

# Amazon Search Config
AMAZON_API_ENDPOINT = "https://api.alphashop.cn/ai.sel.global1688.productSearchApi/1.0"
AMAZON_AK = "071ab8aa912f4788b4db110a2e801430"
AMAZON_SK = "riB9h8ljuOn2814bJXKjQ"

# CJ Search Config
CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"
CJ_EMAIL = "szyungtay@gmail.com"
CJ_API_KEY = "2c0889e00f7a4bd1881989564c3e148c"

def base64url_encode(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def generate_amazon_jwt():
    header = {"alg": "HS256", "typ": "JWT"}
    current_time = int(time.time())
    payload = {
        "iss": AMAZON_AK,
        "exp": current_time + 1800,
        "nbf": current_time - 5
    }
    segments = [
        base64url_encode(json.dumps(header, separators=(',', ':'))),
        base64url_encode(json.dumps(payload, separators=(',', ':')))
    ]
    signing_input = ".".join(segments).encode('utf-8')
    signature = hmac.new(AMAZON_SK.encode('utf-8'), signing_input, hashlib.sha256).digest()
    segments.append(base64url_encode(signature))
    return ".".join(segments)

async def search_amazon(keyword, count=5):
    token = generate_amazon_jwt()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    request_data = {
        "keyword": keyword,
        "platform": "amazon",
        "region": "US",
        "count": count,
        "userId": "123456"
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        for attempt in range(3):
            try:
                response = await client.post(AMAZON_API_ENDPOINT, json=request_data, headers=headers)
                if response.status_code != 200:
                    print(f"Amazon API error (Attempt {attempt+1}): {response.status_code} - {response.text}")
                    await asyncio.sleep(2)
                    continue
                
                result = response.json()
                if not result or not result.get('result', {}).get('success'):
                    print(f"Amazon Search failed (Attempt {attempt+1}): {result.get('result', {}).get('message') if result else 'No result'}")
                    await asyncio.sleep(2)
                    continue
                    
                return result.get('result', {}).get('data', {}).get('productList', [])
            except (httpx.ReadTimeout, httpx.ConnectTimeout) as e:
                print(f"Amazon API timeout/error (Attempt {attempt+1}): {str(e)}")
                await asyncio.sleep(2)
            except Exception as e:
                print(f"Unexpected error (Attempt {attempt+1}): {str(e)}")
                await asyncio.sleep(2)
        return []

async def get_cj_token():
    url = f"{CJ_BASE_URL}/authentication/getAccessToken"
    payload = {
        "email": CJ_EMAIL,
        "password": CJ_API_KEY
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        data = response.json()
        if data.get("success"):
            return data["data"]["accessToken"]
        raise Exception(f"Failed to get CJ access token: {data.get('message')}")

async def search_cj(token, keyword):
    url = f"{CJ_BASE_URL}/product/listV2"
    headers = {
        "CJ-Access-Token": token,
        "Content-Type": "application/json"
    }
    params = {
        "pageNumber": 1,
        "pageSize": 5,
        "keyWord": keyword
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        for attempt in range(3):
            try:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        res_data = data.get("data")
                        if res_data:
                            content = res_data.get("content", [])
                            if content:
                                return content[0].get("productList", [])
                elif response.status_code == 429:
                    print(f"CJ API Rate Limit (429). Sleeping 10s...")
                    await asyncio.sleep(10)
                    continue
                
                # Fallback to list V1 if V2 failed or empty
                url_v1 = f"{CJ_BASE_URL}/product/list"
                params_v1 = {"page": 1, "size": 5, "keyWord": keyword}
                response = await client.get(url_v1, headers=headers, params=params_v1)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        return data.get("data", {}).get("list", [])
                
                await asyncio.sleep(2)
            except (httpx.ReadTimeout, httpx.ConnectTimeout) as e:
                print(f"CJ API timeout/error (Attempt {attempt+1}): {str(e)}")
                await asyncio.sleep(3)
    return []

def clean_price(price_str):
    if not price_str or not isinstance(price_str, str):
        return 0.0
    # Remove "US$", "$", etc.
    clean = price_str.replace("US$", "").replace("$", "").replace(",", "").strip()
    try:
        if " - " in clean:
            return float(clean.split(" - ")[0])
        return float(clean)
    except:
        return 0.0

async def main():
    sub_categories = ["Automatic Laser Cat Toy", "Pet Grooming Vacuum", "Smart Pet Water Fountain", "GPS Pet Tracker", "Slow Feeder Bowl"]
    all_products = []
    
    print("Fetching CJ Token...")
    try:
        cj_token = await get_cj_token()
    except Exception as e:
        print(f"Error: {e}")
        return

    for sub_cat in sub_categories:
        print(f"\nSearching for {sub_cat} on Amazon...")
        amazon_products = await search_amazon(sub_cat, count=5)
        print(f"Found {len(amazon_products)} products on Amazon.")
        
        for p in amazon_products:
            title = p.get('title')
            # Use first 5-8 words for CJ search to increase match chance
            cj_search_term = " ".join(title.split()[:8])
            print(f"  Searching for matching product on CJ: {cj_search_term}...")
            
            cj_matches = await search_cj(cj_token, cj_search_term)
            if not cj_matches:
                # Try even shorter keyword
                cj_search_term = " ".join(title.split()[:4])
                cj_matches = await search_cj(cj_token, cj_search_term)
            
            if cj_matches:
                match = cj_matches[0]
                cj_cost_raw = match.get('sellPrice') or match.get('productSellPrice') or "0"
                cj_cost = clean_price(str(cj_cost_raw))
                
                amazon_price_raw = p.get('sellingPriceMin') or p.get('spItmMidPrice') or "0"
                amazon_price = clean_price(str(amazon_price_raw))
                
                if amazon_price > 0 and cj_cost > 0:
                    zero_buck_price = round(amazon_price * 0.6, 2)
                    roi = round(zero_buck_price / cj_cost, 2)
                    
                    product_entry = {
                        "category": "Pet Supplies",
                        "sub_category": sub_cat,
                        "amazon_title": title,
                        "amazon_price": amazon_price,
                        "0buck_price": zero_buck_price,
                        "cj_pid": match.get('id') or match.get('pid'),
                        "cj_cost": cj_cost,
                        "roi": roi,
                        "tag": "pet_batch_v7_1"
                    }
                    all_products.append(product_entry)
                    print(f"    Matched: {match.get('productNameEn') or match.get('productName')} | Price: ${cj_cost} | ROI: {roi}")
                else:
                    print(f"    Skipping due to zero price: Amazon(${amazon_price}), CJ(${cj_cost})")
            else:
                print(f"    No match found on CJ.")
            
            # Rate limit mitigation
            await asyncio.sleep(2)

    output_path = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/deliverables/batch_v7_1/pet_supplies.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_products, f, indent=2, ensure_ascii=False)
    
    print(f"\nSuccessfully saved {len(all_products)} products to {output_path}")

if __name__ == "__main__":
    asyncio.run(main())

import json
import requests
import os
import re
import time

# CJ Config
CJ_EMAIL = "szyungtay@gmail.com"
CJ_API_KEY = "2c0889e00f7a4bd1881989564c3e148c"
CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"

def get_cj_token():
    url = f"{CJ_BASE_URL}/authentication/getAccessToken"
    payload = {"email": CJ_EMAIL, "password": CJ_API_KEY}
    response = requests.post(url, json=payload)
    data = response.json()
    if data.get("success"):
        return data["data"]["accessToken"]
    else:
        print(f"Failed to get CJ token: {data}")
        return None

def search_cj_product(token, keyword):
    url = f"{CJ_BASE_URL}/product/listV2"
    headers = {"CJ-Access-Token": token}
    params = {"keyWord": keyword, "pageNumber": 1, "pageSize": 1}
    try:
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        if data.get("success") and data.get("data") and data["data"].get("content"):
            products = data["data"]["content"][0].get("productList", [])
            if products:
                return products[0]
        # Fallback to V1
        url_v1 = f"{CJ_BASE_URL}/product/list"
        params_v1 = {"keyWord": keyword, "page": 1, "size": 1}
        response = requests.get(url_v1, headers=headers, params=params_v1)
        data = response.json()
        if data.get("success") and data.get("data") and data["data"].get("list"):
            return data["data"]["list"][0]
    except Exception as e:
        print(f"Error searching CJ for '{keyword}': {e}")
    return None

def parse_price(price_str):
    if not price_str or price_str == "N/A":
        return 0.0
    # Handle range "US$57.64 ~ US$60.01"
    if " ~ " in price_str:
        price_str = price_str.split(" ~ ")[0]
    match = re.search(r"[\d\.]+", price_str)
    if match:
        return float(match.group())
    return 0.0

def parse_cj_cost(cost_raw):
    if not cost_raw:
        return 0.0
    cost_str = str(cost_raw)
    if " -- " in cost_str:
        return float(cost_str.split(" -- ")[1])
    match = re.search(r"[\d\.]+", cost_str)
    if match:
        return float(match.group())
    return 0.0

def process():
    token = get_cj_token()
    if not token:
        return

    categories = [
        ("Beauty & Personal Care", "LED Light Therapy Mask", "beauty_led_mask.json"),
        ("Beauty & Personal Care", "Electric Guasha", "beauty_electric_guasha.json"),
        ("Beauty & Personal Care", "Makeup Brush Cleaner", "beauty_makeup_brush_cleaner.json"),
        ("Beauty & Personal Care", "Water Flosser", "beauty_water_flosser.json"),
        ("Beauty & Personal Care", "Hair Curler", "beauty_hair_curler.json"),
    ]

    base_dir = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/deliverables/batch_v7_1/"
    final_products = []

    for cat, sub_cat, filename in categories:
        file_path = os.path.join(base_dir, filename)
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        with open(file_path, 'r') as f:
            data = json.load(f)
            products = data.get("result", {}).get("data", {}).get("productList", [])
            
            # Take top 5
            for p in products[:5]:
                title = p.get("title")
                amazon_price = parse_price(p.get("sellingPriceMin"))
                
                # Search CJ
                # Use a simplified title for better matching (first 5 words)
                search_query = " ".join(title.split()[:5])
                cj_p = search_cj_product(token, search_query)
                
                if cj_p:
                    cj_pid = cj_p.get("pid") or cj_p.get("id")
                    cj_cost = parse_cj_cost(cj_p.get("sellPrice") or cj_p.get("productSellPrice"))
                else:
                    cj_pid = "N/A"
                    cj_cost = 0.0

                buck_price = round(amazon_price * 0.6, 2)
                roi = round(buck_price / cj_cost, 2) if cj_cost > 0 else 0.0

                final_products.append({
                    "category": cat,
                    "sub_category": sub_cat,
                    "amazon_title": title,
                    "amazon_price": amazon_price,
                    "0buck_price": buck_price,
                    "cj_pid": cj_pid,
                    "cj_cost": cj_cost,
                    "roi": roi,
                    "tag": "beauty_personal_care"
                })
                print(f"Processed: {title[:50]}... | CJ Cost: {cj_cost} | ROI: {roi}")
                time.sleep(0.5) # Rate limiting

    output_path = os.path.join(base_dir, "beauty_personal_care.json")
    with open(output_path, 'w') as f:
        json.dump(final_products, f, indent=2)
    
    print(f"\nSaved {len(final_products)} products to {output_path}")

if __name__ == "__main__":
    process()

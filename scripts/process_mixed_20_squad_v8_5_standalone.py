import os
import asyncio
import httpx
import json
import logging
from decimal import Decimal
from datetime import datetime

# Config
API_KEY = "sk-acw-2595eca9-6f979794c2335614"
BASE_URL = "https://api.aicodewith.com/v1"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP_NAME = "pxjkad-zt"

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("0BuckMixedSquad")

mixed_squad = [
    {"pid": "1601295461177", "tier": "MAGNET", "amz": 19.99, "cat": "Auto Tools"},
    {"pid": "1601114568956", "tier": "MAGNET", "amz": 25.00, "cat": "Hand Tools"},
    {"pid": "1601231330502", "tier": "MAGNET", "amz": 35.00, "cat": "Beauty Tools"},
    {"pid": "11000014411482", "tier": "MAGNET", "amz": 29.90, "cat": "Office Supplies"},
    {"pid": "1601132977125", "tier": "MAGNET", "amz": 89.00, "cat": "Outdoor Gear"},
    {"pid": "1601443430997", "tier": "NORMAL", "amz": 499.00, "cat": "Auto Tools"},
    {"pid": "1600202722927", "tier": "NORMAL", "amz": 145.00, "cat": "Office Furniture"},
    {"pid": "1601104499479", "tier": "NORMAL", "amz": 180.00, "cat": "Outdoor Gear"},
    {"pid": "1600780250174", "tier": "NORMAL", "amz": 159.00, "cat": "Beauty Instruments"},
    {"pid": "1601091673550", "tier": "NORMAL", "amz": 59.00, "cat": "Power Tools"},
    {"pid": "1600517351386", "tier": "NORMAL", "amz": 65.00, "cat": "Pet Appliances"},
    {"pid": "1601124773821", "tier": "NORMAL", "amz": 45.00, "cat": "Personal Care"},
    {"pid": "1601290753597", "tier": "NORMAL", "amz": 320.00, "cat": "Auto Tools"},
    {"pid": "11000005642572", "tier": "NORMAL", "amz": 199.00, "cat": "Office Furniture"},
    {"pid": "1601712678934", "tier": "REBATE", "amz": 299.00, "cat": "Outdoor Gear"},
    {"pid": "1601683319649", "tier": "REBATE", "amz": 850.00, "cat": "Auto Tools"},
    {"pid": "1601058092402", "tier": "REBATE", "amz": 120.00, "cat": "Power Tools"},
    {"pid": "1600238743226", "tier": "REBATE", "amz": 199.00, "cat": "Beauty Instruments"},
    {"pid": "60694595500", "tier": "REBATE", "amz": 250.00, "cat": "Office Furniture"},
    {"pid": "1601586430587", "tier": "REBATE", "amz": 75.00, "cat": "Pet Appliances"}
]

async def call_llm(prompt: str, model="gpt-4o-mini"):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{BASE_URL.rstrip('/')}/chat/completions", json=payload, headers=headers)
        if resp.status_code != 200:
            print(f"❌ LLM Error: {resp.text}")
            resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()

async def process():
    print("🚀 [v8.5 Standalone] Processing 20 Mixed Items...")
    for item in mixed_squad:
        print(f"   ⚙️ Item: {item['cat']} - PID: {item['pid']}")
        
        # 1. Solution Hook
        hook_prompt = f"Analyze: Generic {item['cat']} with quality issues. Create a 3-5 word Solution Hook addressing 'feels cheap' or 'poor quality'. Output ONLY the 3-5 words."
        try:
            hook = await call_llm(hook_prompt)
        except:
            hook = "Industrial Grade Truth"
            
        title = f"{item['cat']} Professional Model {item['pid']} - {hook} | Industrial Grade | 0Buck Verified Artisan"
        
        # 2. Category Mapping
        cat_prompt = f"Map '{title}' to a Category ID (SNAKE_CASE) and friendly Category Name. Output ONLY JSON: {{'category_id': '...', 'category_name': '...'}}"
        try:
            cat_raw = await call_llm(cat_prompt)
            if "```json" in cat_raw:
                cat_raw = cat_raw.split("```json")[1].split("```")[0].strip()
            cat_info = json.loads(cat_raw.replace("'", '"'))
        except:
            cat_info = {"category_id": "GENERAL", "category_name": item['cat']}
            
        # 3. Pricing
        sale_price = 0.0 if item['tier'] == "MAGNET" else round(item['amz'] * 0.6, 2)
        compare_at = round(item['amz'] * 0.95, 2)
        
        # 4. Shopify Sync
        payload = {
            "product": {
                "title": title,
                "body_html": f"<p>v8.5 Truth Narrative for {item['cat']}. Verified Artisan Quality.</p>",
                "vendor": "0Buck Verified Artisan",
                "product_type": cat_info.get('category_name', item['cat']),
                "status": "active",
                "tags": f"LOC-US, {item['tier']}, v8.5, {cat_info.get('category_id', 'GENERAL')}",
                "variants": [{
                    "price": str(sale_price),
                    "compare_at_price": str(compare_at),
                    "sku": f"0B-{item['pid']}",
                    "inventory_quantity": 100,
                    "inventory_management": "shopify"
                }],
                "images": [{"src": "https://s.alicdn.com/@sc04/kf/H71f5ef64e1e1492bbf92f9ad6de969c9i.jpg"}]
            }
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"https://{SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json", json=payload, headers={"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN})
            if resp.status_code == 201:
                print(f"      ✅ Synced: {cat_info.get('category_name', item['cat'])}")
            else:
                print(f"      ❌ Failed: {resp.text}")
        await asyncio.sleep(0.5)

if __name__ == "__main__":
    asyncio.run(process())

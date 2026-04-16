import asyncio
import os
import json
import logging
from decimal import Decimal

# Config
API_KEY = "sk-acw-2595eca9-6f979794c2335614"
BASE_URL = "https://api.aicodewith.com/v1"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP_NAME = "pxjkad-zt"

# 0Buck v8.5: Mixed Category Audit Dataset (20 items provided by Expert)
audit_dataset = [
    {"pid": "1601295461177", "tax": "320%", "pain": "Poor connectivity, fake chips", "tier": "MAGNET", "cat": "Auto Tools"},
    {"pid": "1601634136333", "tax": "280%", "pain": "Slow inflation, overheating", "tier": "MAGNET", "cat": "Auto Tools"},
    {"pid": "1601229593377", "tax": "350%", "pain": "Fake brightness, short battery", "tier": "MAGNET", "cat": "Outdoor Gear"},
    {"pid": "1601132977125", "tax": "400%", "pain": "Weak frame, complex setup", "tier": "MAGNET", "cat": "Outdoor Gear"},
    {"pid": "1601443430997", "tax": "180%", "pain": "High subscription fees, brand tax", "tier": "NORMAL", "cat": "Auto Tools"},
    {"pid": "1600202722927", "tax": "250%", "pain": "Wobbly lift, high markup", "tier": "NORMAL", "cat": "Office Furniture"},
    {"pid": "1600780250174", "tax": "380%", "pain": "No cooling, skin irritation", "tier": "NORMAL", "cat": "Beauty Instruments"},
    {"pid": "1601586430587", "tax": "560%", "tax_label": "Social Vanity Tax", "pain": "App disconnects, overpriced", "tier": "REBATE", "cat": "Pet Appliances"}
]

async def call_llm(prompt: str, model="gpt-4o-mini"):
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.0}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{BASE_URL.rstrip('/')}/chat/completions", json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()

async def batch_reconstruct():
    print(f"🚀 [v8.5 Soul Reconstruction] Batch Processing 20 Truth Assets...")
    import httpx
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for item in audit_dataset:
            print(f"   🔥 Auditing {item['cat']} - PID: {item['pid']} (Tax: {item['tax']})")
            
            # Narrative prompt based on v8.5 Five-Stage Template
            narrative_prompt = f"""
            Generate a v8.5 0Buck Narrative for this product:
            Category: {item['cat']}
            PID: {item['pid']}
            Brand Tax: {item['tax']}
            Pain Point to Smash: {item['pain']}
            
            Structure:
            1. [The Disruption]: Attack the {item['tax']} Brand Tax.
            2. [The Transformation]: Describe the lag-free/perfect experience.
            3. [The Supply Chain Truth]: Direct factory truth.
            4. [The Fulfillment Shield]: US Warehouse stock.
            5. [The Evidence]: 1:1 Physical match.
            """
            
            try:
                narrative = await call_llm(narrative_prompt)
                hook_prompt = f"Create a 3-word solution hook for {item['cat']} solving '{item['pain']}'. Output only the words."
                hook = await call_llm(hook_prompt)
                
                title = f"{item['cat']} Professional Model - {hook} | US Stock | 0Buck Verified"
                
                # Pricing logic
                sale_price = 0.0 if item['tier'] == "MAGNET" else 49.99 # Simplified for test
                
                sh_payload = {
                    "product": {
                        "title": title,
                        "body_html": narrative.replace("\n", "<br>"),
                        "vendor": "0Buck Verified Artisan",
                        "product_type": item['cat'],
                        "status": "active",
                        "tags": f"LOC-US, {item['tier']}, v8.5, {item['cat'].replace(' ', '_').upper()}",
                        "variants": [{"price": str(sale_price), "sku": f"0B-{item['pid']}", "inventory_quantity": 100, "inventory_management": "shopify"}],
                        "images": [{"src": "https://s.alicdn.com/@sc04/kf/H71f5ef64e1e1492bbf92f9ad6de969c9i.jpg"}]
                    }
                }
                
                resp = await client.post(f"https://{SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json", json=sh_payload, headers={"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN})
                if resp.status_code == 201:
                    print(f"      ✅ Soul Reconstructed & Synced: {item['pid']}")
                else:
                    print(f"      ❌ Sync Failed: {resp.text}")
                    
            except Exception as e:
                print(f"      ❌ Processing Error: {e}")
                
            await asyncio.sleep(0.5)

if __name__ == "__main__":
    asyncio.run(batch_reconstruct())

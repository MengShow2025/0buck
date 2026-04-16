import asyncio
import os
import json
import logging
import httpx
from decimal import Decimal

# Config
API_KEY = "sk-acw-2595eca9-6f979794c2335614"
BASE_URL = "https://api.aicodewith.com/v1"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP_NAME = "pxjkad-zt"

# 0Buck v8.5.3 Mixed Category Audit Dataset (Remaining 13)
mixed_squad = [
    {"pid": "1600928302175", "tax": "250%", "pain": "Fake capacity, short life", "tier": "NORMAL", "cat": "Auto Tools", "amz": 85.00, "creds": "Grade A Battery Cells, 1000+ Cycle Audit"},
    {"pid": "1600606615977", "tax": "300%", "pain": "Weak pump, leaking", "tier": "NORMAL", "cat": "Auto Tools", "amz": 110.00, "creds": "Heavy Duty Copper Motor, High-Pressure Seal Protocol"},
    {"pid": "11000021925399", "tax": "320%", "pain": "Modified sine wave, damages electronics", "tier": "NORMAL", "cat": "Outdoor Power", "amz": 549.00, "creds": "Pure Sine Wave Tech, UL-Certified Inverter"},
    {"pid": "1601665039555", "tax": "280%", "pain": "High heat, fake power rating", "tier": "NORMAL", "cat": "Outdoor Power", "amz": 480.00, "creds": "Real 500W Peak, Advanced Thermal Logic"},
    {"pid": "1601403830660", "tax": "340%", "pain": "Fake waterproof, fragile hook", "tier": "NORMAL", "cat": "Outdoor Lighting", "amz": 45.00, "creds": "TPU Waterproof Seal, 50kg Hook Load Tested"},
    {"pid": "1601615644636", "tax": "300%", "pain": "Low solar conversion, dim light", "tier": "NORMAL", "cat": "Outdoor Lighting", "amz": 59.00, "creds": "Monocrystalline Solar, 22% Conversion Efficiency"},
    {"pid": "1601706421074", "tax": "520%", "pain": "Slow updates, brand monopoly", "tier": "REBATE", "cat": "Auto Tools", "amz": 899.00, "creds": "Open Protocol V2.0, Real-Time Update Bridge"},
    {"pid": "1601665084906", "tax": "680%", "pain": "Fails to jump start, low peak current", "tier": "REBATE", "cat": "Auto Tools", "amz": 129.00, "creds": "2500A Peak Current, Low-Temp Cell Tech"},
    {"pid": "1600948553486", "tax": "450%", "pain": "Short cycle life, unsafe", "tier": "REBATE", "cat": "Outdoor Power", "amz": 599.00, "creds": "LiFePO4 Chemistry, 10 Year Service Life"},
    {"pid": "1601564721313", "tax": "510%", "pain": "Low safety, poor build", "tier": "REBATE", "cat": "Outdoor Power", "amz": 650.00, "creds": "BMS Protection V3.0, Fireproof Case Material"},
    {"pid": "1600700939363", "tax": "480%", "pain": "Fast battery drain in cold", "tier": "REBATE", "cat": "Outdoor Power", "amz": 720.00, "creds": "Low-Temp Resilience, High-Density Lithium"},
    {"pid": "1600320733662", "tax": "420%", "pain": "High latency, connection drift", "tier": "REBATE", "cat": "Auto Tools", "amz": 95.00, "creds": "AptX Low Latency, Dual-Antenna Bridge"},
    {"pid": "1601683469796", "tax": "720%", "pain": "Overpriced brand service fees", "tier": "REBATE", "cat": "Auto Tools", "amz": 1200.00, "creds": "Global Protocol Unlocked, Lifetime Free Updates"}
]

# Assets mapping (Pre-fetched)
with open("scripts/pilot_20_assets.json", "r") as f:
    ASSETS = json.load(f)

async def call_llm(prompt: str, model="deepseek-v3.2"):
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.3}
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers)
            return resp.json()["choices"][0]["message"]["content"].strip() if resp.status_code == 200 else "Soul Narrative Generation Failed."
        except: return "Soul Narrative Generation Failed."

async def process():
    async with httpx.AsyncClient(timeout=60.0) as client:
        for item in mixed_squad:
            pid = item['pid']
            asset = ASSETS.get(pid, {})
            image_url = asset.get("image", "https://s.alicdn.com/@sc04/kf/H71f5ef64e1e1492bbf92f9ad6de969c9i.jpg")
            narrative = await call_llm(f"v8.5.3 Soul Narrative for {item['cat']} ({pid}). Price ${item['amz']}, Tax {item['tax']}, Pain: {item['pain']}, Creds: {item['creds']}. Industrial, NO ALIBABA.")
            hook = await call_llm(f"3-5 word Solution Hook for {item['cat']} solving '{item['pain']}'. No period.")
            sale_price = 0.0 if item['tier'] == "MAGNET" else round(item['amz'] * 0.6, 2)
            compare_at = round(item['amz'] * 0.95, 2)
            title = f"{item['cat']} Professional Grade - {hook} | 0Buck Verified"
            body_html = f"""<div class="obuck-truth-table"><table style="width:100%; border-collapse: collapse; margin-bottom: 20px; font-family: monospace; border: 1px solid #000;"><tr style="background-color: #000; color: #fff;"><th style="padding: 10px; text-align: left; font-size: 14px;">TRUTH PROTOCOL</th><th style="padding: 10px; text-align: left; font-size: 14px;">AUDIT RESULT</th></tr><tr><td style="border: 1px solid #000; padding: 10px;"><b>Origin</b></td><td style="border: 1px solid #000; padding: 10px;">US Fulfillment Center (3-5 Day)</td></tr><tr><td style="border: 1px solid #000; padding: 10px;"><b>Audit</b></td><td style="border: 1px solid #000; padding: 10px;">0Buck Artisan Protocol [LOCKED]</td></tr><tr><td style="border: 1px solid #000; padding: 10px;"><b>Credential</b></td><td style="border: 1px solid #000; padding: 10px;">{item['creds']}</td></tr></table></div>""" + narrative.replace("\n", "<br>")
            sh_payload = {"product": {"title": title, "body_html": body_html, "vendor": "0Buck Verified Artisan", "product_type": item['cat'], "status": "active", "tags": f"LOC-US, {item['tier']}, v8.5.3, {item['cat'].replace(' ', '_').upper()}", "variants": [{"price": str(sale_price), "compare_at_price": str(compare_at), "sku": f"0B-{pid}", "inventory_quantity": 100, "inventory_management": "shopify"}], "images": [{"src": image_url}]}}
            headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
            resp = await client.post(f"https://{SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json", json=sh_payload, headers=headers)
            print(f"✅ {pid}" if resp.status_code == 201 else f"❌ {pid}: {resp.text}")
            await asyncio.sleep(0.5)

if __name__ == "__main__": asyncio.run(process())

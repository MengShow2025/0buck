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

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("0BuckBatch1")

# 0Buck v8.5.3 Mixed Category Audit Dataset (Batch 1: 1-10)
mixed_squad = [
    {"pid": "1601295461177", "tax": "320%", "pain": "Poor connectivity, fake chips", "tier": "MAGNET", "cat": "Auto Tools", "amz": 19.99, "creds": "Certified ISO9001 Factory, V1.5 Genuine Chipset"},
    {"pid": "1601634136333", "tax": "280%", "pain": "Slow inflation, overheating", "tier": "MAGNET", "cat": "Auto Tools", "amz": 25.00, "creds": "15y OEM Experience, Dual-Core Pressure Pump"},
    {"pid": "1601426240173", "tax": "300%", "pain": "App crashes, slow connection", "tier": "MAGNET", "cat": "Auto Tools", "amz": 22.00, "creds": "High-Density Silicon, FCC/CE Certified"},
    {"pid": "1601229593377", "tax": "350%", "pain": "Fake brightness, short battery", "tier": "MAGNET", "cat": "Outdoor Gear", "amz": 35.00, "creds": "Cree LED Partner Factory, 5000mAh Battery Audit"},
    {"pid": "1601609455105", "tax": "320%", "pain": "Fragile port, not waterproof", "tier": "MAGNET", "cat": "Outdoor Gear", "amz": 28.00, "creds": "IPX7 Waterproof Rated, Reinforced ABS Shell"},
    {"pid": "1600798477689", "tax": "300%", "pain": "Feels plastic, fragile", "tier": "MAGNET", "cat": "Outdoor Gear", "amz": 32.00, "creds": "Aerospace Grade Aluminum, Lifetime Frame Warranty"},
    {"pid": "1601443430997", "tax": "180%", "pain": "High subscription, brand tax", "tier": "NORMAL", "cat": "Auto Tools", "amz": 499.00, "creds": "Tier-1 Diagnostic OEM, No-Subscription Protocol"},
    {"pid": "1600928302175", "tax": "250%", "pain": "Fake capacity, short life", "tier": "NORMAL", "cat": "Auto Tools", "amz": 85.00, "creds": "Grade A Battery Cells, 1000+ Cycle Audit"},
    {"pid": "1600606615977", "tax": "300%", "pain": "Weak pump, leaking", "tier": "NORMAL", "cat": "Auto Tools", "amz": 110.00, "creds": "Heavy Duty Copper Motor, High-Pressure Seal Protocol"},
    {"pid": "11000021925399", "tax": "320%", "pain": "Modified sine wave, damages electronics", "tier": "NORMAL", "cat": "Outdoor Power", "amz": 549.00, "creds": "Pure Sine Wave Tech, UL-Certified Inverter"}
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
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    async with httpx.AsyncClient(timeout=60.0) as client:
        for item in mixed_squad:
            pid = item['pid']
            asset = ASSETS.get(pid, {})
            image_url = asset.get("image", "https://s.alicdn.com/@sc04/kf/H71f5ef64e1e1492bbf92f9ad6de969c9i.jpg")
            narrative = await call_llm(f"v8.5.3 Soul Narrative for {item['cat']} ({pid}). Price ${item['amz']}, Tax {item['tax']}, Pain: {item['pain']}, Creds: {item['creds']}. Industrial, NO ALIBABA.")
            hook = await call_llm(f"3-5 word Solution Hook for {item['cat']} solving '{item['pain']}'. English.")
            sale_price = 0.0 if item['tier'] == "MAGNET" else round(item['amz'] * 0.6, 2)
            compare_at = round(item['amz'] * 0.95, 2)
            title = f"{item['cat']} Professional Grade - {hook} | 0Buck Verified"
            body_html = f"""<div class="obuck-truth-table"><table style="width:100%; border-collapse: collapse; margin-bottom: 20px; font-family: monospace; border: 1px solid #000;"><tr style="background-color: #000; color: #fff;"><th style="padding: 10px; text-align: left; font-size: 14px;">TRUTH PROTOCOL</th><th style="padding: 10px; text-align: left; font-size: 14px;">AUDIT RESULT</th></tr><tr><td style="border: 1px solid #000; padding: 10px;"><b>Origin</b></td><td style="border: 1px solid #000; padding: 10px;">US Fulfillment Center (3-5 Day)</td></tr><tr><td style="border: 1px solid #000; padding: 10px;"><b>Audit</b></td><td style="border: 1px solid #000; padding: 10px;">0Buck Artisan Protocol [LOCKED]</td></tr><tr><td style="border: 1px solid #000; padding: 10px;"><b>Credential</b></td><td style="border: 1px solid #000; padding: 10px;">{item['creds']}</td></tr></table></div>""" + narrative.replace("\n", "<br>")
            sh_payload = {"product": {"title": title, "body_html": body_html, "vendor": "0Buck Verified Artisan", "product_type": item['cat'], "status": "active", "tags": f"LOC-US, {item['tier']}, v8.5.3, {item['cat'].replace(' ', '_').upper()}", "variants": [{"price": str(sale_price), "compare_at_price": str(compare_at), "sku": f"0B-{pid}", "inventory_quantity": 100, "inventory_management": "shopify"}], "images": [{"src": image_url}]}}
            resp = await client.post(f"https://{SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json", json=sh_payload, headers=headers)
            print(f"✅ {pid}" if resp.status_code == 201 else f"❌ {pid}: {resp.text}")
            await asyncio.sleep(0.5)

if __name__ == "__main__": asyncio.run(process())

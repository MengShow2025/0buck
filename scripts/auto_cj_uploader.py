import os
import sys
import json
import requests
import time
import re
from sqlalchemy import create_engine, text
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

# Configuration from .env
SHOP_URL = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
API_VERSION = "2024-01"
DB_URI = os.getenv("DATABASE_URL")

def get_new_cj_candidates():
    engine = create_engine(DB_URI)
    with engine.connect() as conn:
        query = text("""
            SELECT id, title_zh, source_url, source_platform, profit_ratio, estimated_sale_price, images, 
                   title_en_preview, description_zh, desire_hook, desire_logic, desire_closing, 
                   amazon_price, amazon_compare_at_price, is_cashback_eligible, structural_data, logistics_data
            FROM candidate_products 
            WHERE status = 'approved' AND source_platform = 'CJ'
        """)
        result = conn.execute(query)
        return result.fetchall()

def mark_as_published(candidate_id, shopify_product_id):
    engine = create_engine(DB_URI)
    with engine.connect() as conn:
        query = text("UPDATE candidate_products SET status = 'published', evidence = :evidence WHERE id = :id")
        evidence = json.dumps({"shopify_id": shopify_product_id, "timestamp": time.time()})
        conn.execute(query, {"id": candidate_id, "evidence": evidence})
        conn.commit()

def create_shopify_product(title, price, compare_at_price, tags, image_urls, sku, roi, is_cashback, enriched_data, raw_description_html, logistics_data):
    url = f"https://{SHOP_URL}/admin/api/{API_VERSION}/products.json"
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    
    # Extract weight & size
    weight = 0.0
    weight_unit = "kg"
    packing_info = ""
    if logistics_data:
        try:
            logis = json.loads(logistics_data) if isinstance(logistics_data, str) else logistics_data
            shipping = logis.get("shipping", {})
            weight = float(shipping.get("product_weight", 0) or 0)
            weight_unit = shipping.get("weight_unit", "kg")
            p_size = shipping.get("packing_size", {})
            if p_size and p_size.get("length"):
                packing_info = f" | Size: {p_size['length']}x{p_size['width']}x{p_size['height']} {p_size['unit']}"
        except: pass

    def clean_label(text):
        if not text: return ""
        # Remove [The Hook], Hook:, [The Logic], etc.
        return re.sub(r'^\[?The (?:Hook|Logic|Closing|Contract)\]?:?\s*', '', text, flags=re.IGNORECASE).strip()

    # 0Buck Brand Vibe - Professional & Natural
    rebate_block = ""
    if is_cashback:
        rebate_block = f"""
        <div style="border: 1px solid #d00; padding: 15px; border-radius: 8px; margin: 25px 0; background: #fff1f0; color: #cf1322;">
            <p style="font-weight: bold; font-size: 16px; margin: 0;">Verified Artisan Rebate Eligible</p>
            <p style="font-size: 14px; margin-top: 5px;">Unlock a 100% rebate of ${price:.2f} through our signature 20-phase journey. Excellence, delivered direct.</p>
        </div>
        """
    
    narrative = clean_label(enriched_data.get("description_en") or "")
    hook_text = clean_label(enriched_data.get("desire_hook") or "")
    logic_text = clean_label(enriched_data.get("desire_logic") or "We've bypassed traditional retail markups to bring you direct artisan quality.")
    closing_text = clean_label(enriched_data.get("desire_closing") or "Crafted for quality. Priced for wisdom.")
    title_en = clean_label(enriched_data.get("title_en") or title)

    body_html = f"""
    <div class="0buck-experience-v5" style="max-width: 800px; margin: 0 auto; line-height: 1.7; color: #222; font-family: 'Inter', -apple-system, sans-serif;">
        <div class="intro-section" style="margin-bottom: 40px;">
            <h1 style="font-size: 28px; font-weight: 800; color: #000; margin-bottom: 15px;">{title_en}</h1>
            <p style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 20px;">{hook_text}</p>
            
            <div style="font-size: 16px; color: #555; margin-bottom: 25px;">
                {narrative}
            </div>
            
            {rebate_block}
            
            <div style="background: #fff; border: 2px solid #eee; border-radius: 12px; padding: 25px; margin: 30px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                <h3 style="margin-top: 0; font-size: 18px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Market Efficiency Audit</h3>
                <div style="display: flex; align-items: baseline; gap: 20px; margin-top: 15px;">
                    <div style="flex: 1;">
                        <span style="color: #999; font-size: 12px;">Market Reference Price</span><br>
                        <span style="text-decoration: line-through; color: #bbb; font-size: 20px;">${compare_at_price:.2f}</span>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <span style="color: #000; font-size: 12px; font-weight: 600;">0Buck Artisan Value</span><br>
                        <span style="color: #d00; font-size: 32px; font-weight: 900;">${price:.2f}</span>
                    </div>
                </div>
                <p style="margin-top: 15px; color: #52c41a; font-weight: 600; font-size: 14px;">✓ Real Sourcing Value: Direct-to-Consumer Efficiency.</p>
            </div>
            
            <p style="font-size: 15px; color: #444; font-style: italic;">{logic_text}</p>
        </div>

        <div style="background: #fffbe6; border: 1px solid #ffe58f; padding: 12px 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; font-size: 13px; color: #856404;">⚖️ <strong>Verified Physical Specs:</strong> Net Weight {weight} {weight_unit}{packing_info} (Artisan Standard)</p>
        </div>

        <div class="product-story" style="border-top: 1px solid #eee; padding-top: 40px; margin-top: 40px;">
            <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 25px;">Detailed Documentation</h3>
            <div class="raw-content" style="font-size: 15px; color: #444;">
                {raw_description_html}
            </div>
        </div>

        <div class="brand-footer" style="background: #fafafa; border-radius: 10px; padding: 30px; margin-top: 50px; text-align: center; border: 1px solid #f0f0f0;">
            <p style="margin: 0; font-weight: 700; color: #000;">🚀 0Buck Global Fulfillment</p>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">{closing_text}</p>
            <p style="font-size: 11px; color: #ccc; margin-top: 25px; letter-spacing: 1px;">ID: {sku} | VERIFIED ARTISAN STANDARD v5.7</p>
        </div>
    </div>
    """
    
    images = [{"src": img} for img in image_urls[:10]]
    payload = {
        "product": {
            "title": f"{title_en} | 0Buck Artisan",
            "body_html": body_html,
            "vendor": "0Buck Verified Artisan",
            "tags": tags,
            "variants": [
                {
                    "price": f"{price:.2f}",
                    "compare_at_price": f"{compare_at_price:.2f}",
                    "sku": sku,
                    "inventory_management": "shopify",
                    "inventory_quantity": 999,
                    "weight": weight,
                    "weight_unit": weight_unit
                }
            ],
            "images": images
        }
    }
    
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 201:
        return response.json()['product']['id']
    else:
        print(f"❌ Shopify Error: {response.text}")
        return None

def process_batch():
    candidates = get_new_cj_candidates()
    if not candidates:
        print("No candidates.")
        return

    for c in candidates:
        # c: id, title_zh, url, platform, roi, sale_price, images, t_en, d_en, hook, logic, closing, m_sell, m_list, is_cb, struct, logis
        c_id, title, url, platform, roi, sale_price, images_json, t_en, d_en, hook, logic, closing, m_sell, m_list, is_cb, struct_json, logis_json = c
        
        try:
            raw_sell = float(m_sell or 0)
            raw_list = float(m_list or 0)
            compare_at = raw_list if raw_list > 0 else raw_sell
            
            if raw_sell <= 0:
                print(f"   🚫 Skipping {title[:20]}: Missing real Selling Price.")
                continue
            
            price = float(round(Decimal(str(raw_sell)) * Decimal("0.6"), 2))
        except Exception as e:
            continue
        
        is_cashback = bool(is_cb)
        tags = "0buck-verified, cj-safe-path"
        if is_cashback: tags += ", rebate-eligible"
        else: tags += ", value-only"
        
        sku = url.split('/')[-1].split('.')[0] if url else f"CJ-{c_id}"
        
        # Parse Images (Robust Regex Cleanup)
        image_urls = []
        try:
            raw_str = str(images_json)
            image_urls = re.findall(r'https?://[^\s"\'\[\]<>]+(?:\.jpe?g|\.png|\.webp|\.gif|\.JPG|\.PNG)', raw_str)
            image_urls = list(dict.fromkeys(image_urls))
        except: image_urls = []
        
        if not image_urls: image_urls = ["https://m.media-amazon.com/images/I/61N9p7XU2jL._SL1500_.jpg"]
            
        struct_data = {}
        try: struct_data = json.loads(struct_json) if isinstance(struct_json, str) else (struct_json or {})
        except: pass
        raw_description_html = struct_data.get("description_html", "")
        
        enriched_data = {
            "title_en": t_en, "description_en": d_en,
            "desire_hook": hook, "desire_logic": logic, "desire_closing": closing
        }
        
        print(f"🚀 Processing: {t_en or title}")
        shopify_id = create_shopify_product(title, price, compare_at, tags, image_urls, sku, roi, is_cashback, enriched_data, raw_description_html, logis_json)
        if shopify_id:
            mark_as_published(c_id, shopify_id)
            print(f"✅ Published: {shopify_id}")

if __name__ == "__main__":
    process_batch()

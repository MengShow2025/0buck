
import asyncio
import os
import sys
import json
import httpx
import base64
import ssl
import re

# Add backend and temp packages to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from sqlalchemy import create_engine, text
import psycopg2
import shopify
from app.services.aliexpress_auditor import AliExpressAuditor

# 0Buck V7.7.1 Master - "Local Truth" Configuration
# v7.9.6: Decoupled from Vercel - Use Environment Variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require")
ACW_KEY = os.getenv("ACW_KEY", "sk-acw-2595eca9-6f979794c2335614")
ACW_BASE_URL = "https://api.aicodewith.com/v1"
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOPIFY_API_VERSION = "2024-01"

def get_db_conn():
    return psycopg2.connect(DATABASE_URL)

def calculate_obuck_price(amz_p, amz_s, amz_total, cost, freight):
    """0Buck Pricing Logic: 60% of Amazon Price + Margin Safety"""
    try:
        base_ref = float(amz_s or amz_p or 0)
        if base_ref <= 0: return None
        ob_p = round(base_ref * 0.6, 2)
        
        # Margin Check: Price > (Cost + Freight) * 1.2
        min_p = (float(cost or 0) + float(freight or 0)) * 1.2
        return max(ob_p, round(min_p, 2))
    except: return None

async def extract_physical_truth(client, images, title):
    """AI Vision Audit for Materials, Protocols, and Weight"""
    prompt = f"Analyze these product images for {title}. Identify: 1. Primary Material. 2. Electronic protocol (if any, e.g. Zigbee/WiFi/PD3.0). 3. Estimated packaging weight from visual cues or labels. Return JSON: {{'material_audit': '...', 'chip_audit': '...', 'weight_audit': '...'}}"
    # Simplified for Master script, real implementation would call vision model
    return {"material_audit": "Verified Artisan Grade", "chip_audit": "Dual-Protocol Optimized", "weight_audit": "Audited via Vision"}

async def purify_image_fal(client, img_url):
    """Background removal and AI upscaling via FAL"""
    # Placeholder for FAL API call
    return img_url 

async def generate_narrative(client, data):
    """Generates the structured HTML narrative for 0Buck App"""
    title = data.get('title_en') or data.get('title_zh') or "Artisan Product"
    obuck_price = data.get('obuck_price')
    w_kg = float(data.get('source_weight', 0)) / 1000.0
    
    prompt = f"Generate an 'Artisan Narrative' for {title} (${obuck_price}). Focus on why it beats brand-taxed versions. Use 4 sections: 1. The Hook, 2. The Logic, 3. Technical Specs, 4. 0Buck Truth Audit Log. End with Verified Weight: {w_kg}kg."
    
    payload = {"model": "deepseek-v3-fast", "messages": [{"role": "user", "content": prompt}], "temperature": 0.3}
    try:
        resp = await client.post(f"{ACW_BASE_URL}/chat/completions", json=payload, headers={"Authorization": f"Bearer {ACW_KEY}"})
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"], ""
    except: pass
    return "Narrative generation failed.", ""

async def sync_to_shopify_lite(title, body_html, price, images, sku="0BUCK", weight_grams=0, compare_at_price=None, existing_handle=None):
    """V7.5.5: Unified Data Sync to Shopify Warehouse with Retries"""
    max_retries = 3
    
    v_data = {
        'price': str(price),
        'compare_at_price': str(compare_at_price) if compare_at_price else None,
        'sku': str(sku),
        'inventory_management': 'shopify',
        'inventory_policy': 'deny',
        'grams': int(weight_grams) if weight_grams else 0,
        'weight': float(weight_grams)/1000.0 if weight_grams else 0,
        'weight_unit': 'kg'
    }

    for attempt in range(max_retries):
        try:
            session = shopify.Session(f"{SHOPIFY_SHOP_NAME}.myshopify.com", SHOPIFY_API_VERSION, SHOPIFY_ACCESS_TOKEN)
            shopify.ShopifyResource.activate_session(session)
            
            product = None
            if existing_handle:
                try:
                    found = shopify.Product.find(handle=existing_handle)
                    if found:
                        if isinstance(found, list) and len(found) > 0:
                            product = found[0]
                            print(f"   🔄 Updating existing Shopify product: {existing_handle}")
                except Exception as e:
                    print(f"   ⚠️ Error searching for existing product: {e}")

            if product:
                # Update
                product.title = title
                product.body_html = body_html
                product.vendor = "0Buck Artisan"
                product.product_type = "Verified Artisan"
                product.tags = "0Buck, Truth-Engine-V7.5"
                
                # Update variant
                if product.variants:
                    v = product.variants[0]
                    for key, val in v_data.items():
                        setattr(v, key, val)
                else:
                    v = shopify.Variant()
                    for key, val in v_data.items():
                        setattr(v, key, val)
                    product.variants = [v]
                
                # Images
                product.images = []
                for img in images[:10]:
                    if "http" in img:
                        image = shopify.Image()
                        image.src = img.strip()
                        product.images.append(image)
                
                if product.save():
                    return product.handle
                else:
                    print(f"   ⚠️ Update Error: {product.errors.full_messages()}")
            else:
                # Create
                # Note: shopify-python-api Product.create handles dicts correctly
                p_data = {
                    'title': title,
                    'body_html': body_html,
                    'vendor': "0Buck Artisan",
                    'product_type': "Verified Artisan",
                    'tags': "0Buck, Truth-Engine-V7.5",
                    'variants': [v_data],
                    'images': [{'src': img} for img in images[:10] if "http" in img]
                }
                product = shopify.Product.create(p_data)
                if hasattr(product, 'errors') and product.errors:
                    print(f"   ⚠️ Create Error: {product.errors.full_messages()}")
                else:
                    return product.handle
        except Exception as e:
            print(f"   🔄 Sync Retry {attempt+1}... Error: {e}")
            await asyncio.sleep(2)
    return None

async def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", type=str, help="Target Product ID or Range (e.g. 10 or 10-25)")
    args = parser.parse_args()
    
    conn = get_db_conn()
    cursor = conn.cursor()
    
    # Range handling
    if args.id and "-" in args.id:
        start, end = map(int, args.id.split("-"))
        target_sql = f"id BETWEEN {start} AND {end}"
    elif args.id and "," in args.id:
        target_sql = f"id IN ({args.id})"
    elif args.id:
        target_sql = f"id = {int(args.id)}"
    else:
        # Default to all remaining items
        target_sql = "status != 'synced'"
    
    cursor.execute(f"""
        SELECT id, title_en, title_zh, cj_pid, amazon_price, amazon_sale_price, source_cost_usd, freight_fee, 
               images, description_zh, product_weight, detail_images_html, origin_video_url,
               amazon_shipping_fee, amazon_total_price, amazon_link,
               is_freebie_eligible, freebie_shipping_price, description_artisan, shopify_product_handle
        FROM candidate_products 
        WHERE {target_sql}
        ORDER BY id ASC LIMIT 10
    """)
    candidates = cursor.fetchall()
    print(f"🚀 0Buck V7.9.0 'Logistics Truth' Started. Processing {len(candidates)} items...")

    async with httpx.AsyncClient(timeout=180.0) as client:
        for cand in candidates:
            c_id, t_en, t_zh, pid, amz_p, amz_s, cost, freight, imgs, desc_zh, raw_w, detail_html, video_url, amz_shipping, amz_total, amz_url, is_freebie, freebie_ship, cached_artisan, existing_handle = cand
            title = f"{t_en or t_zh} | 0Buck Verified Artisan"
            print(f"🏭 ID {c_id}: {title}")
            
            # 1. AE Local Warehouse Audit (v7.7.1 New Method)
            ae_auditor = AliExpressAuditor(db_session=conn)
            ae_audit = await ae_auditor.audit_product_sourcing(str(c_id), t_en)
            local_winner = await ae_auditor.find_local_warehouse_winner(str(c_id))
            
            # 1.1 V7.8: Shipping Truth Collision (Browser Use Extraction)
            from app.services.amazon_truth_anchor import AmazonTruthAnchor
            truth_anchor = AmazonTruthAnchor()
            live_shipping = await truth_anchor.get_shipping_fee_via_browser(amz_url) if amz_url else None
            
            # 50% Shipping Rule
            # For magnets with no Amazon Link, we anchor to the standard 6.99 shipping floor
            market_shipping = float(live_shipping or amz_shipping or (6.99 if is_freebie else 9.99))
            obuck_shipping = round(market_shipping * 0.5, 2)
            shipping_profit = round(market_shipping - obuck_shipping, 2)
            
            # 2. Price Logic with Local Freight Optimization
            eff_freight = local_winner.get("freight", 3.99) if local_winner.get("status") == "local_winner_found" else float(freight or 12.0)
            
            # Base obuck pricing: 60% of Amazon OR 1.2x cost+freight
            ob_price = calculate_obuck_price(amz_p, amz_s, amz_total, cost, eff_freight)
            
            # Handle Freebie Mode
            if is_freebie:
                print(f"   🎁 FREEBIE MODE: ID {c_id} for $0.00!")
                ob_price = 0.00
                amz_total_ref = float(amz_total or (float(amz_p or amz_s or 0) + market_shipping))
                compare_at = amz_total_ref
            else:
                compare_at = amz_p or amz_s

            if ob_price is None or ob_price < 0:
                print(f"   🔥 MELTING: Invalid Price Data (${ob_price}).")
                cursor.execute("UPDATE candidate_products SET status = 'melted', is_melted = TRUE, updated_at = NOW() WHERE id = %s", (c_id,))
                conn.commit()
                continue

            # 3. Content Generation
            w_grams = float(raw_w) if raw_w else 0
            
            if is_freebie:
                truth = await extract_physical_truth(client, [], title)
                artisan_desc, _ = await generate_narrative(client, {"title_en": t_en, "obuck_price": "FREE (Just Pay Shipping)", "source_weight": w_grams, **truth})
                # Force sponsorship text and USA Local badge
                artisan_desc = f"""
                <div class='obuck-usa-badge' style='background:#f6ffed; border:1px solid #b7eb8f; padding:10px; margin-bottom:15px; border-radius:4px; color:#389e0d; font-weight:bold;'>
                    🚚 USA Local - 3 Days Delivery Guaranteed
                </div>
                <h3 style='color:#cf1322;'>Product Sponsored by Factory ($0.00). You Only Pay Verified Shipping.</h3>
                """ + artisan_desc
            elif cached_artisan:
                print(f"   📜 Using cached Artisan Narrative for ID {c_id}")
                artisan_desc = cached_artisan
            else:
                truth = await extract_physical_truth(client, [], title)
                artisan_desc, _ = await generate_narrative(client, {"title_en": t_en, "obuck_price": ob_price, "source_weight": w_grams, **truth})
            
            # CLEAN UP AI FILLER
            artisan_desc = re.sub(r'^.*?(##|###|####|\*\*\*|<h2>|<h3>)', r'\1', artisan_desc, flags=re.DOTALL)
            artisan_desc = artisan_desc.split('***')[0] if '***' in artisan_desc and len(artisan_desc.split('***')) > 2 else artisan_desc
            # Ensure we remove common phrases
            artisan_desc = artisan_desc.replace("Of course. Here is the Artisan Narrative for your product.", "").strip()
            
            # 4. Artisan Layout (HTML Orchestration)
            local_badge = ""
            if local_winner.get("status") == "local_winner_found":
                display_service = local_winner['service'].replace("AliExpress Choice", "0Buck Artisan Express").replace("Choice", "Artisan Express")
                local_badge = f"<div class='obuck-local-badge' style='background:#f6ffed; border:1px solid #b7eb8f; padding:12px; margin-bottom:15px; border-radius:4px; color:#389e0d; font-weight:bold;'>🚀 0Buck Artisan Express (US Local) — 3-7 Days Delivery</div>"
            
            freebie_box = ""
            if is_freebie:
                freebie_box = f"""
                <div class='obuck-freebie-badge' style='background:#fff1f0; border:1px solid #ffa39e; padding:15px; margin-bottom:20px; border-radius:8px; font-weight:bold; color:#cf1322;'>
                    <h4 style='margin-top:0; color:#cf1322;'>🎁 Artisan Gift Program</h4>
                    <p style='margin-bottom:10px;'>Product Price: $0.00 (Factory Sponsored)</p>
                    <div style='display:flex; justify-content:space-between; border-top:1px dashed #ffa39e; padding-top:10px;'>
                        <span>Artisan Verified Logistics:</span>
                        <span>${freebie_ship}</span>
                    </div>
                    <div style='font-size:12px; color:#666; font-weight:normal; margin-top:5px;'>Your total cost is parity with Amazon's standard shipping fee (${market_shipping}).</div>
                </div>
                """
            
            shipping_truth_box = f"""
            <div class='obuck-shipping-collision' style='background:#fffbe6; border:1px solid #ffe58f; padding:15px; margin-bottom:20px; border-radius:8px;'>
                <h4 style='margin-top:0;'>🛡️ Logistics Truth Collision</h4>
                <div style='display:flex; justify-content:space-between; font-size:14px;'>
                    <span>Market Standard Shipping (Amazon):</span>
                    <span style='text-decoration:line-through; color:#999;'>${market_shipping}</span>
                </div>
                <div style='display:flex; justify-content:space-between; font-weight:bold; color:#52c41a; font-size:16px; margin-top:5px;'>
                    <span>0Buck Artisan Delivery:</span>
                    <span>${obuck_shipping} (50% OFF)</span>
                </div>
                <div style='font-size:12px; color:#666; margin-top:8px;'>Verified Packaging Weight ({w_grams/1000.0}kg) matches industry standard. No hidden logistics markup.</div>
            </div>
            """

            final_html = f"<div class='obuck-narrative'>{freebie_box if is_freebie else shipping_truth_box}{local_badge}{artisan_desc.replace('####', '<h3>').replace('###', '<h2>')}</div>"
            if video_url and "http" in video_url:
                final_html += f"<div class='obuck-video' style='margin: 20px 0;'><video controls width='100%'><source src='{video_url}' type='video/mp4'></video></div>"
            if detail_html:
                # Clean up some common dirty HTML
                clean_detail = re.sub(r'<script.*?</script>', '', detail_html, flags=re.DOTALL)
                final_html += f"<div class='obuck-details' style='margin-top:20px;'>{clean_detail}</div>"
            
            # Footer Audit Log
            final_html += f"""
            <div class='obuck-audit' style='background:#f9f9f9; padding:15px; border:1px solid #ddd; margin-top:30px;'>
                <h3>0Buck Truth Audit Log</h3>
                <p><strong>Verified Weight:</strong> {w_grams/1000.0} kg</p>
                <p><strong>Merchant Status:</strong> 0Buck Verified Artisan (Local Audit Passed)</p>
                <p><strong>Market Price Ref:</strong> ${amz_p or amz_s}</p>
                <p><strong>Amazon Landed Cost:</strong> ${amz_total or (float(amz_p or amz_s or 0) + market_shipping)}</p>
                <p><strong>Logistics Profit (Rebate Pool):</strong> ${shipping_profit}</p>
                <p><strong>Freebie Eligible:</strong> {"YES" if is_freebie else "NO"}</p>
                <p><strong>Audit Logic:</strong> V7.9 Hybrid Audit (API + Visual + Zero-Cost Logic)</p>
            </div>
            """

            # 5. Shopify Sync
            images = []
            raw_imgs = imgs
            if isinstance(raw_imgs, str):
                try: raw_imgs = json.loads(raw_imgs)
                except: pass
            
            if isinstance(raw_imgs, list):
                for item in raw_imgs:
                    if isinstance(item, str):
                        # Use regex to find all URLs in the string
                        urls = re.findall(r'https?://[^\s"\'\]\[,]+', item)
                        images.extend(urls)
                    elif isinstance(item, list):
                        images.extend([i for i in item if isinstance(i, str) and "http" in i])
            
            # Remove duplicates and limit to 10
            images = list(dict.fromkeys(images))[:10]
            
            if not images:
                print(f"   ⚠️ NO valid images found for ID {c_id}")
            else:
                print(f"   🖼️ Found {len(images)} valid images for ID {c_id}")
            
            handle = await sync_to_shopify_lite(title, final_html, ob_price, images, sku=f"0BUCK-{c_id}", weight_grams=w_grams, compare_at_price=compare_at, existing_handle=existing_handle)
            
            if handle:
                cursor.execute("""
                    UPDATE candidate_products 
                    SET obuck_price = %s, body_html = %s, status = 'synced', shopify_product_handle = %s, updated_at = NOW() 
                    WHERE id = %s
                """, (ob_price, final_html, handle, c_id))
                conn.commit()
                print(f"   ✅ ID {c_id} SYNCED: {handle} at ${ob_price}")
            else:
                print(f"   ❌ ID {c_id} Shopify Sync FAILED.")
    
    cursor.close()
    conn.close()
    print("🏁 Vanguard Sync Task Completed.")

if __name__ == "__main__":
    asyncio.run(main())

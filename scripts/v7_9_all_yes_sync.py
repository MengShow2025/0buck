
import asyncio
import os
import sys
import json
import httpx
import ssl
import re
import pg8000
import urllib.parse as urlparse

# Add backend to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require")
ACW_KEY = os.getenv("ACW_KEY", "sk-acw-2595eca9-6f979794c2335614")
ACW_BASE_URL = "https://api.aicodewith.com/v1"
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

def get_db_conn():
    url = urlparse.urlparse(DATABASE_URL)
    return pg8000.connect(
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or 5432,
        database=url.path[1:],
        ssl_context=ssl.create_default_context()
    )

async def sync_to_shopify(title, body_html, price, images, sku, weight_grams, compare_at_price=None, tags=None, existing_id=None):
    """V7.9 Unified Shopify Sync with Tagging and Update Support"""
    url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json"
    method = "POST"
    
    if existing_id:
        url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products/{existing_id}.json"
        method = "PUT"
    
    payload = {
        "product": {
            "title": title,
            "body_html": body_html,
            "vendor": "0Buck Artisan",
            "product_type": "Artisan Gift",
            "status": "active",
            "tags": tags,
            "images": [{"src": img} for img in images],
            "variants": [{
                "price": str(price),
                "sku": sku,
                "weight": weight_grams / 1000.0,
                "weight_unit": "kg",
                "compare_at_price": str(compare_at_price) if compare_at_price else None,
                "inventory_management": "shopify",
                "inventory_policy": "continue",
                "inventory_quantity": 999
            }]
        }
    }
    
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN, "Content-Type": "application/json"}
    async with httpx.AsyncClient() as client:
        try:
            if method == "PUT":
                resp = await client.put(url, json=payload, headers=headers)
            else:
                resp = await client.post(url, json=payload, headers=headers)
            
            if resp.status_code in (200, 201):
                return resp.json()["product"]["handle"], resp.json()["product"]["id"]
        except Exception as e:
            print(f"Shopify Sync Error: {e}")
    return None, None

async def generate_narrative(title, price, weight_kg, amz_p):
    """Generates the structured HTML narrative for 0Buck App via ACW API"""
    prompt = f"Generate a high-quality 'Artisan Narrative' in English for {title} (0Buck Price: ${price}). \n" \
             f"Highlight the value compared to Amazon's ${amz_p}. \n" \
             f"Use these sections: \n" \
             f"1. [The Hook] Catchy intro. \n" \
             f"2. [The Logic] Why it's a 'Factory Sponsored' item. \n" \
             f"3. [Technical Specs] Material, weight ({weight_kg}kg), features. \n" \
             f"4. [0Buck Truth Audit Log] Display verified weight: {weight_kg}kg and market price: ${amz_p}."
    
    payload = {"model": "deepseek-v3-fast", "messages": [{"role": "user", "content": prompt}], "temperature": 0.3}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{ACW_BASE_URL}/chat/completions", json=payload, headers={"Authorization": f"Bearer {ACW_KEY}"}, timeout=30.0)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                # Convert markdown to HTML tags
                content = content.replace("####", "<h3>").replace("###", "<h2>").replace("##", "<h1>")
                return f"<div class='obuck-narrative'>{content}</div>"
        except Exception as e:
            print(f"Narrative Generation Error: {e}")
    return f"<div><h2>{title}</h2><p>Experience artisan quality without the brand tax.</p></div>"

async def main():
    conn = get_db_conn()
    cur = conn.cursor()
    
    # Process 'audit_pending', 'new', 'approved' and 'synced' (for backfill)
    cur.execute("SELECT id, title_en, title_zh, cost_cny, amazon_price, amazon_compare_at_price, images, cj_pid, shopify_product_handle, product_weight, warehouse_anchor, shopify_product_id, body_html FROM candidate_products WHERE status IN ('audit_pending', 'new', 'approved', 'synced') LIMIT 10")
    candidates = cur.fetchall()
    
    if not candidates:
        print("No pending candidates found.")
        return

    print(f"Found {len(candidates)} candidates to process.")
    
    for row in candidates:
        c_id, title_en, title_zh, cost, amz_p, amz_compare, images_json, cj_pid, existing_handle, p_weight, anchor, s_id, old_body = row
        print(f"Processing ID {c_id}: {title_en or title_zh}")
        
        # Check if already has v8.0 Truth Table
        if old_body and "fulfillment-truth" in old_body:
            print(f"   ⏩ Skipping ID {c_id}: Already has Truth Table.")
            continue
        
        # 1. Image Processing
        images = []
        if isinstance(images_json, str):
            try: images = json.loads(images_json)
            except: pass
        elif isinstance(images_json, list):
            images = images_json
        
        # Clean images
        images = [img for img in images if isinstance(img, str) and img.startswith("http")][:10]
        if not images:
            print(f"   ⚠️ Skipping ID {c_id}: No valid images.")
            continue

        # 2. Title Selection
        title = title_en or title_zh or f"0Buck Artisan Item {c_id}"
        
        # 3. Pricing Logic (Magnet Default)
        # Use existing logic from Vanguard: 0Buck Price = 0.0 for Magnets, or 60% of Amazon
        amz_ref = float(amz_p or 15.99)
        ob_price = 0.0 if amz_ref < 15.0 else round(amz_ref * 0.6, 2)
        compare_at = float(amz_compare or amz_ref * 1.5)
        
        # 4. Weight Audit
        w_grams = p_weight or 200.0 # Default 200g
        
        # 4.5 Tags Generation (Simplified v8.0)
        tag_list = ["Artisan-Express"]
        warehouse = str(anchor or "CN")
        tag_list.extend([t.strip() for t in warehouse.split(",")])
            
        # 0-Buck-Eligible Rule: Must be Local (Not just CN)
        is_local = "CN" not in warehouse or len(warehouse.split(",")) > 1
        if ob_price == 0 and is_local:
            tag_list.append("0-Buck-Eligible")
            
        tags_str = ", ".join(list(set(tag_list))) 
        
        # 5. Narrative Generation + v8.0 Fulfillment Route Table
        print(f"   🤖 Generating narrative for {title[:20]}...")
        raw_narrative = await generate_narrative(title, ob_price, w_grams/1000.0, amz_ref)
        
        # v8.0 Truth Protocol: Inject Fulfillment Route Table
        local_codes = [t.strip() for t in warehouse.split(",") if t.strip() != "CN"]
        is_truly_local = len(local_codes) > 0
        shipping_days = "3-7 Days (Local)" if is_truly_local else "10-15 Days (Global)"
        origin_display = warehouse if is_truly_local else "Global (CN)"
        
        route_table = f'''
        <div class="fulfillment-truth" style="margin-bottom: 25px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; font-family: sans-serif;">
            <div style="background: #F3F4F6; padding: 10px 15px; font-weight: 700; font-size: 0.9em; text-transform: uppercase; color: #374151;">Fulfillment Route</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #E5E7EB;">
                <div style="padding: 10px 15px; border-right: 1px solid #E5E7EB;">
                    <span style="display: block; font-size: 0.75em; color: #6B7280; text-transform: uppercase;">Origin</span>
                    <span style="font-weight: 600;">{origin_display} Warehouse</span>
                </div>
                <div style="padding: 10px 15px;">
                    <span style="display: block; font-size: 0.75em; color: #6B7280; text-transform: uppercase;">Speed</span>
                    <span style="font-weight: 600;">{shipping_days}</span>
                </div>
            </div>
            <div style="padding: 10px 15px; border-top: 1px solid #E5E7EB; background: #FFFBEB;">
                <span style="display: block; font-size: 0.75em; color: #D97706; text-transform: uppercase;">Truth Protocol</span>
                <span style="font-weight: 500; font-size: 0.85em; color: #92400E;">Verified Local Inventory. Ships directly from source to minimize carbon & cost.</span>
            </div>
        </div>
        '''
        body_html = f"{route_table}{raw_narrative}"
        
        # 6. Shopify Sync
        print(f"   🚀 Syncing to Shopify: {title[:20]} with Tags: {tags_str}")
        handle, new_s_id = await sync_to_shopify(title, body_html, ob_price, images, f"0BUCK-{c_id}", w_grams, compare_at, tags_str, s_id)
        await asyncio.sleep(1.0) 
        
        if handle:
            cur.execute("""
                UPDATE candidate_products 
                SET status = 'synced', shopify_product_handle = %s, shopify_product_id = %s, obuck_price = %s, body_html = %s, updated_at = NOW() 
                WHERE id = %s
            """, (handle, new_s_id, ob_price, body_html, c_id))
            conn.commit()
            print(f"   ✅ ID {c_id} SYNCED as {handle} (ID: {new_s_id})")
        else:
            print(f"   ❌ ID {c_id} Sync FAILED")

    cur.close()
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())

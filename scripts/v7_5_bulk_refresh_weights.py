
import asyncio
import os
import sys
import json
import httpx
import shopify
import pg8000
import ssl
import urllib.parse
from sqlalchemy import create_engine, text

# 0Buck V7.5 Master Environment
DATABASE_URL = "postgresql+pg8000://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
ACW_KEY = "sk-acw-2595eca9-6f979794c2335614"
ACW_BASE_URL = "https://api.aicodewith.com/v1"
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOPIFY_API_VERSION = "2024-01"

def get_conn():
    # v7.5.2: Ultra-Stable Direct Neon Connection
    import urllib.parse
    parsed = urllib.parse.urlparse(DATABASE_URL)
    return pg8000.connect(
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path.lstrip('/'),
        ssl_context=True # Use default pg8000 SSL
    )

async def generate_narrative_with_weight(client, data):
    """Refreshed Narrative with Mandatory Weight Audit"""
    obuck_price = data.get("obuck_price", 0)
    title = data.get("title_en") or data.get("title_zh") or "Artisan Product"
    weight_kg = float(data.get("weight", 0)) / 1000.0 if data.get("weight") else 0
    
    prompt = f"""
    Generate an "Artisan Narrative" for 0Buck.
    
    Context:
    - Product: {title}
    - Calculated 0Buck Price: ${obuck_price}
    - Source Weight (Ground Truth): {data.get('weight')}g
    - Materials: {data.get('material_audit')}
    - Specs: {data.get('chip_audit')}, {data.get('count_audit')}, {data.get('weight_audit')}
    
    Instructions:
    1. Start with "#### 1. The Hook (Breaking the Bubble)".
    2. Continue with "#### 2. The Logic (Physical Identity)".
    3. Include "#### 3. Technical Specs".
    4. MANDATORY: "#### 4. 0Buck Truth Audit Log".
       - FIRST LINE: "Verified Packaging Weight: {weight_kg} kg"
       - This is critical for dispute prevention.
    5. 100% English. Minimalist & Objective.
    """
    
    payload = {
        "model": "deepseek-v3-fast",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3
    }
    
    try:
        resp = await client.post(f"{ACW_BASE_URL}/chat/completions", json=payload, headers={"Authorization": f"Bearer {ACW_KEY}"})
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
    except: pass
    return None

async def main():
    conn = get_conn()
    cursor = conn.cursor()
    
    # 1. Get already synced products
    cursor.execute("""
        SELECT id, title_en, title_zh, product_weight, material_audit, chip_audit, count_audit, weight_audit, 
               obuck_price, shopify_product_handle, cj_pid
        FROM candidate_products 
        WHERE status = 'synced' AND shopify_product_handle IS NOT NULL
    """)
    synced_items = cursor.fetchall()
    print(f"📦 Found {len(synced_items)} synced products to refresh weight...")
    
    session = shopify.Session(f"{SHOPIFY_SHOP_NAME}.myshopify.com", SHOPIFY_API_VERSION, SHOPIFY_ACCESS_TOKEN)
    shopify.ShopifyResource.activate_session(session)
    
    async with httpx.AsyncClient(timeout=180.0) as client:
        for item in synced_items:
            c_id, t_en, t_zh, p_weight, m_audit, ch_audit, co_audit, w_audit, ob_price, handle, pid = item
            print(f"🔄 Refreshing ID {c_id}: {t_en} (Weight: {p_weight}g)")
            
            # A. Generate new narrative
            cand_data = {
                "title_en": t_en, "title_zh": t_zh, "weight": p_weight, "obuck_price": ob_price,
                "material_audit": m_audit, "chip_audit": ch_audit, "count_audit": co_audit, "weight_audit": w_audit
            }
            new_desc = await generate_narrative_with_weight(client, cand_data)
            
            if not new_desc:
                print(f"   ⚠️ Narrative generation failed for ID {c_id}")
                continue
            
            # B. Update Shopify
            try:
                # Handle can be title-handle or ID. Find by handle is more robust.
                sp = shopify.Product.find(handle)
                if not sp:
                    # Try find by title if ID/handle mismatch
                    products = shopify.Product.find(title=t_en)
                    if products: sp = products[0]
                
                if sp:
                    sp.body_html = new_desc
                    # Update variant weight
                    if sp.variants:
                        v = sp.variants[0]
                        v.grams = int(weight) if weight else 0
                        v.weight = float(weight)/1000.0 if weight else 0
                        v.weight_unit = 'kg'
                    
                    if sp.save():
                        # C. Update DB
                        cursor.execute("UPDATE candidate_products SET description_artisan = %s, body_html = %s WHERE id = %s", (new_desc, new_desc, c_id))
                        conn.commit()
                        print(f"   ✅ ID {c_id} Refreshed Successfully.")
                    else:
                        print(f"   ❌ Shopify Save Failed for ID {c_id}: {sp.errors.full_messages()}")
                else:
                    print(f"   ⚠️ Shopify Product Not Found: {handle}")
            except Exception as e:
                print(f"   ❌ Error updating ID {c_id}: {str(e)}")
                
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())

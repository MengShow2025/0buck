import os
import sys
import json

# Add custom packages path first
sys.path.append('/tmp/v7_packages_311')

import shopify
from sqlalchemy import create_engine, text
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

SHOP_URL = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
API_VERSION = "2024-01"
DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def push_approved_v7():
    # 1. Setup Shopify
    session = shopify.Session(SHOP_URL, API_VERSION, ACCESS_TOKEN)
    shopify.ShopifyResource.activate_session(session)
    
    # 2. Setup DB
    engine = create_engine(DATABASE_URL)
    
    print("🚀 v7.0 Truth Engine: Pushing Approved Candidates to Shopify...")
    
    with engine.connect() as conn:
        res = conn.execute(text("SELECT * FROM candidate_products WHERE status = 'approved'"))
        approved = res.fetchall()
        
        for cand in approved:
            try:
                print(f"   📤 Processing: {cand.title_zh}...")
                
                # Truth UI Logic
                amazon_price = float(cand.amazon_sale_price or 0.0)
                # 0Buck price formula: Amazon * 0.6 or Landing * 1.5
                obuck_price = float(round(Decimal(str(amazon_price)) * Decimal("0.6"), 2))
                savings = amazon_price - obuck_price
                savings_pct = int((savings / amazon_price) * 100) if amazon_price > 0 else 0
                
                truth_ui = f"""
                <div class="truth-audit-block" style="background: #fff; border: 2px solid #000; padding: 25px; margin-bottom: 35px; border-radius: 4px; box-shadow: 8px 8px 0px #000;">
                    <div style="text-transform: uppercase; font-size: 11px; font-weight: 900; letter-spacing: 2px; color: #666; margin-bottom: 15px;">🔍 Truth Audit: #{cand.id}</div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <div style="font-size: 13px; color: #999;">Market Reference (Amazon)</div>
                            <div style="font-size: 24px; text-decoration: line-through; color: #bbb;">${amazon_price:.2f}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 13px; color: #000; font-weight: 700;">0Buck Verified Price</div>
                            <div style="font-size: 42px; font-weight: 900; color: #D946EF;">${obuck_price:.2f}</div>
                        </div>
                    </div>
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <div style="color: #059669; font-weight: 700; font-size: 15px;">✓ You Save: ${savings:.2f} ({savings_pct}% Brand Tax Removed)</div>
                        <div style="background: #000; color: #fff; padding: 4px 10px; font-size: 11px; font-weight: 700;">VERIFIED PHYSICAL TRUTH</div>
                    </div>
                </div>
                """
                
                # Simple Shopify Product Create
                sp = shopify.Product()
                sp.title = f"0Buck Verified Artisan: {cand.title_zh}"
                sp.body_html = truth_ui + (cand.description_en or cand.description_zh or "")
                sp.vendor = "0Buck Verified Artisan"
                sp.tags = f"source_CJ, {cand.entry_tag}, {cand.category_name or 'General'}"
                sp.status = "active"
                
                # 3. Images (Strict 1:1 Identity Lock)
                images_json = cand.images
                image_urls = []
                if isinstance(images_json, str) and images_json.startswith('['):
                    try:
                        image_urls = json.loads(images_json)
                    except:
                        import re
                        image_urls = re.findall(r'https?://[^\s"\'\[\]<>]+(?:\.jpe?g|\.png|\.webp)', images_json)
                elif isinstance(images_json, list):
                    image_urls = images_json
                
                # Deduplicate and limit
                image_urls = list(dict.fromkeys([img for img in image_urls if img]))[:10]
                
                # Explicit position and identity tagging
                sp.images = [
                    {
                        "src": img, 
                        "position": idx + 1,
                        "alt": f"0BUCK_AUDIT_{cand.id}_POS_{idx + 1}"
                    } 
                    for idx, img in enumerate(image_urls)
                ]
                
                # Variant
                v = shopify.Variant({
                    "price": str(obuck_price),
                    "compare_at_price": str(amazon_price),
                    "sku": cand.cj_pid,
                    "inventory_management": "shopify",
                    "inventory_quantity": 999
                })
                sp.variants = [v]
                
                if sp.save():
                    print(f"   ✅ Published: {sp.id}")
                    conn.execute(text("UPDATE candidate_products SET status = 'synced', evidence = :ev WHERE id = :id"), 
                                 {"id": cand.id, "ev": json.dumps({"shopify_id": sp.id, "pushed_at": "v7.0"})})
                    conn.commit()
                else:
                    print(f"   ❌ Error: {sp.errors.full_messages()}")
            except Exception as e:
                print(f"   ❌ Error pushing {cand.id}: {e}")
                
    shopify.ShopifyResource.clear_session()
    print("✨ v7.0 Push Complete.")

if __name__ == "__main__":
    push_approved_v7()

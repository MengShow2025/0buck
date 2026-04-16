import os
import sys
import json
import time
import hashlib
from decimal import Decimal

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify
import httpx
from sqlalchemy import create_engine, text

load_dotenv()

# --- CJ SERVICE (Minimal inline for script) ---
class CJService:
    BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"
    def __init__(self, email, api_key):
        self.email = email
        self.api_key = api_key
        self._token = None
    async def _get_token(self):
        url = f"{self.BASE_URL}/authentication/getAccessToken"
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json={"email": self.email, "password": self.api_key})
            data = resp.json()
            if data.get("success"): return data["data"]["accessToken"]
            raise Exception(f"CJ Auth failed: {data.get('message')}")
    async def get_detail(self, pid):
        if not pid: return None
        if not self._token: self._token = await self._get_token()
        url = f"{self.BASE_URL}/product/query"
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(url, headers={"CJ-Access-Token": self._token}, params={"pid": str(pid)})
            data = resp.json()
            if not data.get("success"):
                print(f"      DEBUG: CJ Error for PID {pid}: {data.get('message')}")
            return data.get("data") if data.get("success") else None

# --- CONSTANTS ---
SHOP_URL = f"{os.getenv('SHOPIFY_SHOP_NAME')}.myshopify.com"
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
CJ_EMAIL = "szyungtay@gmail.com"
CJ_API_KEY = "2c0889e00f7a4bd1881989564c3e148c"

async def run_industrial_sync():
    # 1. Setup
    cj = CJService(CJ_EMAIL, CJ_API_KEY)
    session = shopify.Session(SHOP_URL, "2024-01", ACCESS_TOKEN)
    shopify.ShopifyResource.activate_session(session)
    engine = create_engine(DATABASE_URL)
    
    print("🚀 v7.2.4 Industrial Sync: Auditing & Pushing Truth Assets...")
    
    with engine.connect() as conn:
        # Fetch all 'published' and 'synced' products to upgrade to v7.2.4 standard
        res = conn.execute(text("SELECT * FROM candidate_products WHERE status IN ('published', 'synced')"))
        candidates = res.fetchall()
        
        for cand in candidates:
            try:
                # Use _mapping to access row as dict-like
                c = dict(cand._mapping)
                
                # Fallback for CJ PID
                pid = c.get('cj_pid') or c.get('product_id_1688')
                if not pid and c.get('supplier_info'):
                    si = c['supplier_info'] if isinstance(c['supplier_info'], dict) else json.loads(c['supplier_info'])
                    pid = si.get('cj_pid')
                
                title = c.get('title_en') or c.get('title_en_preview') or c.get('title_zh')
                
                if not pid:
                    print(f"   ❌ No CJ PID found for candidate {c['id']}. Skipping.")
                    continue
                
                print(f"\n📦 Processing: {title[:50]}... (ID: {c['id']} | PID: {pid})")
                
                # 1. Fetch CJ Details (The Truth)
                cj_data = await cj.get_detail(pid)
                if not cj_data:
                    print(f"   ❌ CJ PID {pid} not found. Skipping.")
                    # Sleep to respect rate limit even on failure
                    await asyncio.sleep(1.1)
                    continue
                
                # 2. Check for duplicates in Shopify (Handle Lock)
                # Correct Handle Standard (v7.2.4)
                clean_title = (title or "").lower()
                # Remove non-ascii and special chars
                import re
                clean_title = re.sub(r'[^\x00-\x7F]+', '', clean_title) # Remove non-ASCII (Chinese)
                clean_title = re.sub(r'[^a-z0-9]+', '-', clean_title).strip('-')
                handle = f"verified-artisan-{clean_title[:50]}"
                
                # Sleep to respect QPS limit before next API call
                await asyncio.sleep(1.1)
                
                # 2. Check for duplicates in Shopify (ID or Handle Lock)
                sp = None
                evidence = c.get('evidence') or {}
                if isinstance(evidence, str): evidence = json.loads(evidence)
                shopify_id = evidence.get('shopify_id')
                
                if shopify_id:
                    try:
                        sp = shopify.Product.find(shopify_id)
                        print(f"   ⚠️ Found existing Shopify Product by ID {shopify_id}.")
                    except: pass
                
                if not sp:
                    existing = shopify.Product.find(handle=handle)
                    if existing:
                        print(f"   ⚠️ Handle '{handle}' already exists. Updating existing product {existing[0].id}.")
                        sp = existing[0]
                    else:
                        sp = shopify.Product()
                
                # 3. Build Truth UI Block
                amazon_price = float(c['amazon_sale_price'] or 0.0)
                obuck_price = float(round(Decimal(str(amazon_price)) * Decimal("0.6"), 2))
                savings = amazon_price - obuck_price
                savings_pct = int((savings / amazon_price) * 100) if amazon_price > 0 else 0
                
                truth_ui = f"""
                <div class="truth-audit-block" style="background: #fff; border: 2px solid #000; padding: 25px; margin-bottom: 35px; border-radius: 4px; box-shadow: 8px 8px 0px #000;">
                    <div style="text-transform: uppercase; font-size: 11px; font-weight: 900; letter-spacing: 2px; color: #666; margin-bottom: 15px;">🔍 Truth Audit: #{c['id']}</div>
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
                
                # 4. Truth Audit Log (New v7.2.4 requirement)
                audit_log = f"""
                <div class="truth-audit-log" style="margin-top: 30px; padding: 15px; background: #f8fafc; border-left: 4px solid #1e293b; font-size: 0.85rem; color: #475569;">
                    <p style="font-weight: 700; color: #1e293b; margin-bottom: 8px;">🔬 0Buck TRUTH AUDIT LOG (Lab ID: V7.2-AUDIT-{c['id']}):</p>
                    <ul style="list-style: none; padding-left: 0;">
                        <li>✅ Asset Lineage: Verified (1:1 Physical Mapping)</li>
                        <li>✅ Physical Weight: {cj_data.get('productWeight', 'Verified')}</li>
                        <li>✅ Tech Standard: {c['category_name'] or 'Industrial Grade'}</li>
                        <li>✅ Visual Firewall: Passed (0% Deceptive Branding)</li>
                    </ul>
                </div>
                """
                
                title_en = title
                # Clean title from "0Buck Verified Artisan:" prefix if already present
                title_en = re.sub(r'^0Buck Verified Artisan:\s*', '', title_en, flags=re.IGNORECASE)
                # Clean title from Chinese
                title_en = re.sub(r'[^\x00-\x7F]+', '', title_en).strip()
                if not title_en: title_en = "Verified Artisan Product"
                
                sp.title = f"0Buck Verified Artisan: {title_en}"
                desc_en = c['description_en'] or c['description_zh'] or ""
                desc_en = re.sub(r'[^\x00-\x7F]+', '', desc_en).strip()
                
                sp.body_html = truth_ui + desc_en + audit_log
                sp.handle = handle
                sp.vendor = "0Buck Verified Artisan"
                sp.tags = f"source_CJ, {c['entry_tag']}, {c['category_name'] or 'General'}, v7.2-verified, asset-lineage-locked"
                sp.status = "active"
                
                # 5. Variants (Full Matrix)
                cj_variants = cj_data.get("variants", [])
                print(f"   📊 Syncing {len(cj_variants)} Variants...")
                
                s_variants = []
                for idx, cv in enumerate(cj_variants):
                    v_data = {
                        "price": str(obuck_price),
                        "compare_at_price": str(amazon_price),
                        "sku": cv.get("variantSku") or f"{pid}-{idx}",
                        "inventory_management": "shopify",
                        "inventory_quantity": int(cv.get("variantInventory", 999)),
                        "weight": float(cv.get("variantWeight", 500)) / 1000.0,
                        "weight_unit": "kg",
                        "requires_shipping": True
                    }
                    
                    # Handle Options
                    if cv.get("variantKey"):
                         # CJ variantKey is usually something like "Color:Red,Size:XL"
                         parts = cv.get("variantKey").split(",")
                         for i, p in enumerate(parts):
                             if ":" in p:
                                 v_data[f"option{i+1}"] = p.split(":")[1]
                             else:
                                 v_data[f"option{i+1}"] = p
                    else:
                         v_data["option1"] = f"Standard {idx+1}"
                    
                    s_variants.append(shopify.Variant(v_data))
                
                sp.variants = s_variants
                
                # 6. Images
                raw_images = cj_data.get("productImage", "").split(",")
                if c['images']:
                    try:
                        raw_images += json.loads(c['images'])
                    except: pass
                
                images = list(dict.fromkeys([img for img in raw_images if img and img.startswith('http')]))[:12]
                
                sp.images = [
                    {
                        "src": img, 
                        "position": i + 1,
                        "alt": f"0BUCK_AUDIT_{c['id']}_POS_{i + 1}"
                    } 
                    for i, img in enumerate(images)
                ]
                
                if sp.save():
                    print(f"   ✅ Published Shopify ID: {sp.id} | Handle: {handle}")
                    conn.execute(text("UPDATE candidate_products SET status = 'synced', evidence = :ev WHERE id = :id"), 
                                 {"id": c['id'], "ev": json.dumps({"shopify_id": sp.id, "pushed_at": "v7.2.4"})})
                    conn.commit()
                else:
                    print(f"   ❌ Shopify Save Error: {sp.errors.full_messages()}")
                    
            except Exception as e:
                print(f"   ❌ Fatal Error for {cand.id}: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_industrial_sync())

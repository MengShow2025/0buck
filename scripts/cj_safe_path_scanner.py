import asyncio
import logging
import sys
import os
import json
import re
import random
import httpx
import time
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.services.cj_service import CJDropshippingService
from app.services.supply_chain import SupplyChainService
from app.models.product import CandidateProduct
from sqlalchemy import text

try:
    from playwright.async_api import async_playwright
except ImportError:
    async_playwright = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAINFOREST_KEY = os.getenv("RAINFOREST_API_KEY")
RAINFOREST_DISABLED_UNTIL = 0  # Timestamp for cooldown
CJ_BACKOFF_UNTIL = 0           # Timestamp for cooldown

def safe_float(val, default=0.0):
    if not val: return default
    try:
        if isinstance(val, str) and "-" in val:
            parts = val.split("-")
            return float(parts[-1])
        return float(val)
    except: return default

async def fetch_rainforest_data(search_query):
    """Fetch exact Amazon data via Rainforest API with 402/429 protection."""
    global RAINFOREST_DISABLED_UNTIL
    if not RAINFOREST_KEY: return None
    if time.time() < RAINFOREST_DISABLED_UNTIL: return None
    
    params = {
        "api_key": RAINFOREST_KEY,
        "type": "search",
        "amazon_domain": "amazon.com",
        "search_term": search_query
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get("https://api.rainforestapi.com/request", params=params)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 402:
                logger.warning("⚠️ Rainforest API Account Over Limit (402). Disabling for 30 mins.")
                RAINFOREST_DISABLED_UNTIL = time.time() + 1800 # 30 mins
                return None # Explicitly return None to trigger fallback
            elif response.status_code == 429:
                logger.warning("⚠️ Rainforest API Rate Limited (429). Disabling for 15 mins.")
                RAINFOREST_DISABLED_UNTIL = time.time() + 900 # 15 mins
                return None
        except: pass
    return None

async def visual_audit_via_playwright(search_query):
    """Fallback: Visual audit via Playwright (Alibaba Page-Agent Prototype)."""
    if not async_playwright: return None
    
    logger.info(f"🔍 Starting Visual Audit for: {search_query[:30]}...")
    try:
        async with async_playwright() as p:
            # We use a real user-agent to avoid detection
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            url = f"https://www.amazon.com/s?k={search_query.replace(' ', '+')}"
            logger.info(f"   🌐 Navigating to Amazon: {url}")
            await page.goto(url, wait_until="load", timeout=60000)
            
            # Wait for search results
            await page.wait_for_selector("div.s-result-item[data-component-type='s-search-result']", timeout=30000)
            
            # Extract first result
            first_res = await page.query_selector("div.s-result-item[data-component-type='s-search-result']")
            if not first_res:
                logger.warning("   ⚠️ No search results found on Amazon.")
                await browser.close()
                return None
            
            title_el = await first_res.query_selector("h2 a span")
            title = await title_el.inner_text() if title_el else "No Title"
            logger.info(f"   ✅ Found Title: {title[:50]}...")
            
            price_whole = await first_res.query_selector(".a-price-whole")
            price_fraction = await first_res.query_selector(".a-price-fraction")
            
            p_w = await price_whole.inner_text() if price_whole else "0"
            p_f = await price_fraction.inner_text() if price_fraction else "0"
            price_str = f"{p_w}.{p_f}"
            
            price = float(re.sub(r'[^\d.]', '', price_str))
            logger.info(f"   ✅ Found Price: ${price}")
            
            link_el = await first_res.query_selector("h2 a")
            link_attr = await link_el.get_attribute('href') if link_el else ""
            link = f"https://www.amazon.com{link_attr}"
            
            await browser.close()
            return {
                "search_results": [{
                    "title": title,
                    "price": {"value": price},
                    "link": link
                }]
            }
    except Exception as e:
        logger.error(f"   ❌ Playwright error: {e}")
        return None

async def find_market_evidence(name):
    """High-Resilience Audit using Rainforest (API) -> Playwright (Visual)."""
    evidence = {
        "selling_price": 0.0, "list_price": 0.0, "market_url": "", 
        "pack_size": 1, "unit_selling_price": 0.0, "unit_list_price": 0.0,
        "identity_confirmed": False
    }
    
    # Map "Graffiti" to "Tuya" for better Amazon results
    search_name = name.replace("Graffiti", "Tuya").replace("graffiti", "tuya")
    
    # Try API First, then Fallback to Visual
    data = await fetch_rainforest_data(search_name)
    if not data:
        data = await visual_audit_via_playwright(search_name)
        
    if not data or not data.get("search_results"):
        # Retry with a shorter name
        short_name = " ".join(search_name.split()[:5])
        data = await fetch_rainforest_data(short_name)
        if not data:
            data = await visual_audit_via_playwright(short_name)
        if not data or not data.get("search_results"): return evidence

    for res in data["search_results"]:
        amz_title = (res.get("title") or "").lower()
        cj_keys = set(re.findall(r'\w{4,}', search_name.lower()))
        amz_keys = set(re.findall(r'\w{4,}', amz_title))
        
        # Identity match: Core tech terms + overlap
        tech_terms = ['wifi', 'smart', 'bluetooth', 'tuya', 'camera', 'lock', 'sensor', 'led', '4g', '5g', 'massage']
        tech_overlap = [t for t in tech_terms if (t in search_name.lower()) and (t in amz_title)]
        
        if len(cj_keys.intersection(amz_keys)) < 1 and not tech_overlap:
            continue
            
        price_obj = res.get("price")
        if price_obj:
            sell_val = float(price_obj.get("value", 0))
            list_val = float(res.get("base_price", {}).get("value", sell_val))
            pack_match = re.search(r'(\d+)\s?-(?:pack|pcs|set|count)', amz_title)
            pack_size = int(pack_match.group(1)) if pack_match else 1
            
            evidence["unit_selling_price"] = round(sell_val / pack_size, 2)
            evidence["unit_list_price"] = round(list_val / pack_size, 2)
            evidence["market_url"] = res.get("link")
            evidence["identity_confirmed"] = True
            return evidence
    return evidence

async def get_robust_freight(cj_service, pid):
    """Fetch freight with retries and 429 backoff handling."""
    global CJ_BACKOFF_UNTIL
    if time.time() < CJ_BACKOFF_UNTIL: return 10.0
    
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                headers = await cj_service._get_headers()
                url = f"{cj_service.BASE_URL}/logistic/freightCalculate"
                response = await client.post(url, headers=headers, json={"pid": pid, "countryCode": "US"})
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("data"):
                        freight_list = data.get("data")
                        cheapest = min([f for f in freight_list if f], key=lambda x: float(x.get("freightFee", 999)))
                        return float(cheapest.get("freightFee", 10.0))
                elif response.status_code == 429:
                    logger.warning("⚠️ CJ API Freight Rate Limited (429). Backing off for 15 mins.")
                    CJ_BACKOFF_UNTIL = time.time() + 900
                    return 10.0
                await asyncio.sleep(2.0 * (attempt + 1))
        except:
            await asyncio.sleep(2.0 * (attempt + 1))
    return 10.0 # Safe default

async def process_one_item(db, cj_service, p):
    global CJ_BACKOFF_UNTIL
    pid = p.get("pid") or p.get("id")
    name = p.get("nameEn") or p.get("productNameEn") or p.get("productName") or "Unknown"
    
    if time.time() < CJ_BACKOFF_UNTIL:
        return

    # 1. Archive Raw First
    try:
        detail = await cj_service.get_product_detail(pid)
        if not detail:
            # Check if it was a 429 by checking the status (CJDropshippingService handles it but we should check here)
            # Actually we just assume if it returns None it's either not found or 429
            # To be safe, we will assume 429 if we see errors in the console
            return
        
        db.execute(text("""
            INSERT INTO cj_raw_products (cj_pid, raw_json, title_en, source_url)
            VALUES (:pid, :json, :title, :url)
            ON CONFLICT (cj_pid) DO UPDATE SET raw_json = EXCLUDED.raw_json
        """), {
            "pid": pid, "json": json.dumps(detail, ensure_ascii=False),
            "title": name, "url": f"https://app.cjdropshipping.com/product-detail.html?id={pid}"
        })
        db.commit()
    except Exception as e:
        db.rollback()
        if "429" in str(e):
            logger.warning("⚠️ CJ API Detail 429. Triggering 15 min cooldown.")
            CJ_BACKOFF_UNTIL = time.time() + 900
        print(f"   ⚠️ Archival error for {pid}: {e}")
        return

    # 2. Heartbeat to file
    with open("scanner_heartbeat.json", "w") as f:
        json.dump({"last_pid": pid, "last_name": name, "time": time.time(), "status": "running"}, f)

    # 2. Market Audit
    price_usd_raw = p.get("sellPrice") or p.get("productPrice") or p.get("productSellPrice") or 0.0
    try:
        if " -- " in str(price_usd_raw): price_usd = float(str(price_usd_raw).split(" -- ")[-1])
        else: price_usd = float(price_usd_raw)
    except: price_usd = 0.0
    
    freight = await get_robust_freight(cj_service, pid)
    landed_cost = price_usd + freight

    evidence = await find_market_evidence(name)
    if not evidence["identity_confirmed"]:
        return

    m_sell = evidence["unit_selling_price"]
    target_price = round(m_sell * 0.6, 2)
    
    # PROFIT CHECK: Must cover cost
    if target_price <= landed_cost:
        return

    # 3. Draft Ingestion
    exists = db.query(CandidateProduct).filter_by(product_id_1688=pid).first()
    if exists: return

    p_w_raw = safe_float(detail.get("productWeight"))
    product_weight = p_w_raw / 1000.0 if p_w_raw > 5.0 else p_w_raw
    
    img_raw = detail.get("productImage") or p.get("bigImage")
    if isinstance(img_raw, str):
        img_list = img_raw.split(",")
    elif isinstance(img_raw, list):
        img_list = img_raw
    else:
        img_list = []
    img_list = [img if str(img).startswith("http") else f"https:{img}" if str(img).startswith("//") else img for img in img_list if img]

    new_draft = CandidateProduct(
        product_id_1688=pid, title_zh=name, title_en_preview=name,
        cost_cny=landed_cost * 7.1, amazon_price=m_sell, amazon_compare_at_price=evidence["unit_list_price"],
        market_comparison_url=evidence["market_url"], estimated_sale_price=target_price,
        profit_ratio=target_price / landed_cost, images=img_list,
        discovery_source="MASTER_FULL_SWEEP_V6.1", status="draft", source_platform="CJ",
        source_url=f"https://app.cjdropshipping.com/product-detail.html?id={pid}",
        structural_data={"description_html": detail.get("description", "")},
        logistics_data={"shipping": {"product_weight": round(product_weight, 3), "weight_unit": "kg"}},
        raw_vendor_info={"name": detail.get("shopName"), "rating": detail.get("shopRating")}
    )
    try:
        db.add(new_draft)
        db.commit()
        print(f"      ✅ Draft Library Ingested: {name[:30]} (Price: ${target_price})")
    except Exception as e:
        db.rollback()
        print(f"      ❌ Ingestion Error for {name[:20]}: {e}")

async def main():
    global CJ_BACKOFF_UNTIL
    while True:
        db = None
        try:
            db = SessionLocal()
            cj = CJDropshippingService()
            
            print("🚀 0Buck v6.1.5 High-Resilience Sweep (Backoff + Visual Audit)...")
            
            if time.time() < CJ_BACKOFF_UNTIL:
                wait_time = int(CJ_BACKOFF_UNTIL - time.time())
                print(f"💤 CJ API Cooldown. Waiting {wait_time}s... (Heartbeat {int(time.time())})")
                await asyncio.sleep(30) # Smaller sleep for better visibility
                continue

            try:
                raw_categories = await cj.get_categories()
            except Exception as e:
                if "429" in str(e):
                    print("⚠️ CJ API Categories 429. Cooling down.")
                    CJ_BACKOFF_UNTIL = time.time() + 900
                await asyncio.sleep(60)
                continue

            if not raw_categories:
                print("❌ Could not fetch categories. Retrying in 60s...")
                await asyncio.sleep(60)
                continue

            # Flatten nested CJ categories
            categories = []
            for first in raw_categories:
                for second in first.get("categoryFirstList", []):
                    for third in second.get("categorySecondList", []):
                        categories.append({"name": third.get("categoryName"), "id": third.get("categoryId")})
            
            print(f"📂 Found {len(categories)} sub-categories. Starting shuffle-sweep...")
            random.shuffle(categories)

            for cat in categories:
                if time.time() < CJ_BACKOFF_UNTIL: break
                
                print(f"\n📂 Sweeping Category: {cat['name']} (ID: {cat['id']})")
                try:
                    results = await cj.search_products(None, category_id=cat['id'], size=30)
                    if results:
                        for p in results:
                            pid = p.get('pid') or p.get('id')
                            # Ensure session is healthy
                            try:
                                if db.query(CandidateProduct).filter_by(product_id_1688=pid).first(): continue
                            except Exception as db_e:
                                print(f"      ⚠️ Database error checking product {pid}: {db_e}")
                                try:
                                    db.rollback()
                                except: pass
                                continue
                            
                            await process_one_item(db, cj, p)
                            await asyncio.sleep(2.0) # Respect rate limits
                except Exception as e:
                    if "429" in str(e):
                        print(f"⚠️ CJ API 429 in category {cat['name']}. Triggering Global Backoff.")
                        CJ_BACKOFF_UNTIL = time.time() + 900
                        break
                    print(f"      ❌ Sweep Error in category {cat['name']}: {e}")
                    if db:
                        try:
                            db.rollback()
                        except: pass
                
                await asyncio.sleep(5.0) # Category cooldown

            db.close()
            print("\n🏁 Full Loop Complete. Restarting in 1 hour...")
            await asyncio.sleep(3600)
            
        except Exception as e:
            print(f"🔥 Global Main Error: {e}. Restarting in 60s...")
            if db:
                try:
                    db.close()
                except: pass
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())

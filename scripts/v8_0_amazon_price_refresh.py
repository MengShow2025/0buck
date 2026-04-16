import asyncio
import os
import json
import pg8000
import ssl
import urllib.parse as urlparse
import logging
import httpx

# Configuration
DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
RAINFOREST_API_KEY = "27994945D3184575A48F73B8CCBC44DB"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("amazon_refresh")

async def get_amazon_product(url):
    params = {
        "api_key": RAINFOREST_API_KEY,
        "type": "product",
        "amazon_domain": "amazon.com",
        "url": url
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get("https://api.rainforestapi.com/request", params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get("request_info", {}).get("success"):
                    return data.get("product")
        except Exception as e:
            logger.error(f"Rainforest error: {e}")
    return None

def extract_price_data(product_data):
    if not product_data: return {}
    buybox = product_data.get("buybox_winner", {})
    sale_price = buybox.get("price", {}).get("value")
    shipping_fee = buybox.get("shipping", {}).get("value", 0.0)
    return {
        "amazon_sale_price": float(sale_price) if sale_price else 0.0,
        "amazon_shipping_fee": float(shipping_fee) if shipping_fee else 0.0
    }

async def refresh_amazon_prices():
    # Connect to DB
    url = urlparse.urlparse(DATABASE_URL)
    conn = pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )
    cur = conn.cursor()
    
    try:
        # Use amazon_link or market_comparison_url
        cur.execute("""
            SELECT id, title_en, COALESCE(amazon_link, market_comparison_url), warehouse_anchor, sell_price, freight_fee
            FROM candidate_products 
            WHERE status != 'archived' AND (amazon_link IS NOT NULL OR market_comparison_url IS NOT NULL) AND id BETWEEN 10 AND 50;
        """)
        products = cur.fetchall()
        
        logger.info(f"🚀 Refreshing Amazon prices for {len(products)} products...")
        
        for p in products:
            c_id, title, amz_url, anchor, cost, freight = p
            logger.info(f"Checking ID {c_id}: {title[:30] if title else 'Unknown'}...")
            
            if not amz_url:
                logger.warning(f"  ⚠️ No Amazon URL for ID {c_id}")
                continue
                
            amz_data = await get_amazon_product(amz_url)
            if amz_data:
                price_data = extract_price_data(amz_data)
                new_amz_p = price_data.get("amazon_sale_price", 0.0)
                new_amz_s = price_data.get("amazon_shipping_fee", 0.0)
                
                if new_amz_p > 0:
                    cost = float(cost or 0)
                    freight = float(freight or 0)
                    landed_cost = cost + freight
                    amz_total = new_amz_p + new_amz_s
                    roi = amz_total / landed_cost if landed_cost > 0 else 0
                    
                    new_label = "NORMAL"
                    if roi >= 4.0: new_label = "REBATE"
                    
                    anchor_str = str(anchor or "CN")
                    is_magnet = (new_amz_s >= landed_cost) and ("US" in anchor_str.upper())
                    if is_magnet: new_label = "MAGNET"
                    
                    logger.info(f"  -> New Price: ${new_amz_p} | Shipping: ${new_amz_s} | ROI: {roi:.1f} | Label: {new_label}")
                    
                    cur.execute("""
                        UPDATE candidate_products 
                        SET amazon_price = %s, amazon_shipping_fee = %s, product_category_label = %s, updated_at = NOW()
                        WHERE id = %s
                    """, (new_amz_p, new_amz_s, new_label, c_id))
                else:
                    logger.warning(f"  ⚠️ No valid price for ID {c_id}")
            else:
                logger.warning(f"  ⚠️ Rainforest fetch failed for ID {c_id}")
            
            await asyncio.sleep(0.5)
            
        conn.commit()
        logger.info("✅ Amazon Price Refresh & ROI Audit Completed.")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    asyncio.run(refresh_amazon_prices())

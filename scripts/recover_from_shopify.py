
import asyncio
import os
import pg8000
import ssl
import json
import httpx
import urllib.parse as urlparse

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
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

async def main():
    url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?limit=50"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN, "Content-Type": "application/json"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"Error fetching Shopify products: {resp.status_code}")
            return
        
        products = resp.json()["products"]
        print(f"Fetched {len(products)} products from Shopify.")
        
        conn = get_db_conn()
        cur = conn.cursor()
        
        for p in products:
            handle = p["handle"]
            title = p["title"]
            body_html = p["body_html"]
            variants = p["variants"]
            images = [img["src"] for img in p["images"]]
            sku = variants[0]["sku"] if variants else "0BUCK-UNKNOWN"
            price = float(variants[0]["price"]) if variants else 0.0
            compare_at = float(variants[0]["compare_at_price"]) if variants and variants[0]["compare_at_price"] else 0.0
            
            # Simple profit_ratio recovery from shopify data
            profit_ratio = round(price / (price * 0.3), 2) if price > 0 else 1.5 # Mock ratio for recovered items
            
            # Check if exists by handle
            cur.execute("SELECT id FROM candidate_products WHERE shopify_product_handle = %s", (handle,))
            # Extract label and platform from tags
            tags_list = p.get("tags", "").split(", ")
            
            # Logic for Category Label
            category_label = "普通商品"
            if price == 0.0:
                category_label = "0元活动商品"
            elif any(t in tags_list for t in ["CASHBACK", "返现"]):
                category_label = "返现商品"
            elif profit_ratio >= 4.0:
                category_label = "返现商品"
                
            # Logic for Platform Name
            platform_name = "CJ"
            if any(t in tags_list for t in ["Alibaba", "国际站", "ALI"]):
                platform_name = "阿里国际"
            elif any(t in tags_list for t in ["AE", "AliExpress"]):
                platform_name = "速卖通"

            # Admin tags from current Shopify tags
            possible_admin = ["热销", "促销", "预售", "众筹", "Hot", "Promo"]
            admin_tags = [t for t in tags_list if t in possible_admin]

            if cur.fetchone():
                print(f"Product with handle {handle} already in DB.")
            else:
                print(f"Recovering from Shopify: {title}")
                cur.execute("""
                    INSERT INTO candidate_products (
                        product_id_1688, status, title_en, body_html,
                        images, obuck_price, amazon_compare_at_price,
                        shopify_product_handle, product_category_label, source_platform_name,
                        admin_tags, created_at, updated_at,
                        cost_cny, estimated_sale_price, profit_ratio
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s, %s, %s)
                """, (
                    f"1688-{p['id']}", "synced", title, body_html,
                    json.dumps(images), price, compare_at,
                    handle, category_label, platform_name,
                    json.dumps(admin_tags), price * 3.0, price, profit_ratio
                ))
        
        conn.commit()
        cur.close()
        conn.close()
        print("Successfully recovered products from Shopify to NEW database.")

if __name__ == "__main__":
    asyncio.run(main())


import asyncio
import os
import pg8000
import ssl
import json
import httpx
import urllib.parse as urlparse

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

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
    conn = get_db_conn()
    cur = conn.cursor()
    
    # 1. Update tagging logic for candidate_products
    cur.execute("""
        SELECT 
            id, obuck_price, profit_ratio, title_en, cj_pid, shopify_product_handle
        FROM candidate_products
    """)
    candidates = cur.fetchall()
    
    print(f"Applying V7.9 Tagging to {len(candidates)} candidates...")
    
    for cand in candidates:
        c_id, price, profit, title, pid, handle = cand
        
        # A. Category Label
        label = "普通商品"
        if price is not None and price == 0.0:
            label = "0元活动商品"
        elif profit is not None and profit >= 4.0:
            label = "返现商品"
        elif price is not None and profit is not None and profit >= 1.5:
            label = "普通商品"
        else:
            label = "普通商品" # Default
            
        # B. Platform Name (Default to CJ)
        platform = "CJ"
        if pid and "ALI" in pid: platform = "阿里国际"
        elif pid and ("AE" in pid or "AliExpress" in pid): platform = "速卖通"
        
        # C. Category Name (Rules-based)
        cat_name = "消费电子"
        title_lower = (title or "").lower()
        if any(kw in title_lower for kw in ["plug", "light", "curtain", "socket", "gan", "charger"]):
            cat_name = "智能家居/通信器材"
        elif any(kw in title_lower for kw in ["pet", "cat", "dog", "feeder"]):
            cat_name = "宠物用品"
        elif any(kw in title_lower for kw in ["watch", "heart", "health", "smartwatch"]):
            cat_name = "智能穿戴/医疗器械"
        elif any(kw in title_lower for kw in ["jewelry", "watch", "glasses"]):
            cat_name = "珠宝眼镜手表"
            
        # D. Admin Tags (Hot/Promo for first 50)
        admin = ["热销"] if c_id < 100 else ["上新"]
        
        # E. Search Keywords
        keywords = f"{title}, {cat_name}, {platform}, {label}"
        
        cur.execute("""
            UPDATE candidate_products 
            SET 
                product_category_label = %s,
                source_platform_name = %s,
                category_name = %s,
                admin_tags = %s,
                search_keywords = %s,
                vibe_tags = %s,
                status = CASE WHEN shopify_product_handle IS NOT NULL THEN 'synced' ELSE 'approved' END
            WHERE id = %s
        """, (label, platform, cat_name, json.dumps(admin), keywords, json.dumps(["Vanguard-v1"]), c_id))

    # 2. Sync to products table
    cur.execute("DELETE FROM products")
    cur.execute("""
        INSERT INTO products (
            id, product_id_1688, title_en, description_en, detail_images_html,
            images, sale_price, compare_at_price, shopify_product_handle,
            source_cost_usd, profit_ratio, is_active,
            product_category_label, source_platform_name, admin_tags, category_name,
            created_at, updated_at
        )
        SELECT 
            id, product_id_1688, title_en, title_en, body_html,
            images, obuck_price, amazon_compare_at_price, shopify_product_handle,
            cost_cny / 7.23, profit_ratio, TRUE,
            product_category_label, source_platform_name, admin_tags, category_name,
            NOW(), NOW()
        FROM candidate_products
        WHERE shopify_product_handle IS NOT NULL
    """)
    
    conn.commit()
    print("V7.9 Master Tagging and Sync Complete.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())

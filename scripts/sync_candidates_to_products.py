
import os
import pg8000
import ssl
import json
import urllib.parse as urlparse

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def main():
    url = urlparse.urlparse(DATABASE_URL)
    conn = pg8000.connect(
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or 5432,
        database=url.path[1:],
        ssl_context=ssl.create_default_context()
    )
    
    cur = conn.cursor()
    
    # Get synced candidates
    cur.execute("""
        SELECT 
            id, product_id_1688, title_en, description_en, images, 
            estimated_sale_price, amazon_list_price, shopify_product_id,
            cost_cny, product_category_label, source_platform, warehouse_anchor
        FROM candidate_products 
        WHERE status = 'synced'
    """)
    candidates = cur.fetchall()
    
    print(f"Syncing {len(candidates)} products to final products table...")
    
    # Clear products table first
    cur.execute("DELETE FROM products")
    
    for cand in candidates:
        c_id, pid_1688, title, description, images_data, price, compare, sh_id, cost, label, platform, anchor = cand
        
        # Ensure images_data is valid JSON list for JSONB column
        if isinstance(images_data, str):
            try:
                # If it's already a string, parse it to verify
                img_list = json.loads(images_data)
                images_json = json.dumps(img_list)
            except:
                images_json = json.dumps([images_data]) if images_data else "[]"
        elif isinstance(images_data, list):
            images_json = json.dumps(images_data)
        else:
            images_json = "[]"
            
        cur.execute("""
            INSERT INTO products (
                id, product_id_1688, title_en, description_en,
                images, sale_price, compare_at_price, shopify_product_id,
                source_cost_usd, is_active,
                product_category_label, platform_tag, warehouse_anchor,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s, %s, NOW(), NOW())
        """, (
            c_id, pid_1688, title, description,
            images_json, price, compare, sh_id,
            (cost or 0.0) / 7.23,
            label, platform, anchor
        ))
        
    conn.commit()
    print("Successfully synced candidate_products to products table.")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()

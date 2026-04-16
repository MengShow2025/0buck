
import os
import pg8000
import ssl
import json
import urllib.parse as urlparse

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
JSON_DATA_PATH = "data/1688/complete_assets_v3_9_1.json"

AMAZON_PRICES = {
    "Jointcorp 1657B Sleep Monitoring Belt": 179.99,
    "V-Series Health Smart Watch (HR/BP)": 89.00,
    "Interactive Smart Pet Ball (AI Motion)": 28.58,
    "Vstarcam Mini 1080P Smart Video Doorbell": 19.99,
    "Matter Smart Plug (Energy)": 19.99,
    "Digital Measuring Tape (OLED Display)": 39.99,
    "8-in-1 Electric Spin Scrubber (Telescopic)": 34.98,
    "Kasa Smart Plug Mini (KP115)": 19.99,
    "Full Spectrum Smart Grow Light": 29.99,
    "Austar 8-Ch Programmable Hearing Aid": 139.99,
    "RSH-CB01 Smart Curtain Robot": 59.99
}

def main():
    if not os.path.exists(JSON_DATA_PATH):
        print(f"Error: {JSON_DATA_PATH} not found")
        return

    with open(JSON_DATA_PATH, 'r') as f:
        products_data = json.load(f)

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
    
    # Clean first
    cur.execute("DELETE FROM candidate_products")
    
    for p_data in products_data:
        name = p_data['name']
        comp_price = AMAZON_PRICES.get(name, 49.99)
        sale_price = round(comp_price * 0.6, 2)
        cost_cny = p_data['variants'][0]['price_cny']
        
        hook = f"Is the high price of {name} holding you back? Stop paying for middleman markups."
        logic = f"We source directly from {p_data['supplier']}, the same factory behind premium brands. No branding tax, just pure quality."
        closing = f"Get it now for ${sale_price} and join our 20-phase rebate ritual to get 100% cashback."

        profit_ratio = round(sale_price / (cost_cny / 7.23), 2) if cost_cny > 0 else 0
        
        # New Category Tagging Logic
        if sale_price == 0.0:
            category_label = "0元活动商品"
        elif profit_ratio >= 4.0:
            category_label = "返现商品"
        else:
            category_label = "普通商品"

        # Platform Map
        platform_name = "CJ" # Default for these 11
        
        # Category Mapping (3.0)
        cat_name = "消费电子"
        if any(kw in name for kw in ["Watch", "Hearing", "Speaker"]):
            cat_name = "智能穿戴/音频"
        elif any(kw in name for kw in ["Plug", "Light", "Curtain"]):
            cat_name = "智能家居"
        elif "Pet" in name:
            cat_name = "宠物用品"
        
        cur.execute("""
            INSERT INTO candidate_products (
                product_id_1688, status, source_platform, discovery_source, discovery_evidence,
                title_zh, description_zh, images, variants_raw,
                cost_cny, comp_price_usd, estimated_sale_price, profit_ratio,
                title_en_preview, description_en_preview,
                desire_hook, desire_logic, desire_closing,
                product_category_label, source_platform_name, category_name, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (
            str(p_data['id']), 'new', '1688', 'Core Selection', json.dumps({'v': '3.9.0'}),
            p_data['name'], p_data['description'], json.dumps(p_data['gallery_images']), json.dumps(p_data['variants']),
            float(cost_cny), float(comp_price), float(sale_price), profit_ratio,
            p_data['title'], p_data['description'],
            hook, logic, closing,
            category_label, platform_name, cat_name
        ))

    conn.commit()
    print(f"Successfully re-populated {len(products_data)} candidates into NEW database.")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()

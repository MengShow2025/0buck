
import psycopg2
import json

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def setup_magnets():
    with open("/Volumes/SAMSUNG 970/AccioWork/coder/0buck/temp/magnet_data/magnet_details.json", "r") as f:
        magnets = json.load(f)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    magnet_ids = []
    for pid, data in magnets.items():
        title = data['title_en']
        imgs = json.dumps(data['main_images'])
        weight_kg = float(data['weight'].split(" ")[0])
        weight_grams = weight_kg * 1000
        video = data['video_url'] if data['video_url'] != "Not available" else None
        
        cur.execute("""
            INSERT INTO candidate_products (product_id_1688, title_en, images, product_weight, origin_video_url, is_freebie_eligible, freebie_shipping_price, amazon_shipping_fee, status)
            VALUES (%s, %s, %s, %s, %s, true, 6.99, 6.99, 'pending')
            ON CONFLICT (product_id_1688) DO UPDATE 
            SET title_en = EXCLUDED.title_en, images = EXCLUDED.images, product_weight = EXCLUDED.product_weight, 
                origin_video_url = EXCLUDED.origin_video_url, is_freebie_eligible = true, freebie_shipping_price = 6.99, amazon_shipping_fee = 6.99
            RETURNING id
        """, (pid, title, imgs, weight_grams, video))
        new_id = cur.fetchone()[0]
        magnet_ids.append(new_id)
        print(f"Upserted Magnet ID: {new_id} (PID: {pid})")

    # Ensure ID 21 is also set as magnet
    cur.execute("UPDATE candidate_products SET is_freebie_eligible = true, freebie_shipping_price = 6.99, amazon_shipping_fee = 6.99, status = 'pending' WHERE id = 21")
    magnet_ids.append(21)
    
    conn.commit()
    cur.close()
    conn.close()
    return magnet_ids

if __name__ == "__main__":
    ids = setup_magnets()
    print(f"Magnet IDs Ready for Sync: {ids}")

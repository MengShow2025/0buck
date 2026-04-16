import sys
sys.path.insert(0, '/tmp/v7_packages_311')
import psycopg2
import json

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

data = [
    { "category": "GaN Charger 65W 100W", "products": [
      { "title": "LDNIO GaN 100W Fast Charge Charger", "price": 10.08, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/S6af296d0f99447358ac66b4124d5d647d.png_960x960.png", "product_id": "3256810301068640", "is_choice": True, "shipping_days": "5-10" },
      { "title": "140W GaN USB C Charger PD 100W 65W", "price": 26.94, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/Scf7a12f2934e45358f842bb1b7ed621ac.png_960x960.png", "product_id": "3256807081961950", "is_choice": True, "shipping_days": "5-10" },
      { "title": "Baseus 65W GaN Charger Quick Charge", "price": 24.03, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/Scf7503bcc2194238beaef6ca8ad02b41a.jpg_960x960q75.jpg", "product_id": "3256804806642394", "is_choice": True, "shipping_days": "5-10" }
    ]},
    { "category": "Smart Pet Feeder", "products": [
      { "title": "Smart Pet Feeder Automatic Cat Feeder", "price": 44.76, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/Sf047c19074e64998870731a7f804703f4.jpg_960x960q75.jpg", "product_id": "3256807120538206", "is_choice": True, "shipping_days": "5-10" },
      { "title": "ROJECO Automatic Pet Feeder", "price": 48.72, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/S0d678a1d4b0848b7bfec371ae42e79eeU.jpg_960x960q75.jpg", "product_id": "3256806491744864", "is_choice": True, "shipping_days": "5-10" },
      { "title": "1080P HD Camera Automatic Cat Feeder", "price": 93.76, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/S645e54ddcad34447bdf6896715bf1b3cI.jpg_960x960q75.jpg", "product_id": "3256807448293699", "is_choice": True, "shipping_days": "5-10" }
    ]},
    { "category": "Tuya Zigbee Smart Sensor", "products": [
      { "title": "Tuya ZigBee Smart Water Leak Sensor", "price": 1.33, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/Se00109fffa69419e8b1a0c8281fe529b9.png_960x960.png", "product_id": "1005006996120904", "is_choice": True, "shipping_days": "3-5" },
      { "title": "Tuya Zigbee Smart Vibration Sensor", "price": 0.99, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/Sfa340df47d4747e3a84d4fa0bed88db87.jpg_960x960q75.jpg", "product_id": "3256807333963507", "is_choice": True, "shipping_days": "3-5" },
      { "title": "Tuya ZigBee PIR Motion Sensor", "price": 2.13, "image_url": "https://ae-pic-a1.aliexpress-media.com/kf/Sb2f990d80eb349829dc7bf92b1b3fd2c4.jpg_960x960q75.jpg", "product_id": "1005007345195200", "is_choice": True, "shipping_days": "3-5" }
    ]}
]

def inject():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        for cat_data in data:
            cat = cat_data["category"]
            for p in cat_data["products"]:
                pid = p["product_id"]
                cur.execute("SELECT id FROM candidate_products WHERE cj_pid = %s", (pid,))
                if cur.fetchone(): continue
                
                cur.execute("""
                    INSERT INTO candidate_products (
                        cj_pid, title_en, source_cost_usd, images, status, category, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """, (pid, p["title"], p["price"], json.dumps([p["image_url"]]), 'audit_pending', cat))
        conn.commit()
        cur.close()
        conn.close()
        print("Success: Injected 9 scouted items.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inject()

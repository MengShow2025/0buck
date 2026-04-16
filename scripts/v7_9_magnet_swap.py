
import sys
import os
import psycopg2
import json

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def update_magnets():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Magnet 01 (ID 17): 引磁片 (2片装)
    cur.execute("""
        UPDATE candidate_products 
        SET title_en = 'Universal Magnet Sheet | 2-Pack Flexible Adhesive', 
            title_zh = '引磁片 (2片装)', 
            source_cost_usd = 0.25, 
            freight_fee = 3.00,
            amazon_link = 'https://www.amazon.com/dp/B079G4RWX5',
            amazon_price = 10.99,
            amazon_shipping_fee = 6.99,
            amazon_total_price = 17.98,
            is_freebie_eligible = true, 
            freebie_shipping_price = 6.99,
            obuck_price = 0.00,
            status = 'audit_pending',
            cj_pid = '1600119531720',
            updated_at = NOW()
        WHERE id = 17
    """)
    
    # Magnet 02 (ID 23): 5孔硅胶理线器
    cur.execute("""
        UPDATE candidate_products 
        SET title_en = '5-Hole Silicone Cable Organizer | Desktop Wire Management', 
            title_zh = '5孔硅胶理线器', 
            source_cost_usd = 0.85, 
            freight_fee = 4.00,
            amazon_link = 'https://www.amazon.com/dp/B071FXZBMV',
            amazon_price = 12.98,
            amazon_shipping_fee = 6.99,
            amazon_total_price = 19.97,
            is_freebie_eligible = true, 
            freebie_shipping_price = 6.99,
            obuck_price = 0.00,
            status = 'audit_pending',
            cj_pid = '1600555031419',
            updated_at = NOW()
        WHERE id = 23
    """)
    
    # Magnet 03 (ID 20): 120W 磁吸快充线
    cur.execute("""
        UPDATE candidate_products 
        SET title_en = '120W Magnetic Fast Charging Cable | 3-in-1 Zinc Alloy', 
            title_zh = '120W 磁吸快充线', 
            source_cost_usd = 1.50, 
            freight_fee = 4.00,
            amazon_link = 'https://www.amazon.com/dp/B08P1X6QY1',
            amazon_price = 14.99,
            amazon_shipping_fee = 6.99,
            amazon_total_price = 21.98,
            is_freebie_eligible = true, 
            freebie_shipping_price = 6.99,
            obuck_price = 0.00,
            status = 'audit_pending',
            cj_pid = '1601348246405',
            updated_at = NOW()
        WHERE id = 20
    """)
    
    conn.commit()
    cur.close()
    conn.close()
    print("Database updated for the 3 new magnets.")

if __name__ == "__main__":
    update_magnets()

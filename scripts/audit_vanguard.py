import pg8000
import os
import ssl
import urllib.parse as urlparse

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def audit_vanguard():
    try:
        url = urlparse.urlparse(DATABASE_URL)
        conn = pg8000.connect(
            user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
            database=url.path[1:], ssl_context=ssl.create_default_context()
        )
        cur = conn.cursor()
        
        # 1. Fetch products
        cur.execute("""
            SELECT id, title_en, warehouse_anchor, product_category_label, 
                   sell_price, amazon_price, freight_fee, amazon_shipping_fee
            FROM candidate_products 
            WHERE id BETWEEN 10 AND 30;
        """)
        rows = cur.fetchall()
        
        for row in rows:
            c_id, title, anchor, label, cost, amz_p, freight, amz_s = row
            title = str(title or "Unknown")[:20]
            anchor_str = str(anchor or "CN")
            label_str = str(label or "NORMAL")
            
            cost = float(cost or 0)
            amz_p = float(amz_p or 0)
            freight = float(freight or 0)
            amz_s = float(amz_s or 0)
            
            # v8.0 ROI Audit
            # Cost Landed = Cost + Freight
            landed_cost = cost + freight
            amz_total = amz_p + amz_s
            
            roi = amz_total / landed_cost if landed_cost > 0 else 0
            
            new_label = "NORMAL"
            if roi >= 4.0:
                new_label = "REBATE"
            
            # Magnet logic: Landed cost < Amazon shipping fee AND Local stock
            is_magnet = (amz_s >= landed_cost) and ("US" in anchor_str.upper())
            if is_magnet:
                new_label = "MAGNET"
            
            # Anchor cleanup: Use ISO codes
            new_anchor = "CN"
            if "US" in anchor_str.upper():
                new_anchor = "US"
            elif "DE" in anchor_str.upper():
                new_anchor = "DE"
            
            print(f"ID {c_id:2} | {title:20} | ROI: {roi:4.1f} | {anchor_str:5} -> {new_anchor:5} | {label_str:8} -> {new_label:8}")
            
            # 2. Update DB
            cur.execute("""
                UPDATE candidate_products 
                SET warehouse_anchor = %s, product_category_label = %s, updated_at = NOW()
                WHERE id = %s
            """, (new_anchor, new_label, c_id))
            
        conn.commit()
        cur.close()
        conn.close()
        print("\n✅ Vanguard Audit & Update Completed.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    audit_vanguard()

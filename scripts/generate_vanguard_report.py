import sys
sys.path.insert(0, '/tmp/v7_packages_311')
import psycopg2
import json

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def generate_report():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT id, title_en, source_cost_usd, freight_fee, amazon_sale_price, amazon_shipping_fee, amazon_total_price, obuck_price, amazon_link, warehouse_anchor 
            FROM candidate_products 
            WHERE id BETWEEN 10 AND 25 AND id != 13
            ORDER BY id
        """)
        rows = cur.fetchall()
        report = []
        for r in rows:
            report.append({
                "id": r[0],
                "title": r[1],
                "ae_cost": float(r[2]) if r[2] else 0.0,
                "ae_freight": float(r[3]) if r[3] else 0.0,
                "amz_price": float(r[4]) if r[4] else 0.0,
                "amz_shipping": float(r[5]) if r[5] else 0.0,
                "amz_total": float(r[6]) if r[6] else 0.0,
                "obuck_price": float(r[7]) if r[7] else 0.0,
                "amz_link": r[8],
                "warehouse": r[9]
            })
        
        with open("vanguard_audit_report.json", "w") as f:
            json.dump(report, f, indent=2)
        print("Success: Generated vanguard_audit_report.json")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_report()

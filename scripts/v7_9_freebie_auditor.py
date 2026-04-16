
import sys
import os
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

import asyncio
import psycopg2
import json
import httpx
from app.services.amazon_truth_anchor import AmazonTruthAnchor

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require")

async def audit_freebies_async():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT id, title_en, source_cost_usd, freight_fee, amazon_shipping_fee, amazon_total_price, obuck_price, amazon_link
            FROM candidate_products 
            WHERE id BETWEEN 10 AND 100 AND id != 13
        """)
        rows = cur.fetchall()
        print(f"🕵️ [Magnet Audit] Analyzing IDs 10-100 for 'Zero-Cost Magnet' potential...")
        
        truth_anchor = AmazonTruthAnchor()
        eligible_count = 0
        
        for r in rows:
            c_id, title, cost, freight, amz_ship, amz_total, ob_price, amz_url = r
            cost = float(cost or 0)
            freight = float(freight or 0)
            amz_ship = float(amz_ship or 0)
            total_cost = cost + freight
            
            # If amz_ship is 0, try to get truth via browser (v7.9.1 Proactive Mode)
            if amz_ship <= 0 and amz_url:
                print(f"   🔎 ID {c_id}: Missing Amz Shipping. Auditing via Browser...")
                # We simulate/use the anchor
                live_ship = await truth_anchor.get_shipping_fee_via_browser(amz_url)
                amz_ship = float(live_ship or 0)
                if amz_ship > 0:
                    cur.execute("UPDATE candidate_products SET amazon_shipping_fee = %s WHERE id = %s", (amz_ship, c_id))

            # Logic: V7.9.1 "Zero-Cost Magnet" Rule
            # If total landed cost <= Amazon's standalone shipping fee
            if amz_ship >= total_cost and amz_ship > 0:
                # MAGNET MODE: $0.00 Product + Amazon-matching Shipping
                suggested_ship = amz_ship
                print(f"🧲 [MAGNET FOUND] ID {c_id}: {title}")
                print(f"   - Total Cost: ${total_cost:.2f} | Amazon Shipping: ${amz_ship:.2f}")
                print(f"   - Magnet Shipping Fee: ${suggested_ship:.2f} (100% Match)")
                
                cur.execute("""
                    UPDATE candidate_products 
                    SET is_freebie_eligible = true, 
                        freebie_shipping_price = %s,
                        status = 'synced',
                        updated_at = NOW()
                    WHERE id = %s
                """, (suggested_ship, c_id))
                eligible_count += 1
            else:
                cur.execute("UPDATE candidate_products SET is_freebie_eligible = false WHERE id = %s", (c_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"🏁 Audit Complete: {eligible_count} Magnet candidates found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(audit_freebies_async())

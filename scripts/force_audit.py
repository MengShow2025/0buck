import asyncio
import os
import sys
import json
from sqlalchemy import text

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.services.cj_service import CJDropshippingService
from scripts.cj_safe_path_scanner import process_one_item

async def force_audit_raw_stones():
    db = SessionLocal()
    cj = CJDropshippingService()
    
    print("🚀 Forcing Audit on existing Raw Stones...")
    
    # Fetch items from raw stone library that aren't in candidate library
    query = text("""
        SELECT cj_pid, raw_json 
        FROM cj_raw_products r
        WHERE NOT EXISTS (
            SELECT 1 FROM candidate_products c WHERE c.product_id_1688 = r.cj_pid
        )
    """)
    rows = db.execute(query).fetchall()
    print(f"Found {len(rows)} un-audited stones.")
    
    for pid, raw_json in rows:
        try:
            # SQLAlchemy might return dict if it's JSONB, or str
            p = raw_json if isinstance(raw_json, dict) else json.loads(raw_json)
            print(f"\nRe-Auditing PID: {pid}")
            await process_one_item(db, cj, p)
            await asyncio.sleep(2.0)
        except Exception as e:
            print(f"Error re-auditing {pid}: {e}")
            
    db.close()

if __name__ == "__main__":
    asyncio.run(force_audit_raw_stones())


import asyncio
import os
import sys
import json
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def v7_5_dedup_and_audit():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # 1. Deduplication
        query_prod = text("SELECT cj_pid, amazon_link FROM products WHERE cj_pid IS NOT NULL OR amazon_link IS NOT NULL")
        existing = conn.execute(query_prod).fetchall()
        existing_pids = {r[0] for r in existing if r[0]}
        existing_links = {r[1] for r in existing if r[1]}
        
        # Get candidates
        query_cand = text("SELECT id, cj_pid, amazon_link, title_en, images FROM candidate_products WHERE status IN ('draft', 'reviewing', 'approved')")
        candidates = conn.execute(query_cand).fetchall()
        
        to_audit = []
        duplicates = []
        
        for cand in candidates:
            c_id, pid, link, title, images = cand
            if pid in existing_pids or link in existing_links:
                duplicates.append(c_id)
            else:
                # Fix: Check if images is already a list or a string
                if isinstance(images, str):
                    try:
                        images_list = json.loads(images)
                    except:
                        images_list = []
                else:
                    images_list = images if images else []
                    
                to_audit.append({
                    "id": c_id,
                    "pid": pid,
                    "title": title,
                    "images": images_list
                })
        
        print(f"✅ Deduplication Complete: {len(duplicates)} duplicates found, {len(to_audit)} candidates for audit.")
        
        # Mark duplicates
        if duplicates:
            conn.execute(text("UPDATE candidate_products SET status = 'duplicate' WHERE id IN :ids"), {"ids": tuple(duplicates)})
            conn.commit()
            print(f"   - Marked {len(duplicates)} IDs as duplicate.")

        # Save audit queue
        os.makedirs("backend/data", exist_ok=True)
        with open("backend/data/v7_5_audit_queue.json", "w") as f:
            json.dump(to_audit, f)
        print(f"📂 Audit queue saved to backend/data/v7_5_audit_queue.json")

if __name__ == "__main__":
    asyncio.run(v7_5_dedup_and_audit())

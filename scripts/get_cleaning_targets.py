
import asyncio
import os
import sys
import json
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def get_cleaning_targets():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Get candidates that are approved or reviewing
        query_cand = text("SELECT id, title_zh, images, cj_pid FROM candidate_products WHERE status IN ('approved', 'reviewing') LIMIT 5")
        cands = conn.execute(query_cand).fetchall()
        
        # Get synced products
        query_prod = text("SELECT id, title_zh, primary_image, cj_pid FROM products LIMIT 5")
        prods = conn.execute(query_prod).fetchall()
        
        return {
            "candidates": [{"id": r[0], "title": r[1], "images": r[2], "pid": r[3]} for r in cands],
            "synced": [{"id": r[0], "title": r[1], "image": r[2], "pid": r[3]} for r in prods]
        }

if __name__ == "__main__":
    targets = get_cleaning_targets()
    print(json.dumps(targets))

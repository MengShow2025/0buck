
import asyncio
import os
import sys
import json
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def get_pilot_targets():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Get 2 from draft/synced
        query = text("""
            SELECT id, title_zh, images, cj_pid 
            FROM candidate_products 
            WHERE status IN ('draft', 'synced') 
            LIMIT 5
        """)
        results = conn.execute(query).fetchall()
        return [{"id": r[0], "title": r[1], "images": r[2], "pid": r[3]} for r in results]

if __name__ == "__main__":
    targets = get_pilot_targets()
    print(json.dumps(targets))

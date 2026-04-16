import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def check_lineage():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT id, product_id_1688, source_pid, asset_lineage_verified, image_fingerprint_md5 
            FROM candidate_products 
            WHERE product_id_1688 IN ('CJ-PRO-LED-175', 'CJ-DOOR-ZIG-154', 'CJ-MESH-SHOES-84')
        """))
        for row in res.fetchall():
            print(f"Verified {row[1]}: Lineage={row[3]}, Fingerprint={row[4]}")

if __name__ == "__main__":
    check_lineage()

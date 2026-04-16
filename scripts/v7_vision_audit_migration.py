import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def migrate_v7_vision_audit():
    engine = create_engine(DATABASE_URL)
    
    print("🛠️ v7.0 Truth Engine: Adding Vision Audit Columns...")
    
    cols = [
        ("vision_ocr_text", "TEXT"),
        ("vision_audit_passed", "BOOLEAN DEFAULT TRUE"),
        ("vision_audit_notes", "TEXT")
    ]
    
    with engine.connect() as conn:
        for table in ["products", "candidate_products"]:
            print(f"Migrating {table}...")
            for col, dtype in cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))
                    conn.commit()
                    print(f"   ✅ Added {col} to {table}")
                except Exception as e:
                    if "already exists" not in str(e):
                        print(f"   ❌ Error adding {col} to {table}: {e}")
                    conn.rollback()
                
    print("✨ Vision Audit Migration Complete.")

if __name__ == "__main__":
    migrate_v7_vision_audit()

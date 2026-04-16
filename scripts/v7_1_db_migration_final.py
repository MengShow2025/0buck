import os
import sys

# Add custom packages path first
sys.path.append('/tmp/v7_packages_311')

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def migrate_v7_schema_final():
    engine = create_engine(DATABASE_URL)
    
    print("🛠️ v7.1 Truth Engine: Final Schema Alignment...")
    
    missing_cols = [
        ("body_html", "TEXT")
    ]
    
    with engine.connect() as conn:
        for table in ["candidate_products"]:
            print(f"Migrating {table}...")
            for col, dtype in missing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))
                    conn.commit()
                    print(f"   ✅ Added {col} to {table}")
                except Exception as e:
                    if "already exists" not in str(e):
                        print(f"   ❌ Error adding {col} to {table}: {e}")
                    conn.rollback()
                
    print("✨ Migration Final Complete.")

if __name__ == "__main__":
    migrate_v7_schema_final()

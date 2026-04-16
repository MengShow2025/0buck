import os
import sys

# Add custom packages path first
sys.path.append('/tmp/v7_packages_311')

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def migrate_v7_schema_fix():
    engine = create_engine(DATABASE_URL)
    
    print("🛠️ v7.0 Truth Engine: Migrating Neon DB Schema (Fixing Missing Columns)...")
    
    extra_cols = [
        ("source_cost_usd", "FLOAT"),
        ("title_en", "VARCHAR"),
        ("description_en", "TEXT")
    ]
    
    with engine.connect() as conn:
        for table in ["candidate_products", "products"]:
            print(f"Migrating {table}...")
            for col, dtype in extra_cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))
                    conn.commit()
                    print(f"   ✅ Added {col} to {table}")
                except Exception as e:
                    if "already exists" not in str(e):
                        print(f"   ❌ Error adding {col} to {table}: {e}")
                    conn.rollback()
                
    print("✨ Migration Fix Complete.")

if __name__ == "__main__":
    migrate_v7_schema_fix()

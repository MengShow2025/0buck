import os
import sys

# DEBUG: Print sys.path
print(f"Initial sys.path: {sys.path}")

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')
print(f"Updated sys.path: {sys.path}")

# Check if sqlalchemy exists in /tmp/v7_packages_311
if os.path.exists('/tmp/v7_packages_311/sqlalchemy'):
    print("Found sqlalchemy in /tmp/v7_packages_311/sqlalchemy")
else:
    print("CRITICAL: sqlalchemy NOT found in /tmp/v7_packages_311/sqlalchemy")

try:
    from sqlalchemy import create_engine, text
    print("SUCCESS: Successfully imported sqlalchemy")
except ImportError as e:
    print(f"FAILURE: Could not import sqlalchemy: {e}")
    sys.exit(1)

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def migrate_v7_2_fingerprint():
    engine = create_engine(DATABASE_URL)
    
    print("🛠️ v7.2 Truth Engine: Adding Asset Fingerprint Columns...")
    
    cols = [
        ("source_pid", "VARCHAR"), # Hard CJ/1688 PID
        ("image_fingerprint_md5", "VARCHAR"), # MD5 of primary image URL
        ("asset_lineage_verified", "BOOLEAN DEFAULT FALSE"), # Final Cross-border Expert check
        ("source_platform_id", "VARCHAR"), # CJ, 1688, etc.
        ("shopify_product_handle", "VARCHAR")
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
                
    print("✨ v7.2 Fingerprint Migration Complete.")

if __name__ == "__main__":
    migrate_v7_2_fingerprint()

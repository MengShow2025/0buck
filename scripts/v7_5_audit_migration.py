
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def migrate_v7_5_audit_columns():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("🚀 Migration: Adding v7.5 Audit Columns to candidate_products...")
        columns = [
            "material_audit TEXT",
            "chip_audit TEXT",
            "count_audit TEXT",
            "weight_audit TEXT",
            "description_artisan TEXT",
            "obuck_price FLOAT",
            "primary_image_refined TEXT"
        ]
        for col in columns:
            try:
                # Use a subtransaction or separate execution to avoid aborting the whole block
                conn.execute(text(f"ALTER TABLE candidate_products ADD COLUMN {col}"))
                conn.commit()
                print(f"   ✅ Added column {col.split()[0]}")
            except Exception as e:
                conn.rollback()
                if "already exists" in str(e):
                    print(f"   ℹ️ Column {col.split()[0]} already exists.")
                else:
                    print(f"   ❌ Error adding {col}: {e}")
    print("✨ Migration Complete.")

if __name__ == "__main__":
    migrate_v7_5_audit_columns()

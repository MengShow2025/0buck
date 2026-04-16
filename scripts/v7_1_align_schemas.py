import os
import sys

# Add custom packages path first
sys.path.append('/tmp/v7_packages_311')
# Add backend path
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import create_engine, text
from app.models.product import CandidateProduct, Product

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def align_schemas():
    engine = create_engine(DATABASE_URL)
    
    print("🛠️ v7.1 Truth Engine: Aligning DB Schema with SQLAlchemy Models...")
    
    # Check CandidateProduct columns
    cand_cols = [
        ("packing_weight", "FLOAT"),
        ("product_weight", "FLOAT"),
        ("inventory_total", "INT"),
        ("supplier_id_cj", "VARCHAR"),
        ("supplier_name", "VARCHAR"),
        ("vendor_rating", "FLOAT"),
        ("estimated_sale_price", "FLOAT"),
        ("supplier_info", "JSONB DEFAULT '{}'"),
        ("title_en_preview", "VARCHAR"),
        ("description_en_preview", "VARCHAR"),
        ("visual_fingerprint", "VARCHAR"),
        ("desire_hook", "VARCHAR"),
        ("desire_logic", "VARCHAR"),
        ("desire_closing", "VARCHAR"),
        ("category", "VARCHAR"),
        ("category_type", "VARCHAR DEFAULT 'PROFIT'"),
        ("is_cashback_eligible", "BOOLEAN DEFAULT TRUE"),
        ("attributes", "JSONB DEFAULT '[]'"),
        ("variants_raw", "JSONB DEFAULT '[]'"),
        ("logistics_data", "JSONB DEFAULT '{}'"),
        ("mirror_assets", "JSONB DEFAULT '{}'"),
        ("structural_data", "JSONB DEFAULT '{}'"),
        ("raw_vendor_info", "JSONB DEFAULT '{}'"),
        ("audit_notes", "VARCHAR"),
        ("evidence", "JSONB DEFAULT '{}'"),
        ("source_url", "VARCHAR"),
        ("source_platform", "VARCHAR DEFAULT '1688'"),
        ("backup_source_url", "VARCHAR"),
        ("alibaba_comparison_price", "FLOAT"),
        ("cost_cny", "FLOAT"),
        ("comp_price_usd", "FLOAT"),
        ("amazon_price", "FLOAT"),
        ("ebay_price", "FLOAT"),
        ("amazon_compare_at_price", "FLOAT"),
        ("ebay_compare_at_price", "FLOAT"),
        ("market_comparison_url", "VARCHAR"),
        ("body_html", "TEXT"),
        ("title_en", "VARCHAR"),
        ("description_en", "TEXT"),
        ("title_zh", "VARCHAR"),
        ("description_zh", "VARCHAR"),
        ("images", "JSONB DEFAULT '[]'"),
        ("discovery_source", "VARCHAR"),
        ("discovery_evidence", "JSONB DEFAULT '{}'")
    ]
    
    with engine.connect() as conn:
        for table in ["candidate_products", "products"]:
            print(f"Migrating {table}...")
            for col, dtype in cand_cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))
                    conn.commit()
                    print(f"   ✅ Added {col} to {table}")
                except Exception as e:
                    if "already exists" not in str(e):
                        print(f"   ❌ Error adding {col} to {table}: {e}")
                    conn.rollback()
                
    print("✨ Alignment Complete.")

if __name__ == "__main__":
    align_schemas()

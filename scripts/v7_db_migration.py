import os
import sys

# Add custom packages path first
sys.path.append('/tmp/v7_packages_311')

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def migrate_v7_schema():
    engine = create_engine(DATABASE_URL)
    
    print("🛠️ v7.0 Truth Engine: Migrating Neon DB Schema...")
    
    cols_cand = [
        ("amazon_link", "VARCHAR"),
        ("amazon_sale_price", "FLOAT"),
        ("amazon_list_price", "FLOAT"),
        ("amazon_compare_at_price", "FLOAT"),
        ("hot_rating", "FLOAT"),
        ("profit_ratio", "FLOAT"),
        ("entry_tag", "VARCHAR"),
        ("platform_tag", "VARCHAR"),
        ("is_melted", "BOOLEAN DEFAULT FALSE"),
        ("melt_reason", "VARCHAR"),
        ("shipping_ratio", "FLOAT"),
        ("shipping_warning", "BOOLEAN DEFAULT FALSE"),
        ("cj_pid", "VARCHAR"),
        ("category_id", "VARCHAR"),
        ("category_name", "VARCHAR"),
        ("is_test_product", "BOOLEAN DEFAULT FALSE"),
        ("primary_image", "VARCHAR"),
        ("variant_images", "JSONB DEFAULT '[]'"),
        ("detail_images_html", "TEXT"),
        ("sell_price", "FLOAT"),
        ("variant_sell_price", "FLOAT"),
        ("dimensions_display", "VARCHAR"),
        ("weight_display", "VARCHAR"),
        ("freight_fee", "FLOAT"),
        ("shipping_days", "VARCHAR"),
        ("warehouse_anchor", "VARCHAR"),
        ("variant_sku", "VARCHAR"),
        ("variant_key", "VARCHAR"),
        ("entry_code", "VARCHAR"),
        ("entry_name", "VARCHAR"),
        ("product_props", "JSONB DEFAULT '{}'")
    ]
    
    cols_prod = cols_cand + [
        ("body_html", "TEXT"),
        ("title_en", "VARCHAR"),
        ("description_en", "TEXT")
    ]
    
    with engine.connect() as conn:
        print("Migrating candidate_products...")
        for col, dtype in cols_cand:
            try:
                conn.execute(text(f"ALTER TABLE candidate_products ADD COLUMN {col} {dtype}"))
                conn.commit()
                print(f"   ✅ Added {col} to candidate_products")
            except Exception as e:
                if "already exists" not in str(e):
                    print(f"   ❌ Error adding {col}: {e}")
                conn.rollback()
        
        print("Migrating products...")
        for col, dtype in cols_prod:
            try:
                conn.execute(text(f"ALTER TABLE products ADD COLUMN {col} {dtype}"))
                conn.commit()
                print(f"   ✅ Added {col} to products")
            except Exception as e:
                if "already exists" not in str(e):
                    print(f"   ❌ Error adding {col}: {e}")
                conn.rollback()
                
    print("✨ Migration Complete.")

if __name__ == "__main__":
    migrate_v7_schema()

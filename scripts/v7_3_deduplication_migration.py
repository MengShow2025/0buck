
from sqlalchemy import create_engine, text
import sys

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def apply_deduplication_constraints():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("🚀 Applying v7.3 Deduplication Constraints...")
        
        # 1. CandidateProduct: unique cj_pid
        try:
            conn.execute(text("ALTER TABLE candidate_products ADD CONSTRAINT uq_candidate_cj_pid UNIQUE (cj_pid)"))
            print("   ✅ Added UNIQUE constraint to candidate_products.cj_pid")
        except Exception as e:
            if "already exists" in str(e):
                print("   ℹ️ UNIQUE constraint already exists on candidate_products.cj_pid")
            else:
                print(f"   ❌ Error adding constraint to candidate_products: {e}")
        
        # 2. Product: unique cj_pid
        try:
            conn.execute(text("ALTER TABLE products ADD CONSTRAINT uq_product_cj_pid UNIQUE (cj_pid)"))
            print("   ✅ Added UNIQUE constraint to products.cj_pid")
        except Exception as e:
            if "already exists" in str(e):
                print("   ℹ️ UNIQUE constraint already exists on products.cj_pid")
            else:
                print(f"   ❌ Error adding constraint to products: {e}")
                
        # 3. CandidateProduct: unique amazon_link (secondary dedup)
        try:
            conn.execute(text("ALTER TABLE candidate_products ADD CONSTRAINT uq_candidate_amazon_link UNIQUE (amazon_link)"))
            print("   ✅ Added UNIQUE constraint to candidate_products.amazon_link")
        except Exception as e:
            if "already exists" in str(e):
                print("   ℹ️ UNIQUE constraint already exists on candidate_products.amazon_link")
            else:
                print(f"   ❌ Error adding constraint to candidate_products: {e}")
        
        conn.commit()
    print("✨ Migration Complete.")

if __name__ == "__main__":
    apply_deduplication_constraints()

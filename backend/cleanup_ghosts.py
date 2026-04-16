
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add the project root to sys.path
sys.path.append(os.getcwd())

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not found in .env")
    sys.exit(1)

# v7.5.5: Explicitly use pg8000 as specified in 0Buck technical memory
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://")
    # v7.5.6: Remove unsupported params for pg8000
    if "?" in db_url:
        db_url = db_url.split("?")[0]

engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        # v7.5.5: Cleanup ghost products (0 price or no images) from the main table
        print("🔍 Searching for ghost products (0 price or no images)...")
        
        # Deactivate products with 0 price
        res1 = conn.execute(text("UPDATE products SET is_active = false WHERE sale_price = 0 OR sale_price IS NULL"))
        print(f"✅ Deactivated {res1.rowcount} products with 0 price.")
        
        # Deactivate products with empty images
        res2 = conn.execute(text("UPDATE products SET is_active = false WHERE images IS NULL OR CAST(images AS TEXT) = '[]' OR CAST(images AS TEXT) = 'null'"))
        print(f"✅ Deactivated {res2.rowcount} products with no images.")
        
        conn.commit()
        print("✨ Database cleanup complete.")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        conn.rollback()

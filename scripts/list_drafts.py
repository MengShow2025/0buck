import sys
import os
from sqlalchemy import create_engine, text

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_root = os.path.join(project_root, 'backend')
if backend_root not in sys.path:
    sys.path.append(backend_root)

from app.core.config import settings

def list_drafts():
    db_uri = 'postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
    engine = create_engine(db_uri)
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SELECT title_zh, amazon_price, market_comparison_url, created_at FROM candidate_products WHERE status = 'draft' ORDER BY created_at DESC"))
            print("Current Drafts in Library:")
            for row in result:
                print(f"- {row[0]}")
                print(f"  Amazon: ${row[1]} ({row[2]})")
                print(f"  Time: {row[3]}")
                print("-" * 20)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    list_drafts()

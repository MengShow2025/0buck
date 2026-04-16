import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)

def debug_candidate(cid):
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, title_zh, title_en_preview, description_zh, description_en, images, variants, attributes, structural_data FROM candidate_products WHERE id = :id"), {"id": cid})
        row = res.fetchone()
        if not row:
            print(f"❌ Candidate {cid} not found.")
            return

        print(f"\n--- Candidate ID: {row.id} ---")
        print(f"Title ZH: {row.title_zh}")
        print(f"Title EN: {row.title_en_preview}")
        print(f"Desc ZH: {row.description_zh}")
        print(f"Desc EN: {row.description_en}")
        
        try:
            vars_data = json.loads(row.variants) if row.variants else []
            print(f"Variants Count: {len(vars_data)}")
            if vars_data:
                print(f"First Variant Sample: {json.dumps(vars_data[0], indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"Error parsing variants: {e}")

        try:
            attrs = json.loads(row.attributes) if row.attributes else []
            print(f"Attributes Count: {len(attrs)}")
            if attrs:
                print(f"Attributes Sample: {json.dumps(attrs[:3], indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"Error parsing attributes: {e}")

if __name__ == "__main__":
    # The shoe from the screenshot might be 84 (from previous context)
    debug_candidate(84)
    debug_candidate(154)
    debug_candidate(175)

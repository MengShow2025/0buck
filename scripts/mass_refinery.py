import os
import sys
import json
import time
import re
import asyncio
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.services.supply_chain import SupplyChainService
from app.models.product import CandidateProduct

def clean_label(text):
    if not text: return ""
    # v5.9.7: Rigidly strip [The Hook], Hook:, [The Logic], etc.
    return re.sub(r'^\[?The (?:Hook|Logic|Closing|Contract)\]?:?\s*', '', text, flags=re.IGNORECASE).strip()

async def refine_batch():
    db = SessionLocal()
    sc = SupplyChainService(db)
    
    print("🚀 0Buck Step 2: AI Refinery (Natural Narrative Mode)...")
    
    # 1. Fetch only 'draft' items
    drafts = db.query(CandidateProduct).filter_by(status='draft').all()
    
    if not drafts:
        print("☕ No new drafts to polish.")
        return

    print(f"✨ Found {len(drafts)} drafts. Applying Desire Engine v5.0 (No Labels)...")

    for d in drafts:
        try:
            print(f"   🤖 Refining: {d.title_zh[:30]}...")
            
            # AI Narrative & Branding Refinement
            enriched = await sc.translate_and_enrich({
                "title": d.title_zh,
                "category": d.category or "Artisan Collection",
                "price": d.cost_cny / 7.1
            }, strategy="IDS_BRUTE_FORCE")
            
            # Update fields with Cleaned Labels
            d.title_en_preview = clean_label(enriched.get("title_en") or d.title_zh)
            d.description_zh = clean_label(enriched.get("description_en") or "")
            d.desire_hook = clean_label(enriched.get("desire_hook") or "")
            d.desire_logic = clean_label(enriched.get("desire_logic") or "")
            d.desire_closing = clean_label(enriched.get("desire_closing") or "")
            
            # Move to 'refined' state for checking
            d.status = 'refined'
            d.audit_notes = f"AI Polished (Labels Stripped) at {time.strftime('%Y-%m-%d %H:%M:%S')}."
            
            db.commit()
            print(f"      ✅ Success: {d.title_en_preview[:30]}...")
            
        except Exception as e:
            db.rollback()
            print(f"      ❌ Refinement Error for {d.title_zh[:20]}: {e}")

    db.close()
    print("\n🏁 Refinery Batch Complete. Proceed to Step 3: Manual Check.")

if __name__ == "__main__":
    asyncio.run(refine_batch())

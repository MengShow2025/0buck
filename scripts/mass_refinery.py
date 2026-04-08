import os
import sys
import json
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.services.supply_chain import SupplyChainService
from app.models.product import CandidateProduct

def run_refinery():
    db = SessionLocal()
    sc = SupplyChainService(db)
    
    print("🚀 0Buck Step 2: AI Refinery (Polishing Drafts)...")
    
    # 1. Fetch only 'draft' items
    drafts = db.query(CandidateProduct).filter_by(status='draft').all()
    
    if not drafts:
        print("☕ No new drafts to polish. Scanner is still hunting...")
        return

    print(f"✨ Found {len(drafts)} drafts. Applying Desire Engine v5.0...")

    for d in drafts:
        try:
            print(f"   🤖 Refining: {d.title_zh[:30]}...")
            
            # AI Narrative & Branding Refinement
            # We use the raw data from the draft stage
            enriched = asyncio.run(sc.translate_and_enrich({
                "title": d.title_zh,
                "category": d.category or "Artisan Collection",
                "price": d.cost_cny / 7.1
            }, strategy="IDS_BRUTE_FORCE"))
            
            # Update fields but DO NOT change status to approved yet
            d.title_en_preview = enriched.get("title_en")
            d.description_zh = enriched.get("description_en")
            d.desire_hook = enriched.get("desire_hook")
            d.desire_logic = enriched.get("desire_logic")
            d.desire_closing = enriched.get("desire_closing")
            
            # Move to 'refined' state for checking
            d.status = 'refined'
            d.audit_notes = f"AI Polished at {time.strftime('%Y-%m-%d %H:%M:%S')}. Ready for human check."
            
            db.commit()
            print(f"      ✅ Refined: {d.title_en_preview[:20]}")
            
        except Exception as e:
            db.rollback()
            print(f"      ❌ Refinement Error: {e}")

    db.close()
    print("\n🏁 Refinery Batch Complete. Proceed to Step 3: Manual Check.")

if __name__ == "__main__":
    # SupplyChainService needs an event loop for translate_and_enrich
    import asyncio
    run_refinery()

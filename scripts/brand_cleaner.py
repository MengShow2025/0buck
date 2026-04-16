import os, sys, re
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
from app.db.session import SessionLocal
from app.models.product import CandidateProduct
from decimal import Decimal

from app.utils.brand_cleaner import clean_title

def process_cleaning():
    db = SessionLocal()
    # v6.1.7: Clean both automated CJ leads and Expert 1688 leads
    products = db.query(CandidateProduct).filter(
        CandidateProduct.discovery_source.in_(['AOXIAO_CJ_LINKED_V6.1', '1688_EXPERT_SNIPE_V6.1']),
        CandidateProduct.status.in_(['draft', 'approved', 'research_draft'])
    ).all()
    
    print(f"🧹 Cleaning {len(products)} candidate titles...")
    
    for p in products:
        old_title = p.title_en_preview
        new_title = clean_title(old_title)
        
        # Apply 0.6 Rule for Pricing (or tactical pricing if already set)
        anchor = float(p.amazon_compare_at_price or p.amazon_price or 0)
        if anchor > 0 and not p.estimated_sale_price:
            p.estimated_sale_price = float(round(Decimal(str(anchor)) * Decimal("0.6"), 2))
            print(f"   💰 {p.id}: ${anchor} -> ${p.estimated_sale_price}")
        
        p.title_en_preview = new_title
        p.status = 'approved' # Mark as approved for uploader
        
        # Preserve 1688 platform if already set by expert
        if not p.source_platform:
            p.source_platform = 'CJ'
            
        print(f"   ✅ ID {p.id}: {old_title[:30]}... -> {new_title[:50]}...")
        
    db.commit()
    db.close()

if __name__ == "__main__":
    process_cleaning()

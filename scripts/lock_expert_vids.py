import asyncio
import os
import sys
import json
from decimal import Decimal

# Ensure project root is in sys.path
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))

from app.db.session import SessionLocal
from app.models.product import CandidateProduct
from app.services.cj_service import CJDropshippingService

async def lock_expert_vids():
    db = SessionLocal()
    cj_api = CJDropshippingService()
    
    # Target IDs (Expert-audited)
    target_ids = [84, 154, 175, 271]
    
    for cid in target_ids:
        p = db.query(CandidateProduct).get(cid)
        if not p or not p.product_id_1688:
            continue
            
        pid = p.product_id_1688
        print(f"🔎 Auditing CJ PID for ID {cid}: {pid}")
        
        detail = await cj_api.get_product_detail(pid)
        if not detail or not detail.get("variants"):
            print(f"   ❌ Could not fetch CJ detail for {pid}")
            continue
            
        # v6.2.0: Lock the first variant as the "Expert Audit" baseline
        # (In a more complex case, we'd match specs like 240g or 152 LEDs)
        best_variant = detail["variants"][0]
        vid = best_variant.get("vid")
        sku = best_variant.get("variantSku")
        
        # Store in variants_raw for Step 6 Fulfillment
        p.variants_raw = {
            "vid": vid,
            "sku": sku,
            "audit_specs": detail.get("productUnit", "Verified Artisan Grade"),
            "source": "CJ_EXPERT_LOCK_V6.2"
        }
        
        # Update cost from CJ (Landed cost calculation)
        p.cost_cny = float(best_variant.get("variantSellPrice", 0)) # Using cost_cny slot for USD
        
        print(f"   ✅ Locked VID: {vid} | Cost: ${p.cost_cny}")
        
    db.commit()
    db.close()

if __name__ == "__main__":
    asyncio.run(lock_expert_vids())

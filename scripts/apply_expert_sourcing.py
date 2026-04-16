import os, sys, json
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
from app.db.session import SessionLocal
from app.models.product import CandidateProduct
from decimal import Decimal

db = SessionLocal()

def update_lead(asin, new_pid, cost_rmb, expert_id, new_source="1688_EXPERT_SNIPE_V6.1"):
    p = db.query(CandidateProduct).filter(CandidateProduct.product_id_1688 == f"ASIN:{asin}").first()
    if not p:
        # Check if already updated but still has old source URL or something
        p = db.query(CandidateProduct).filter(CandidateProduct.title_en_preview.like(f"%{asin}%") | CandidateProduct.source_url.like(f"%{asin}%")).first()
    
    if p:
        p.product_id_1688 = new_pid if new_pid else p.product_id_1688
        p.status = 'approved'
        p.source_platform = '1688'
        p.cost_cny = float(cost_rmb)
        p.discovery_source = new_source
        p.discovery_evidence = f"Matched with 1688 Expert Source ID {expert_id}"
        p.structural_data = {
            "1688_id": expert_id,
            "real_cost_rmb": float(cost_rmb),
            "source": "1688_EXPERT_SNIPE"
        }
        db.commit()
        print(f"✅ Updated ASIN {asin} (ID: {p.id}) to 1688 source.")
    else:
        print(f"❓ Could not find lead for ASIN {asin}")

# LED Mask (B0FJ6CNXYH) -> 853378630188 (1688)
update_lead("B0FJ6CNXYH", "853378630188", 30.0, "853378630188")
# WiFi Alarm (B0F5LYZRVL) -> 976849159661 (1688)
update_lead("B0F5LYZRVL", "976849159661", 8.0, "976849159661")
# True Classic T-Shirt (B0BJZ9GT1J) -> 615058915656 (1688)
update_lead("B0BJZ9GT1J", "615058915656", 18.5, "615058915656")

db.close()

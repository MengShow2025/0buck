
import asyncio
import os
import sys
import json
from typing import List, Dict, Any

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.services.cj_service import CJDropshippingService
from app.db.session import SessionLocal
from app.models.product import CandidateProduct

async def inspect_cj_products():
    cj = CJDropshippingService()
    db = SessionLocal()
    
    # IDs from my earlier bash check
    target_ids = [84, 154, 175, 271]
    leads = db.query(CandidateProduct).filter(CandidateProduct.id.in_(target_ids)).all()
    
    results = []
    
    for lead in leads:
        pid = lead.product_id_1688
        print(f"🔎 Inspecting CJ PID: {pid} (Lead {lead.id})")
        
        # We need to manually call with features to get video
        url = f"{cj.BASE_URL}/product/query"
        headers = await cj._get_headers()
        params = {
            "pid": pid,
            "features": "enable_video,enable_inventory"
        }
        
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            data = response.json()
            if data.get("success"):
                product_data = data.get("data", {})
                
                # Identify default VID (usually the first one)
                variants = product_data.get("variants", [])
                default_vid = variants[0].get("vid") if variants else None
                
                # Video
                video_url = product_data.get("videoUrl") or product_data.get("productVideoUrl")
                
                results.append({
                    "lead_id": lead.id,
                    "pid": pid,
                    "default_vid": default_vid,
                    "video_url": video_url,
                    "variant_count": len(variants),
                    "full_data": product_data
                })
                
                # Update database
                structural_data = lead.structural_data or {}
                structural_data["default_vid"] = default_vid
                structural_data["video_url"] = video_url
                structural_data["cj_sourcing_verified"] = True
                lead.structural_data = structural_data
                
                print(f"   ✅ VID: {default_vid} | Video: {video_url}")
            else:
                print(f"   ❌ Failed: {data.get('message')}")
                
    db.commit()
    db.close()
    
    with open("cj_inspection_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"🏁 Inspection complete. Results saved to cj_inspection_results.json")

if __name__ == "__main__":
    asyncio.run(inspect_cj_products())

import asyncio
import os
import sys
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Ensure project root is in sys.path
project_root = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck"
sys.path.append(os.path.join(project_root, "backend"))

from app.services.cj_service import CJDropshippingService

load_dotenv()

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)

async def deep_source_v7_2_2():
    cj = CJDropshippingService()
    
    # Target IDs (Candidate IDs)
    target_ids = [154, 175, 84, 353, 357, 364]
    
    print(f"🚀 v7.2.2 Deep Sourcing: Updating Candidates {target_ids}...")
    
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, cj_pid FROM candidate_products WHERE id IN :ids"), {"ids": target_ids})
        rows = res.fetchall()
        
        for row in rows:
            print(f"   🔍 Fetching CJ Detail for PID: {row.cj_pid} (ID: {row.id})...")
            detail = await cj.get_product_detail(row.cj_pid)
            
            if not detail:
                print(f"   ❌ Failed to get CJ detail for {row.cj_pid}")
                continue
            
            # Extract Rich Data
            images = []
            if detail.get("productImage"): images.append(detail["productImage"])
            if detail.get("productImageSet"):
                images.extend(detail["productImageSet"])
            
            # Variants
            variants = detail.get("variants", [])
            
            # Attributes (Material, Weight, etc.)
            attributes = []
            if detail.get("materialEn"): attributes.append({"label": "Material", "value": detail["materialEn"]})
            if detail.get("packingWeight"): attributes.append({"label": "Packing Weight", "value": f"{detail['packingWeight']}g"})
            if detail.get("productWeight"): attributes.append({"label": "Net Weight", "value": f"{detail['productWeight']}g"})
            if detail.get("productUnit"): attributes.append({"label": "Unit", "value": detail["productUnit"]})
            
            # Update DB
            update_data = {
                "id": row.id,
                "description_zh": detail.get("productDescription", ""),
                "images": json.dumps(images),
                "variants": json.dumps(variants),
                "attributes": json.dumps(attributes),
                "category_name": detail.get("categoryName", "General"),
                "structural_data": json.dumps(detail) # Keep full copy for safety
            }
            
            conn.execute(text("""
                UPDATE candidate_products 
                SET description_zh = :description_zh,
                    images = :images,
                    variants = :variants,
                    attributes = :attributes,
                    category_name = :category_name,
                    structural_data = :structural_data
                WHERE id = :id
            """), update_data)
            conn.commit()
            print(f"   ✅ Updated ID {row.id} with {len(variants)} variants and {len(images)} images.")

if __name__ == "__main__":
    asyncio.run(deep_source_v7_2_2())

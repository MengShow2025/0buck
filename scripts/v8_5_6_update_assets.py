import json
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker
import glob
import os

DATABASE_URL = "postgresql+pg8000://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb"

def update_assets():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    files = glob.glob("scripts/result_*.json")
    print(f"🔄 Updating {len(files)} items with deep assets...")

    for file_path in files:
        pid = os.path.basename(file_path).replace("result_", "").replace(".json", "")
        with open(file_path, "r") as f:
            data = json.load(f)
        
        # Merge gallery and detail images
        all_images = data.get("gallery", []) + data.get("detail_images", [])
        video = data.get("video", "")
        certs = data.get("certs", [])
        
        # Use first image as main image if it exists
        primary_image = all_images[0] if all_images else None
        
        sql = text("""
            UPDATE candidate_products 
            SET images = CAST(:images AS jsonb),
                admin_tags = CAST(:certs AS jsonb),
                description_en = :desc_update
            WHERE product_id_1688 = :pid
        """)
        
        desc_update = f"Deep Assets Extracted. Video: {video}. Certs: {len(certs)} photos."
        
        session.execute(sql, {
            "pid": pid,
            "images": json.dumps(all_images),
            "certs": json.dumps(certs),
            "desc_update": desc_update
        })
        print(f"✅ Updated: {pid} ({len(all_images)} images, {len(certs)} certs)")

    session.commit()
    session.close()

if __name__ == "__main__":
    update_assets()

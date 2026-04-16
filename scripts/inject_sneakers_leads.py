
import os
import sys
import json
from datetime import datetime

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.models.product import CandidateProduct

def inject_sneakers():
    print("🚀 Injecting Skechers Walking Shoes Benchmarks into Draft Library...")
    db = SessionLocal()
    source = "AOXIAO_AMZ_EXCEL_V6.1"
    
    benchmarks = [
        {
            "asin": "B0CLP6DRCH",
            "title": "Skechers Men's Go Walk Max Clinched Athletic Walking Shoes",
            "price": 50.64,
            "url": "https://www.amazon.com/dp/B0CLP6DRCH",
            "image": "https://m.media-amazon.com/images/I/71u9vY0L1lL._AC_SY695_.jpg",
            "category": "Clothing, Shoes & Jewelry",
            "sales": "399"
        },
        {
            "asin": "B07N13RJ4K",
            "title": "Skechers Women's Go Walk 5 Walking Shoes",
            "price": 43.96,
            "url": "https://www.amazon.com/dp/B07N13RJ4K",
            "image": "https://m.media-amazon.com/images/I/71qVv9X+NUL._AC_SY695_.jpg",
            "category": "Clothing, Shoes & Jewelry",
            "sales": "1000+"
        },
        {
            "asin": "B0B37NQT23",
            "title": "Skechers Men's Go Walk Max Clinched Athletic Walking Shoes (Variant)",
            "price": 60.31,
            "url": "https://www.amazon.com/dp/B0B37NQT23",
            "image": "https://m.media-amazon.com/images/I/71u9vY0L1lL._AC_SY695_.jpg",
            "category": "Clothing, Shoes & Jewelry",
            "sales": "33"
        }
    ]
    
    count = 0
    for item in benchmarks:
        asin = item["asin"]
        # Check if already exists
        check = db.query(CandidateProduct).filter(CandidateProduct.product_id_1688 == f"ASIN:{asin}").first()
        if check:
            print(f"   ⚠️ ASIN {asin} already exists. Updating status to research_draft.")
            check.status = 'research_draft'
            check.amazon_price = item["price"]
            check.title_en_preview = item["title"]
            continue
            
        evidence = {
            "asin": asin,
            "monthly_sales": item["sales"],
            "original_category": item["category"],
            "import_source": "MANUAL_SNIPER_V6.1"
        }
        
        new_c = CandidateProduct(
            product_id_1688=f"ASIN:{asin}",
            status='research_draft',
            discovery_source=source,
            title_en_preview=item["title"],
            amazon_price=item["price"],
            amazon_compare_at_price=item["price"],
            source_url=item["url"],
            images=json.dumps([item["image"]]),
            evidence=evidence,
            discovery_evidence=f"Manual Sniper Lead: Skechers Benchmarking ASIN {asin}. Monthly Sales: {item['sales']}",
            category=item["category"]
        )
        db.add(new_c)
        count += 1
        
    db.commit()
    db.close()
    print(f"🏁 Successfully injected {count} leads.")

if __name__ == "__main__":
    inject_sneakers()

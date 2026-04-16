import pandas as pd
import os
import sys
import json
import time
from decimal import Decimal
from sqlalchemy import text

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.models.product import CandidateProduct

def import_excel(file_path):
    print(f"🚀 Importing Amazon Excel from: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    # Read Excel
    df = pd.read_excel(file_path, sheet_name="商品信息")
    print(f"📂 Found {len(df)} rows. Columns: {df.columns.tolist()}")
    
    db = SessionLocal()
    source = "AOXIAO_AMZ_EXCEL_V6.1"
    count = 0
    
    try:
        for _, row in df.iterrows():
            asin = str(row['商品ID'])
            title = str(row['商品标题'])
            brand = str(row.get('品牌', 'nan'))
            # Check price column name - sometimes it has spaces or hidden chars
            price_col = '商品价格'
            price = float(row[price_col]) if pd.notna(row[price_col]) else 0.0
            sales = str(row['月销量'])
            url = str(row['商品链接'])
            image = str(row['商品主图'])
            category = str(row['类目名称'])
            
            # Check if already exists by ASIN (stored in product_id_1688 prefix)
            check = db.query(CandidateProduct).filter(CandidateProduct.product_id_1688 == f"ASIN:{asin}").first()
            if check:
                # Update existing candidate with brand info if missing
                if 'brand' not in check.evidence:
                    check.evidence['brand'] = brand
                    db.commit()
                continue
                
            evidence = {
                "asin": asin,
                "brand": brand,
                "monthly_sales": sales,
                "sales_trend": str(row.get('销量走势', '')),
                "original_category": category,
                "import_source": "AOXIAO_1688_PLUGIN"
            }
            
            # Create new candidate as "research_draft"
            try:
                new_c = CandidateProduct(
                    product_id_1688=f"ASIN:{asin}",
                    status='research_draft',
                    discovery_source=source,
                    title_en_preview=title,
                    amazon_price=price,
                    amazon_compare_at_price=price,
                    source_url=url,
                    images=json.dumps([image]),
                    evidence=evidence, # Model handles JSON serialization if defined
                    discovery_evidence=f"Directly imported from Amazon Top Seller List (Aoxiao Excel). Monthly Sales: {sales}",
                    category=category
                )
                
                db.add(new_c)
                db.flush() # Try flushing to catch constraint errors early
                count += 1
                if count % 10 == 0:
                    db.commit()
                    print(f"   ... Processed {count} items")
            except Exception as e:
                db.rollback()
                if "UniqueViolation" in str(e) or "duplicate key" in str(e):
                    # print(f"   ⚠️ ASIN {asin} already exists (Caught during flush). Skipping.")
                    pass
                else:
                    print(f"   🔥 Error importing ASIN {asin}: {e}")
        
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"🔥 Error during import: {e}")
    finally:
        db.close()
        
    print(f"\n🏁 Successfully imported {count} new research candidates.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        import_excel(sys.argv[1])
    else:
        import_excel("/Users/long/Desktop/amazon-product-1775950646752.xlsx")

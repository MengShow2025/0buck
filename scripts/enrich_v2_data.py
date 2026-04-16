
import asyncio
import os
import sys
import json
import httpx
import time
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.services.cj_service import CJDropshippingService
from app.models.product import CandidateProduct
from sqlalchemy import text

async def enrich_all():
    db = SessionLocal()
    cj = CJDropshippingService()
    
    print("🚀 0Buck v6.1.6 工业级数据大补全 (Enrichment SOP) 启动...")
    
    # 1. Enrich Candidate Products (Visible to Frontend)
    candidates = db.query(CandidateProduct).filter(CandidateProduct.status == 'draft').all()
    print(f"📦 发现 {len(candidates)} 款待选商品 (Candidates) 需要补全...")
    
    for c in candidates:
        pid = c.product_id_1688
        print(f"🔍 补全待选: {c.title_zh[:30]} (PID: {pid})")
        
        try:
            # 1. Get Detail for Rating/Inventory/Supplier
            detail = await cj.get_product_detail(pid)
            # 2. Get Logistics V2 (Fast Calculation)
            estimates = await cj.get_freight_estimate(pid, "US")
            
            updates = {}
            if detail:
                updates["vendor_rating"] = detail.get("shopRating", 0.0)
                updates["inventory_total"] = detail.get("inventory", 0)
                updates["supplier_name"] = detail.get("supplierName") or detail.get("shopName", "Verified Artisan")
            
            curr_logistics = c.logistics_data or {}
            if estimates:
                cheapest = min([f for f in estimates if f], key=lambda x: float(x.get('logisticFee', 999)))
                curr_logistics["shipping_estimate"] = {
                    "fee": float(cheapest.get("logisticFee", 0)),
                    "days": cheapest.get("shippingTime", "7-15 days"),
                    "method": cheapest.get("logisticName", "Unknown"),
                    "last_updated": str(time.time())
                }
            
            curr_supplier = c.supplier_info or {}
            if "vendor_rating" in updates:
                curr_supplier["rating"] = updates["vendor_rating"]
                curr_supplier["name"] = updates["supplier_name"]
                curr_supplier["inventory"] = updates["inventory_total"]

            # Update Candidate (Ensuring JSON structures are populated)
            db.execute(text("""
                UPDATE candidate_products 
                SET logistics_data = :logistics, 
                    supplier_info = :supplier
                WHERE id = :id
            """), {
                "logistics": json.dumps(curr_logistics), 
                "supplier": json.dumps(curr_supplier),
                "id": c.id
            })
            db.commit()
            print(f"   ✅ 待选补全成功: Freight ${curr_logistics.get('shipping_estimate', {}).get('fee')} / Rating {updates.get('vendor_rating')}")
            
            await asyncio.sleep(5.0) # 严格遵守限流，5秒一发
            
        except Exception as e:
            db.rollback()
            print(f"   ❌ 待选补全失败 {pid}: {e}")
            if "429" in str(e):
                print("💤 触发限流休眠 60s...")
                await asyncio.sleep(60)

    # 2. Enrich Raw Library (Audit Consistency)
    print("\n📚 启动原石库 (CJ Raw Products) 深度大补全...")
    # Only enrich products without freight_fee
    cur = db.execute(text("SELECT cj_pid, title_en FROM cj_raw_products WHERE freight_fee IS NULL LIMIT 100"))
    raw_list = cur.fetchall()
    print(f"📦 发现 {len(raw_list)} 款原石 (Raw) 正在排队补全...")
    
    for r in raw_list:
        pid, title = r
        print(f"🔍 深度补全: {title[:30]} (PID: {pid})")
        
        try:
            # Get Detail for Rating/Inventory
            detail = await cj.get_product_detail(pid)
            # Get Freight
            estimates = await cj.get_freight_estimate(pid, "US")
            
            updates = {}
            if detail:
                updates["vendor_rating"] = detail.get("shopRating", 0.0)
                updates["inventory_total"] = detail.get("inventory", 0)
                # Raw table doesn't have supplier_name column yet, so we just use the existing ones
            
            if estimates:
                cheapest = min([f for f in estimates if f], key=lambda x: float(x.get('logisticFee', 999)))
                updates["freight_fee"] = float(cheapest.get("logisticFee", 0))
                updates["shipping_days"] = cheapest.get("shippingTime", "7-15 days")
            
            if updates:
                db.execute(text("""
                    UPDATE cj_raw_products 
                    SET freight_fee = :f, shipping_days = :s, 
                        vendor_rating = :v, inventory_total = :i
                    WHERE cj_pid = :pid
                """), {
                    "f": updates.get("freight_fee"), "s": updates.get("shipping_days"),
                    "v": updates.get("vendor_rating"), "i": updates.get("inventory_total"),
                    "pid": pid
                })
                db.commit()
                print(f"   ✅ 原石补全成功: Rating {updates.get('vendor_rating')} / Inventory {updates.get('inventory_total')}")
            
            await asyncio.sleep(5.0) # 严格遵守限流
            
        except Exception as e:
            db.rollback()
            print(f"   ❌ 原石补全失败 {pid}: {e}")
            if "429" in str(e):
                print("💤 触发限流休眠 60s...")
                await asyncio.sleep(60)

    db.close()
    print("🏁 数据大补全任务 (v6.1.6) 已全部完成。")

if __name__ == "__main__":
    asyncio.run(enrich_all())

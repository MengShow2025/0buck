import sys
import os
import json
import shopify
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.app.core.config import settings

def update_top10_metafields():
    shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
    session = shopify.Session(shop_url, "2024-01", settings.SHOPIFY_ACCESS_TOKEN)
    shopify.ShopifyResource.activate_session(session)
    
    # Top 10 Mapping (Planner Title -> {1688_id, cost_cny})
    top10_data = {
        "0Buck Smart Home Hub": {"id": "1688_HUB_001", "price": 45.0},
        "0Buck AI Smart Home Hub": {"id": "1688_HUB_001", "price": 45.0},
        "0Buck Crystal Glow Bluetooth Speaker - HiFi Deep Bass": {"id": "1029783429203", "price": 20.0},
        "0Buck 5-in-1 Multi-functional Wireless Charging Station": {"id": "1002375336070", "price": 173.0},
        "Custom Mechanical Gaming Keyboard": {"id": "1688_KBD_001", "price": 85.0},
        "0Buck White Noise Sleep Aid Speaker - Rechargeable": {"id": "830412795104", "price": 43.0},
        "0Buck Intelligent Wall-Mounted Fragrance Diffuser": {"id": "1791374538", "price": 92.0},
        "0Buck Padded Adjustable Outdoor Camping Recliner": {"id": "981415419676", "price": 35.0},
        "0Buck Portable Foldable Outdoor Camping Stool": {"id": "568923561981", "price": 9.9},
        "0Buck Modern Minimalist Metal LED Table Lamp": {"id": "898004673346", "price": 11.0},
        "户外升降桌自由调节户外折叠桌椅套装碳钢金野餐折叠椅子摆摊露桌": {"id": "1688_TABLE_001", "price": 160.0},
        "加棉躺椅户外椅子四档调节加棉月亮椅午休椅露营躺椅可拆卸带腿托": {"id": "981415419676", "price": 35.0}
    }
    
    products = shopify.Product.find(limit=50)
    print(f"Found {len(products)} products on Shopify.")
    
    buffered_rate = settings.EXCHANGE_RATE * (1 + settings.EXCHANGE_BUFFER) # 0.1407
    
    success_count = 0
    for sp in products:
        clean_title = sp.title.replace("[0Buck] ", "").strip()
        data = None
        
        # Match by clean title or full title
        if clean_title in top10_data:
            data = top10_data[clean_title]
        elif sp.title in top10_data:
            data = top10_data[sp.title]
            
        if data:
            source_1688_id = data['id']
            cost_cny = float(data['price'])
            source_cost_usd = round(cost_cny * buffered_rate, 4)
            
            target_mfs = [
                {"namespace": "0buck_sync", "key": "source_1688_id", "value": source_1688_id, "type": "single_line_text_field"},
                {"namespace": "0buck_sync", "key": "original_cost", "value": str(cost_cny), "type": "number_decimal"},
                {"namespace": "0buck_sync", "key": "source_cost_usd", "value": str(source_cost_usd), "type": "number_decimal"},
                {"namespace": "0buck_sync", "key": "last_sync_timestamp", "value": datetime.now().isoformat(), "type": "date_time"},
                {"namespace": "0buck_sync", "key": "is_reward_eligible", "value": "true", "type": "single_line_text_field"}
            ]
            
            for mf_data in target_mfs:
                sp.add_metafield(shopify.Metafield(mf_data))
            
            print(f"  Aligned Top 10: {sp.title} (ID: {source_1688_id}, Cost USD: {source_cost_usd})")
            success_count += 1

    shopify.ShopifyResource.clear_session()
    print(f"\nReport: {success_count} Top 10 items aligned.")

if __name__ == "__main__":
    update_top10_metafields()

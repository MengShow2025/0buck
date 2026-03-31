import sys
import os
import shopify
from datetime import datetime
from decimal import Decimal

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.app.core.config import settings

def align_all_shopify_metafields(limit=250):
    print(f"Connecting to Shopify: {settings.SHOPIFY_SHOP_NAME}")
    
    # Configure Shopify session
    shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
    session = shopify.Session(shop_url, "2024-01", settings.SHOPIFY_ACCESS_TOKEN)
    shopify.ShopifyResource.activate_session(session)
    
    # Fetch all products
    products = shopify.Product.find(limit=limit)
    print(f"Found {len(products)} products on Shopify.")
    
    aligned_count = 0
    fixed_count = 0
    error_count = 0
    
    for sp in products:
        try:
            print(f"Processing: {sp.title} ({sp.id})")
            
            # 1. Get existing metafields
            mfs = sp.metafields()
            mf_map = {f"{mf.namespace}.{mf.key}": mf for mf in mfs}
            
            # 2. Check for 1688 ID in SKU if not in metafields
            sku = ""
            if sp.variants:
                sku = sp.variants[0].sku or ""
            
            source_1688_id = ""
            if "0buck_sync.source_1688_id" in mf_map:
                source_1688_id = mf_map["0buck_sync.source_1688_id"].value
            elif sku.startswith("1688-"):
                source_1688_id = sku.replace("1688-", "")
                
            if not source_1688_id:
                print(f"  Warning: No 1688 ID found for {sp.title} (SKU: {sku}). Skipping.")
                continue
            
            # 3. Calculate or fetch original cost
            original_cost = "0.0"
            if "0buck_sync.original_cost" in mf_map:
                original_cost = mf_map["0buck_sync.original_cost"].value
            else:
                # If missing, we might need a lookup, but for now we'll mark it as missing
                print(f"  Warning: Original cost missing for {sp.title}.")
            
            # 4. Calculate buffered cost
            # (Using a default if missing)
            try:
                cost_cny = float(original_cost)
            except:
                cost_cny = 0.0
                
            buffered_rate = settings.EXCHANGE_RATE * (1 + settings.EXCHANGE_BUFFER)
            source_cost_usd = round(cost_cny * buffered_rate, 4)
            
            # 5. Define target metafields
            target_mfs = [
                {
                    "namespace": "0buck_sync",
                    "key": "source_1688_id",
                    "value": source_1688_id,
                    "type": "single_line_text_field"
                },
                {
                    "namespace": "0buck_sync",
                    "key": "original_cost",
                    "value": str(original_cost),
                    "type": "number_decimal"
                },
                {
                    "namespace": "0buck_sync",
                    "key": "source_cost_usd",
                    "value": str(source_cost_usd),
                    "type": "number_decimal"
                },
                {
                    "namespace": "0buck_sync",
                    "key": "last_sync_timestamp",
                    "value": datetime.now().isoformat(),
                    "type": "date_time"
                },
                {
                    "namespace": "0buck_sync",
                    "key": "is_reward_eligible",
                    "value": "true", # Default for now
                    "type": "single_line_text_field"
                }
            ]
            
            # 6. Apply updates
            for mf_data in target_mfs:
                key = f"{mf_data['namespace']}.{mf_data['key']}"
                if key in mf_map:
                    # Update existing
                    mf = mf_map[key]
                    if str(mf.value) != str(mf_data["value"]):
                        mf.value = mf_data["value"]
                        mf.save()
                        fixed_count += 1
                else:
                    # Create new
                    sp.add_metafield(shopify.Metafield(mf_data))
                    fixed_count += 1
            
            aligned_count += 1
            print(f"  Aligned successfully.")
            
        except Exception as e:
            print(f"  Error processing {sp.title}: {str(e)}")
            error_count += 1
            
    shopify.ShopifyResource.clear_session()
    
    print("\n--- Shopify Metafield Alignment Report ---")
    print(f"Total Products Checked: {len(products)}")
    print(f"Successfully Aligned: {aligned_count}")
    print(f"Metafields Updated/Created: {fixed_count}")
    print(f"Errors: {error_count}")
    print("------------------------------------------")

if __name__ == "__main__":
    align_all_shopify_metafields()

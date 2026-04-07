import asyncio
import sys
import os
import json

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_root = os.path.join(project_root, 'backend')
if backend_root not in sys.path:
    sys.path.append(backend_root)

from app.services.cj_service import CJDropshippingService

async def dump_cj_products():
    service = CJDropshippingService()
    print("Dumping a few CJ products to see all fields...")
    
    # Use listV2 via search_products
    products = await service.search_products(size=5)
    
    if products:
        print(f"Found {len(products)} products.")
        # Pretty print the first one
        print("\nFirst product sample:")
        print(json.dumps(products[0], indent=2))
        
        # Save all for closer inspection
        with open("cj_dump.json", "w") as f:
            json.dump(products, f, indent=2)
    else:
        print("No products found.")

if __name__ == "__main__":
    asyncio.run(dump_cj_products())

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

async def list_categories():
    service = CJDropshippingService()
    categories = await service.get_categories()
    print(json.dumps(categories, indent=2))

if __name__ == "__main__":
    asyncio.run(list_categories())

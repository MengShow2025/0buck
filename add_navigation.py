import os
import requests
import json

shop = 'pxjkad-zt.myshopify.com'
token = 'os.getenv("SHOPIFY_ACCESS_TOKEN", "")'
headers = {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json'
}

def graphql_query(query, variables=None):
    url = f'https://{shop}/admin/api/2024-04/graphql.json'
    payload = {'query': query}
    if variables:
        payload['variables'] = variables
    res = requests.post(url, headers=headers, json=payload)
    return res.json()

# 1. Get collections
collections_query = """
{
  collections(first: 50) {
    nodes {
      id
      title
      handle
    }
  }
}
"""

res_collections = graphql_query(collections_query)
collections = res_collections.get('data', {}).get('collections', {}).get('nodes', [])

print("Collections found:")
for c in collections:
    print(f"- {c['title']} ({c['handle']})")

# 2. Get menus
menus_query = """
{
  menus(first: 10) {
    nodes {
      id
      title
      handle
      itemsCount
      items {
        id
        title
        url
        items {
            id
            title
            url
        }
      }
    }
  }
}
"""

res_menus = graphql_query(menus_query)
menus = res_menus.get('data', {}).get('menus', {}).get('nodes', [])

main_menu = next((m for m in menus if m['handle'] == 'main-menu'), None)
if not main_menu:
    print("Main menu not found. Menus available:")
    for m in menus:
        print(f"- {m['title']} ({m['handle']})")
    # Fallback to any menu with "Main" in title
    main_menu = next((m for m in menus if 'main' in m['title'].lower()), None)

if main_menu:
    print(f"Main menu identified: {main_menu['title']} ({main_menu['id']})")
else:
    print("Could not find Main Menu.")
    exit(1)

# Target collections to add
targets = [
    "Tech & Gadgets | 数码极客",
    "Auto & Tools | 汽配工具",
    "Beauty & Health | 美妆健康",
    "Office & Work | 办公学习",
    "Outdoor & Sports | 户外运动",
    "Home & Living | 居家生活"
]

# Map targets to collection handles
# We'll try to find collections that match the titles or part of the titles.
collection_map = {}
for target in targets:
    # Try exact match first
    match = next((c for c in collections if c['title'].lower() == target.lower()), None)
    if not match:
        # Try matching the English part
        eng_part = target.split('|')[0].strip().lower()
        match = next((c for c in collections if c['title'].lower() == eng_part or c['handle'] == eng_part.replace(' & ', '-').replace(' ', '-')), None)
    
    if match:
        collection_map[target] = match
    else:
        print(f"Warning: Could not find collection for '{target}'")

# Check if 'Shop' or 'Catalog' exists
shop_item = next((item for item in main_menu['items'] if item['title'].lower() in ['shop', 'catalog']), None)

if shop_item:
    print(f"Found nesting item: {shop_item['title']}")
else:
    print("No 'Shop' or 'Catalog' item found. Adding to top level.")

# In GraphQL, to update a menu, we use menuUpdate mutation.
# We need to build the full items list.

new_items = []

# If shop_item exists, we want to add the new collections as its children.
# Otherwise, we add them to the top level.

# Get current items excluding the ones we are going to add (to avoid duplicates if we rerun)
current_items = main_menu['items']

# Helper to find if an item exists by title
def find_item_by_title(items, title):
    for item in items:
        if item['title'] == title:
            return item
    return None

if shop_item:
    # We will update the shop_item's children
    existing_children = shop_item.get('items', [])
    new_children = list(existing_children)
    
    for target in targets:
        coll = collection_map.get(target)
        if coll:
            # Check if already exists
            if not find_item_by_title(new_children, target):
                new_children.append({
                    'title': target,
                    'url': f"/collections/{coll['handle']}"
                })
    
    # Update main_menu items
    for item in current_items:
        if item['id'] == shop_item['id']:
            new_items.append({
                'title': item['title'],
                'url': item['url'],
                'items': [{ 'title': c['title'], 'url': c['url'] } for c in new_children]
            })
        else:
            # Keep other top level items
            # We need to strip IDs and nested items' IDs for the update
            new_items.append({
                'title': item['title'],
                'url': item['url'],
                'items': [{ 'title': sub['title'], 'url': sub['url'] } for sub in item.get('items', [])]
            })
else:
    # Adding to top level
    new_items = [{ 'title': item['title'], 'url': item['url'], 'items': [{ 'title': sub['title'], 'url': sub['url'] } for sub in item.get('items', [])] } for item in current_items]
    for target in targets:
        coll = collection_map.get(target)
        if coll:
            if not find_item_by_title(new_items, target):
                new_items.append({
                    'title': target,
                    'url': f"/collections/{coll['handle']}"
                })

# Update mutation
update_mutation = """
mutation menuUpdate($id: ID!, $title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
  menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
    menu {
      id
      title
      items {
        title
        url
        items {
          title
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
"""

variables = {
    'id': main_menu['id'],
    'title': main_menu['title'],
    'handle': main_menu['handle'],
    'items': new_items
}

res_update = graphql_query(update_mutation, variables)
print(json.dumps(res_update, indent=2, ensure_ascii=False))

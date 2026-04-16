
import json
import re

def search_cj_dump():
    try:
        with open('cj_dump.json', 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading cj_dump.json: {e}")
        return

    targets = [
        "Trash Cabinet",
        "Cat Feeder",
        "Door Sensor",
        "Sticker",
        "Silicone Cable",
        "Easter Grass",
        "Earrings",
        "Thumb Screws",
        "Cemetery Vases",
        "Beeswax",
        "Pain Relief",
        "GaN USB C"
    ]

    # Handle the case where cj_dump is a list or a dict with a list
    if isinstance(data, dict):
        products = data.get('data', {}).get('list', [])
        if not products:
            products = data.get('content', [])
    else:
        products = data

    results = []
    for p in products:
        name = p.get('nameEn') or p.get('productNameEn') or ""
        pid = p.get('pid') or p.get('id')
        for t in targets:
            if re.search(t, name, re.IGNORECASE):
                results.append({"target": t, "match": name, "pid": pid})
    
    for r in results:
        print(f"Match for [{r['target']}]: {r['match']} | PID: {r['pid']}")

if __name__ == "__main__":
    search_cj_dump()

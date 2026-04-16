import os, sys
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
from app.db.session import SessionLocal
from app.models.product import CandidateProduct

db = SessionLocal()
# Looking for specific titles in candidate_products
searches = ['Skechers Go Walk', 'Door Alarm', 'Heavy T-Shirts', 'Pet Tracker', 'LED Mask']
all_products = db.query(CandidateProduct).all()

for s in searches:
    matches = [p for p in all_products if p.title_en_preview and s.lower() in p.title_en_preview.lower()]
    if not matches:
        # try just the main word
        word = s.split()[0]
        matches = [p for p in all_products if p.title_en_preview and word.lower() in p.title_en_preview.lower()]
    
    for p in matches:
        print(f"Search: {s} | ID: {p.id} | PID: {p.product_id_1688} | Status: {p.status} | Title: {p.title_en_preview[:50]}")
db.close()

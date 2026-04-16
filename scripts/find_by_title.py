import os, sys
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
from app.db.session import SessionLocal
from app.models.product import CandidateProduct

db = SessionLocal()
titles = ['Skechers', 'Door Alarm', 'T-Shirt', 'Pet Tracker', 'LED Mask']
all_products = db.query(CandidateProduct).all()

for t in titles:
    matches = [x for x in all_products if x.title_en_preview and t.lower() in x.title_en_preview.lower()]
    for p in matches:
        print(f"Title: {t} | ID: {p.id} | PID: {p.product_id_1688} | Status: {p.status} | Platform: {p.source_platform} | Title: {p.title_en_preview[:50]}")
db.close()

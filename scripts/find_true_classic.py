import os, sys
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
from app.db.session import SessionLocal
from app.models.product import CandidateProduct

db = SessionLocal()
products = db.query(CandidateProduct).filter(CandidateProduct.title_en_preview.like('%True Classic%')).all()
for p in products:
    print(f"ID: {p.id} | PID: {p.product_id_1688} | Platform: {p.source_platform} | Title: {p.title_en_preview[:50]}")
db.close()

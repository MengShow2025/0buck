import os, sys
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
from app.db.session import SessionLocal
from app.models.product import CandidateProduct

db = SessionLocal()
asins = ['B0BXZ2HTVP', 'B0F5LYZRVL', 'B0BJZ9GT1J', 'B0FVFQKFN2', 'B0FJ6CNXYH']
all_products = db.query(CandidateProduct).all()

for a in asins:
    p = next((x for x in all_products if x.product_id_1688 == f"ASIN:{a}" or (x.discovery_evidence and a in str(x.discovery_evidence))), None)
    if p:
        print(f"ASIN: {a} | ID: {p.id} | PID: {p.product_id_1688} | Status: {p.status} | Platform: {p.source_platform}")
    else:
        print(f"ASIN: {a} | NOT FOUND")
db.close()

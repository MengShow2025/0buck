from app.db.session import SessionLocal
from app.models.product import CandidateProduct, Product
db = SessionLocal()
c = db.query(CandidateProduct).filter_by(id=2).first()
print("Candidate 2 status:", c.status if c else "None")
p = db.query(Product).filter_by(product_id_1688=c.product_id_1688).first() if c else None
print("Product exists?", p is not None)

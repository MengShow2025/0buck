from backend.app.db.session import SessionLocal
from backend.app.models.product import Product

def update_vanguard():
    db = SessionLocal()
    try:
        vanguard_data = [
            {"id": 18, "amz": 15.99, "sale": 0.0, "label": "MAGNET"},
            {"id": 114, "amz": 12.99, "sale": 0.0, "label": "MAGNET"},
            {"id": 154, "amz": 24.99, "sale": 14.99, "label": "REBATE"},
        ]
        
        for item in vanguard_data:
            p = db.query(Product).filter(Product.id == item["id"]).first()
            if p:
                p.amazon_price = item["amz"]
                p.sale_price = item["sale"]
                p.product_category_label = item["label"]
                p.status = "approved"
                print(f"Updated Product {item['id']}")
            else:
                print(f"Product {item['id']} not found")
        
        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_vanguard()

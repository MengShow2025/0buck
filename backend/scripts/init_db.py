from backend.app.db.session import engine
from backend.app.models.product import Base as ProductBase
from backend.app.models.rewards import Base as RewardsBase

def init_db():
    print("Creating tables...")
    # Both use the same Base but might be imported differently if not careful
    ProductBase.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    import sys
    import os
    # Add project root to sys.path
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
    init_db()

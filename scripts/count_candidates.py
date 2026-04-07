import os
import sys
from sqlalchemy import create_engine, text

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_root = os.path.join(project_root, 'backend')
if backend_root not in sys.path:
    sys.path.append(backend_root)

from app.core.config import settings

def count_candidates():
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT status, count(*) FROM candidate_products GROUP BY status"))
        for row in result:
            print(f"Status: {row[0]}, Count: {row[1]}")

if __name__ == "__main__":
    count_candidates()

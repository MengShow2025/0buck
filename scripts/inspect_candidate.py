import os
import sys
import json
from sqlalchemy import create_engine, text

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_root = os.path.join(project_root, 'backend')
if backend_root not in sys.path:
    sys.path.append(backend_root)

from app.core.config import settings

def inspect_candidate(cid):
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT title_zh, discovery_evidence FROM candidate_products WHERE id = {cid}"))
        row = result.fetchone()
        if row:
            print(f"Title: {row[0]}")
            evidence = json.loads(row[1]) if isinstance(row[1], str) else row[1]
            print(f"Evidence: {json.dumps(evidence, indent=2)}")

if __name__ == "__main__":
    inspect_candidate(12)

import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../test.db'))
print(f"Updating database at {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(products)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'source_cost_usd' not in columns:
        print("Adding column 'source_cost_usd' to 'products' table...")
        cursor.execute("ALTER TABLE products ADD COLUMN source_cost_usd FLOAT")
        conn.commit()
        print("Column added successfully.")
    else:
        print("Column 'source_cost_usd' already exists.")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

def report():
    with engine.connect() as conn:
        query = text("""
            SELECT title_en_preview, amazon_price, estimated_sale_price, cost_cny/7.1 as cost_usd, desire_hook, market_comparison_url 
            FROM candidate_products 
            WHERE status = 'refined'
        """)
        rows = conn.execute(query).fetchall()
        
        print("| Refined Title | Market Ref ($) | 0Buck Price | Gross Margin | Natural Hook | Evidence |")
        print("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for r in rows:
            margin = ((r[2] - r[3]) / r[2] * 100) if r[2] > 0 else 0
            title = r[0][:40].replace("|", " ")
            hook = r[4][:50].replace("|", " ") if r[4] else "N/A"
            print(f"| {title} | ${r[1]:.2f} | ${r[2]:.2f} | {int(margin)}% | {hook} | [Link]({r[5]}) |")

if __name__ == "__main__":
    report()

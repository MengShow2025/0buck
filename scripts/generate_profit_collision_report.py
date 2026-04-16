import asyncio
import os
import pg8000
import ssl
import urllib.parse as urlparse
from decimal import Decimal

DB_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require")

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def generate_profit_collision_table():
    print("📊 Generating 0Buck v8.5 Profit Collision Detail Table...")
    conn = get_db_conn()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            product_id_1688, 
            category_type, 
            amazon_price, 
            estimated_sale_price, 
            freight_fee, 
            cost_cny,
            title_zh
        FROM candidate_products 
        WHERE source_platform = 'ALIBABA'
        ORDER BY category_type ASC, id DESC
    """)
    products = cur.fetchall()
    
    report_md = "# 0Buck v8.5 利润对撞明细表 (Profit Collision Detail)\n\n"
    report_md += "本表展示首批 110 个商品（含测试品）的定价对撞及预估套利空间。遵循 v8.5 定价宪法。\n\n"
    report_md += "| PID | 梯度 | Amazon 售价 | 0Buck 售价 | 用户运费 | 拿货成本 (USD) | 预估毛利 (Est. Margin) |\n"
    report_md += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
    
    total_margin = Decimal("0.0")
    
    for pid, tier, amz, sale, ship_rev, cost_cny, title in products:
        item_cost_usd = Decimal(str(cost_cny)) / Decimal("7.2")
        ship_rev_dec = Decimal(str(ship_rev))
        sale_dec = Decimal(str(sale))
        
        # Simulated DDP Freight Cost (Placeholder for actual API data)
        # We assume our actual shipping cost is ~80% of what we charge the user
        actual_ship_cost = ship_rev_dec * Decimal("0.8")
        
        # Total Revenue = Sale Price + Shipping Revenue
        # Total Cost = Item Cost + Actual Shipping Cost
        margin = (sale_dec + ship_rev_dec) - (item_cost_usd + actual_ship_cost)
        total_margin += margin
        
        report_md += f"| {pid} | {tier} | ${amz:.2f} | **${sale:.2f}** | ${ship_rev:.2f} | ${item_cost_usd:.2f} | **${margin:.2f}** |\n"
    
    report_md += f"\n\n**数据总结**：\n"
    report_md += f"- **总计商品数**：{len(products)}\n"
    report_md += f"- **单均预估毛利**：${(total_margin / len(products)):.2f}\n"
    report_md += f"- **定价逻辑**：MAGNET (Price=$0), NORMAL/REBATE (Price=60% Amz). 所有运费均对齐 Amazon 非 Prime 标准 ($6.99+).\n"
    
    with open("profit_collision_report_v8_5.md", "w") as f:
        f.write(report_md)
    
    conn.close()
    print("✅ Profit Collision Report Generated: profit_collision_report_v8_5.md")

if __name__ == "__main__":
    asyncio.run(generate_profit_collision_table())

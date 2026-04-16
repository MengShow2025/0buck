
import sys
import os
import json
import asyncio
import subprocess
import time
import psycopg2

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def call_mcp_tool(tool_name, args):
    """Call an MCP tool via accio-mcp-cli."""
    json_args = json.dumps(args)
    cmd = ["accio-mcp-cli", "call", tool_name, "--json", json_args]
    print(f"   [CLI] Calling {tool_name}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"   [CLI Error] {result.stderr}")
        return None
    try:
        return json.loads(result.stdout)
    except:
        print(f"   [CLI Parse Error] {result.stdout}")
        return None

async def audit_vanguard_with_assistant():
    print("🚀 [Research Mode] V7.9.2 Vanguard Arbitrage V2 with Alibaba Assistant Plugin")
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, COALESCE(title_en, title_zh), amazon_link, amazon_shipping_fee, source_cost_usd 
        FROM candidate_products 
        WHERE id BETWEEN 10 AND 25 AND amazon_link IS NOT NULL
        ORDER BY id ASC
    """)
    vanguard = cur.fetchall()
    
    report = []
    
    for item in vanguard:
        c_id, title, amz_url, amz_ship, curr_cost = item
        print(f"🏭 Analyzing ID {c_id}: {title}")
        
        # 1. Start URL Publishing (Parsing Amazon)
        # Using start_url_product_generate from icbu-product-agent service
        gen_result = call_mcp_tool("start_url_product_generate", {"urlList": amz_url})
        
        if not gen_result:
            print(f"   ❌ Failed to start URL generate for ID {c_id}")
            report.append({"id": c_id, "status": "failed", "reason": "MCP call failed"})
            continue
            
        # The return value should contain uniqueRequestId or a material key
        # Based on icbu-product-agent flow, it might return a materialIndex or taskId
        unique_id = gen_result.get("uniqueRequestId") or gen_result.get("taskId")
        
        if not unique_id:
            print(f"   ❌ No Request/Task ID returned for ID {c_id}: {gen_result}")
            # If it returns a list of materials directly (for batch), handle it
            unique_id = gen_result.get("data", {}).get("uniqueRequestId")
            
        if not unique_id:
            report.append({"id": c_id, "status": "failed", "reason": "No Task ID", "debug": gen_result})
            continue
            
        print(f"   🔎 Task ID: {unique_id}. Polling for analysis result...")
        
        # 2. Poll for Material Analysis Result
        parsed_info = None
        for i in range(15): # Max 150 seconds
            await asyncio.sleep(10)
            analysis_result = call_mcp_tool("query_material_analysis_result", {"uniqueRequestId": str(unique_id)})
            if analysis_result and analysis_result.get("status") == "COMPLETED":
                # The parsed product data is in productInfoForMaterial (JSON string)
                parsed_info = analysis_result.get("productInfoForMaterial")
                if isinstance(parsed_info, str):
                    parsed_info = json.loads(parsed_info)
                break
            elif analysis_result and analysis_result.get("status") == "FAILED":
                print(f"   ❌ Analysis failed for ID {c_id}")
                break
            print(f"   ... polling ({i+1}/15)")
            
        if not parsed_info:
            print(f"   ⚠️ Analysis timed out or failed for ID {c_id}")
            report.append({"id": c_id, "status": "timeout"})
            continue
            
        # 3. Extract Pricing and Logistics
        # On Alibaba, parsed info usually contains multiple price options
        # We look for the "distribution" or "unit" price
        sourcing_price = float(parsed_info.get("price", {}).get("minPrice", 0))
        # Look for US warehouse indicator in logistics
        shipping_options = parsed_info.get("logistics", {}).get("shippingLines", [])
        has_us_warehouse = any("USA" in str(line) or "United States" in str(line) for line in shipping_options)
        
        # 4. Final Comparison
        total_sourcing = sourcing_price + float(parsed_info.get("logistics", {}).get("minFreight", 0))
        amz_shipping = float(amz_ship or 0)
        
        is_magnet = amz_shipping >= total_sourcing and amz_shipping > 0
        
        print(f"   🎯 Sourcing Price: ${sourcing_price} | US Warehouse: {'YES' if has_us_warehouse else 'NO'}")
        print(f"   🎯 Total Sourcing (Landed): ${total_sourcing} | Amz Shipping: ${amz_shipping}")
        print(f"   🎯 Magnet Potential: {'YES' if is_magnet else 'NO'}")
        
        report.append({
            "id": c_id,
            "title": title,
            "status": "success",
            "sourcing_price": sourcing_price,
            "us_warehouse": has_us_warehouse,
            "total_sourcing": total_sourcing,
            "amz_shipping": amz_shipping,
            "is_magnet": is_magnet,
            "arbitrage_profit": amz_shipping - total_sourcing if is_magnet else 0
        })
        
    cur.close()
    conn.close()
    
    # Write report
    with open("vanguard_arbitrage_report.json", "w") as f:
        json.dump(report, f, indent=4)
    print("\n🏁 Research Report saved to vanguard_arbitrage_report.json")

if __name__ == "__main__":
    asyncio.run(audit_vanguard_with_assistant())

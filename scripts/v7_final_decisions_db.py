import os
import sys
import json

# Add custom packages path first
sys.path.append('/tmp/v7_packages_311')

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def execute_v7_final_decisions():
    engine = create_engine(DATABASE_URL)
    
    print("🎬 v7.0 Truth Engine: Executing Final TL Decisions (Simple DB Update)...")
    
    with engine.connect() as conn:
        # 1. Melt #271 Heavy T-Shirt (Negative Arbitrage)
        conn.execute(text("""
            UPDATE candidate_products 
            SET status = 'rejected', is_melted = True, 
                melt_reason = 'Negative Arbitrage: Shipping cost ($24) exceeds value proposition.'
            WHERE product_id_1688 = 'CJ-HEAVY-TEE-271'
        """))
        print("   🔴 Melted: CJ-HEAVY-TEE-271")
        
        # 2. Pause #58 GPS Tracker (Regulatory Risk)
        conn.execute(text("""
            UPDATE candidate_products 
            SET status = 'reviewing', 
                audit_notes = 'PAUSED: Waiting for FCC FCC/4G Band verification (B2/B4/B12).'
            WHERE product_id_1688 = 'CJ-DOG-GPS-58'
        """))
        print("   🟡 Paused: CJ-DOG-GPS-58")
        
        # 3. Approve & Add Packing Instruction for #175 LED Mask
        # Note: We'll append to structural_data or set it
        conn.execute(text("""
            UPDATE candidate_products 
            SET status = 'approved',
                structural_data = structural_data || '{"packing_instruction": "Mandatory Air Column Bag (气柱袋增强包装)"}'::jsonb
            WHERE product_id_1688 = 'CJ-PRO-LED-175'
        """))
        print("   🟢 Approved (with Packing Logic): CJ-PRO-LED-175")
        
        # 4. Approve Others
        others = ['CJ-DOOR-ZIG-154', 'CJ-MESH-SHOES-84']
        for pid in others:
            conn.execute(text("UPDATE candidate_products SET status = 'approved' WHERE product_id_1688 = :pid"), {"pid": pid})
            print(f"   🟢 Approved: {pid}")
            
        conn.commit()
    print("✨ DB Updated.")

if __name__ == "__main__":
    execute_v7_final_decisions()

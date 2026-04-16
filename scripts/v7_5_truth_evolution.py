
import asyncio
import os
import sys
import json
import httpx
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
ACW_KEY = "sk-acw-2595eca9-6f979794c2335614"
ACW_BASE_URL = "https://api.aicodewith.com/v1"

async def truth_narrative_evolution_v7_5():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        query = text("""
            SELECT id, title_zh, title_en, cj_pid, amazon_link, amazon_price, 
                   images, description_zh, material_audit, chip_audit, 
                   count_audit, weight_audit
            FROM candidate_products 
            WHERE status IN ('draft', 'reviewing', 'approved')
            LIMIT 5
        """)
        candidates = conn.execute(query).fetchall()
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Model priority list for the proxy
            model_pool = ["deepseek-v3-fast", "qwen2.5-72b-instruct", "gpt-4o"]
            
            for cand in candidates:
                c_id, t_zh, t_en, pid, amz_link, amz_price, imgs, desc_zh, m_aud, c_aud, count_aud, w_aud = cand
                print(f"🔬 Refining ID {c_id}: {t_en}...")
                
                # Narrative Generation
                amazon_price = float(amz_price if amz_price else 0)
                obuck_price = round(amazon_price * 0.6, 2) if amazon_price > 0 else 0
                
                prompt = f"""
                As the Lead Auditor for 0Buck, create an industrial "Artisan Narrative" for product: {t_en}.
                
                Context:
                - Amazon MSRP: ${amazon_price}
                - 0Buck Truth Price: ${obuck_price}
                - Specs: {m_aud}, {c_aud}, {count_aud}, {w_aud}
                
                Task:
                1. "Breaking the Bubble": The ${round(amazon_price - obuck_price, 2)} difference is "Brand Tax".
                2. "Physical Identity": 1:1 match from same tier-1 manufacturing lines.
                3. Truth Audit Log: Verified Artisan status.
                100% English. Minimalist & Objective.
                """
                
                success = False
                for model in model_pool:
                    payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.2}
                    headers = {"Authorization": f"Bearer {ACW_KEY}"}
                    
                    try:
                        resp = await client.post(f"{ACW_BASE_URL}/chat/completions", json=payload, headers=headers)
                        if resp.status_code == 200:
                            content = resp.json()["choices"][0]["message"]["content"]
                            conn.execute(text("""
                                UPDATE candidate_products 
                                SET description_artisan = :desc, obuck_price = :price, status = 'refined'
                                WHERE id = :id
                            """), {"desc": content, "price": obuck_price, "id": c_id})
                            conn.commit()
                            print(f"   ✅ ID {c_id} evolved via {model}")
                            success = True
                            break
                        else:
                            print(f"   ⚠️ Model {model} failed: {resp.status_code}")
                    except: pass
                
                if not success: print(f"   ❌ ID {c_id} FAILED all models.")

if __name__ == "__main__":
    asyncio.run(truth_narrative_evolution_v7_5())

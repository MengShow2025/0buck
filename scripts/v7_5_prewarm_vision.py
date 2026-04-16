import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

import json
import asyncio
import hashlib
from typing import List, Dict, Any
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

import httpx
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

# Load env
env_path = os.path.join(os.getcwd(), 'backend/.env.local')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.getcwd()), 'backend/.env.local')
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# Set proxy for Google SDK (Disabled if refused)
# os.environ["HTTP_PROXY"] = "http://127.0.0.1:6152"
# os.environ["HTTPS_PROXY"] = "http://127.0.0.1:6152"

class PrewarmVisionAudit:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=GEMINI_API_KEY,
            temperature=0
        )
        self.engine = create_engine(DATABASE_URL)

    async def extract_ocr_from_image(self, image_url: str) -> str:
        """
        Uses Gemini 2.0 Flash (with Fallback to ACW) to extract ALL text from the image.
        """
        if not image_url: return ""
        
        prompt = "Extract all readable text from this product image. Return only the raw text found."
        try:
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": image_url},
                ]
            )
            
            # Use ACW Proxy for stability (already in __init__ for this script)
            response = await self.llm.ainvoke([message])
            return response.content.strip()
        except Exception as e:
            print(f"   ❌ API Error for {image_url[:50]}: {e}")
            return ""

    async def run(self):
        print("🚀 v7.5 Pre-warming: Gemini OCR Scan for Candidates...")
        
        with self.engine.connect() as conn:
            # Fetch candidates that need OCR (empty vision_ocr_text)
            # Filter for high-potential ones (e.g. status='refined' or 'synced')
            res = conn.execute(text("SELECT id, primary_image, title_zh FROM candidate_products WHERE (vision_ocr_text IS NULL OR vision_ocr_text = '') AND primary_image IS NOT NULL AND primary_image != '' LIMIT 5"))
            candidates = res.fetchall()
            
            if not candidates:
                print("✅ All candidates already have OCR text. Skipping.")
                return

            print(f"📦 Found {len(candidates)} candidates for vision pre-warming.")
            
            for c_id, img_url, title in candidates:
                display_title = (title or "No Title")[:30]
                print(f"🔍 Auditing Candidate {c_id}: {display_title}...")
                
                # Use primary_image if available, otherwise skip
                if not img_url:
                    print(f"   ⚠️ No primary image for {c_id}. Skipping.")
                    continue
                
                ocr_text = await self.extract_ocr_from_image(img_url)
                
                if ocr_text:
                    print(f"   ✅ Extracted OCR ({len(ocr_text)} chars). Saving to DB.")
                    # Update DB
                    conn.execute(
                        text("UPDATE candidate_products SET vision_ocr_text = :ocr, updated_at = NOW() WHERE id = :id"),
                        {"ocr": ocr_text, "id": c_id}
                    )
                    conn.commit()
                else:
                    print(f"   ⚠️ Failed to extract OCR for {c_id}.")
                
                # Respect Rate Limit
                await asyncio.sleep(1.0)

if __name__ == "__main__":
    audit = PrewarmVisionAudit()
    asyncio.run(audit.run())

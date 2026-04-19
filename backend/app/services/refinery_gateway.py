
import os
import logging
import json
import httpx
import asyncio
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.services.vision_audit import vision_audit_service
from app.services.category_mapping_service import category_mapping_service

logger = logging.getLogger(__name__)

class FluxInpaintService:
    """
    v7.5: 0Buck In-house Pixel Refinery using Flux.1-dev-Inpainting.
    Target: Industrial Grade No-Smudge Background Restoration.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://fal.run/fal-ai/flux/dev/image-to-image/inpaint" 

    async def refine_image(self, image_url: str, mask_url: str, prompt: str) -> Optional[str]:
        if not self.api_key:
            logger.error("❌ FAL_KEY not provided. Skipping Pixel Refinery.")
            return None
            
        headers = {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "image_url": image_url,
            "mask_url": mask_url,
            "prompt": prompt or "Professional product photography, seamless background restoration, remove logo naturally, ultra-high detail, 8k resolution, no smudge, restore background texture",
            "strength": 0.95,
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
            "enable_safety_checker": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                logger.info(f"🎨 Flux Inpaint: Refining image {image_url[:50]}...")
                resp = await client.post(self.base_url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data.get("image", {}).get("url")
        except Exception as e:
            logger.error(f"❌ Flux Inpaint Error: {e}")
            return None

class CopywritingService:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.template_path = "backend/prompts/truth_narrative_v1.md"
        self.model = "anthropic/claude-3.5-sonnet"
        
    def _load_template(self) -> str:
        try:
            if os.path.exists(self.template_path):
                with open(self.template_path, "r") as f:
                    return f.read()
            else:
                return """
                You are the 0Buck Chief Auditor. Your mission is to strip brand lies and reveal physical truth.
                
                Amazon Equivalent: {amazon_title} (${amazon_price})
                Amazon Bullets: {amazon_bullets}
                Amazon Pain Points (Real User Complaints): {amazon_pain_points}
                
                Your Task:
                1. Use the physical specs provided: {physical_specs}
                2. Weight: {weight}, Materials: {materials}
                3. Construct a "Verified Artisan" narrative for {physical_title} at ${obuck_price}.
                
                Format Requirements:
                - [Hook]: Destroy the ${margin_difference} brand markup. Address one of the specific Amazon pain points.
                - [Logic]: Factory-direct Artisan truth. Explain why skipping brand tax results in this value.
                - [Evidence]: Industrial Grade Technical Specs (Audit summary).
                
                Output in English, Industrial/Premium tone, NO sales fluff. 
                Include the '0Buck Verified Artisan' brand signature.
                """
        except Exception as e:
            logger.error(f"❌ Failed to load prompt template: {e}")
            return "Generate a professional e-commerce product description for {physical_title}."

    async def generate_mobile_solution_hook(self, reviews: List[Dict[str, Any]], product_title: str) -> str:
        """
        v8.5: Uses LLM to generate a punchy 3-5 word solution hook based on Amazon complaints.
        """
        if not self.api_key:
            return "Professional Artisan Choice"
            
        pain_points = " ".join([r.get("body", "") for r in reviews[:5]]) if reviews else "N/A"
        
        prompt = f"""
        Analyze these Amazon customer complaints for '{product_title}':
        ---
        {pain_points[:800]}
        ---
        Task: Create a 3-5 word English "Solution Hook" that addresses the biggest complaint.
        The hook should start with an action verb or a clear benefit.
        Examples: 
        - Stop Overheating While Charging
        - Stable Connection Guaranteed
        - 100% Leak-Proof Material
        - Zero Lag Gaming Audio
        
        Output ONLY the 3-5 words hook. No period.
        """
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "google/gemini-2.5-flash", # Use Flash for speed/cost on small tasks
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                api_url = f"{self.base_url.rstrip('/')}/chat/completions"
                resp = await client.post(api_url, json=payload, headers=headers)
                resp.raise_for_status()
                result = resp.json()
                return result["choices"][0]["message"]["content"].strip().strip('"')
        except Exception as e:
            logger.error(f"❌ Hook Generation Error: {e}")
            return "Industrial Grade Stability"

    async def generate_artisan_narrative(self, raw_data: Dict[str, Any]) -> str:
        """
        Logic: Truth-Based Copywriting logic using Claude 3.5 Sonnet.
        v8.5.3 Correction: Removing technical/API exposure.
        """
        if not self.api_key:
            logger.warning("⚠️ No Claude API Key. Falling back to raw description.")
            return raw_data.get("description_zh", "")
            
        template = self._load_template()
        
        # Calculate derived fields for the prompt
        amazon_price = float(raw_data.get("amazon_price", 0))
        obuck_price = float(raw_data.get("obuck_price", 0))
        margin_diff = round(amazon_price - obuck_price, 2)
        
        # Extract pain points from reviews if available
        reviews = raw_data.get("amazon_reviews", [])
        pain_points = " ".join([r.get("body", "") for r in reviews[:5]]) if reviews else "N/A"
        
        # v8.5.3: Add Merchant Credentials (provided by Expert)
        # Fallback to generic if not provided
        merchant_creds = raw_data.get("merchant_credentials", "Tier-1 OEM Facility (Verified Artisan)")
        
        # Final prompt formatting
        prompt = template.format(
            amazon_title=raw_data.get("amazon_title", "Brand Equivalent"),
            amazon_price=amazon_price,
            amazon_bullets=raw_data.get("amazon_bullets", "N/A"),
            amazon_pain_points=pain_points[:1000],
            physical_title=raw_data.get("title_en", "Artisan Product"),
            physical_specs=raw_data.get("specs", "N/A"),
            weight=raw_data.get("weight", "Unknown"),
            materials=raw_data.get("materials", "Unknown"),
            obuck_price=obuck_price,
            margin_difference=margin_diff,
            material_audit=raw_data.get("material_audit", "Verified Industrial Grade"),
            chip_audit=raw_data.get("chip_audit", "Verified Standard"),
            physical_weight=raw_data.get("physical_weight", "N/A"),
            count_audit=raw_data.get("count_audit", "N/A"),
            obuck_id=raw_data.get("id", "0B-PENDING"),
            merchant_credentials=merchant_creds,
            warehouse_location=raw_data.get('warehouse_anchor', 'US Global Hub')
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # v8.5.4: Using Claude 3.7 Sonnet via OpenRouter
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                logger.info(f"✍️ Desire Engine: Generating deep narrative for {raw_data.get('id')}...")
                api_url = f"{self.base_url.rstrip('/')}/chat/completions"
                resp = await client.post(api_url, json=payload, headers=headers)
                resp.raise_for_status()
                result = resp.json()
                content = result["choices"][0]["message"]["content"]
                
                # v8.5.3: Re-designed Truth Table (No technical API exposure)
                truth_table = f"""
<div class="obuck-truth-table">
  <table style="width:100%; border-collapse: collapse; margin-bottom: 20px; font-family: monospace; border: 1px solid #000;">
    <tr style="background-color: #000; color: #fff;">
      <th style="padding: 10px; text-align: left; font-size: 14px;">TRUTH PROTOCOL</th>
      <th style="padding: 10px; text-align: left; font-size: 14px;">AUDIT RESULT</th>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 10px;"><b>Dispatch Origin</b></td>
      <td style="border: 1px solid #000; padding: 10px;">{raw_data.get('warehouse_anchor', 'US Fulfillment Center')} (3-5 Day Priority)</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 10px;"><b>Audit Signature</b></td>
      <td style="border: 1px solid #000; padding: 10px;">0Buck Artisan Protocol [LOCKED]</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 10px;"><b>Credential</b></td>
      <td style="border: 1px solid #000; padding: 10px;">{merchant_creds}</td>
    </tr>
  </table>
</div>
"""
                return truth_table + content
        except Exception as e:
            logger.error(f"❌ Desire Engine Error: {e}")
            return raw_data.get("description_zh", "Error generating narrative.")

class RefineryGateway:
    """
    0Buck v7.5 "API Gateway" (智造中心网关).
    Decouples Business Logic (Skills) from Execution API.
    """
    def __init__(self):
        self.flux = FluxInpaintService(api_key=settings.FAL_KEY)
        self.copywriter = CopywritingService(
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1"
        )
        self.vision_audit = vision_audit_service

    async def extract_physical_truth(self, image_urls: List[str], product_title: str) -> Dict[str, Any]:
        """
        v7.5: Using Gemini 2.0 to extract hard specs from images.
        """
        logger.info(f"🔬 Physical Truth Audit: Extracting specs for {product_title}...")
        
        prompt = f"""
        Extract the hard physical specifications of this product: {product_title}.
        Look for technical details in the images (text, charts, material close-ups).
        
        Fields to extract:
        1. material_audit (Specific materials like 304 Stainless Steel, ABS, etc.)
        2. chip_audit (Specific protocols like Zigbee 3.0, Bluetooth version, or no-name)
        3. count_audit (LED beads, button counts, items in kit)
        4. weight_audit (Physical weight if visible)
        
        Format (JSON only):
        {{
            "material_audit": "...",
            "chip_audit": "...",
            "count_audit": "...",
            "weight_audit": "..."
        }}
        """
        
        # Use first 3 images for extraction to save tokens/speed
        targets = image_urls[:3]
        results = {"material_audit": "Verified", "chip_audit": "Verified", "count_audit": "Verified", "weight_audit": "Verified"}
        
        try:
            # We use the same Gemini instance as vision_audit_service
            from langchain_core.messages import HumanMessage
            content = [{"type": "text", "text": prompt}]
            for url in targets:
                content.append({"type": "image_url", "image_url": url})
            
            message = HumanMessage(content=content)
            
            # v7.5 Strategy: Try Gemini first, fallback to ACW
            response = None
            if self.vision_audit.gemini_llm:
                try:
                    logger.info("  -> Attempting Gemini 2.0 for Specs Extraction...")
                    response = await self.vision_audit.gemini_llm.ainvoke([message])
                except Exception as ge:
                    logger.warning(f"  ⚠️ Gemini failed for Specs: {ge}")
            
            if not response and self.vision_audit.acw_llm:
                logger.info("  -> Falling back to ACW for Specs Extraction...")
                response = await self.vision_audit.acw_llm.ainvoke([message])
            
            if not response: raise Exception("No functional Vision LLM for Specs Extraction")
            
            raw_content = response.content
            if "```json" in raw_content:
                raw_content = raw_content.split("```json")[1].split("```")[0].strip()
            
            results.update(json.loads(raw_content))
            return results
        except Exception as e:
            logger.error(f"❌ Physical Truth Extraction Error: {e}")
            return results

    def _map_pain_point_to_solution(self, reviews: List[Dict[str, Any]], product_title: str) -> str:
        """
        v8.5: Maps detected Amazon pain points to specific Artisan solutions.
        """
        mapping = {
            "overheat": "Stop Overheating While Charging",
            "disconnect": "Stable Connection Guaranteed",
            "battery": "Long-Lasting Battery Life",
            "noise": "Crystal Clear Audio & Noise Cancel",
            "fragile": "Durable Industrial Grade Material",
            "expensive": "Transparent Factory-Direct Price",
            "slow": "Ultra-Fast Response & Low Latency",
            "leak": "100% Leak-Proof Guaranteed",
            "setup": "One-Tap Easy Setup & Matter Ready"
        }
        
        all_review_text = " ".join([r.get("body", "").lower() for r in reviews[:10]])
        
        for key, solution in mapping.items():
            if key in all_review_text:
                return solution
        
        # Default solution based on category or generic
        return "The Professional Artisan Choice"

    async def audit_sentiment_risk(self, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        v8.5 Patch: Amazon Sentiment Audit.
        Detects return risks like size issues, color mismatch, or quality collapse.
        """
        if not reviews:
            return {"return_risk": "Low", "risk_factors": []}
            
        review_text = " ".join([r.get("body", "") for r in reviews[:20]])
        
        prompt = f"""
        Analyze these Amazon reviews for potential return risks:
        ---
        {review_text[:2000]}
        ---
        Check for:
        1. Size/Fit Issues
        2. Color Mismatch
        3. Quality/Durability Collapse
        
        If any issue appears in >10% of these reviews, mark as High Risk.
        Output ONLY a JSON object:
        {{
            "return_risk": "Low" | "Medium" | "High",
            "risk_factors": ["list", "of", "issues"],
            "summary": "1-sentence summary"
        }}
        """
        
        # Use simple HTTPX call to ACW Proxy (OpenAI format)
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                api_url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
                resp = await client.post(api_url, json=payload, headers=headers)
                resp.raise_for_status()
                result = resp.json()
                raw_json = result["choices"][0]["message"]["content"].strip()
                if "```json" in raw_json:
                    raw_json = raw_json.split("```json")[1].split("```")[0].strip()
                return json.loads(raw_json)
        except Exception as e:
            logger.error(f"❌ Sentiment Audit Error: {e}")
            return {"return_risk": "Unknown", "risk_factors": []}

    async def refine_candidate(self, candidate_data: Dict[str, Any]):
        """
        Full Refinery Pipeline v8.5.
        Includes Amazon Pain Points collision and Title Protocol ordering.
        """
        candidate_id = candidate_data.get("id")
        logger.info(f"🏗️ Refinery Gateway: Starting Full Pipeline for Candidate {candidate_id}...")
        
        # 1. Fetch Amazon Pain Points (Reviews)
        reviews = []
        amazon_link = candidate_data.get("amazon_link")
        if amazon_link:
            from app.services.rainforest_service import RainforestService
            rf = RainforestService()
            import re
            asin_match = re.search(r"/dp/([A-Z0-9]{10})", amazon_link)
            if asin_match:
                asin = asin_match.group(1)
                logger.info(f"🔎 Fetching Amazon Reviews for ASIN: {asin}")
                reviews = await rf.get_amazon_reviews(asin)
                candidate_data["amazon_reviews"] = reviews
                
                # 1.5 v8.5 Sentiment Audit (Return Risk Check)
                sentiment_audit = await self.audit_sentiment_risk(reviews)
                candidate_data.update(sentiment_audit)
                
                # 1.6 v8.5 Brand Tax Audit (Input from Expert)
                # Ensure we capture the brand tax context for narrative generation
                if "brand_tax_percent" not in candidate_data:
                    candidate_data["brand_tax_percent"] = "300%" # Default baseline

        # 2. Physical Truth Extraction
        images = json.loads(candidate_data.get("images", "[]"))
        if images:
            truth_specs = await self.extract_physical_truth(images, candidate_data.get("title_en", ""))
            candidate_data.update(truth_specs)

        # 3. Desire Engine Narrative
        narrative = await self.copywriter.generate_artisan_narrative(candidate_data)
        candidate_data["description_artisan"] = narrative
        
        # 3.5 v8.5 Refined Category Mapping
        # Map to more granular categories for frontend waterfall display
        cat_info = await category_mapping_service.map_to_refined_category(
            candidate_data.get("title_en", ""),
            candidate_data.get("attributes", [])
        )
        candidate_data.update(cat_info)
        
        # 4. v8.5 Title Polish: {Title} - {Solution} | {Specs} | [Brand]
        # v8.5 Update: Removed leading brand to ensure zero-offset mobile visibility.
        brand = "0Buck Verified Artisan"
        
        # Determine the Solution based on Pain Points - v8.5 Dynamic LLM Hook
        if reviews:
            solution = await self.copywriter.generate_mobile_solution_hook(reviews, candidate_data.get("title_en", ""))
        else:
            solution = self._map_pain_point_to_solution(reviews, candidate_data.get("title_en", ""))
        
        # Extract Specs for Title
        specs = candidate_data.get("chip_audit", "Industrial Grade")
        if specs == "Verified": specs = "Artisan Quality"
        
        title_raw = candidate_data.get("title_en", candidate_data.get("title_zh", "Premium Product"))
        # Clean title_raw: remove existing brand and boilerplate
        title_raw = title_raw.replace(brand, "").strip(" |")
        
        # Final Assembly: Title - Solution hook (Brand at the end only)
        polished_title = f"{title_raw} - {solution} | {specs} | {brand}"
        
        # Length Control: Ensure core hook is within mobile visibility
        if len(polished_title) > 150:
            polished_title = f"{title_raw[:60]}... - {solution} | {specs} | {brand}"
            
        candidate_data["title_polished"] = polished_title
        
        return candidate_data

refinery_gateway = RefineryGateway()

import logging
import json
from typing import Dict, Any, Tuple, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from app.core.config import settings

logger = logging.getLogger(__name__)

class VisionAuditService:
    def __init__(self):
        # v7.5 Hybrid Engine: Support OpenRouter for fallback and primary
        self.openrouter_key = settings.OPENROUTER_API_KEY
        self.acw_base_url = "https://openrouter.ai/api/v1"
        
        # Initialize Primary (Cheap/Capable Vision)
        try:
            self.gemini_llm = ChatOpenAI(
                model="google/gemini-2.5-flash",
                api_key=self.openrouter_key,
                base_url=self.acw_base_url,
                temperature=0
            )
        except: self.gemini_llm = None
        
        # Initialize High Quality Fallback (Claude)
        try:
            self.acw_llm = ChatOpenAI(
                model="anthropic/claude-3.5-sonnet", # High quality vision fallback
                api_key=self.openrouter_key,
                base_url=self.acw_base_url,
                temperature=0
            )
        except: self.acw_llm = None
        
        self.BLACKLIST_PATTERNS = [
            "550-SPYI",  # Factory code/Logo
            "CJDropshipping", 
            "1688.com",
            "Taobao",
            "Tmall",
            "AliExpress",
            "FISLIAN",
            "Logo Here",
            "Brand Name",
            "Model No"
        ]

    async def audit_image_v7_3(self, image_url: str, product_context: Dict[str, Any]) -> Tuple[bool, str, str]:
        """
        v7.3 Truth Engine: Pixel Purification & OCR Audit Hook (Enhanced for "No Smudge").
        1. Extract OCR Text (High Sensitivity).
        2. Detect Corner Logos & Watermarks (Top-Left, Top-Right, etc.).
        3. Identify "Smudge" artifacts or poor generative inpainting.
        4. Identify Technical Contradictions.
        Returns: (passed: bool, melt_reason: str, ocr_text: str)
        """
        logger.info(f"👁️ Vision Audit: Scanning Truth Asset for Quality & Purification {image_url}...")
        
        product_title = product_context.get("title", "Unknown Product")
        category = product_context.get("category", "General")
        expected_protocol = "Zigbee" if "zigbee" in product_title.lower() else "Unknown"
        if "wifi" in product_title.lower(): expected_protocol = "WiFi"
        
        prompt = f"""
        Analyze this product image for the 0Buck Truth Engine (v7.3). 
        Objective: ENSURE INDUSTRIAL GRADE PURIFICATION (NO LOGOS, NO SMUDGES).

        Context:
        - Product: {product_title}
        - Expected Tech: {expected_protocol}
        
        CRITICAL SCAN ZONES:
        - Top-Right & Top-Left Corners: Scan for small factory logos or circular symbols.
        - Bottom Edge: Scan for manufacturer watermarks or product codes.
        
        AUDIT TASKS:
        1. OCR: Extract ALL text. Be extremely sensitive to small font or partially obscured text.
        2. PURIFICATION CHECK: Identify any "unnatural blurred spots", "smudge marks", or "disrupted textures" where text/logos were removed poorly.
        3. BRAND LEAKAGE: Identify any visible brand logos (even without text) or factory codes: {", ".join(self.BLACKLIST_PATTERNS)}.
        4. TECH AUDIT: Flag if the image mentions "WiFi" while the product is "{expected_protocol}".

        Output format (JSON only):
        {{
            "ocr_text": "...",
            "visual_smudge_detected": true/false,
            "corner_logo_detected": true/false,
            "detected_remnants": ["list of logos or text fragments found"],
            "technical_contradiction": true/false,
            "industrial_quality_decision": "PASS" or "FAIL",
            "reason": "summary of pixel-level findings"
        }}
        """
        
        try:
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": image_url},
                ]
            )
            
            # v7.5 Strategy: Try Gemini first, fallback to ACW (Claude/GPT-4o)
            response = None
            if self.gemini_llm:
                try:
                    logger.info("  -> Attempting Gemini 2.0...")
                    response = await self.gemini_llm.ainvoke([message])
                except Exception as ge:
                    logger.warning(f"  ⚠️ Gemini failed, trying ACW fallback: {ge}")
            
            if not response and self.acw_llm:
                logger.info("  -> Falling back to ACW (GPT-4o/Claude)...")
                response = await self.acw_llm.ainvoke([message])
            
            if not response: raise Exception("No functional Vision LLM found (Gemini/ACW failed)")
            
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            result = json.loads(content)
            ocr_text = result.get("ocr_text", "").upper()
            decision = result.get("industrial_quality_decision", "FAIL")
            reason = result.get("reason", "Quality audit failed")
            
            # v7.3 Meltdown Logic (Zero Tolerance for Smudges and Corner Logos)
            if result.get("visual_smudge_detected"):
                return False, f"Visual Quality Failure: Unnatural smudges/blurs detected. {reason}", ocr_text
            
            if result.get("corner_logo_detected"):
                return False, f"Visual Quality Failure: Missed logo in corners/edges. {reason}", ocr_text

            if decision == "FAIL":
                return False, f"Vision Audit Failure: {reason}", ocr_text
            
            # Redundancy checks
            if expected_protocol == "Zigbee" and "WIFI" in ocr_text:
                return False, "Visual Firewall Breach: WiFi protocol in image for Zigbee device", ocr_text
            
            for pattern in self.BLACKLIST_PATTERNS:
                if pattern.upper() in ocr_text:
                    return False, f"Visual Firewall Breach: Logo/Text remnant '{pattern}' found", ocr_text

            return True, "Passed Quality Audit", ocr_text

        except Exception as e:
            logger.error(f"❌ Vision Audit Exception: {e}")
            # Safe Fallback: Fail if audit crashes during "Purification" phase
            return False, f"Vision Audit Error: {str(e)}", ""

vision_audit_service = VisionAuditService()

import logging
import re
from typing import Dict, Any, Tuple
from decimal import Decimal

logger = logging.getLogger(__name__)

class SourcingFilter:
    """
    v4.0 3-Layer Audit Firewall (Replaces Toxic Sandbox)
    Implements the 14-point industrial audit standard:
    1. Regex Pre-filter (Token Saver)
    2. Physical Fingerprint Wall (Visual Similarity)
    3. Unit Auditor (Pack Size vs Unit Price)
    4. Strict Truth Protocol (Margin >= 15%)
    """
    PROHIBITED_PATTERNS = [
        r'\b(battery|batteries)\b',
        r'\b(liquid|liquids)\b',
        r'\b(powder|powders)\b',
        r'\b(knife|knives|weapon|weapons)\b',
        r'\b(fake|replica)\b'
    ]

    @classmethod
    def scan_product(cls, product_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Runs the product through the 3-Layer Audit Firewall.
        Returns (is_clean: bool, reason: str).
        """
        # 1. Regex Pre-filter (Save AI Tokens)
        content_to_scan = [
            str(product_data.get('title', '')).lower(),
            str(product_data.get('description', '')).lower(),
            str(product_data.get('attributes', '')).lower()
        ]
        for content in content_to_scan:
            for pattern in cls.PROHIBITED_PATTERNS:
                if re.search(pattern, content):
                    reason = f"Toxic product detected (Pattern: {pattern})"
                    logger.warning(f"⚠️ {reason} - {product_data.get('title')}")
                    return False, reason
                    
        # 2. Physical Fingerprint Wall
        if not cls._visual_fingerprint_check(product_data):
            reason = "Visual fingerprint similarity < 80% (Quarantined)"
            logger.warning(f"⚠️ {reason} - {product_data.get('title')}")
            return False, reason
            
        # 3. Unit Auditor
        if not cls._unit_alignment_check(product_data):
            reason = "Unit price vs Pack size mathematical mismatch"
            logger.warning(f"⚠️ {reason} - {product_data.get('title')}")
            return False, reason
            
        # 4. Strict Truth Protocol
        is_margin_safe, margin_reason = cls._strict_truth_margin_check(product_data)
        if not is_margin_safe:
            logger.error(f"🚨 STRICT TRUTH PROTOCOL FAILED: {margin_reason} - {product_data.get('title')}")
            return False, margin_reason
            
        return True, "Passed all audits"

    @classmethod
    def _visual_fingerprint_check(cls, product_data: Dict[str, Any]) -> bool:
        """
        Mock implementation: Compares CJ source image fingerprint vs Amazon market source.
        Requires >= 80% similarity.
        """
        # In a real implementation, this calls an image hashing or CLIP model service
        similarity_score = product_data.get("visual_similarity_score", 1.0)
        return similarity_score >= 0.80

    @classmethod
    def _unit_alignment_check(cls, product_data: Dict[str, Any]) -> bool:
        """
        Ensures 'Pack Size' matches the expected unit price multipliers.
        Prevents "2-pack" vs "1-pack" pricing errors.
        """
        pack_size = product_data.get("pack_size", 1)
        base_unit_cost = product_data.get("base_unit_cost", 0.0)
        total_cost = product_data.get("cost_usd", 0.0)
        
        if pack_size > 1 and base_unit_cost > 0:
            expected_cost = base_unit_cost * pack_size
            # Allow 5% tolerance for bulk discounts
            if total_cost < expected_cost * 0.95 or total_cost > expected_cost * 1.05:
                return False
        return True

    @classmethod
    def _strict_truth_margin_check(cls, product_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Strict Truth Protocol & Margin Check.
        Must have a valid comparison link.
        Calculated margin must be >= 15%.
        """
        comp_url = product_data.get("market_comparison_url")
        if not comp_url:
            return False, "Missing Amazon/Market real comparison link"
            
        sale_price = Decimal(str(product_data.get("sale_price", 0)))
        cost = Decimal(str(product_data.get("cost_usd", 0)))
        shipping = Decimal(str(product_data.get("shipping_cost_usd", 0)))
        
        if sale_price <= 0:
            return False, "Sale price is zero or invalid"
            
        margin = (sale_price - cost - shipping) / sale_price
        
        if margin < Decimal('0.15'):
            return False, f"Margin {margin*100:.2f}% is below 15% safety threshold"
            
        return True, ""

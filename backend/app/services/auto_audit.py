import logging
from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.product import CandidateProduct
from app.core.config import settings
from app.services.finance_engine import calculate_final_price
from app.services.rainforest_service import RainforestService
from app.services.amazon_truth_anchor import AmazonTruthAnchor

logger = logging.getLogger(__name__)

# 可信度门槛：低于此值的 Amazon 锚点不能自动 approve，转人工审核
ANCHOR_CONFIDENCE_THRESHOLD = 0.5

class AutoAuditRobot:
    def __init__(self, db: Session):
        self.db = db
        self.rainforest = RainforestService()
        self.truth_anchor = AmazonTruthAnchor()

    async def audit_and_inject(self, products_data: List[Dict[str, Any]], use_rainforest: bool = True):
        """
        v7.2 Truth Engine: Batch Audit & Injection (Three-Tier Amazon Anchor).
        1. AmazonTruthAnchor 三阶可信度校验（ASIN直查 > 关键词搜索中位数 > web_search兜底）。
        2. 可信度 < 0.5 → status=needs_review，跳过自动定价，等待人工审核。
        3. Calculate Pricing Law (60% Amazon MSRP vs 1.5x Landed).
        4. Evaluate ROI (Tag as Rebate if >= 4.0, else Promotion).
        5. Check Shipping Ratio (Warning if > 40%).
        6. Bulk Upsert into candidate_products.
        """
        audit_results = []
        for data in products_data:
            try:
                # 1. 三阶 Amazon 锚点校验
                amazon_sale_price = data.get("amazon_sale_price")
                amazon_list_price = data.get("amazon_list_price")
                amazon_link = data.get("amazon_link")
                asin = data.get("asin")
                product_title = data.get("title_en_raw") or data.get("title_en") or ""

                anchor_result = None
                if use_rainforest and (amazon_link or asin or product_title):
                    logger.info(f"🔍 Truth Audit: AmazonTruthAnchor for '{product_title[:40]}'")
                    anchor_result = await self.truth_anchor.get_anchor(
                        product_title=product_title,
                        asin=asin,
                        amazon_url=amazon_link,
                        category=data.get("category_name"),
                    )

                # 2. 可信度门控：低于阈值 → needs_review，不走自动定价
                if anchor_result:
                    confidence = anchor_result.get("confidence", 0.0)
                    data["amazon_anchor_confidence"] = confidence
                    data["amazon_anchor_source"]     = anchor_result.get("source", "")
                    data["amazon_anchor_verified"]   = anchor_result.get("is_verified", False)

                    if confidence < ANCHOR_CONFIDENCE_THRESHOLD:
                        warning_msg = anchor_result.get("warning") or f"锚点可信度低 ({confidence:.2f})"
                        logger.warning(f"⚠️ 锚点不可信，转人工审核: {product_title[:40]} | {warning_msg}")
                        data["status"] = "needs_review"
                        data["audit_notes"] = f"⚠️ Amazon 锚点可信度 {confidence:.2f} < {ANCHOR_CONFIDENCE_THRESHOLD}：{warning_msg}"
                        # 仍写入 DB 供人工处理，但跳过自动定价
                        self._upsert_candidate(data)
                        audit_results.append(data)
                        continue

                    # 可信度足够 → 使用 anchor 价格
                    amazon_sale_price = anchor_result.get("amazon_sale_price") or amazon_sale_price
                    amazon_list_price = anchor_result.get("amazon_list_price") or amazon_list_price
                    if anchor_result.get("is_branded"):
                        logger.info(f"   ℹ️ 品牌商品锚点（已降权使用）: {product_title[:40]}")

                # 3. Pricing Logic via FinanceEngine
                cost_cny = data.get("cost_cny", 0.0)
                amazon_price_base = amazon_sale_price or amazon_list_price or 0.0
                amazon_msrp_base = amazon_list_price or amazon_price_base
                freight_fee = data.get("freight_fee", 0.0)

                # Exchange rate: from settings (unified source of truth)
                exchange_rate = settings.EXCHANGE_RATE

                pricing = calculate_final_price(
                    cost_cny=cost_cny,
                    exchange_rate=exchange_rate,
                    comp_price_usd=amazon_msrp_base,  # Use list price for MSRP base
                    sale_price_ratio=0.6,
                    compare_at_price_ratio=1.0,        # Strike at Amazon MSRP
                    shipping_cost_usd=freight_fee
                )

                # 4. Update Data with Audit Results
                data.update({
                    "amazon_sale_price": amazon_sale_price,
                    "amazon_list_price": amazon_list_price,
                    "sell_price": pricing["final_price_usd"],
                    "amazon_compare_at_price": pricing["compare_at_price"],
                    "source_cost_usd": pricing["source_cost_usd"],
                    "shipping_ratio": pricing["shipping_ratio"],
                    "shipping_warning": pricing["shipping_warning"],
                    "profit_ratio": pricing["roi"],
                    "entry_tag": "Rebate" if pricing["is_reward_eligible"] else "Promotion",
                    "status": "reviewing"
                })
                
                # 5. Handle Deduplication and Upsert
                self._upsert_candidate(data)
                audit_results.append(data)

            except Exception as e:
                logger.error(f"❌ Error auditing product {data.get('product_id_1688')}: {e}")

    def _upsert_candidate(self, data: Dict[str, Any]):
        """将候选商品写入 DB（去重更新或新建），供正常流程和 needs_review 流程共用。"""
        pid = data.get("product_id_1688")
        existing = self.db.query(CandidateProduct).filter_by(product_id_1688=pid).first()
        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            logger.info(f"   🔄 Updated Candidate: {pid}")
        else:
            new_cand = CandidateProduct(**data)
            self.db.add(new_cand)
            logger.info(f"   🆕 Injected Candidate: {pid}")

        self.db.commit()
        return audit_results

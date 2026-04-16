import asyncio
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.services.auto_audit import AutoAuditRobot
from app.services.batch_uploader import BatchUploader

logger = logging.getLogger(__name__)

class IndustrialBatchFactory:
    """
    v7.1 0Buck "Truth Factory": Industrial 5x5x5 Scale-up.
    Orchestrates batch audit, injection, and parallel upload sync.
    Target: 500 products/day (3 batches of 167 products).
    """
    def __init__(self, db: Session):
        self.db = db
        self.audit_robot = AutoAuditRobot(db)
        self.uploader = BatchUploader(db)
        self.melting_service = MeltingService(db)

    async def run_high_freq_monitor(self):
        """
        v7.1: High-frequency monitoring (Melting Radar).
        """
        await self.melting_service.run_radar_scan(batch_size=100)

    def process_daily_batch(self, raw_data_list: List[Dict[str, Any]]):
        """
        Step 6: Batch Injection & Auto-Audit.
        Processes up to 125 items per batch.
        """
        logger.info(f"🏭 Truth Factory: Processing daily batch of {len(raw_data_list)} items...")
        
        # 1. Audit & Inject (Synchronous for DB stability, but could be threaded)
        audited_candidates = self.audit_robot.audit_and_inject(raw_data_list)
        
        logger.info(f"✅ Batch Audit Complete. Items in Review: {len(audited_candidates)}")
        return audited_candidates

    def generate_audit_report(self, limit: int = 30):
        """
        Generates the 'Sniper Audit Report' for Boss approval.
        Sorted by ROI (profit_ratio).
        """
        from app.models.product import CandidateProduct
        from sqlalchemy import desc
        
        candidates = self.db.query(CandidateProduct).filter(
            CandidateProduct.status == "reviewing"
        ).order_by(desc(CandidateProduct.profit_ratio)).limit(limit).all()
        
        report = []
        for c in candidates:
            report.append({
                "ID": c.id,
                "Title": c.title_zh,
                "Amazon MSRP": c.amazon_list_price or c.amazon_sale_price,
                "0Buck Price": c.sell_price,
                "ROI": round(c.profit_ratio, 2),
                "Shipping Ratio": round(c.shipping_ratio, 3),
                "Status": c.status,
                "Evidence": c.amazon_link
            })
        
        return report

    def get_batch_for_sync(self, batch_size: int = 167):
        """
        Target: 500/day = ~167 per batch (Morning, Afternoon, Evening).
        Picks the highest ROI candidates in 'approved' status.
        """
        from app.models.product import CandidateProduct
        from sqlalchemy import desc
        
        candidates = self.db.query(CandidateProduct).filter(
            CandidateProduct.status == "approved"
        ).order_by(desc(CandidateProduct.profit_ratio)).limit(batch_size).all()
        
        return [c.id for c in candidates]

    async def sync_approved_to_shopify(self, candidate_ids: List[int], concurrency: int = 5):
        """
        Step 9: Parallel Batch Sync (Step 9).
        Once approved (or auto-approved based on ROI), push to Shopify.
        """
        results = await self.uploader.upload_batch(candidate_ids, concurrency=concurrency)
        return results

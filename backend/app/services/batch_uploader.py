import asyncio
import logging
from typing import List
from sqlalchemy.orm import Session
from app.models.product import CandidateProduct
from app.services.sync_shopify import ShopifySyncService

logger = logging.getLogger(__name__)

class BatchUploader:
    def __init__(self, db: Session):
        self.db = db
        self.shopify_service = ShopifySyncService()

    async def upload_single(self, candidate_id: int):
        """
        Wrapper to sync a single candidate product to Shopify.
        """
        try:
            # Re-fetch in the current session/thread if needed
            candidate = self.db.query(CandidateProduct).get(candidate_id)
            if not candidate:
                return False, f"Candidate {candidate_id} not found."
            
            # Step 9: Formal Sync (Simplified logic from v7_push_simple)
            # This triggers the sync_to_shopify method
            # Which handles description, images, truth UI etc.
            result = await self.shopify_service.sync_to_shopify(candidate)
            
            if result:
                candidate.status = "synced"
                self.db.commit()
                return True, f"✅ Candidate {candidate_id} Synced."
            else:
                return False, f"❌ Candidate {candidate_id} Sync Failed."
                
        except Exception as e:
            return False, f"💥 Candidate {candidate_id} Error: {e}"

    async def upload_batch(self, candidate_ids: List[int], concurrency: int = 5):
        """
        v7.0 Truth Engine: Batch Parallel Mode (Step 9).
        Concurrency limit to avoid Shopify rate limits (2 reqs/sec bucket).
        """
        logger.info(f"🚀 Starting Batch Upload for {len(candidate_ids)} items...")
        
        # Using a semaphore to control concurrency
        semaphore = asyncio.Semaphore(concurrency)
        
        async def sem_upload(cid):
            async with semaphore:
                # Add a small delay between tasks to stay within Shopify limits
                # (1 req every 0.5s is safe for standard bucket)
                await asyncio.sleep(0.5) 
                return await self.upload_single(cid)
        
        tasks = [sem_upload(cid) for cid in candidate_ids]
        results = await asyncio.gather(*tasks)
        
        success_count = sum(1 for r, m in results if r)
        logger.info(f"🏁 Batch Upload Finished. Success: {success_count}/{len(candidate_ids)}")
        return results

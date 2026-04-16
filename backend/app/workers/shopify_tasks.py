from celery import Celery
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.ledger import WebhookEvent, ProcessedWebhookEvent
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery("shopify_workers", broker=settings.REDIS_URL)

@celery_app.task(name="process_shopify_webhook")
def process_shopify_webhook(event_uuid: str):
    """
    v4.0: Asynchronous Webhook Processor.
    1. Fetch raw event from DB.
    2. Enforce idempotency.
    3. Route to specific logic (FinanceEngine, etc.).
    """
    db = SessionLocal()
    try:
        # 1. Fetch Event
        event = db.query(WebhookEvent).filter_by(id=event_uuid, status="pending").first()
        if not event:
            return "Event not found or already processed"

        # 2. Idempotency Check (Second level)
        existing = db.query(ProcessedWebhookEvent).filter_by(
            event_id=event.event_id, 
            provider=event.provider
        ).first()
        
        if existing:
            event.status = "processed"
            event.processed_at = datetime.now()
            db.commit()
            return "Duplicate event ignored"

        # 3. Process Logic (Simplified routing)
        payload = event.payload
        topic = event.topic
        
        if topic == "orders/paid":
            # v8.3: Hybrid Fulfillment Orchestrator (Alibaba + CJ)
            import asyncio
            from app.services.fulfillment_cj import CJFulfillmentService
            from app.services.fulfillment_alibaba import AlibabaFulfillmentService
            
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            # Logic: If order contains Alibaba products, use Alibaba service
            # For simplicity in v8.3, we run Alibaba service first as it has the new Truth Routing
            ali_fulfillment = AlibabaFulfillmentService(db)
            res = loop.run_until_complete(ali_fulfillment.process_shopify_order(payload))
            logger.info(f"🚩 Step 5/6 Alibaba Routing Result for {payload.get('order_number')}: {res}")
            
            # Fallback/Dual-track to CJ if needed
            if res.get("status") != "success":
                cj_fulfillment = CJFulfillmentService(db)
                res_cj = loop.run_until_complete(cj_fulfillment.process_shopify_order(payload))
                logger.info(f"🚩 Step 6 CJ Fulfillment Result for {payload.get('order_number')}: {res_cj}")
            
            # Trigger FinanceEngine
            from app.services.finance_engine import FinanceEngine
            engine = FinanceEngine(db)
            engine.handle_paid_order(payload)
        
        # 4. Mark as processed
        event.status = "processed"
        event.processed_at = datetime.now()
        
        # Record in idempotency table
        db.add(ProcessedWebhookEvent(event_id=event.event_id, provider=event.provider))
        db.commit()
        
        return f"Successfully processed {topic}"

    except Exception as e:
        logger.error(f"❌ Webhook Processing Error: {str(e)}")
        if event:
            event.status = "failed"
            event.error_log = str(e)
            db.commit()
        raise e
    finally:
        db.close()

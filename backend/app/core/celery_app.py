from celery import Celery
import os
from app.core.config import settings

# Initialize Celery
# We use the existing Redis URL from settings
redis_url = settings.REDIS_URL or "redis://localhost:6379/0"

celery_app = Celery(
    "0buck_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.workers.shopify_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

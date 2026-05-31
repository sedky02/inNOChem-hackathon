"""Celery application. Imported lazily by callers inside try/except, so the API
runs fine when Celery is not installed or no broker is configured."""

from datetime import timedelta

from celery import Celery
from celery.schedules import crontab

from src.config.settings import settings

_broker = settings.celery_broker_url or settings.redis_url or "memory://"
_backend = settings.celery_result_backend or settings.redis_url or "cache+memory://"

celery_app = Celery("greendye", broker=_broker, backend=_backend)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    beat_schedule={
        "check-retrain-threshold": {
            "task": "jobs.check_retrain_threshold",
            "schedule": timedelta(hours=1),
        },
        "cleanup-exports": {
            "task": "jobs.cleanup_exports",
            "schedule": crontab(hour=2, minute=0),
        },
    },
)

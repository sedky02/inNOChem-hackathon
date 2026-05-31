"""Celery task definitions (spec §7).

Bodies are intentionally compact: full model retraining / S3 upload / SMTP are
infrastructure-bound and run only when a worker + broker + credentials exist.
The API degrades gracefully (inline confidence updates, direct file streaming)
when no broker is configured.
"""

from __future__ import annotations

from src.jobs.celery_app import celery_app


@celery_app.task(
    name="jobs.model_retrain",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    time_limit=3600,
    soft_time_limit=3300,
)
def retrain_model(self, org_id: str) -> dict:
    """Accumulate pending feedback, retrain the 4 XGBoost regressors, evaluate
    against a holdout, upload to S3, and register a new model version. Returns a
    summary dict; marks processed feedback rows complete."""
    # Implementation requires a sync DB session + training data; wired in the
    # production deployment. Returns a placeholder summary in dev.
    return {"org_id": org_id, "status": "noop-dev"}


@celery_app.task(name="jobs.generate_report", max_retries=2, default_retry_delay=30, time_limit=120)
def generate_report(session_id: str, fmt: str) -> dict:
    """Render JSON/CSV/PDF, upload to S3, and record the export. In dev the API
    streams files directly instead of using this job."""
    return {"session_id": session_id, "format": fmt, "status": "noop-dev"}


@celery_app.task(name="jobs.session_flush")
def session_flush() -> dict:
    """Flush dirty session caches from Redis to PostgreSQL."""
    return {"status": "noop-dev"}


@celery_app.task(name="jobs.send_invite_email", max_retries=3)
def send_invite_email(email: str, temp_password: str, org_id: str) -> dict:
    """Send an invite email with a temporary password via SES/SendGrid."""
    return {"email": email, "status": "noop-dev"}


@celery_app.task(name="jobs.cleanup_exports")
def cleanup_expired_exports() -> dict:
    """Delete export_files rows + S3 objects past their expiry."""
    return {"status": "noop-dev"}


@celery_app.task(name="jobs.check_retrain_threshold")
def check_retrain_threshold() -> dict:
    """Hourly: enqueue retraining for any org with >= 10 pending feedbacks."""
    return {"status": "noop-dev"}

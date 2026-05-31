"""Seed a demo organization, users, and an active model version.

Idempotent: does nothing if the demo org already exists. Demo logins (password
`demo`): admin@greendye.io · engineer@greendye.io · operator@greendye.io
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select

from src.config.database import SessionFactory
from src.core.security import hash_password
from src.models.enums import UserRole
from src.models.tables import ModelVersion, Organization, User

DEMO_SLUG = "greendye-demo"
DEMO_USERS = [
    ("admin@greendye.io", "Avery Chen", UserRole.admin),
    ("engineer@greendye.io", "Sam Okafor", UserRole.engineer),
    ("operator@greendye.io", "Lena Park", UserRole.operator),
]


async def seed_demo_data() -> None:
    async with SessionFactory() as db:
        existing = (
            await db.execute(
                select(Organization).where(Organization.slug == DEMO_SLUG)
            )
        ).scalar_one_or_none()
        if existing is not None:
            return

        org = Organization(name="GreenDye Demo Co.", slug=DEMO_SLUG, settings={})
        db.add(org)
        await db.flush()

        for email, name, role in DEMO_USERS:
            db.add(
                User(
                    org_id=org.id,
                    email=email,
                    full_name=name,
                    role=role,
                    hashed_password=hash_password("demo"),
                    is_active=True,
                )
            )

        db.add(
            ModelVersion(
                org_id=org.id,
                version_tag="v1.4.0",
                s3_model_key="models/demo/v1.4.0/model.joblib",
                accuracy_score=0.91,
                training_sample_count=247,
                performance_metrics={"rmse": 0.12},
                is_active=True,
                trained_at=datetime.now(timezone.utc),
            )
        )
        await db.commit()

"""Standalone seeding entrypoint: `python -m scripts.seed_dev_data`."""

import asyncio

from src.config.database import init_db
from src.config.seed import seed_demo_data


async def main() -> None:
    await init_db()
    await seed_demo_data()
    print("Seeded demo org + users (admin/engineer/operator @greendye.io, pw: demo)")


if __name__ == "__main__":
    asyncio.run(main())

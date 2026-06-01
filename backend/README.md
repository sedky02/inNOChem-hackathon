# GreenDye Twin — Backend

FastAPI backend for the GreenDye Twin digital twin: RDKit chemistry, a
multi-objective optimization pipeline, SHAP-style explainability, sustainability
LCA, risk scoring, JWT auth, and an adaptive feedback loop.

## Runtime modes

The production deployment targets PostgreSQL + Redis + Celery + optional S3.
Local development can still run with fewer services:

| Concern | Production | Default (no infra) |
|---|---|---|
| Database | PostgreSQL (`asyncpg`) | **SQLite** (`aiosqlite`) |
| Cache / tokens | Redis | **In-memory** TTL store |
| Background jobs | Dedicated Celery worker + Redis | API-only mode for flows that do not enqueue jobs |
| Chemistry | RDKit descriptors | **Deterministic** SMILES approximation |
| ML optimization | XGBoost models | **Thermodynamic baseline** + mode weights |
| Explainability | `shap.TreeExplainer` | **Deterministic** additive attributions |
| Exports | S3 presigned URLs | **Direct file streaming** |

The Docker image does not train models during build. Train or load model
artifacts as a separate release step and point `MODEL_BASE_PATH` at them.

## Run locally (SQLite, no infra)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings \
    "sqlalchemy[asyncio]" aiosqlite "python-jose[cryptography]" \
    "passlib[bcrypt]" python-multipart email-validator
uvicorn src.main:app --reload --port 8000
```

Open <http://localhost:8000/docs>. The app auto-creates tables locally. To seed
demo users, set `SEED_ON_STARTUP=true` or run `python -m scripts.seed_dev_data`.

**Demo logins** (password `demo`): `admin@greendye.io`, `engineer@greendye.io`,
`operator@greendye.io`.

## Run full local stack

```bash
cp .env.example .env
docker compose up --build
```

`docker-compose.yml` is for local development only. Production is described by
`render.yaml`, which creates a Render web service for the API, a separate
background worker for Celery, Render Postgres, and Render Key Value.

## Render deployment

Use `render.yaml` from the repository root. Set `CORS_ORIGINS` in the Render
Dashboard to the comma-separated list of allowed browser origins, or leave it
empty for server-to-server/API-docs-only access.

The API and Celery worker share the same Docker image but use different
commands. The API runs Uvicorn on Render's `PORT`; the worker runs
`celery -A src.jobs.celery_app.celery_app worker`.

## Tests

```bash
pip install pytest pytest-asyncio
pytest
```

## API

Interactive OpenAPI docs at `/docs`. Base path: `/api/v1`. Key endpoints:

- `POST /api/v1/auth/login` · `/auth/refresh` · `/auth/logout`
- `POST /api/v1/sessions` · `GET /sessions` · `GET/PUT/DELETE /sessions/{id}` · `GET /sessions/{id}/export`
- `POST /api/v1/chemical/screen`
- `POST /api/v1/process/optimize`
- `POST /api/v1/sessions/{id}/verify`
- `POST /api/v1/model/adapt` · `GET /model/adapt/{id}/status`
- `GET /api/v1/dashboard/aggregate`
- `GET/POST/PATCH/DELETE /api/v1/admin/users` · `GET/POST /api/v1/admin/model-versions`
- `GET /health`

## Layering

```
api/ (routers, thin)  →  services/ (orchestration)  →  repositories/ (DB)  →  models/
engines/ (pure compute: chemical, simulation, optimization, sustainability, risk, explainability, pipeline)
core/ (security, deps, cache, executor)   schemas/ (Pydantic v2)   jobs/ (Celery)
```

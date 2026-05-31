# GreenDye Twin — Backend

FastAPI backend for the GreenDye Twin digital twin: RDKit chemistry, a
multi-objective optimization pipeline, SHAP-style explainability, sustainability
LCA, risk scoring, JWT auth, and an adaptive feedback loop.

## Design choices for zero-setup runs

The full spec targets PostgreSQL + Redis + Celery + S3 + RDKit/XGBoost/SHAP.
To stay runnable in any environment, this implementation **degrades gracefully**:

| Concern | Production | Default (no infra) |
|---|---|---|
| Database | PostgreSQL (`asyncpg`) | **SQLite** (`aiosqlite`) — auto-created |
| Cache / tokens | Redis | **In-memory** TTL store |
| Background jobs | Celery + Redis | **Inline** confidence updates |
| Chemistry | RDKit descriptors | **Deterministic** SMILES approximation |
| ML optimization | XGBoost models | **Thermodynamic baseline** + mode weights |
| Explainability | `shap.TreeExplainer` | **Deterministic** additive attributions |
| Exports | S3 presigned URLs | **Direct file streaming** |

Every heavy dependency is import-guarded, so `pip install` of just the core
packages is enough to boot. Installing the optional packages (see
`requirements.txt`) transparently upgrades each engine to its real implementation.

## Run locally (SQLite, no infra)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings \
    "sqlalchemy[asyncio]" aiosqlite "python-jose[cryptography]" \
    "passlib[bcrypt]" python-multipart email-validator
uvicorn src.main:app --reload --port 8000
```

Open <http://localhost:8000/docs>. The app auto-creates tables and seeds a demo
org on startup.

**Demo logins** (password `demo`): `admin@greendye.io`, `engineer@greendye.io`,
`operator@greendye.io`.

## Run with full stack

```bash
cp .env.example .env        # adjust as needed
docker compose up --build   # api + postgres + redis + celery
```

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

## Connecting the frontend

The backend's response field names follow this spec (e.g. `pressure_bar`,
`dye_uptake_pct`). The Next.js frontend currently runs on its own mock layer; a
thin adapter in the frontend's `lib/api` (or matching the field names) bridges
the two. Point the frontend at the backend by setting
`NEXT_PUBLIC_API_URL=http://localhost:8000` and `NEXT_PUBLIC_USE_MOCKS=false`.

## Layering

```
api/ (routers, thin)  →  services/ (orchestration)  →  repositories/ (DB)  →  models/
engines/ (pure compute: chemical, simulation, optimization, sustainability, risk, explainability, pipeline)
core/ (security, deps, cache, executor)   schemas/ (Pydantic v2)   jobs/ (Celery)
```

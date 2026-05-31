# GreenDye Twin — Unified Application

Explainable-AI **digital twin for supercritical CO₂ textile dyeing**. One repo,
one `docker compose up`: a Next.js wizard frontend talking to a FastAPI backend
whose engines run real chemistry (RDKit), physics (PR-EOS + Langmuir ODE), and
ML (RandomForest + SHAP) trained on a 100-row scCO₂ dyeing dataset.

## Quick start

```bash
cp .env.example .env          # optional; sensible defaults work
docker compose up --build     # backend + frontend + redis
```

- **Frontend (Next.js):** http://localhost:3000
- **Backend API + Swagger:** http://localhost:8000/docs
- **Health:** http://localhost:8000/health

Demo logins (password `demo`): `admin@greendye.io` · `engineer@greendye.io` ·
`operator@greendye.io`. Roles gate verification (engineer/admin) and admin pages.

### Run without Docker

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.train_models      # trains RF models from the dataset
uvicorn src.main:app --reload --port 8000

# Frontend (new shell, repo root)
npm install
NEXT_PUBLIC_USE_MOCKS=false npm run dev
```

The frontend also runs **fully standalone on built-in mocks**
(`NEXT_PUBLIC_USE_MOCKS=true`, the default when no backend is configured) —
handy for UI work and demos.

## How the three parts were unified

| Source | Role in the unified app |
|---|---|
| **Next.js frontend** (repo root) | The 5-step experiment wizard, dashboard, reports, settings. |
| **FastAPI backend** (`backend/`) | Base API: JWT auth, sessions, `/chemical/screen`, `/process/optimize`, `/sessions/{id}/verify`, `/model/adapt`, `/dashboard/aggregate`, exports, `/health`. |
| **InnoChem repo science** | Folded into the backend engines: **PR-EOS** CO₂ density, **Langmuir adsorption ODE** (SciPy), **RandomForest** K/S regressor + thermal/fixation classifiers (+ SHAP), and the **SMARTS negative-knowledge risk firewall**. |
| **Colab notebooks** | Converted into the engine modules (descriptors, kinetics, optimization, risk, explainability). |

### Graceful degradation
Every heavy dependency (RDKit, XGBoost/sklearn, SHAP, SciPy, Redis, Celery,
ChromaDB, S3) is **import-guarded with a deterministic fallback**, so the stack
boots with only the core deps and lights up the real engines as libraries appear.

| Concern | Real | Fallback |
|---|---|---|
| DB | PostgreSQL (`--profile postgres`) | SQLite (auto-created) |
| Cache/tokens | Redis | in-memory |
| Chemistry | RDKit descriptors | SMILES approximation |
| K/S + risk | trained RandomForest + SHAP | heuristic scores |
| Kinetics | SciPy Langmuir ODE + PR-EOS | analytic curve |
| RAG citations | ChromaDB literature index | empty list |

## Models & data

- Dataset: `backend/data/raw/dyeing_dataset.xlsx` (100 rows, precomputed descriptors).
- `make train` trains and saves `ks_regressor`, `thermal_classifier`,
  `fixation_classifier` to `backend/models/`.
  LOOCV: K/S MAE ≈ 13 units, thermal acc ≈ 0.93, fixation acc ≈ 0.99.
- `/health` reports which models are loaded.

## Make targets

`make setup` · `make install` · `make train` · `make up` · `make down` ·
`make dev` · `make test` · `make lint` · `make health` · `make clean`

## Architecture

```
frontend (Next.js, App Router)
  src/lib/api/{index,backend,client,token}.ts   ← mock layer OR real-backend adapter
        │  (NEXT_PUBLIC_USE_MOCKS=false)
        ▼
backend (FastAPI)
  api/v1/* → services/* → repositories/* → models/   (SQLAlchemy async)
  engines/ (pure compute): chemical · simulation(ODE+PR-EOS) · optimization
            · sustainability · risk(+SMARTS firewall) · explainability · pipeline
  ml/ (features, registry) · core/ (security, deps, cache) · jobs/ (Celery)
```

## Tests

```bash
cd backend && python -m pytest -q            # engine unit tests
python -m tests.smoke_flow                   # full API flow (login→…→export)
npx tsc --noEmit                             # frontend type check (repo root)
```

## Notes / follow-ups

- The frontend adapter (`src/lib/api/backend.ts`) maps the backend's spec field
  names (`pressure_bar`, `dye_uptake_pct`, …) onto the frontend types and
  synthesizes the 3-mode `scenarios` block (Step 2) via three optimize calls.
- LangGraph orchestration, ChromaDB RAG, Celery retraining, and S3 exports are
  scaffolded/guarded but not required to run the core experience.

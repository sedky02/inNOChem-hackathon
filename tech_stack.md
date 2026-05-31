# GreenDye Twin — Tech Stack & Architecture

## 1. What the project is

**GreenDye Twin** is an Explainable-AI **digital twin for sustainable supercritical
CO₂ (scCO₂) textile dyeing**. It replaces wet-lab trial-and-error with a software
pipeline that, for a given dye + fabric:

1. **Screens** the dye molecule (RDKit descriptors → compatibility/solubility scores).
2. **Optimizes** the process across three strategies (Eco / Balanced / Performance).
3. **Simulates** dye-uptake kinetics over time (Langmuir adsorption ODE + PR-EOS CO₂ density).
4. **Assesses risk** (trained classifiers + a structural/process safety firewall) and
   **explains** every recommendation with SHAP-style attributions.
5. Enforces a **human-in-the-loop** sign-off, emits a **signed configuration manifest**,
   and feeds **real factory outcomes back** to recalibrate the models.

The product is a 5-step wizard (Next.js) backed by a FastAPI service whose engines run
real chemistry, physics, and ML.

---

## 2. High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend — Next.js 16 (App Router), TypeScript, Tailwind v4   │
│  shadcn/ui · TanStack Query · Zustand · Recharts               │
│  5-step wizard · dashboard · reports · settings                │
│  src/lib/api: mock layer  ──OR──  real-backend adapter         │
└───────────────────────────────┬──────────────────────────────┘
                                 │  HTTPS + JWT (Bearer)
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend — FastAPI (async), modular monolith                   │
│                                                                │
│   api/v1  →  services  →  repositories  →  models (SQLAlchemy)  │
│      (thin routers) (orchestration) (data access) (ORM tables) │
│                                                                │
│   engines/  (pure compute, no DB/HTTP):                        │
│     chemical · simulation(ODE+PR-EOS) · optimization ·         │
│     sustainability · risk(+SMARTS firewall) · explainability · │
│     pipeline (orchestrates the 6 engines)                      │
│                                                                │
│   ml/ (features + model registry) · core/ (security, deps,     │
│   cache, executor) · jobs/ (Celery) · rag/ (ChromaDB retriever)│
└───────────┬───────────────────────┬──────────────────┬────────┘
            ▼                        ▼                  ▼
      PostgreSQL / SQLite       Redis (opt.)      Trained models
      (sessions, results,       cache · tokens     (joblib RF +
       verification, feedback)   · denylist         SHAP) on disk
```

**Layering rule (strict, one-way):** `api → services → repositories → models`.
Engines are **pure functions of their inputs** (no DB, no HTTP) so they are unit-testable
and reusable; the API offloads them to a thread executor.

**Modular monolith (not microservices):** the 6 engines form a tight, CPU-bound
sequential pipeline; in-process function calls avoid network hops and shared-stack
duplication.

---

## 3. Backend tech stack

| Concern | Technology | Notes |
|---|---|---|
| Web framework | **FastAPI** (async/await) | OpenAPI docs at `/docs` |
| Validation | **Pydantic v2** | request/response schemas in `src/schemas/` |
| ORM / DB | **SQLAlchemy 2.0 async** | portable types: SQLite (dev) ↔ PostgreSQL (prod) |
| DB drivers | **aiosqlite** / **asyncpg** | chosen by `DATABASE_URL` |
| Auth | **python-jose** (JWT) + **bcrypt** | HS256 default, RS256 optional; RBAC |
| Cache / tokens | **Redis** (`redis.asyncio`) | in-memory fallback when unset |
| ML | **scikit-learn** RandomForest + **SHAP** | K/S regressor + 2 risk classifiers |
| Chemistry | **RDKit** | descriptors + SMARTS substructure matching |
| Physics | **SciPy** (`solve_ivp`) + **NumPy** | Langmuir ODE + Peng-Robinson EOS |
| Data | **pandas** + **openpyxl** | training dataset load/prep |
| Background jobs | **Celery** + Redis | retraining/reports/cleanup (inline fallback) |
| Exports | **ReportLab** (PDF) + stdlib (JSON/CSV) | streamed to client |
| RAG (optional) | **ChromaDB** + PyPDF | literature citations |
| Tests | **pytest**, **httpx** | engine units + full API smoke flow |

### Graceful degradation
Every heavy dependency is **import-guarded with a deterministic fallback**, so the API
boots on the core deps (FastAPI + SQLAlchemy + JWT) and upgrades automatically when the
scientific libraries are present:

| Capability | Real implementation | Fallback (no lib) |
|---|---|---|
| Descriptors | RDKit `Descriptors` | SMILES structural approximation |
| K/S + risk | trained RandomForest + SHAP | physics/heuristic scoring |
| Kinetics | SciPy Langmuir ODE + PR-EOS | analytic exponential curve + empirical density |
| Cache/tokens | Redis | in-process TTL dict |
| Retraining | Celery task | inline confidence update |
| RAG citations | ChromaDB query | empty list |
| Database | PostgreSQL | SQLite (auto-created) |

---

## 4. Backend functionality (the engines)

All engines live in `backend/src/engines/` and are orchestrated by `pipeline.py`.

### 4.1 Chemical Intelligence Engine — `chemical_engine.py`
- Parses a **SMILES** string with RDKit; raises `InvalidSMILESError` on bad input.
- Extracts descriptors: **MolWt, LogP, TPSA, H-bond donors/acceptors, rotatable bonds,
  aromatic rings**.
- Computes a **compatibility score** (LogP 40% · TPSA 30% · MW-window 30%, minus HBD
  penalty) and a **solubility score** for scCO₂ — both clamped 0–100.
- Without RDKit, derives plausible descriptors from the SMILES character structure so
  scores stay stable and comparable.

### 4.2 Process Simulation Engine — `simulation_engine.py`
- Predicts **equilibrium K/S** from the trained RandomForest regressor (falls back to a
  physics heuristic).
- Computes **CO₂ density** via the **Peng-Robinson EOS** (`pr_eos.py`), which drives the
  adsorption rate constants.
- Solves the **Langmuir adsorption ODE** (`kinetics.py`, SciPy `solve_ivp`, RK4 fallback):
  `dq/dt = k_ads·C·(q_max−q) − k_des·q`, `dC/dt = −dq/dt`.
- Returns a **50-point kinetic curve** (K/S vs time, fluid dye concentration vs time),
  plus dye-uptake %, color intensity (K/S), and process efficiency.

### 4.3 Optimization Engine — `optimization_engine.py`
- Recommends **pressure / temperature / time / flow-rate** for a chosen mode.
- **Mode weight vectors** (Eco/Balanced/Performance) bias the thermodynamic baseline,
  adjusted by molecular weight, TPSA, and blend ratio.
- Loads XGBoost/joblib models if present; otherwise uses the deterministic baseline (spec-sanctioned fallback).

### 4.4 Sustainability Engine — `sustainability_engine.py`
- Life-cycle comparison vs conventional aqueous dyeing (literature baselines:
  50 L water/kg, 4.2 kWh/kg, 3.8 kg CO₂/kg).
- Outputs **water savings %, energy reduction %, carbon saved (kg CO₂e), and E-Factor**
  (waste per kg product).

### 4.5 Risk Intelligence Engine — `risk_engine.py` + `risk_firewall.py`
- Four risk components: **dye degradation, process instability, equipment stress,
  low color yield** — probabilities from the trained **thermal/fixation classifiers**
  (fallback: physical heuristics), each with a confidence.
- **SMARTS negative-knowledge firewall**: matches hazardous substructures (azo cleavage,
  nitro clusters, halogenated acids, free carboxylic acid) via RDKit + **thermodynamic
  threshold checks** (temperature, CO₂ density deficit/excess, low-polyester+high-temp,
  over-long cycles).
- Aggregates an **overall risk level** (LOW/MEDIUM/HIGH/CRITICAL), escalating on critical
  firewall hits, and emits auditable warnings.

### 4.6 Explainability Engine — `explainability_engine.py`
- Per recommended parameter, returns a **baseline, predicted value, and signed SHAP-style
  contributions** per feature (MolWt, LogP, TPSA, density, blend, compatibility).
- Contributions satisfy **SHAP additivity** (`baseline + Σ contributions = predicted`) and
  are **weighted by the trained model's feature importances** when available.

### 4.7 Pipeline — `pipeline.py`
Runs the engines in order — optimization → simulation → sustainability → risk →
explainability — and assembles the full optimize response with `compute_time_ms` and the
active model version. Invoked via a thread executor so the async event loop stays free.

---

## 5. Backend functionality (the platform)

### Authentication & RBAC — `core/security.py`, `core/deps.py`
- **JWT** access tokens (HS256 default; RS256 with key files). Refresh tokens stored
  hashed in the cache; logout adds the `jti` to a **denylist**.
- **bcrypt** password hashing (cost 12, 72-byte safe).
- Roles **operator / engineer / admin** enforced via `require_role(...)` dependencies:
  operators run experiments; engineers/admins **verify**; admins manage users/models and
  can delete sessions.

### Sessions & persistence — `services/session_service.py`, `repositories/`
- Full CRUD with org-scoping, pagination, search/status/mode filters.
- Detail hydration assembles screening + optimization + verification into one payload and
  derives the current wizard step.

### Caching — `core/cache.py`
- Redis or in-memory: screening results keyed by `sha256(smiles)` (1 h), optimize results
  by canonical-request hash (5 min), dashboard aggregate (2 min), plus refresh-token store
  and access-token denylist.

### Human-in-the-loop verification — `services/verification_service.py`
- Records an engineer's acknowledgment, computes a **SHA-256 verification hash**
  (`session + params + user + timestamp`), and marks the session complete.
- **CRITICAL** configs require an explicit `force_override` **and** documented notes;
  re-verifying is **idempotent**.

### Adaptive feedback loop — `services/feedback_service.py`
- Persists real factory outcomes, computes a **confidence delta** from prediction error,
  and (with Celery) dispatches retraining once ≥10 feedbacks accumulate (inline otherwise).

### Exports — `services/export_service.py`
- Server-generated **JSON manifest**, **CSV parameters**, and **ReportLab PDF report**,
  streamed with the correct `Content-Disposition`.

### ML lifecycle — `ml/features.py`, `ml/registry.py`, `scripts/train_models.py`
- `train_models.py` trains three **RandomForest** models on the 100-row scCO₂ dataset
  (precomputed descriptors → no RDKit needed for training):
  - `ks_regressor` — K/S color strength (**LOOCV MAE ≈ 13**)
  - `thermal_classifier` (**acc ≈ 0.93**), `fixation_classifier` (**acc ≈ 0.99**)
- The **model registry** lazily loads the joblib bundles; engines query it and degrade
  gracefully if absent. `/health` reports which models are loaded.

---

## 6. API surface (`/api/v1`)

| Method & path | Purpose | Auth |
|---|---|---|
| `POST /auth/login` · `/auth/refresh` · `/auth/logout` | JWT issue/rotate/revoke | public / bearer |
| `POST /sessions` · `GET /sessions` · `GET/PUT/DELETE /sessions/{id}` | session CRUD (org-scoped) | any / admin (delete) |
| `GET /sessions/{id}/export?format=json\|pdf\|csv` | download manifest/report | engineer+ |
| `POST /chemical/screen` | RDKit descriptors + scores (cached) | any |
| `POST /process/optimize` | full 6-engine pipeline (cached) | any |
| `POST /sessions/{id}/verify` | human-in-the-loop seal | engineer/admin |
| `POST /model/adapt` · `GET /model/adapt/{id}/status` | feedback + recalibration | any |
| `GET /dashboard/aggregate` | org sustainability totals (cached) | any |
| `GET/POST/PATCH/DELETE /admin/users` · `GET/POST /admin/model-versions` | administration | admin |
| `GET /health` | DB / cache / model status | public |

---

## 7. Data model (10 tables)

`organizations`, `users`, `sessions`, `session_steps`, `screening_results`,
`optimization_results`, `verification_records`, `feedback_records`, `export_files`,
`model_versions`.

- **UUID** primary keys, **soft deletes** (`deleted_at`) for audit, **JSON** columns for
  ML outputs (descriptors, SHAP, risk), `TIMESTAMPTZ` timestamps.
- Portable column types run unchanged on SQLite and PostgreSQL.

---

## 8. Frontend tech stack (summary)

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (radix) · TanStack Query v5
· Zustand (sessionStorage-persisted wizard store) · React Hook Form + Zod · Recharts ·
Lucide. The service layer (`src/lib/api/`) runs on **built-in mocks** by default or, with
`NEXT_PUBLIC_USE_MOCKS=false`, an **adapter** that maps the backend's spec field names
onto the frontend types, attaches the JWT, and synthesizes the 3-mode `scenarios` block.

---

## 9. Backend folder structure

```
backend/
├── src/
│   ├── main.py                 FastAPI app factory, CORS, security headers, lifespan
│   ├── api/v1/                 auth, sessions, chemical, process, verification,
│   │                           model_adapt, dashboard, admin, health + router
│   ├── services/               auth, session, compute, verification, feedback,
│   │                           export, user, dashboard (orchestration)
│   ├── repositories/           base + user/session/result/feedback/model (data access)
│   ├── models/                 enums, mixins, tables (SQLAlchemy ORM)
│   ├── schemas/                Pydantic v2 request/response contracts
│   ├── engines/                chemical, simulation, optimization, sustainability,
│   │                           risk, risk_firewall, explainability, pr_eos, kinetics,
│   │                           pipeline, errors
│   ├── ml/                     features, registry
│   ├── core/                   security, deps, cache, executor
│   ├── jobs/                   celery_app, tasks
│   ├── rag/                    retriever
│   └── config/                 settings, database, seed
├── scripts/                    train_models, convert_dataset, build_rag_index, seed
├── data/raw/                   dyeing_dataset.xlsx
├── models/                     trained .joblib bundles
├── tests/                      test_engines.py, smoke_flow.py
├── requirements.txt · Dockerfile · pyproject.toml · .env.example
```

---

## 10. Running & verifying

```bash
docker compose up --build          # backend :8000 + frontend :3000 + redis
# or locally:
cd backend && pip install -r requirements.txt
python -m scripts.train_models     # train the RandomForest models
uvicorn src.main:app --reload --port 8000
```

- Demo logins (password `demo`): `admin@`, `engineer@`, `operator@greendye.io`.
- Tests: `pytest -q` (engine units), `python -m tests.smoke_flow` (full API flow),
  `npx tsc --noEmit` (frontend types).

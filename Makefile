.PHONY: setup install train test lint up down dev health clean

# Copy env template (edit afterwards).
setup:
	cp -n .env.example .env || true
	@echo "Edit .env if needed, then: make install && make train"

# Install backend (Python) + frontend (Node) dependencies.
install:
	cd backend && pip install -r requirements.txt
	npm install

# Train the RandomForest models on the scCO2 dataset.
train:
	cd backend && python -m scripts.train_models

# Optional: build the RAG literature index (needs chromadb + pypdf).
rag:
	cd backend && python -m scripts.build_rag_index

# Run the whole stack in Docker (backend + frontend + redis).
up:
	docker compose up --build

down:
	docker compose down

# Local dev without Docker: backend (uvicorn) + frontend (next dev).
dev:
	cd backend && uvicorn src.main:app --reload --port 8000 &
	npm run dev

# Tests + static checks.
test:
	cd backend && python -m pytest -q

lint:
	npx tsc --noEmit
	cd backend && ruff check src || true

health:
	curl -s http://localhost:8000/health | python -m json.tool

clean:
	docker compose down -v || true
	find . -name "__pycache__" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	rm -f backend/greendye.db

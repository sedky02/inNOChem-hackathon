# Multi-stage build
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runtime
WORKDIR /app
# RDKit runtime libraries
RUN apt-get update \
    && apt-get install -y --no-install-recommends libxrender1 libxext6 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
COPY . .
RUN mkdir -p /app/dbdata /app/models
# Train the RandomForest models at build time if not already present, so the
# image ships ready-to-serve. Safe to fail (engines fall back gracefully).
RUN python -m scripts.train_models || echo "training skipped"
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

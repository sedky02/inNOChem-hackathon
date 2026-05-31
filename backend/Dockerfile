# Multi-stage build
FROM python:3.12-slim AS builder

WORKDIR /build

# Improve pip reliability
RUN pip install --upgrade pip setuptools wheel

COPY requirements.txt .

# Stable dependency install (timeouts + retries + no-input)
RUN pip install --no-cache-dir \
    --prefix=/install \
    --timeout 120 \
    --retries 10 \
    --no-input \
    -r requirements.txt


FROM python:3.12-slim AS runtime

WORKDIR /app

# System deps (keep minimal)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libxrender1 \
        libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python packages
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Ensure runtime folders exist
RUN mkdir -p /app/dbdata /app/models

# Optional model training (non-fatal)
RUN python -m scripts.train_models || echo "training skipped"

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
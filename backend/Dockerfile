# ==============================================================================
# Backend Dockerfile - Production FastAPI RAG Server
# ==============================================================================
FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast Python package installation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy project specification & dependencies
COPY pyproject.toml .

# Install dependencies into system environment (CPU PyTorch to optimize build speed & size)
RUN uv pip install --system --no-cache --extra-index-url https://download.pytorch.org/whl/cpu -r pyproject.toml

# Copy backend application source code
COPY backend/ ./backend/
COPY README.md .

# Install local package in editable/system mode
RUN uv pip install --system --no-cache -e .

# Create volume mount point for local SQLite / storage if needed
RUN mkdir -p /app/data

EXPOSE 8000

# Health check against the health endpoint
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start FastAPI application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

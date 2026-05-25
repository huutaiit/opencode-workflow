# FastAPI Docker Specialist
# FastAPI Dockerスペシャリスト
# Chuyen Gia Docker FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Directory Pattern** | `Dockerfile`, `docker-compose.yml`, `.dockerignore` |
| **Variant** | ALL |
| **Naming Convention** | `Dockerfile`, `docker-compose.yml`, `gunicorn_conf.py` |
| **Imports From** | N/A (infrastructure) |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (Docker tooling) |
| **When To Use** | Containerized deployment, Gunicorn + Uvicorn production setup |
| **Source Skeleton** | `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `gunicorn.conf.py` |
| **Pattern Numbers** | 90.1–90.5 |
| **Source Paths** | `Dockerfile`, `docker-compose*.yml` |
| **File Count** | 2-3 per project |
| **Imported By** | N/A (DevOps) |
| **Specialist Type** | devops |
| **Purpose** | Multi-stage Dockerfile, gunicorn+uvicorn worker config, .dockerignore, HEALTHCHECK, uv for fast installs |
| **Activation Trigger** | docker, Dockerfile, container, gunicorn, uvicorn, deploy |

---

## Purpose

Define Docker deployment patterns for FastAPI: multi-stage builds for minimal images, gunicorn with uvicorn workers, .dockerignore for clean context, HEALTHCHECK directive, and uv for fast dependency installation.

---

## Pattern 90.1: Multi-Stage Dockerfile

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install runtime system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Copy application code
COPY src/ src/
COPY alembic/ alembic/
COPY alembic.ini .
COPY gunicorn_conf.py .

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

CMD ["gunicorn", "src.main:app", "-c", "gunicorn_conf.py"]
```

**Key rules**:
- Multi-stage: builder installs, runtime copies (smaller image)
- Non-root user (security)
- `--no-cache-dir` saves ~50MB in image
- `--no-install-recommends` for minimal system packages

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-deployment)

---

## Pattern 90.2: Gunicorn + UvicornWorker

```python
# gunicorn_conf.py
import multiprocessing

# Workers: 2 * CPU + 1 (recommended formula)
workers = 2 * multiprocessing.cpu_count() + 1
worker_class = "uvicorn.workers.UvicornWorker"

# Binding
bind = "0.0.0.0:8000"

# Timeouts
timeout = 120              # Worker timeout
graceful_timeout = 30      # Time for graceful shutdown
keepalive = 5              # Keep-alive connections

# Worker lifecycle
max_requests = 2000        # Restart worker after N requests (prevent memory leaks)
max_requests_jitter = 200  # Random jitter to prevent all workers restarting at once

# Logging
accesslog = "-"            # stdout
errorlog = "-"             # stderr
loglevel = "info"

# Preload
preload_app = True         # Load app before forking (saves memory via copy-on-write)
```

**Worker count guide**:
- **CPU-bound** (ML inference): `workers = CPU_COUNT + 1`
- **I/O-bound** (typical API): `workers = 2 * CPU_COUNT + 1`
- **Kubernetes** (1 pod = 1 core): `workers = 2-4`

---

## Pattern 90.3: .dockerignore

```
# .dockerignore
.git
.gitignore
.env
.env.*
.venv
venv
__pycache__
*.pyc
*.pyo
.pytest_cache
.mypy_cache
.ruff_cache
htmlcov
.coverage
node_modules
*.md
!requirements.txt
docker-compose*.yml
Dockerfile
.dockerignore
tests/
docs/
*.egg-info
dist/
build/
```

---

## Pattern 90.4: HEALTHCHECK Directive

```dockerfile
# In Dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1
```

```yaml
# In docker-compose.yml
services:
  api:
    build: .
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/live"]
      interval: 30s
      timeout: 5s
      start_period: 10s
      retries: 3
```

---

## Pattern 90.5: uv in Docker (Fast Installs)

```dockerfile
# Using uv instead of pip (10-100x faster)
FROM python:3.12-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (cached by Docker layer)
RUN uv sync --frozen --no-dev --no-install-project

# Copy source code
COPY src/ src/

# Install project
RUN uv sync --frozen --no-dev

FROM python:3.12-slim AS runtime

WORKDIR /app
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

COPY src/ src/
COPY gunicorn_conf.py .

ENV PATH="/app/.venv/bin:$PATH"
USER appuser
EXPOSE 8000

CMD ["gunicorn", "src.main:app", "-c", "gunicorn_conf.py"]
```

---

## MUST DO

- Use multi-stage builds (smaller images)
- Run as non-root user
- Set `max_requests` to prevent memory leaks
- Use `.dockerignore` to exclude unnecessary files
- Add HEALTHCHECK directive
- Pin base image versions (not `:latest`)

## MUST NOT DO

- Run container as root
- Use `:latest` tag for base images
- Skip `.dockerignore` (sends entire repo as build context)
- Hardcode secrets in Dockerfile (use env vars or secrets)
- Skip HEALTHCHECK (no automatic restart on failure)
- Install dev dependencies in production image

---

## References

- [FastAPI Docker Deployment](https://fastapi.tiangolo.com/deployment/docker/)
- [Gunicorn Settings](https://docs.gunicorn.org/en/latest/settings.html)
- [uv Docker](https://docs.astral.sh/uv/guides/integration/docker/)

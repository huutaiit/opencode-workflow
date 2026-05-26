# Django Docker Specialist
# Django Dockerスペシャリスト
# Chuyen Gia Docker Django

**Stack**: Python 3.12+ / Django 5.x / Docker | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Directory Pattern** | `Dockerfile`, `docker-compose.yml`, `entrypoint.sh` |
| **Variant** | ALL |
| **Naming Convention** | Standard Docker file naming |
| **Imports From** | — |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | multi-stage-dockerfile, entrypoint, gunicorn-config, docker-compose, dockerignore, env-overrides |
| **Pattern Numbers** | 45.1–45.6 |
| **Source Paths** | `Dockerfile`, `docker-compose*.yml`, `entrypoint.sh` |
| **File Count** | 3-4 files at project root |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | Multi-stage Dockerfile, entrypoint script, gunicorn configuration, Docker Compose full stack, .dockerignore, environment-specific overrides |
| **Activation Trigger** | Docker, Dockerfile, container, gunicorn, deploy, docker-compose |

---

## Purpose

Define Django Docker patterns: multi-stage Dockerfile for minimal production images, entrypoint script for startup sequence, gunicorn configuration for WSGI/ASGI, Docker Compose for full-stack development, .dockerignore for build optimization, and environment-specific overrides.

---

## Pattern 45.1: Multi-Stage Dockerfile

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements/production.txt requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Collect static files during build
RUN DJANGO_SETTINGS_MODULE=config.settings.production \
    SECRET_KEY=build-placeholder \
    DATABASE_URL=sqlite:///tmp/build.db \
    python manage.py collectstatic --noinput

# Create non-root user
RUN addgroup --system django && adduser --system --ingroup django django
RUN chown -R django:django /app
USER django

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--config", "gunicorn_conf.py"]
```

---

## Pattern 45.2: entrypoint.sh

```bash
#!/bin/bash
set -e

echo "Waiting for database..."
while ! python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()
from django.db import connection
connection.ensure_connection()
" 2>/dev/null; do
    echo "  Database unavailable - retrying in 2s..."
    sleep 2
done
echo "Database available."

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting server..."
exec "$@"
```

```dockerfile
# Make entrypoint executable in Dockerfile
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
```

---

## Pattern 45.3: Gunicorn Configuration

```python
# gunicorn_conf.py
import multiprocessing
import os

# Server
bind = os.getenv("GUNICORN_BIND", "0.0.0.0:8000")
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = os.getenv("GUNICORN_WORKER_CLASS", "sync")
threads = int(os.getenv("GUNICORN_THREADS", 1))

# For ASGI (Django Channels)
# worker_class = "uvicorn.workers.UvicornWorker"

# Timeouts
timeout = int(os.getenv("GUNICORN_TIMEOUT", 120))
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Security
limit_request_line = 8190
limit_request_fields = 100
```

---

## Pattern 45.4: Docker Compose (Full Stack)

```yaml
# docker-compose.yml
services:
  web:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myproject
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  worker:
    build: .
    command: celery -A config worker --loglevel=info -c 4
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  beat:
    build: .
    command: celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    deploy:
      replicas: 1

  flower:
    build: .
    command: celery -A config flower --port=5555
    ports:
      - "5555:5555"
    env_file: .env
    depends_on:
      - redis

volumes:
  pgdata:
```

---

## Pattern 45.5: .dockerignore

```
# Git
.git
.gitignore

# Python
__pycache__
*.pyc
*.pyo
.pytest_cache
.mypy_cache
.ruff_cache
htmlcov
.coverage

# Environment
.env
.env.*
!.env.example

# IDE
.vscode
.idea
*.swp

# Docker
docker-compose*.yml
Dockerfile

# Django
staticfiles/
media/
*.sqlite3
db.sqlite3

# Docs
*.md
docs/
LICENSE
```

---

## Pattern 45.6: Environment-Specific Overrides

```yaml
# docker-compose.override.yml (auto-loaded, for development)
services:
  web:
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
      - /app/__pycache__
    environment:
      - DEBUG=True
      - DJANGO_SETTINGS_MODULE=config.settings.development

  worker:
    volumes:
      - .:/app
    command: celery -A config worker --loglevel=debug --autoreload

  beat:
    volumes:
      - .:/app
    command: celery -A config beat --loglevel=debug --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

```bash
# Development (auto-loads override)
docker compose up

# Production (skip override)
docker compose -f docker-compose.yml up -d

# Or use profiles
docker compose --profile production up -d
```

---

## MUST DO

- Use multi-stage builds (smaller image, no build tools in prod)
- Run as non-root user in container
- Run `collectstatic` during Docker build (not at runtime)
- Use health checks on database before starting
- Separate worker and beat containers

## MUST NOT DO

- Run as root in production containers
- Skip collectstatic in build (static files missing)
- Commit `.env` files to git
- Set `DEBUG=True` in production containers
- Run migrations in Dockerfile (run in entrypoint or init container)

---

## References

- [Docker: Best practices for Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Gunicorn: Configuration](https://docs.gunicorn.org/en/stable/configure.html)
- [Docker Compose: Profiles](https://docs.docker.com/compose/profiles/)

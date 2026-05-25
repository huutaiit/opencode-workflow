# NestJS Docker Compose Specialist — DevOps
# NestJS Docker Composeスペシャリスト — DevOps
# Chuyen Gia Docker Compose NestJS — DevOps

**Version**: 1.0.0
**Technology**: Docker Compose for NestJS Development
**Aspect**: Docker Compose
**Category**: devops
**Purpose**: Knowledge provider for NestJS Docker Compose patterns — multi-service development, infrastructure services, networking, volumes, health checks, environment profiles

---

## Metadata

```json
{
  "id": "nestjs-docker-compose-specialist",
  "technology": "Docker Compose for NestJS",
  "aspect": "Docker Compose",
  "category": "devops",
  "subcategory": "nestjs",
  "lines": 320,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Docker Compose v2 — multi-container orchestration for development",
    "E2: NestJS microservice architecture — multiple services + shared infra",
    "E3: p2plend docker-compose — real-world NestJS compose patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (DevOps) |
| **Variant** | ALL |
| **Pattern Numbers** | 244.1–244.6 |
| **Directory Pattern** | N/A (Docker Compose configuration) |
| **Naming Convention** | `docker-compose.yml` (base), `docker-compose.infra.yml`, `docker-compose.apps.yml` |
| **Dependencies** | none (Docker Compose config) |
| **When To Use** | Local development environment with infrastructure services |
| **Source Skeleton** | docker-compose.yml, docker-compose.infra.yml, docker-compose.apps.yml |
| **Specialist Type** | code |
| **Purpose** | Docker Compose patterns — multi-service development, networking, volumes |
| **Activation Trigger** | files: docker-compose*; keywords: dockerCompose, services, volumes, networks |

---

## Role

You are a **NestJS Docker Compose Specialist**. You supply patterns for Docker Compose configuration in NestJS microservice projects — infrastructure services (DB, Redis, RabbitMQ), app service definitions, networking, volume mounts, health checks, and multi-file compose organization.

**Used by**: Any code agent configuring local development environment for NestJS
**Not used by**: Production deployments (use K8s), non-Docker environments

---

## Patterns

### Pattern 244.1: Infrastructure Services

**Category**: Compose Fundamentals
**Description**: PostgreSQL, Redis, RabbitMQ for NestJS microservices.

```yaml
# docker-compose.infra.yml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dev_password}
      POSTGRES_DB: lending_dev
    ports: ['5432:5432']
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U app']
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD:-dev_redis}
    ports: ['6379:6379']
    healthcheck:
      test: ['CMD', 'redis-cli', '-a', '${REDIS_PASSWORD:-dev_redis}', 'ping']
      interval: 5s
      timeout: 3s

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: app
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-dev_rabbit}
    ports:
      - '5672:5672'   # AMQP
      - '15672:15672' # Management UI
    healthcheck:
      test: ['CMD', 'rabbitmq-diagnostics', '-q', 'ping']
      interval: 10s
      timeout: 5s

volumes:
  postgres_data:
```

**Key Points**:
- Alpine images for smaller download/disk usage
- Health checks on ALL infrastructure — apps should `depends_on` with `condition: service_healthy`
- Persistent volume for DB — survive `docker compose down`
- Default passwords via `${VAR:-default}` — dev convenience, NEVER in production

---

### Pattern 244.2: App Services with Hot Reload

**Category**: Compose Fundamentals
**Description**: NestJS app containers with source code mount for development.

```yaml
# docker-compose.apps.yml
services:
  lending-service:
    build:
      context: .
      dockerfile: apps/lending-service/Dockerfile.dev
    volumes:
      - ./apps/lending-service/src:/app/apps/lending-service/src
      - ./libs:/app/libs
    ports: ['3001:3000', '50051:50051']
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      REDIS_HOST: redis
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      rabbitmq: { condition: service_healthy }

  auth-service:
    build:
      context: .
      dockerfile: apps/auth-service/Dockerfile.dev
    volumes:
      - ./apps/auth-service/src:/app/apps/auth-service/src
      - ./libs:/app/libs
    ports: ['3002:3000']
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
```

---

### Pattern 244.3: Multi-File Compose Organization

**Category**: Organization
**Description**: Split compose files by concern — infrastructure, apps, tools.

```bash
# Base infrastructure
docker compose -f docker-compose.infra.yml up -d

# Apps (depends on infra)
docker compose -f docker-compose.infra.yml -f docker-compose.apps.yml up -d

# Full stack (shortcut)
docker compose -f docker-compose.yml up -d
# docker-compose.yml includes both via `include:` directive (Compose v2.20+)
```

```yaml
# docker-compose.yml (orchestrator)
include:
  - docker-compose.infra.yml
  - docker-compose.apps.yml
```

---

### Pattern 244.4: Networking

**Category**: Advanced
**Description**: Custom network for service discovery by container name.

```yaml
services:
  lending-service:
    networks: [backend]
  auth-service:
    networks: [backend]
  postgres:
    networks: [backend]

networks:
  backend:
    driver: bridge
```

**Key Points**:
- Services on same network resolve by container name: `postgres`, `redis`
- No need for localhost — use service name as hostname
- Isolate frontend/backend networks if needed

---

### Pattern 244.5: Development Dockerfile

**Category**: Build
**Description**: Dev Dockerfile with hot reload support.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "nx", "serve", "lending-service", "--watch"]
```

---

## Best Practices

### Organization
- Split: infra.yml (DB, Redis, MQ) + apps.yml (NestJS services) + tools.yml (monitoring)
- Use Compose profiles for optional services: `--profile monitoring`
- Document `docker compose up` commands in README or Makefile

### Data Persistence
- Named volumes for databases — data survives container recreation
- Bind mounts for source code — enables hot reload in development
- `.dockerignore`: node_modules, dist, .git, .env (not needed in build context)

### Health & Dependencies
- Health checks on ALL infrastructure services
- `depends_on` with `condition: service_healthy` — never `service_started`
- Retry logic in app startup — even with healthy check, connection may need retries

---

## Abnormal Case Patterns

1. **Port conflict** — Host port already in use. Fix: change host port mapping or use dynamic ports.
2. **Volume permission denied** — Linux UID mismatch. Fix: set `user: "1000:1000"` in compose.
3. **App starts before DB** — `depends_on` without health condition. Fix: add `condition: service_healthy`.
4. **Stale container** — Old image used. Fix: `docker compose build --no-cache` or `docker compose up --build`.
5. **Network unreachable** — Service uses `localhost` instead of container name. Fix: use service name as hostname.
6. **Disk full** — Old volumes accumulate. Fix: `docker system prune --volumes` periodically.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (244.1-244.5)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Docker Compose Specialist — DevOps | EPS v3.2*

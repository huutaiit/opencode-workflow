# NestJS Docker Deployment Specialist — Infrastructure
# NestJS Dockerデプロイメントスペシャリスト — インフラストラクチャ
# Chuyen Gia Trien Khai Docker NestJS — Ha Tang

**Version**: 1.0.0
**Technology**: Docker + Docker Compose for NestJS
**Aspect**: Container Deployment
**Category**: infrastructure
**Purpose**: Knowledge provider for Docker deployment — multi-stage builds, compose orchestration, health checks, container networking, environment configuration

---

## Metadata

```json
{
  "id": "nestjs-docker-deployment-specialist",
  "technology": "Docker + Docker Compose for NestJS",
  "aspect": "Container Deployment",
  "category": "infrastructure",
  "subcategory": "nestjs",
  "lines": 220,
  "token_cost": 1300,
  "version": "1.0.0",
  "evidence": [
    "E1: Docker multi-stage build — minimize image size, separate build/runtime",
    "E2: Compose orchestration — per-service containers with health checks",
    "E5: p2plend deployment — real-world Docker setup for NestJS microservices"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 224.1–224.8 |
| **Directory Pattern** | N/A (Docker configuration, not NestJS source) |
| **Naming Convention** | `Dockerfile`, `Dockerfile.{service}`, `docker-compose.{purpose}.yml` |
| **Imports From** | Infrastructure only (container config, networking) |
| **Imported By** | None (deployment artifacts — consumed by container runtime) |
| **Cannot Import** | Domain, Application, Presentation (Docker config is deployment, not application code) |
| **Dependencies** | none (Dockerfile config) |
| **When To Use** | Docker multi-stage build for NestJS production images |
| **Source Skeleton** | Dockerfile, .dockerignore |
| **Specialist Type** | code |
| **Purpose** | Docker deployment — multi-stage builds, Docker Compose, production optimization |
| **Activation Trigger** | files: **/Dockerfile, **/docker-compose*; keywords: docker, dockerfile, compose, container |

---

## Role

You are a **NestJS Docker Deployment Specialist**. Your responsibility is to provide Docker containerization best practices for NestJS microservice projects following clean architecture. You supply patterns for multi-stage builds, compose orchestration, health checks, networking, environment management, and volume configuration.

**Used by**: Any code agent working with Docker deployment of NestJS services
**Not used by**: Serverless deployments (Lambda, Cloud Functions), bare-metal installs

---

## Patterns

### Pattern 224.1–224.4: Container Fundamentals (HIGH)

```
224.1 Multi-stage Dockerfile: Build stage (node:alpine + build) -> Production stage (node:alpine + dist).
      Separate build dependencies from runtime to minimize image size.
```

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

```
224.2 Docker Compose services: Per-service container with depends_on and health checks.
      Each microservice is an independent container with explicit dependency ordering.
```

```yaml
services:
  loan-service:
    build: { context: ., dockerfile: Dockerfile.loan }
    ports: ["3001:3000"]
    depends_on:
      postgres: { condition: service_healthy }
      rabbitmq: { condition: service_healthy }
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/loans
```

```
224.3 Infrastructure compose: Separate file for PostgreSQL, Redis, RabbitMQ.
      Keep infrastructure services in docker-compose.infra.yml, app services in docker-compose.yml.
```

```yaml
# docker-compose.infra.yml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: p2plend, POSTGRES_PASSWORD: secret }
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports: ["5672:5672", "15672:15672"]
```

```
224.4 Health checks: HEALTHCHECK CMD for container-level liveness probing.
      Docker health checks enable depends_on condition: service_healthy.
```

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Pattern 224.5–224.8: Networking & Configuration (MEDIUM-HIGH)

```
224.5 Container networking: Bridge network for inter-service communication.
      Services on the same Docker network communicate by service name as hostname.
```

```yaml
networks:
  p2plend-net:
    driver: bridge
services:
  loan-service:
    networks: [p2plend-net]
  user-service:
    networks: [p2plend-net]
```

```
224.6 Environment config: docker-compose.override.yml for local dev overrides.
      Override file auto-merged by Docker Compose — keep dev-specific volumes and ports.
```

```yaml
# docker-compose.override.yml (local dev only, gitignored)
services:
  loan-service:
    volumes: ["./apps/loan-service/src:/app/src"]
    environment: { NODE_ENV: development, DEBUG: "true" }
    command: ["npm", "run", "start:dev"]
```

```
224.7 Volume mounts: Named volumes for database persistence, bind mounts for dev.
      Named volumes survive container recreation; bind mounts enable hot-reload.
```

```yaml
volumes:
  pg-data:
services:
  postgres:
    volumes: ["pg-data:/var/lib/postgresql/data"]
```

```
224.8 Build args: ARG for configurable base images and build-time variables.
      Use ARG for values needed at build time, ENV for runtime configuration.
```

```dockerfile
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS builder
ARG APP_NAME=loan-service
COPY apps/${APP_NAME} ./apps/${APP_NAME}
RUN npx nx build ${APP_NAME} --prod
```

---

## Best Practices

### Image Design
- Use multi-stage builds — builder stage for compilation, production stage with only runtime artifacts
- Pin base image versions (e.g., `node:20.11-alpine3.19`) instead of `node:20-alpine` to ensure reproducible builds
- Copy `package.json` and `package-lock.json` first, run `npm ci`, then copy source — maximizes Docker layer cache efficiency
- Use `.dockerignore` to exclude `node_modules`, `.git`, `dist`, test files, and documentation from build context

### Security
- Run the application as a non-root user — create a dedicated user with `adduser` and switch with `USER` directive
- Never store secrets in the image — use runtime environment variables, Docker secrets, or external vault
- Scan images for vulnerabilities in CI using `trivy` or `docker scout` before pushing to registry
- Remove build tools, compilers, and dev dependencies from the final production stage

### Health Checks
- Define `HEALTHCHECK` in Dockerfile for standalone deployments; use probe configuration for Kubernetes
- Use lightweight health check commands (`wget -q --spider`) that are available in alpine images without extra installs
- Set appropriate `--interval`, `--timeout`, and `--retries` values to avoid premature restarts during slow startups
- Use `--start-period` to give the NestJS application time to initialize before health checks begin

### Multi-Stage Optimization
- Use `npm ci --only=production` in the production stage to exclude dev dependencies
- Copy only the `dist/` output and `node_modules/` from builder to production stage
- Set `NODE_ENV=production` in the production stage to optimize runtime behavior and exclude dev-only code paths
- Use `ARG` for build-time variables (app name, version) and `ENV` for runtime configuration

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Running as root | Container compromise gives root access to host kernel exploits | Add `RUN adduser -D appuser` and `USER appuser` before `CMD` |
| No `.dockerignore` | Build context includes `node_modules`, `.git`, secrets — slow builds, security risk | Create `.dockerignore` with `node_modules`, `.git`, `.env`, `*.md`, `test/` |
| No `HEALTHCHECK` instruction | Orchestrator cannot detect unhealthy container; no automatic restart | Add `HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost:3000/health` |
| Using `latest` tag | Non-reproducible builds; different base image on each build | Pin exact version: `node:20.11.1-alpine3.19` |
| Dev dependencies in production image | Bloated image size, larger attack surface, slower pulls | Use `npm ci --only=production` or multi-stage build that only copies production deps |
| `COPY . .` before `npm ci` | Every source change invalidates npm install cache layer | Copy `package*.json` first, run `npm ci`, then `COPY . .` |

## Testing Patterns

### Test Image Build
```typescript
describe('Docker Image', () => {
  it('should build successfully', async () => {
    const { exitCode } = await exec('docker build -t test-app:ci .');
    expect(exitCode).toBe(0);
  });

  it('should have expected image size under 200MB', async () => {
    const { stdout } = await exec("docker image inspect test-app:ci --format='{{.Size}}'");
    expect(parseInt(stdout)).toBeLessThan(200 * 1024 * 1024);
  });
});
```

### Test Health Endpoint
```typescript
it('should return healthy after container starts', async () => {
  const { stdout } = await exec('docker run -d --name test-health -p 3099:3000 test-app:ci');
  await waitForHealthy('http://localhost:3099/health', 30000);
  const response = await fetch('http://localhost:3099/health');
  expect(response.status).toBe(200);
  await exec('docker rm -f test-health');
});
```

### Test Non-Root User
```typescript
it('should run as non-root user', async () => {
  const { stdout } = await exec('docker run --rm test-app:ci whoami');
  expect(stdout.trim()).not.toBe('root');
});
```

---

## Abnormal Case Patterns (8 patterns)

1. **Container OOM killed** — NestJS process exceeds container memory limit. Fix: Set `--max-old-space-size` in NODE_OPTIONS, configure appropriate memory limits in compose.

2. **Health check always failing** — Curl not available in production alpine image. Fix: Use `wget -q --spider` instead of curl, or install curl in Dockerfile.

3. **Service cannot resolve hostname** — Container started before dependency is healthy. Fix: Use `depends_on` with `condition: service_healthy` instead of bare `depends_on`.

4. **Build cache invalidated on every change** — COPY . . before npm install invalidates npm cache. Fix: Copy package*.json first, run npm ci, then COPY source files.

5. **Image too large (>500MB)** — Production image includes build tools, dev dependencies, source maps, and test files. Fix: Use multi-stage build; copy only `dist/` and production `node_modules/` to final stage; verify with `docker image ls` and `dive` tool.

6. **Environment variables baked into image** — Secrets or config hardcoded via `ENV` in Dockerfile, visible in image layers. Fix: Pass all configuration via runtime environment variables (`docker run -e` or compose `environment:`); use `.env` files only for local development, never `COPY .env`.

7. **Timezone mismatch** — Container uses UTC but application expects local timezone, causing incorrect scheduling and log timestamps. Fix: Set `TZ` environment variable at runtime; install `tzdata` in alpine if needed; prefer storing all timestamps in UTC and converting at display layer.

8. **SIGTERM not handled (signal forwarding)** — Container receives SIGTERM on stop but Node.js process does not shut down gracefully; connections are dropped mid-request. Fix: Use `exec` form of CMD (`CMD ["node", "dist/main"]` not `CMD node dist/main`); implement `app.enableShutdownHooks()` in NestJS bootstrap; handle `SIGTERM` to close DB connections and drain requests.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (224.1-224.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Docker Deployment Specialist — Infrastructure | EPS v3.2*

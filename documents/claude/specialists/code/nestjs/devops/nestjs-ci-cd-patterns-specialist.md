# NestJS CI/CD Patterns Specialist — DevOps
# NestJS CI/CDパターンスペシャリスト — DevOps
# Chuyen Gia CI/CD NestJS — DevOps

**Version**: 1.0.0
**Technology**: NestJS 10+ CI/CD with GitHub Actions, GitLab CI
**Aspect**: CI/CD Patterns
**Category**: devops
**Purpose**: Knowledge provider for NestJS CI/CD pipelines — build, test, lint, Docker image, deployment, Nx affected commands, environment promotion

---

## Metadata

```json
{
  "id": "nestjs-ci-cd-patterns-specialist",
  "technology": "NestJS 10+ CI/CD",
  "aspect": "CI/CD Patterns",
  "category": "devops",
  "subcategory": "nestjs",
  "lines": 380,
  "token_cost": 2300,
  "version": "1.0.0",
  "evidence": [
    "E1: GitHub Actions — workflow YAML, job matrix, caching, artifacts",
    "E2: Nx monorepo CI — affected commands, distributed task execution",
    "E3: Docker multi-stage — build optimized NestJS images in CI"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (DevOps) |
| **Variant** | ALL |
| **Pattern Numbers** | 242.1–242.8 |
| **Directory Pattern** | N/A (CI/CD pipeline configuration) |
| **Naming Convention** | `ci.yml`, `cd.yml`, `Dockerfile`, `Dockerfile.ci` |
| **Dependencies** | none (CI/CD pipeline config) |
| **When To Use** | GitHub Actions / GitLab CI pipeline for NestJS |
| **Source Skeleton** | .github/workflows/ci.yml, .github/workflows/cd.yml |
| **Specialist Type** | code |
| **Purpose** | CI/CD patterns — GitHub Actions, GitLab CI, build/test/deploy pipelines |
| **Activation Trigger** | files: .github/workflows/**, .gitlab-ci.yml; keywords: cicd, pipeline, deploy, build |

---

## Role

You are a **NestJS CI/CD Patterns Specialist**. You supply patterns for continuous integration and deployment of NestJS microservices — pipeline structure, Nx affected builds, Docker image creation, test execution, lint enforcement, environment promotion, and rollback strategies.

**Used by**: Any code agent setting up or maintaining CI/CD for NestJS projects
**Not used by**: Non-NestJS stacks, projects without automated pipelines

---

## Patterns

### Pattern 242.1: GitHub Actions CI Pipeline

**Category**: CI Fundamentals
**Description**: Standard CI workflow for NestJS with lint, test, build stages.

```yaml
name: CI
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env: { POSTGRES_DB: test, POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx nx affected --target=lint --base=origin/main
      - run: npx nx affected --target=test --base=origin/main --coverage
      - run: npx nx affected --target=build --base=origin/main
```

**Key Points**:
- `fetch-depth: 0` required for Nx affected to compare with base branch
- Service containers (postgres, redis) for integration tests
- `npm ci` (not `npm install`) for deterministic, fast installs
- Nx affected runs only changed projects — saves time in monorepo

---

### Pattern 242.2: Nx Affected Commands

**Category**: CI Fundamentals
**Description**: Run only what changed — critical for monorepo efficiency.

```bash
# Lint only affected projects
npx nx affected --target=lint --base=origin/main

# Test only affected projects with coverage
npx nx affected --target=test --base=origin/main --coverage

# Build only affected projects
npx nx affected --target=build --base=origin/main

# E2E test only affected
npx nx affected --target=e2e --base=origin/main

# List affected projects (useful for conditional deploy)
npx nx print-affected --base=origin/main --select=projects
```

**Key Points**:
- `--base=origin/main` compares current branch against main
- For PRs: `--base=${{ github.event.pull_request.base.sha }}`
- Dramatically reduces CI time: 10 projects, 1 changed = only 1 tested

---

### Pattern 242.3: Docker Multi-Stage Build

**Category**: Build Patterns
**Description**: Optimized Docker image for NestJS microservice.

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && cp -R node_modules prod_modules
RUN npm ci
COPY . .
RUN npx nx build lending-service --prod

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/prod_modules ./node_modules
COPY --from=builder /app/dist/apps/lending-service ./dist
USER appuser
EXPOSE 3000
HEALTHCHECK CMD wget -q --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

**Key Points**:
- Two-stage: build (full deps) → production (only prod deps + dist)
- Non-root user for security
- HEALTHCHECK for container orchestration
- Alpine base for minimal image size (~150MB vs ~900MB)

---

### Pattern 242.4: Environment Promotion

**Category**: CD Patterns
**Description**: Promote same image through dev → staging → production.

```yaml
deploy:
  strategy:
    matrix:
      include:
        - env: staging
          cluster: staging-cluster
          approval: false
        - env: production
          cluster: prod-cluster
          approval: true

  steps:
    - name: Deploy to ${{ matrix.env }}
      if: ${{ !matrix.approval || github.event.inputs.confirm == 'true' }}
      run: |
        kubectl set image deployment/$SERVICE $SERVICE=$IMAGE:$TAG \
          --namespace=${{ matrix.env }} \
          --context=${{ matrix.cluster }}
        kubectl rollout status deployment/$SERVICE --timeout=300s
```

**Key Points**:
- Same Docker image promoted — never rebuild per environment
- Environment config via K8s ConfigMap/Secret — not baked into image
- Production requires manual approval gate
- Rollout status check — fail pipeline if deployment hangs

---

### Pattern 242.5: Rollback Strategy

**Category**: CD Patterns
**Description**: Automated rollback on deployment failure.

```yaml
- name: Deploy
  run: kubectl set image deployment/$SERVICE $SERVICE=$IMAGE:$TAG
- name: Verify deployment
  run: |
    if ! kubectl rollout status deployment/$SERVICE --timeout=300s; then
      echo "Deployment failed — rolling back"
      kubectl rollout undo deployment/$SERVICE
      exit 1
    fi
- name: Run smoke tests
  run: |
    ENDPOINT=$(kubectl get svc $SERVICE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    curl -f "$ENDPOINT/health" || (kubectl rollout undo deployment/$SERVICE && exit 1)
```

---

### Pattern 242.6: Caching in CI

**Category**: Performance
**Description**: Cache node_modules, Nx cache, Docker layers for faster builds.

```yaml
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.npm
      .nx/cache
    key: ${{ runner.os }}-nx-${{ hashFiles('package-lock.json') }}
    restore-keys: ${{ runner.os }}-nx-
```

---

## Best Practices

### Pipeline Structure
- CI: lint → test → build (fail fast — lint first, cheapest check)
- CD: build image → push → deploy staging → smoke test → deploy prod
- Use Nx affected for monorepo — never build all 10 services on 1 change

### Security
- Never store secrets in workflow files — use GitHub Secrets / Vault
- Scan Docker images for vulnerabilities (Trivy, Snyk)
- Pin action versions: `actions/checkout@v4`, not `@latest`

### Performance
- Cache aggressively: node_modules, Nx cache, Docker layers
- Parallel jobs where possible (lint + test in parallel, build after)
- Use `npm ci` not `npm install` — 2-3x faster, deterministic

---

## Testing Patterns

```yaml
# Run tests with coverage and upload
- run: npx nx affected --target=test --base=origin/main --coverage
- uses: codecov/codecov-action@v4
  with: { files: coverage/lcov.info }
```

---

## Abnormal Case Patterns

1. **Nx affected runs everything** — fetch-depth: 1 (default). Fix: `fetch-depth: 0` for full history.
2. **Flaky tests in CI** — DB not ready when tests start. Fix: service container healthcheck.
3. **Docker build OOM** — Large node_modules. Fix: `.dockerignore` + multi-stage build.
4. **Secret leak in logs** — env var printed. Fix: mask secrets in workflow, never echo.
5. **Cache poisoning** — Stale cache breaks build. Fix: include lockfile hash in cache key.
6. **Deploy without tests** — CD pipeline skips CI. Fix: require CI check pass before deploy.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (242.1-242.6), no overlap?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS CI/CD Patterns Specialist — DevOps | EPS v3.2*

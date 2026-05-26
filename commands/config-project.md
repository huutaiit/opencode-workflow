---
description: Auto-detect project tech stack from build files and create project configuration
agent: orchestrator
subtask: true
---

# CONFIG-PROJECT Command — Tech Stack Detection

Auto-detect project technology stack and create configuration.

## Input

$ARGUMENTS

Parse optional flags:
- `--force` — Overwrite existing config
- `--interactive` — Force interactive mode even if detection is confident

## Step 1: Scan Build Files

### Backend Detection

Scan for build files and detect:

| File | Detected Stack |
|------|----------------|
| `pom.xml` | Java/Spring Boot (detect version) |
| `build.gradle` | Java/Gradle (detect version) |
| `package.json` + `nest/cli` | TypeScript/NestJS |
| `package.json` + `express` | Node.js/Express |
| `pyproject.toml` | Python/FastAPI or Django |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `composer.json` | PHP/Laravel |

### Frontend Detection

| File/Package | Detected Stack |
|------|----------------|
| `next.config.*` | Next.js (detect version) |
| `react` in package.json | React (detect version) |
| `vue` in package.json | Vue.js |
| `angular.json` | Angular |
| `svelte.config.*` | Svelte |

### Infrastructure Detection

| File | Detected |
|------|----------|
| `docker-compose*.yml` | Docker Compose (scan services) |
| `k8s/**/*.yaml` | Kubernetes |
| `Dockerfile` | Docker |
| `.github/workflows/**` | GitHub Actions |

## Step 2: Build Configuration

Collect detected information:
```json
{
  "stackKey": "java-springboot-nextjs",
  "backend": {
    "framework": "spring-boot",
    "version": "3.x.x",
    "language": "java",
    "javaVersion": "21",
    "orm": "R2DBC",
    "webStack": "WebFlux"
  },
  "frontend": {
    "framework": "nextjs",
    "version": "16.x.x",
    "uiLibrary": "antd",
    "stateManagement": "redux-toolkit"
  },
  "infrastructure": {
    "database": "postgresql:17",
    "cache": "redis:7.4",
    "search": "elasticsearch:8.17",
    "queue": "kafka:3.9",
    "auth": "keycloak:26.x"
  }
}
```

## Step 3: Confirm & Write

- Display detected configuration
- Ask for confirmation if not `--force`
- Write to `.opencode/config/project-config.json`

## Step 4: Register Stack Specialists

Based on detected stack, register available specialist patterns.

## Output

| File | Path | Purpose |
|------|------|---------|
| `project-config.json` | `.opencode/config/` | Tech stack configuration, read by all commands |

## State Impact

No state change (setup command — run once per project).

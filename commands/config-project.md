---
description: Auto-detect project tech stack from build files and create project configuration
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
- On user confirm (`yes`/`ok`): write to `.opencode/config/project-config.json`
- On `edit`: let user adjust fields interactively
- On `cancel`: abort with no changes

## Step 4: Confirm Save & Complete

After writing the file:
- Display a brief summary of what was configured
- Report the file path saved
- **STOP immediately** — do NOT continue, do NOT suggest follow-ups, do NOT ask questions

## Output

| File | Path | Purpose |
|------|------|---------|
| `project-config.json` | `.opencode/config/` | Tech stack configuration, read by all commands |

## State Impact

No state change (setup command — run once per project).

## Critical: Completion Behavior

This is a **standalone setup command**. After completing the steps above:
1. Report the result in 1-2 sentences
2. **Stop immediately**
3. Do NOT suggest next steps or ask "anything else"

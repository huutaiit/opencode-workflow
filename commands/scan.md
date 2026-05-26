---
description: Scan source code — index, analyze, and extract module information for RAG
agent: orchestrator
subtask: true
---

# SCAN Command — Source Code Analysis

Index and analyze source code modules for context-aware RAG and codebase understanding.

## Usage

```
/scan --module <moduleId>     # Scan specific module
/scan --all                   # Scan all modules
/scan --path <dir>            # Scan directory recursively
/scan --type <backend|frontend|infra>  # Filter by type
```

## Input

$ARGUMENTS

Parse arguments:
- `--module <code>` — Module code to scan (e.g., cmn001000)
- `--all` — Scan all discovered modules
- `--path <dir>` — Specific directory path
- `--type <type>` — Filter: backend, frontend, infra

If no flags, ask user interactively.

## Step 1: Detect Project Structure

Scan project root for:
- `pom.xml`, `build.gradle` → Java backend
- `package.json` with framework hints → Node/TS frontend/backend
- `pyproject.toml` → Python
- `Dockerfile`, `docker-compose*.yml` → Infrastructure

Identify source directories:
- Backend: `src/main/java/`, `src/`, `app/`
- Frontend: `src/app/`, `src/components/`, `pages/`
- Config: `config/`, `.env*`, `docker-compose*.yml`

## Step 2: Extract Module Information

For each identified module:
- List all source files
- Extract imports/dependencies
- Identify entities, services, controllers
- Map API endpoints (if applicable)
- Identify test files and coverage

## Step 3: Build Module Registry

Write `.opencode/config/module-registry.json`:
```json
{
  "modules": [
    {
      "code": "cmn001000",
      "name": "customer",
      "type": "backend",
      "path": "backend/src/main/java/.../cmn001000/",
      "entities": ["CmnMCustomer"],
      "services": ["CustomerService"],
      "handlers": ["CustomerHandler"],
      "routers": ["CustomerRouter"],
      "testFiles": ["CustomerServiceTest.java"]
    }
  ]
}
```

## Output

```
Scan complete:
  Modules found: 5
  Backend: 3 modules (42 files, 8 test files)
  Frontend: 2 modules (18 files, 5 test files)

Module registry saved to: .opencode/config/module-registry.json
```

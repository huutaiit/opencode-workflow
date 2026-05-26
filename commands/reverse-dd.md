---
description: Reverse engineer existing code into Detail Design documents
agent: orchestrator
subtask: true
---

# REVERSE-DD Command — Reverse Engineering to Detail Design

Generate Detail Design documents from existing source code.

## Input

$ARGUMENTS

Parse arguments:
- `--module <code>` — Module code to reverse engineer (e.g., cmn001000)
- `--path <path>` — Source directory path (e.g., `backend/src/main/java/.../`)
- `--output <path>` — Output path (default: `documents/features/`)

If no flags, ask user interactively:
- Which module/files to analyze?
- Output location?
- Include API contracts? (yes/no)

## Step 1: Scan Source Code

### Backend Analysis
- Scan entity files → extract field definitions, constraints
- Scan repository files → extract query methods, patterns
- Scan service files → extract business logic methods
- Scan handler files → extract request handling patterns
- Scan router files → extract endpoint definitions

### Frontend Analysis
- Scan component files → extract props, state, effects
- Scan page files → extract layout, routing
- Scan API client files → extract endpoint calls, data flow

## Step 2: Build Detail Design

From scanned code, reconstruct:

### Backend Detail Design (BDD)
```
## §1 Entity & DAO
[CmnMCustomer — fields, types, constraints extracted from entity]

## §2 Repository
[Query methods extracted from repository]

## §3 Service
[Business logic methods extracted from service]

## §4 Handler
[Request handling methods extracted from handler]

## §5 Router
[Endpoint routing extracted from router]

## §6-10 [Pattern-based sections]
```

### Frontend Detail Design (FDD)
```
## Screen Layouts
[Components extracted from page files]

## Component Hierarchy
[Parent-child relationships from imports]
```

### API Contracts
Extract from handler + router code:
- Method: POST/GET/PUT/DELETE
- Path: extracted from router annotations
- Request body: extracted from handler params
- Response: extracted from return types

## Step 3: Validate & Write

- Compare extracted design against existing patterns
- Flag any deviations from project conventions
- Write output files

## Output Files

| File | Description |
|------|-------------|
| `{module}-backend-detail-design.md` | Reverse engineered BDD |
| `{module}-frontend-detail-design.md` | Reverse engineered FDD |
| `{module}-api-contracts.md` | Reverse engineered API contracts |

All written to `documents/features/{FEATURE}-{name}/`

## State Impact

No state change (standalone utility — does not affect workflow state).
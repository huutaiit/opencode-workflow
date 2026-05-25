---
description: Create Detail Design — FDD, BDD, and API Contracts
agent: orchestrator
subtask: true
---

# Design Detail — Detail Design Router

Create implementation-ready detail design: Frontend Detail Design, Backend Detail Design, API Contracts.

## Pre-checks
- State: BD_CREATED
- Quality Gate D3: design docs complete

## Pipeline

```
detail.md (router)
  → design/detail/fdd.md          # Frontend Detail Design
  → design/detail/bdd.md          # Backend Detail Design
  → design/detail/api-contract.md # API contracts
```

### FDD — Frontend Detail Design
10 sections:
1. Screen Layouts
2. Component Hierarchy
3. State Management
4. API Integration
5. Form Validations
6. Error Handling
7. Routing/Navigation
8. Localization
9. Accessibility
10. Performance

### BDD — Backend Detail Design
10 mandatory sections:
1. Entity & DAO
2. Repository
3. Service
4. Handler/Controller
5. Router/Endpoint
6. Unit Tests
7. Integration Tests
8. Error Handling
9. Security
10. Performance

### API Contracts
Extract from BDD sections:
- Method, path, auth requirements
- Request/response schemas
- Error codes and HTTP status mapping

## Output Files
| File | Path |
|------|------|
| Frontend Detail Design | `documents/features/{FEATURE}/{feature}-frontend-detail-design.md` |
| Backend Detail Design | `documents/features/{FEATURE}/{feature}-backend-detail-design.md` |
| API Contracts | `documents/features/{FEATURE}/{feature}-api-contracts.md` |

## State
`DD_CREATED`

## Next Step
After design review passes: run `/plan`

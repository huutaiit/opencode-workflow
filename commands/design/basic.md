---
description: Create Basic Design — architecture, components, dataflow, data model
agent: orchestrator
subtask: true
---

# Design Basic — Architecture Design

Create Basic Design document focusing on WHAT components and their interactions.

## Pre-checks
- State: INNOVATE_TECHNICAL or ARCH_VERIFIED
- Quality Gate D2: decisions approved

## Sections (C1-C6, sequential)

### C1: Architecture Overview
- Architecture pattern (Hexagonal, Clean, Layered, etc.)
- Technology stack with versions
- Layer diagram (ASCII)

### C2: Component Design
| Component | Layer | Responsibility |
|-----------|-------|----------------|
| ... | ... | ... |

### C3: Data Flow
- Request/response flows
- Key sequence descriptions
- Integration points

### C4: Data Model (High-level)
- Entity relationships (no SQL DDL)
- Key data structures

### C5: State Diagram
- State transitions for key entities
- Workflow states

### C6: NFR Design
- How each NFR is implemented architecturally
- Performance, security, scalability approach

## Prohibited in BD (must go in DD)
- ❌ Detailed sequence diagrams
- ❌ API specs, method signatures
- ❌ Database schemas, SQL
- ❌ Implementation details

## Output
`documents/features/{FEATURE}/{feature}-basic-design.md`

## State
`BD_CREATED`

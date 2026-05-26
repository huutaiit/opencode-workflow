---
description: Create Software Requirements Specification — 7-section structured document
agent: orchestrator
subtask: true
---

# Design SRS — Software Requirements Specification

Create a complete SRS document focusing on WHAT/WHY, not implementation details.

## Pre-checks
- State must be INNOVATE_SRS or ARCH_VERIFIED
- Quality Gate D1: evidence sections ≥ 2 sources each

## Sections (sequential, with checkpoint after each)

| # | Section | Source |
|---|---------|--------|
| S0 | Document Info | Feature metadata, version, status |
| S1 | Overview | Feature scope, stakeholders, business context |
| S2 | Functional Requirements | FR-XXX IDs, priority, evidence links |
| S3 | Non-Functional Requirements | NFR-XXX IDs, category, targets |
| S4 | User Stories | US-[ROLE]-XXX format |
| S5 | Acceptance Criteria | Per US/FR acceptance conditions |
| S6 | Constraints | Technical, business, regulatory |

## Quality Rules
- Vietnamese ≥ 60% if project requires bilingual docs
- FR/NFR/US IDs must be unique
- NO source code, SQL, API paths, architecture patterns
- Each requirement must link to evidence source

## Final Validation
1. Language validator (bilingual ratio)
2. ID uniqueness check
3. Evidence cross-reference check
4. Prohibited content scan

## Output
`documents/features/{FEATURE}/{feature}-srs.md`

## State
`SRS_CREATED`

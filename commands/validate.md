---
description: Phase 6 — Three-pass validation of implementation against design documents
agent: orchestrator
subtask: true
---

# VALIDATE Command — Three-Pass Validation

Validate implementation quality against design documents.

## EXECUTION CONSTRAINTS
- **SEQUENTIAL** — Validate one file/dimension at a time
- **FOUR-PASS** — Pass 1 → Pass 2 → Pass 3 (sequential)
- **CHECKPOINT** — Each file checkpointed before next

## Input

$ARGUMENTS

## Pre-checks
- State must be EXECUTED
- Run tests first (Quality Gate G3)

## Pass 1: Per-File Validation (weight: 40%)

For each changed file:

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| Naming | 20% | Follows specialist metadata conventions |
| Patterns | 30% | Follows specialist patterns |
| Architecture | 25% | No layer violations, correct imports |
| Plan Compliance | 25% | File in plan allowedFiles |

For each file:
1. Load specialist for file type
2. Score 4 dimensions
3. Checkpoint per file

## Pass 2: Dimension Quality Gates (weight: 20%)

### Architecture Analyzer
- Cross-file dependency check
- Circular dependency detection
- Layer violation check

### Plan Compliance
- Files: matches plan Section 0.1 (40%)
- Methods: matches plan Section 0.2 (40%)
- Test files: test files exist for each step (20%)

## Pass 3: Code Review (weight: 40%)

Load `validate/code-review.md` for:
- R1: Business Logic vs BD/evidence
- R2: API Contract vs api-contracts.md
- R3: Edge Cases vs DD pseudo/evidence
- R4: Abnormal Cases vs Plan Section 3.1
- R5: Specialist pattern depth review

## Scoring

| Pass | Weight |
|------|--------|
| Pass 1 | 40% |
| Pass 2 | 20% |
| Pass 3 | 40% |

Threshold: ≥ 90% → VALIDATED
< 90% → stays EXECUTED, display violations

## Output
`.opencode/memory-bank/{branch}/{FEATURE}-{dev}/validation-report.md`

## State
`EXECUTED → VALIDATED (if ≥90%)`

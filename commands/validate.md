---
description: Phase 6 — Three-pass validation of implementation against design documents
agent: orchestrator
subtask: true
---

# VALIDATE Command — Three-Pass Validation

Validate implementation quality against design documents.

## Memory Bank Path Convention

Memory bank path: `.opencode/memory-bank/{branch}/{FEATURE}-{developer}/`

Derive from git metadata:
- `BRANCH` = `git branch --show-current`
- `DEVELOPER` = `git config user.name` (lowercase, spaces → hyphens)
- `FEATURE` = From context.md
- `MEMORY_DIR` = `.opencode/memory-bank/{BRANCH}/{FEATURE}-{DEVELOPER}/`

## EXECUTION CONSTRAINTS

- **SEQUENTIAL** — Validate one file/dimension at a time
- **THREE-PASS** — Pass 1 → Pass 2 → Pass 3 (sequential)
- **CHECKPOINT** — Each pass checkpointed before next
- **REPORT** — Write validation-report.md with scores

## Input

$ARGUMENTS

## Pre-checks

- State must be EXECUTED
- Quality Gate G3: run tests before validation

## Pass 1: Per-File Validation (weight: 40%)

Load `validate/per-file.md`:
- For each changed file, score 4 dimensions
- Naming Convention (20%)
- Pattern Compliance (30%)
- Architecture Rules (25%)
- Plan Compliance (25%)

**Average Pass 1 Score**: Average of all per-file scores

## Pass 2: Dimension Quality Gates (weight: 20%)

Load `validate/dimensions.md`:
- Architecture Analyzer: cross-file deps, circular deps, layer violations
- Plan Compliance: files(40%) + methods(40%) + test files(20%)

**Pass 2 Score**: 50% × Architecture + 50% × Plan Compliance

## Pass 3: Code Review (weight: 40%)

Load `validate/code-review.md`:
- R1: Business Logic vs BD/evidence (25%)
- R2: API Contract vs api-contracts.md (25%)
- R3: Edge Cases vs DD pseudo/evidence (20%)
- R4: Abnormal Cases vs Plan Section 3.1 (15%)
- R5: Specialist pattern depth review (15%)

**Pass 3 Score**: Weighted average of R1-R5 scores

## Scoring Engine

```
Aggregate Score = 40% × Pass1 + 20% × Pass2 + 40% × Pass3
```

**Threshold**: ≥ 90% → PASS (VALIDATED)
&lt; 90% → FAIL (stays EXECUTED)

**Fallback** (when Pass 3 not available):
```
Aggregate Score = 60% × Pass1 + 40% × Pass2
```

## Validation Report

Write `validation-report.md` to MEMORY_DIR:

```markdown
# Validation Report: {FEATURE}

| Property | Value |
|----------|-------|
| Feature | {FEATURE} |
| Date | {timestamp} |
| Pass 1 Score | XX% |
| Pass 2 Score | XX% |
| Pass 3 Score | XX% |
| Aggregate Score | XX% |
| Threshold | 90% |
| Result | ✅ PASS / ❌ FAIL |

## Pass 1: Per-File Validation (weight: 40%)
| File | Naming(20%) | Patterns(30%) | Arch(25%) | Plan(25%) | Total |
|------|-------------|---------------|-----------|-----------|-------|
| ... | XX | XX | XX | XX | XX% |

**Average**: XX%

## Pass 2: Dimension Gates (weight: 20%)
| Dimension | Score |
|-----------|-------|
| Architecture | XX% |
| Plan Compliance | XX% |

## Pass 3: Code Review (weight: 40%)
| Dimension | Score | Findings |
|-----------|-------|----------|
| R1 Business Logic | XX% | 0 |
| R2 API Contracts | XX% | 0 |
| R3 Edge Cases | XX% | 0 |
| R4 Abnormal Cases | XX% | 0 |
| R5 Specialist | XX% | 0 |

## Issues Found
### [R3] WARNING — Edge Case
**File**: path/to/file.java
**Issue**: Missing null check for input parameter
**Fix**: Add validation before processing
```

## State Transition

```
EXECUTED → VALIDATED (if ≥90%)
EXECUTED → stays EXECUTED (if <90%) — display violations, user chooses fix strategy
```

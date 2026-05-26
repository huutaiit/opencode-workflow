---
description: Review plan quality across 5 dimensions with scoring; auto-runs after /plan
agent: orchestrator
subtask: true
---

# PLAN-REVIEW Command — Plan Quality Review

Review implementation plan quality across 5 dimensions.

## Auto-run

This command runs automatically after `/plan` completes.
Also run manually: `/plan-review` or via `$ARGUMENTS`.

## Input

$ARGUMENTS

## Step 1: Load Plan

Read plan from memory bank:
- `PLANS_DIR` = `.opencode/memory-bank/{branch}/{FEATURE}-{developer}/plans/`
- Load `{feature}-implementation-plan.md` (or master + sub-plans)

## Step 2: Score 5 Dimensions

Score each dimension 0-100:

### Dimension 1: Plan Clarity (weight: 20%)
Is each step unambiguous?
- [ ] Steps have clear titles and descriptions (20 pts)
- [ ] Each step states which files to modify (20 pts)
- [ ] Each step states which methods to add/change (20 pts)
- [ ] Acceptance criteria defined per step (20 pts)
- [ ] Dependencies between steps documented (20 pts)

### Dimension 2: Completeness (weight: 25%)
Are all required sections present?
- [ ] Plan Boundaries (files + methods) (20 pts)
- [ ] Implementation Steps with patterns (25 pts)
- [ ] Validation Checklist (15 pts)
- [ ] Test Plan per step (25 pts)
- [ ] Coverage targets defined (15 pts)

### Dimension 3: Feasibility (weight: 20%)
Can the plan be implemented as described?
- [ ] Step granularity appropriate (20 pts)
- [ ] No missing prerequisites (20 pts)
- [ ] Patterns match existing codebase (25 pts)
- [ ] File paths are valid (20 pts)
- [ ] Dependencies are correctly ordered (15 pts)

### Dimension 4: Risk Assessment (weight: 20%)
Are risks identified and mitigated?
- [ ] Known unknowns documented (25 pts)
- [ ] Complex steps have de-risk strategy (25 pts)
- [ ] Rollback plan mentioned (25 pts)
- [ ] Test strategy covers abnormal cases (25 pts)

### Dimension 5: Testability (weight: 15%)
Can the plan be validated?
- [ ] Per-step test cases defined (30 pts)
- [ ] Abnormal test cases ≥ 40% of total (30 pts)
- [ ] Coverage targets specified (20 pts)
- [ ] Test files listed (20 pts)

## Step 3: Calculate Aggregate Score

```
Score = 20% × D1 + 25% × D2 + 20% × D3 + 20% × D4 + 15% × D5
```

## Step 4: Display Results

```
╔══════════════════════════════════════════════════════╗
║              Plan Review Report                       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  D1 Clarity:      XX/100 (weight: 20%)              ║
║  D2 Completeness: XX/100 (weight: 25%)              ║
║  D3 Feasibility:  XX/100 (weight: 20%)              ║
║  D4 Risk:         XX/100 (weight: 20%)              ║
║  D5 Testability:  XX/100 (weight: 15%)              ║
║                                                      ║
║  Aggregate Score:  XX%                               ║
║  Threshold:        95%                               ║
║  Result:           ✅ PASS / ❌ NEEDS OPTIMIZE       ║
║                                                      ║
║  Issues Found:                                       ║
║  - [Dim X] Issue description                         ║
║  - [Dim Y] Issue description                         ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

## Step 5: Next Action

| Score | Action |
|-------|--------|
| ≥ 95% | ✅ Pass. Update state: `PLAN_REVIEWED`. Auto-chain: `/execute` |
| < 95% | ❌ Needs optimize. Update state: stays `PLAN_CREATED`. Suggest `/plan-optimize` |

## State Transition

```
PLAN_CREATED → PLAN_REVIEWED (if ≥95%)
```

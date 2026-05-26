---
description: Optimize plan when plan-review score < 95%; iterative improvement with max 3 attempts
agent: orchestrator
subtask: true
---

# PLAN-OPTIMIZE Command — Plan Optimization

Optimize plan quality when plan-review score is below 95%.

## Trigger

Auto-triggered when `/plan-review` score < 95%.
Max 3 optimization attempts.

## Input

$ARGUMENTS

## Step 1: Load Previous Review

Read previous plan-review report from memory:
- `MEMORY_DIR` = `.opencode/memory-bank/{branch}/{FEATURE}-{developer}/`
- Load latest plan-review scores and issues

## Step 2: Track Attempt Number

- Read `optimization-attempt` from context.md decisions log
- If not exists, start at attempt 1
- If already ≥ 3, stop and inform user

## Step 3: Identify Low-Scoring Dimensions

From review report, identify dimensions below threshold:
- D1 Clarity < 80%: Add more detail, examples, acceptance criteria
- D2 Completeness < 85%: Add missing sections
- D3 Feasibility < 80%: Break down large steps, add prerequisites
- D4 Risk < 80%: Document risks, add rollback steps
- D5 Testability < 80%: Add test cases, increase abnormal ratio

## Step 4: Optimize Plan

For each low-scoring dimension:
1. Re-read the relevant plan sections
2. Apply targeted improvements:
   - Add missing detail
   - Clarify ambiguous steps
   - Add test cases
   - Document risks
3. Rewrite the plan file

## Step 5: Re-run Plan Review

After optimization:
1. Re-score all 5 dimensions
2. Calculate new aggregate score

## Step 6: Decision

```
Optimization Attempt: {N}/3

Previous Score: XX%
New Score:      YY%
Improvement:    +ZZ%

Result:
  ≥ 95% → ✅ Pass. State: PLAN_REVIEWED. Auto-chain: /execute
  < 95% + attempts < 3 → 🔄 Optimize again
  < 95% + attempts ≥ 3 → ⛔ Stop. Display remaining issues.
```

## Step 7: Update Context

Write optimization attempt log to context.md decisions log.

## State Machine

```
PLAN_CREATED → PLAN_REVIEWED (if ≥95%, attempts ≤ 3)
            → stays PLAN_CREATED (if <95%, attempts = 3 → human intervention)
```

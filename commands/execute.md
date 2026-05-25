---
description: Phase 5 — Implement approved plan with boundary enforcement and checkpoint resume
agent: orchestrator
subtask: true
---

# EXECUTE Command — Implementation Engine

Implement code strictly following the approved plan. Sequential only, boundary-enforced.

## EXECUTION CONSTRAINTS
- **SEQUENTIAL ONLY** — One step at a time, NO parallel agents
- **CHECKPOINT REQUIRED** — Each step must be checkpointed before next
- **BOUNDARY ENFORCEMENT** — Only modify files in plan's allowedFiles

## Input

$ARGUMENTS

## Architecture: Thin Router + Micro-Commands

```
execute.md (router)
  → execute/pre-gates.md     # Stack load, state validation, confidence check
  → execute/plan-loading.md  # Load plan, boundaries, checkpoint restore
  → execute/step-runner.md   # Per-step execution loop
  → execute/finalize.md      # Feedback, verify-all, state update
  → RETURN → auto-chain /validate
```

## Phase 1: Pre-Gates

Load `execute/pre-gates.md`:
- Stack context loading
- State validation (expected: PLAN_REVIEWED)
- Quality Gate G0: confidence check

## Phase 2: Plan Loading

Load `execute/plan-loading.md`:
- Load plan file from memory bank
- Extract boundaries (allowedFiles + allowedMethods)
- Multi-sub-plan: resolve current SP
- Checkpoint restore if previously interrupted

## Phase 3: Step Runner

Load `execute/step-runner.md`:
- Per-step execution loop
- Each step: load specialist → generate code → write/edit → checkpoint
- Boundary enforcement before each write

## Phase 4: Finalize

Load `execute/finalize.md`:
- Verify all checkpoints complete
- Update execution-state.json
- State: EXECUTED

## Auto-chain

After execute completes, auto-chain:
```
/validate → /test (human-in-loop confirm)
```

## State Transition
```
PLAN_REVIEWED → EXECUTED
```

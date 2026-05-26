---
description: Save plan to memory bank and update workflow state
agent: orchestrator
subtask: true
---

# Plan Save & Display

Write plan files and update state.

## Steps

### 5. Write Plan Files
- Write implementation plan to `.opencode/memory-bank/{branch}/{FEATURE}-{dev}/plans/`
- If auto-split: write master plan + sub-plans

### 6. Update State
Set `context.md` state: `PLAN_CREATED`
Add decisions log entry for planning.

### 7. Display Summary
Show user:
- Number of steps
- Files to modify (count)
- Estimated complexity
- Plan file location

## Auto-chain Trigger

After save, automatically run plan review:
- Check plan quality against 5 dimensions
- Score ≥ 95%: auto-chain to `/execute`
- Score < 95%: optimize plan (max 3 attempts)

---
description: Finalize execution — verify all steps, update state, trigger validation
agent: orchestrator
subtask: true
---

# Execute Finalize

Complete execution phase and prepare for validation.

## Steps

### 5 Verify All Steps
- Confirm all plan steps are marked completed
- Verify all checkpoints have passed
- Check for any incomplete steps

### 5.5 Update Execution State
Write final `execution-state.json`:
- `executionComplete: true`
- Summary of files created/modified
- Test run status (if any)

### 6 Update Context
Set `context.md` state: `EXECUTED`
Add execution summary to decisions log.

### 7 Auto-chain Validation
After finalize, load `validate.md` to start validation automatically.

State: `EXECUTED → auto /validate → ≥90% VALIDATED`

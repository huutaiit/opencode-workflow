---
description: Finalize execution — verify all steps, update state, trigger validation
agent: orchestrator
subtask: true
---

# Execute Finalize

Complete execution phase and prepare for validation.

## Steps

### 5 Verify All Steps (Checkpoint Audit)
- Confirm all plan steps have lock files in `{CHECKPOINT_DIR}/`
- Verify all lock files have status = "completed"
- Cross-check lock files vs execution-state.json step list
- Validate all files from plan Section 0.1 were created/modified
- Check for any incomplete steps — if found, prompt user to resume or skip
- Display summary: `✅ {N}/{TOTAL} steps completed`

### 5.5 Update Execution State (Final)
Write final `execution-state.json`:
```json
{
  "feature": "{FEATURE}",
  "plan": "plans/{feature}-implementation-plan.md",
  "lastCompletedStep": {TOTAL},
  "totalSteps": {TOTAL},
  "steps": [/* all steps with completed status */],
  "executionComplete": true,
  "testRun": null,
  "completedAt": "{timestamp}",
  "filesCreated": ["path/to/file1.java", "..."],
  "filesModified": ["path/to/file2.ts", "..."],
  "totalFiles": {N}
}
```

### 6 Update Context
Set `context.md` state: `EXECUTED`
Add execution summary to decisions log.

### 7 Auto-chain Validation
After finalize, load `validate.md` to start validation automatically.

State: `EXECUTED → auto /validate → ≥90% VALIDATED`

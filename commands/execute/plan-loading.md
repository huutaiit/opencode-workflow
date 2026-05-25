---
description: Load plan, extract boundaries, restore checkpoint if interrupted
agent: orchestrator
subtask: true
---

# Execute Plan Loading

Load the approved plan into execution context.

## Steps

### 1 Load Plan File
Read from memory bank:
- `plans/{feature}-implementation-plan.md`
- Or `plans/{feature}-master-plan.md` + `plans/SP-{n}-{title}.md` (auto-split)

### 1.5 Extract Boundaries
Parse plan Section 0:
- `allowedFiles`: the complete list of files to create/modify
- `allowedMethods`: methods permitted to change
- `dependencies`: step ordering

### 1.6 Multi-Sub-Plan Resolution
If auto-split plan:
- Read master plan index
- Load only the current sub-plan
- Track progress across sub-plans

### 1.7 Checkpoint Restore
Check `execution-checkpoints/execution-state.json`:
- If exists: resume from last completed step
- If not: start from step 0

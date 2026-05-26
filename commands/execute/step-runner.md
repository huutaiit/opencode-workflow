---
description: Per-step execution loop with boundary enforcement and checkpointing
agent: orchestrator
subtask: true
---

# Execute Step Runner

Execute each plan step sequentially with strict enforcement.

## Per-Step Loop

For each step in the plan:

### 3.A Checkpoint Check (Dual-Layer)
Checkpoint directory: `{MEMORY_DIR}/execution-checkpoints/`

**Layer 1 — Design Checkpoint** (step-level):
- Each step has a lock file: `step-{N}-{step-name}.lock`
- If lock exists AND status in execution-state.json = "completed": skip step
- If lock exists BUT status = "in-progress": resume step
- If no lock: step not started

**Layer 2 — Execution State** (file-level):
- Track each file created/modified per step
- Track each method implemented per step
- Allows micro-resume within a step if interrupted mid-file

### 3.B Context Loading
- Load graph context (related files, imports)
- Understand how this step fits with completed steps

### 3.C Specialist Loading
- Load relevant specialist patterns for the file type
- Frontend: React/Ant Design patterns
- Backend: Spring Boot/FastAPI patterns
- Test: Testing framework conventions

### 3.D Mark In-Progress
Update TodoWrite for this step.

### 3.E Generate Code
Generate code INLINE based on:
- Plan step description
- Design doc references (FDD section, BDD section)
- Codebase patterns
- Specialist guidance

### 3.F Boundary Check (CRITICAL)
BEFORE writing any file, verify:
- File path is in plan's `allowedFiles`
- Methods are in plan's `allowedMethods`
- If DEVIATION detected: STOP, display to user, ask for guidance

### 3.G Write/Edit Files
Write or edit files with generated code.

### 3.H Write Tests
If plan specifies test cases for this step:
- Generate test code
- Write test files

### 3.I Save Dual-Layer Checkpoint

**Layer 1**: Create/update design checkpoint lock:
```
{CHECKPOINT_DIR}/step-{N}-{step-name}.lock
```
Content: step index, status, timestamp, files modified.

**Layer 2**: Update `execution-state.json`:
```json
{
  "lastCompletedStep": {N},
  "totalSteps": {TOTAL},
  "steps": [
    {"index": {N}, "status": "completed",
     "files": ["path/to/file1.java", "path/to/file2.ts"],
     "methods": ["methodName()", "ClassName"],
     "checkpointTime": "{timestamp}"}
  ],
  "executionComplete": false,
  "subPlanProgress": null
}
```

### 3.J Mark Complete
Update TodoWrite for this step.

Proceed to next step (sequential).

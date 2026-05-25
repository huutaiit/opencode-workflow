---
description: Per-step execution loop with boundary enforcement and checkpointing
agent: orchestrator
subtask: true
---

# Execute Step Runner

Execute each plan step sequentially with strict enforcement.

## Per-Step Loop

For each step in the plan:

### 3.A Checkpoint Check
- If step already completed (from execution-state.json): skip
- If step is in-progress from previous run: resume

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

### 3.I Save Checkpoint
Update `execution-state.json`:
- Step index and status
- Files created/modified
- Methods implemented

### 3.J Mark Complete
Update TodoWrite for this step.

Proceed to next step (sequential).

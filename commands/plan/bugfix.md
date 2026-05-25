---
description: Lightweight bugfix plan — root cause analysis to fix steps
agent: orchestrator
subtask: true
---

# Plan Bugfix

Evidence-based bugfix planning.

## Steps

### 1. Load Bug Context
- Read `evidence.md` sections tagged `[SCOPE:FIX]`
- Load error logs or bug report

### 2. Root Cause → Fix Mapping
For each root cause identified:
- What needs to change
- File and method affected
- Risk assessment

### 3. Generate Bugfix Plan
Compact plan format:
- Files to modify (table)
- Changes per file
- Test cases to add
- Regression check

### 4. Save & Display
Write plan to memory bank.
State: PLAN_CREATED

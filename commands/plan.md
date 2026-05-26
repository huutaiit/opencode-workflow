---
description: Phase 4 — Create implementation plan from design documents with auto-split for large plans
agent: orchestrator
subtask: true
---

# PLAN Command — Implementation Plan Generator

Create detailed implementation plan from design documents. Strict sequential execution.

## Memory Bank Path Convention

Memory bank path: `.opencode/memory-bank/{branch}/{FEATURE}-{developer}/`

Derive from git metadata:
- `BRANCH` = `git branch --show-current`
- `DEVELOPER` = `git config user.name` (lowercase, spaces → hyphens)
- `FEATURE` = From context.md (feature ID)
- `MEMORY_DIR` = `.opencode/memory-bank/{BRANCH}/{FEATURE}-{DEVELOPER}/`
- `PLANS_DIR` = `{MEMORY_DIR}/plans/`

## EXECUTION CONSTRAINTS
- **INLINE only** — NO parallel Task agents for plan generation
- **SEQUENTIAL** — One step at a time
- **NO background execution**

## Input

$ARGUMENTS

Optional: `--persona <name>` to adjust plan perspectives

## Step 0: Detect State & Task Type

Check `context.md`:
- Expected state: BD_DD_CREATED
- Detect task type from context: new/feature, bugfix, enhancement

## Step 1: Route by Task Type

### feature/new → Load `plan/feature-workflow.md`
Standard 5-step feature planning:
1. State validation + Gate D4
2. Context loading (RAG + evidence + specialists)
3. Document loading (design docs)
4. Plan generation
5. Save + display

### bugfix → Load `plan/bugfix.md`
Lightweight bugfix plan:
1. Bug context from evidence.md
2. Root cause → fix steps
3. Save + display

### enhancement → Load `plan/enhancement.md`
Enhancement delta planning:
1. Impact analysis
2. Delta plan generation
3. Save + display

## Step 2: Generate Plan

Plan structure:
```
## 0. Plan Boundaries
### 0.1 Files to Modify (table)
### 0.2 Methods to Change (table)
### 0.3 Dependencies Between Steps

## 1. Implementation Steps
### Step N: Title
- Architecture Reference
- Files
- Methods
- Implementation guidance

## 2. Validation Checklist

## 3. Test Plan
### 3.1 Per-Step Test Cases
### 3.2 Coverage Targets
### 3.3 Test File List
```

### Auto-split
If plan exceeds 600 lines:
1. Create master plan index
2. Split into sub-plans (SP-01, SP-02, ...)
3. Each sub-plan < 15% context window

## Step 3: Save & Update

Write plan to memory bank.
Update `context.md` state: `PLAN_CREATED`

## Auto-chain
After plan saved, run `/plan-review`:
- Score ≥ 95%: continue
- Score < 95%: optimize (max 3 attempts)
- Then auto-chain to `/execute`

## Output
`.opencode/memory-bank/{branch}/{FEATURE}-{dev}/plans/{feature}-implementation-plan.md`

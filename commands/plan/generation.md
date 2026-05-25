---
description: Plan generation — create implementation steps from design docs
agent: orchestrator
subtask: true
---

# Plan Generation

Generate implementation plan INLINE from design documents.

## Step 4: Generate Monolithic Plan

Read design docs (FDD, BDD, API contracts) and generate plan sections:

### Section 0: Plan Boundaries
```
### 0.1 Files to Modify
| # | File | Lines | Action | Layer |
|---|------|-------|--------|-------|
| 1 | path/to/file.java | NEW | CREATE | domain |

### 0.2 Methods to Change
| # | File | Method | Action | Pattern |
|---|------|--------|--------|---------|

### 0.3 Dependencies
| Step | Depends On | Reason |
|------|-----------|--------|
```

### Section 1: Implementation Steps
Each step includes:
- Architecture reference (pattern, layer)
- Files to create/modify
- Methods with signatures
- Implementation guidance
- Acceptance criteria

### Section 3: Test Plan
- Per-step test cases (NORMAL + ABNORMAL)
- Coverage targets
- Test file listing

## Step 4.5: Auto-split (if > 600 lines)

### Pass 1: Create Master Plan
- Overview
- SP list with descriptions
- Shared context and definitions

### Pass 2: Create Sub-plans (SEQUENTIAL)
Each sub-plan:
- SP-{n}-{title}.md
- Contains related implementation steps
- < 15% of context window

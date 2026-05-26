---
description: Feature workflow — validate state, load context, generate plan, save
agent: orchestrator
subtask: true
---

# Plan Feature Workflow

Standard planning workflow for new features.

## Steps

### 1. State Validation
- Check context.md state = BD_DD_CREATED
- Quality Gate D4: all design docs exist
- If FAIL: display missing docs, stop

### 2. Context Loading
Load into context:
- RAG patterns from codebase analysis
- Evidence from `evidence.md`
- Design docs: SRS, BD, FDD, BDD, API contracts
- Specialist patterns for each layer

### 3. Document Loading
- Load SRS for requirements
- Load BD for architecture decisions
- Load FDD/BDD for implementation details
- Load API contracts for endpoint specs

### 4. Plan Generation
Generate monolithic plan INLINE following plan.md format.
If > 600 lines, auto-split.

### 5. Save & Display
Write plan to memory bank.
Update state: PLAN_CREATED
Display plan summary to user.

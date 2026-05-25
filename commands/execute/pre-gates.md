---
description: Pre-execution gates — validate state, stack context, confidence
agent: orchestrator
subtask: true
---

# Execute Pre-Gates

Validate everything before starting execution.

## Steps

### 0.5 Stack Context Loading
- Detect project stack (Java, Node.js, Python, etc.)
- Load stack-specific patterns and conventions
- Identify framework versions and constraints

### 0.6 State Validation
- Context state must be PLAN_REVIEWED
- If state = PLAN_CREATED: run plan-review first
- If state ≠ PLAN_REVIEWED: display error and stop

### 0.7 Quality Gate G0: Confidence Check
- Evaluate confidence in implementation plan
- 4 dimensions:
  - Plan clarity: Is each step unambiguous?
  - Design completeness: Are all design docs available?
  - Pattern fit: Does codebase support the approach?
  - Risk assessment: Are there known unknowns?
- Threshold: ≥ 90%
- If < 90%: display concerns, request user clarification

### 0.8 Environment Check
- Verify required tools are available (git, node, maven, etc.)
- Check that working directory is clean (no uncommitted changes that might conflict)

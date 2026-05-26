---
description: Pass 1 validation — per-file scoring across 4 dimensions
agent: orchestrator
subtask: true
---

# Validate Per-File — Pass 1

Validate each changed file across 4 dimensions.

## Pre-conditions

Load from execution-state.json or git diff:
- List of files created/modified during execute
- Plan Section 0 (boundaries)

## Per-File Loop

For each changed file, score 4 dimensions:

### Dimension 1: Naming Convention (weight: 20%)

| Criteria | Points |
|----------|--------|
| Class/function name follows codebase convention | 40 |
| Variable names are descriptive | 25 |
| File name matches class/component name | 20 |
| Package/import path follows convention | 15 |

### Dimension 2: Pattern Compliance (weight: 30%)

| Criteria | Points |
|----------|--------|
| Follows codebase pattern for this layer | 35 |
| Uses correct base classes/interfaces | 25 |
| Follows error handling pattern | 20 |
| Uses dependency injection pattern (if applicable) | 20 |

### Dimension 3: Architecture Rules (weight: 25%)

| Criteria | Points |
|----------|--------|
| No layer violations (e.g., Service calling another Service directly) | 40 |
| Imports respect dependency direction | 30 |
| No circular dependencies | 30 |

### Dimension 4: Plan Compliance (weight: 25%)

| Criteria | Points |
|----------|--------|
| File is in plan Section 0.1 allowedFiles | 50 |
| Methods match plan Section 0.2 allowedMethods | 30 |
| Test file exists if plan requires it (per plan Section 3.3) | 20 |

## Per-File Score

```
File Score = 20% × NamingScore + 30% × PatternScore + 25% × ArchScore + 25% × PlanScore
```

Record each file score for aggregation.

## Output

Per-file results table:
```
| File | Naming(20%) | Patterns(30%) | Arch(25%) | Plan(25%) | Total |
|------|-------------|---------------|-----------|-----------|-------|
| src/.../Service.java | 95 | 88 | 100 | 100 | 95% |
```

## Checkpoint

Save per-file scores to checkpoint for resume in case of interruption.

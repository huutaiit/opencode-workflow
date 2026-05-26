---
description: Pass 2 validation — cross-file architecture analyzer and plan compliance gate
agent: orchestrator
subtask: true
---

# Validate Dimensions — Pass 2

Cross-file architectural analysis and plan compliance verification.

## Dimension 1: Architecture Analyzer (weight: 50% of Pass 2)

### Cross-File Dependencies
Analyze all changed files together:
- Load all source files from changed file list
- Parse import/require statements
- Build dependency graph

### Checks

| Check | Max Score | Description |
|-------|-----------|-------------|
| No circular deps | 30 | No A→B→A dependency cycles |
| Layer isolation | 25 | Each file only imports from allowed layers |
| Dependency direction | 25 | Dependencies flow correct direction (e.g., Service→Repository, not Repository→Service) |
| No orphan files | 20 | Every new file is referenced by at least one other file |

### Score Calculation
```
ArchScore = (circularDepsScore + layerIsolationScore + depDirectionScore + orphanScore) / 4
```

## Dimension 2: Plan Compliance Gate (weight: 50% of Pass 2)

### Files Check (weight: 40%)
```
FileScore = (filesInPlan / totalFilesCreated) × 100
```
- All files created must be in plan Section 0.1
- Any deviation → score deduction

### Methods Check (weight: 40%)
```
MethodScore = (methodsInPlan / totalMethodsCreated) × 100
```
- All methods added must be in plan Section 0.2
- Any extra method → score deduction

### Test Files Check (weight: 20%)
```
TestScore = (testFilesCreated / testFilesRequired) × 100
```
- Test files must exist for each step that requires them
- Missing test files → score deduction

## Pass 2 Score

```
Pass2 Score = 50% × ArchScore + 50% × PlanComplianceScore
```

## Output

```
╔══════════════════════════════════════════════════════╗
║           Pass 2 — Dimension Gates                   ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Architecture Analyzer (50%):                         ║
║    Circular Dependencies: XX/30                     ║
║    Layer Isolation:        XX/25                     ║
║    Dependency Direction:   XX/25                     ║
║    Orphan Files:           XX/20                     ║
║    Arch Score:             XX%                        ║
║                                                      ║
║  Plan Compliance (50%):                               ║
║    Files:                  XX% (weight: 40%)         ║
║    Methods:                XX% (weight: 40%)         ║
║    Test Files:             XX% (weight: 20%)         ║
║    Plan Score:             XX%                        ║
║                                                      ║
║  Pass 2 Total:            XX%                         ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---
description: Quality review for Detail Design — hard gates (binary) + soft scores (0-100)
agent: orchestrator
subtask: true
---

# DESIGN-REVIEW Command — Detail Design Quality Review

Multi-layer automated quality review for Detail Design documents.

## Auto-run

This command auto-runs after `/design --detail` completes.

## Input

$ARGUMENTS

## Step 1: Load Design Documents

Design docs from: `documents/features/{FEATURE}-{name}/`

Load:
- Frontend Detail Design (FDD)
- Backend Detail Design (BDD)
- API Contracts

## Step 2: Hard Gates (Binary PASS/FAIL)

### Gate 1: Structural Completeness
- [ ] FDD has all 10 sections: Screens, Components, State, API, Forms, Errors, Routing, i18n, A11y, Perf
- [ ] BDD has all 10 sections: Entity, Repository, Service, Handler, Router, Unit Tests, Integration Tests, Errors, Security, Performance
- [ ] API Contracts defined for all endpoints in BDD Router section

### Gate 2: Consistency
- [ ] Entity names match between FDD and BDD
- [ ] API paths/contracts consistent between FDD section 4 and BDD section 5
- [ ] Data types consistent across all documents

### Gate 3: Quality Baseline
- [ ] No implementation code in design docs (interfaces only)
- [ ] All referenced patterns exist in codebase
- [ ] Error handling strategy documented

**If ANY hard gate FAILS** → Block progress, display violations

## Step 3: Soft Scores (0-100)

### Score 1: Evidence Traceability (weight: 30%)
- [ ] Each design decision traces to evidence.md
- [ ] Each component traces to BD component list
- [ ] Each API endpoint traces to SRS functional requirement

### Score 2: Technical Accuracy (weight: 40%)
- [ ] Patterns match codebase conventions
- [ ] Technology versions match project-config
- [ ] Architecture rules followed (layer isolation, dependency direction)

### Score 3: Implementation Readiness (weight: 30%)
- [ ] Each section has enough detail for implementation
- [ ] Pseudo-code (if exists) is complete and actionable
- [ ] Test cases are specific and measurable

## Step 4: Calculate Results

```
Hard Gates:    PASS / FAIL (all must pass)
Soft Score:    XX% (weighted average of 3 scores)
Overall:       PASS if Hard Gates = ALL PASS
```

## Step 5: Display Report

```
╔══════════════════════════════════════════════════════╗
║           Design Review Report                        ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  HARD GATES:                                         ║
║    Gate 1 Completeness:  ✅ PASS / ❌ FAIL          ║
║    Gate 2 Consistency:   ✅ PASS / ❌ FAIL          ║
║    Gate 3 Baseline:      ✅ PASS / ❌ FAIL          ║
║                                                      ║
║  SOFT SCORES:                                        ║
║    S1 Evidence:      XX/100 (weight: 30%)           ║
║    S2 Accuracy:      XX/100 (weight: 40%)           ║
║    S3 Readiness:     XX/100 (weight: 30%)           ║
║    Weighted Score:   XX%                             ║
║                                                      ║
║  Overall: ✅ PASS / ❌ FAIL                          ║
║                                                      ║
║  Issues:                                             ║
║  - [Gate X] Issue description                        ║
║  - [Score Y] Improvement suggestion                  ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

## Step 6: Next Action

| Result | Action |
|--------|--------|
| ALL PASS | Design approved. Update evidence.md. State stays BD_DD_CREATED. Suggest: `/plan` |
| HARD GATE FAIL | Fix violations before proceeding |

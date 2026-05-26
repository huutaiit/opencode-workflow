---
description: Create Test Plan document with strategy, test cases, coverage targets
agent: orchestrator
subtask: true
---

# Design Test — Test Plan

Create a comprehensive Test Plan document for the feature.

## Pre-checks
- State: DD_CREATED
- BDD and FDD documents must exist

## Sections

### 1. Test Strategy
- Test levels (unit, integration, e2e)
- Testing tools and frameworks
- Environment requirements

### 2. Test Cases
Per-module test case outline:
| Test ID | Description | Type | Level | Expected |
|---------|-------------|------|-------|----------|
| T-001 | ... | NORMAL/ABNORMAL | unit | ... |

### 3. Coverage Targets
| Metric | Target |
|--------|--------|
| Line coverage | ≥ 80% |
| Branch coverage | ≥ 70% |
| Abnormal cases | ≥ 40% of total |

### 4. Test Data Requirements
- Fixtures and factories needed
- Test database setup

## Output
`documents/features/{FEATURE}/{feature}-test-plan.md`

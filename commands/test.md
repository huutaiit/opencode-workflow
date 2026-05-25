---
description: Run tests — scan, generate, validate, or run with coverage
agent: orchestrator
subtask: true
---

# TEST Command — EPS Test Framework

Run tests and generate quality reports.

## Usage

```
/test scan --module <moduleId>         # Analyze module source code
/test generate --module <moduleId>     # Generate test plan + test code
/test validate --module <moduleId>     # Compile + run + coverage
/test run                              # Run tests (plan-aware, post-validate)
/test scan --all                       # Scan all registered modules
```

## Input

$ARGUMENTS

Parse sub-command and flags:
- `scan` — Analyze source code structure and test gaps
- `generate` — Create test plan + test code from module
- `validate` — Compile, run tests, collect coverage
- `run` — Plan-aware test run (post-validate)

## Mode: Workflow-Aware Run (`/test run`)

### Pre-checks
- State must be VALIDATED
- Plan must exist in memory bank

### Phase 1: Load Plan + Test Context
- Load plan Section 3 (Test Plan)
- Verify test files exist
- Map test IDs (T1.1, T1.2, etc.) to implementation steps

### Phase 2: Compile & Run Tests
```
if pom.xml → mvn test
if package.json → npm test
if pyproject.toml → pytest
```

### Phase 3: Per-Case Mapping
Map test results to plan test cases by Test ID.

### Phase 4: Coverage Analysis
- Line/branch/method coverage
- Compare against plan targets

### Phase 5: Generate Report
Write `test-run-report.md`:
- Per-test-case results
- Coverage summary
- Quality analysis

### Phase 6: State Update
State: `TESTED`

## Output
`.opencode/memory-bank/{branch}/{FEATURE}-{dev}/test-run-report.md`

## State
`VALIDATED → TESTED`

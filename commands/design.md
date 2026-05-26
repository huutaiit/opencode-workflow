---
description: Phase 3 — Create structured design documents: SRS, Basic Design, Detail Design, Test Plan
agent: orchestrator
subtask: true
---

# DESIGN Command — Document Router

Create structured design documents following documentation-first development.

## Memory Bank Path Convention

Memory bank path: `.opencode/memory-bank/{branch}/{FEATURE}-{developer}/`

Derive from git metadata:
- `BRANCH` = `git branch --show-current`
- `DEVELOPER` = `git config user.name` (lowercase, spaces → hyphens)
- `FEATURE` = From context.md (feature ID)
- `MEMORY_DIR` = `.opencode/memory-bank/{BRANCH}/{FEATURE}-{DEVELOPER}/`

Design docs output: `documents/features/{FEATURE}-{name}/`

## Usage

```
/design --init      Initialize arch-ready workflow (skip research/innovate/SRS)
/design --srs       Create Software Requirements Specification
/design --basic     Create Basic Design (Architecture)
/design --detail    Create Detail Design + API Contracts
/design --test      Create Test Plan
```

## Step 1: Parse Option

Extract flag from arguments: `$ARGUMENTS`

Valid options: `--init`, `--srs`, `--basic`, `--detail`, `--test`

If invalid or missing, display usage error and stop.

## Step 2: Validate State

| Option | Expected State | Next State | Gate |
|--------|----------------|------------|------|
| `--init` | INITIAL | ARCH_VERIFIED | Arch-Ready |
| `--srs` | INNOVATE_SRS | SRS_CREATED | D1 |
| `--basic` | INNOVATE_TECHNICAL | BD_CREATED | D2 |
| `--detail` | BD_CREATED | DD_CREATED | D3 |
| `--test` | DD_CREATED | — | — |

If state invalid, display error and stop.

## Step 3: Route

### `--init` → Load `design/init.md`
Arch-Ready Mode entry point. Skip research/innovate/SRS.

### `--srs` → Load `design/srs.md`
Create SRS document with 7 sections.

### `--basic` → Load `design/basic.md`
Create Basic Design document with architecture, components, dataflow.

### `--detail` → Load `design/detail.md`
Create Detail Design (FDD + BDD + API Contracts).

### `--test` → Load `design/test.md`
Create Test Plan document.

## After Each Option

Update `context.md` state.
Update `evidence.md` with document summary.

## Output Location

```
documents/features/{FEATURE}-{name}/
├── {feature}-srs.md
├── {feature}-basic-design.md
├── {feature}-frontend-detail-design.md
├── {feature}-backend-detail-design.md
├── {feature}-api-contracts.md
└── {feature}-test-plan.md
```

# /design --init Workflow v1.0

> **PURPOSE**: Initialize arch-ready workflow context.
> Verify architecture prerequisites, create feature context,
> set workflowMode=arch-ready, and transition to ARCH_VERIFIED.
>
> This replaces `/research` as the entry point for projects
> with completed architecture docs (ADRs, feature dictionary, project-config).

---

## Command Syntax

```bash
/design --init --feature <FEATURE_ID> --type <new|enhancement> [--module <MODULE>]
```

**Required flags**:
- `--feature <FEATURE_ID>`: Feature identifier (e.g., CMN015, USR001)
- `--type <new|enhancement>`: Task type

**Optional flags**:
- `--module <MODULE>`: Module code (auto-detected from feature-dictionary if omitted)

---

## Step 1: Parse Arguments

Extract from `$ARGUMENTS`:

```
--feature → FEATURE_ID (required)
--type → TASK_TYPE (required: "new" or "enhancement")
--module → MODULE (optional)
```

**If missing required flags**: Display usage and STOP.

```
Usage: /design --init --feature <FEATURE_ID> --type <new|enhancement> [--module <MODULE>]

Example:
  /design --init --feature CMN015 --type new
  /design --init --feature USR001 --type enhancement --module USR
```

---

## Step 2: Verify Architecture Prerequisites

Run the arch-ready gate to check all 3 prerequisites:

```bash
node guards/gates/arch-ready-gate.js
```

Read the JSON output. Check `passed` field.

**If any prerequisite fails**:

Display detailed failure report:

```
Architecture Prerequisites Check FAILED

Results:
  P1 project-config:     [PASS/FAIL] — [message]
  P2 feature-dictionary:  [PASS/FAIL] — [message]
  P3 adr-decisions:       [PASS/FAIL] — [message]

Arch-ready workflow requires all 3 prerequisites.
Options:
  1. Complete missing architecture docs first (/architect)
  2. Use full workflow instead (/research → /innovate → /design)
```

STOP. Do NOT proceed.

**If all prerequisites pass**: Continue to Step 3.

---

## Step 3: Auto-detect Module (if not provided)

If `--module` was not provided, attempt to resolve from feature-dictionary:

```bash
node -e "
  const fd = JSON.parse(require('fs').readFileSync(
    require('path').join('.claude','config','feature-dictionary.json'), 'utf8'));
  const prefix = '$FEATURE_ID'.substring(0,3).toUpperCase();
  if (fd.modules && fd.modules[prefix]) {
    console.log(prefix);
  } else {
    console.log('UNKNOWN');
  }
"
```

If module resolved: use it. If UNKNOWN: ask user to provide `--module` flag.

---

## Step 4: Initialize Feature Context

Create workflow context using state-manager:

```bash
node core/state/state-manager.js init $FEATURE_ID --type $TASK_TYPE --module $MODULE
```

If context already exists: Display error and suggest using existing context or a different feature ID.

---

## Step 5: Set Workflow Mode to arch-ready

After context is created, update the context to set `workflowMode`:

Read the context.md file that was just created and add `Workflow Mode: arch-ready` to the metadata section.

Use the Edit tool to add the following line after "Task Type" in context.md:

```
- **Workflow Mode**: arch-ready
```

---

## Step 6: Load Architecture Context into Evidence

Create a lightweight evidence.md that references architecture docs instead of research output.

Read the following architecture docs and extract key information:

1. **project-config.json** — sourceRoots, modules, conventions, infrastructure
2. **feature-dictionary.json** — feature → service mapping for this feature
3. **ADR files** — technology decisions relevant to this feature

Write a summary into the context's `evidence.md`:

```markdown
# Evidence Report for: $FEATURE_ID

## 1. Metadata

- **Feature ID**: $FEATURE_ID
- **Type**: $TASK_TYPE
- **Module**: $MODULE
- **Source**: Architecture Documents (arch-ready mode)
- **Generated On**: [timestamp]

## 2. Architecture Context

### 2.1 Project Configuration
[Extract relevant sourceRoots, conventions from project-config.json]

### 2.2 Feature Mapping
[Extract feature → service mapping from feature-dictionary.json]

### 2.3 Technology Decisions (from ADRs)
[List relevant ADR decisions: framework, patterns, infrastructure choices]

## 3. Architecture Constraints
[Extract constraints from ADRs that apply to this feature]

## 4. Relevant Patterns
[Extract patterns from project-config conventions]
```

---

## Step 7: Update State to ARCH_VERIFIED

```bash
node core/state/state-manager.js update ARCH_VERIFIED
```

---

## Step 8: Display Summary

```
Architecture-Ready Workflow Initialized

Feature: $FEATURE_ID
Type: $TASK_TYPE
Module: $MODULE
Workflow Mode: arch-ready
State: ARCH_VERIFIED

Architecture Prerequisites:
  P1 project-config:     PASS
  P2 feature-dictionary:  PASS
  P3 adr-decisions:       PASS

Next step: /design --basic
(Will auto-chain from this command)

Workflow: /design --init → /design --basic → /design --detail → /plan → /execute
```

---

## State Transitions

| From | To | Condition |
|------|-----|-----------|
| INITIAL | ARCH_VERIFIED | All 3 prerequisites pass |

---

## Error Messages

**Missing arguments**:
```
Missing required flag: --feature
Usage: /design --init --feature <FEATURE_ID> --type <new|enhancement>
```

**Prerequisites failed**:
```
Architecture prerequisites not met. Cannot use arch-ready workflow.
Run /architect to complete architecture docs, or use /research for full workflow.
```

**Context already exists**:
```
Context already exists for feature $FEATURE_ID on branch $BRANCH.
Use existing context or choose a different feature ID.
```

---

*Design Init v1.0 — Arch-Ready Workflow Entry Point*
*EPS Framework v10.0*

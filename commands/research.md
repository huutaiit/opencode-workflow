---
description: Phase 1 — Unified knowledge base builder with evidence gathering, codebase survey, and domain research
agent: orchestrator
subtask: true
---

# RESEARCH Command — Knowledge Base Builder

Build comprehensive domain knowledge in a single run covering all scopes (SRS + BD + DD).

## Input

$ARGUMENTS

Parse arguments for:
- `--type new|enhancement|bugfix` — Task type (default: new)
- `--input <path>` — Requirement file path
- `--module <code>` — Module code

If no flags provided, ask user interactively.

## Step 0: Smart Onboarding

### 0.1 Check for Existing Context
Check if `.opencode/memory-bank/` has existing context for current feature:
- If state is `RESEARCHED` or beyond: display state and suggest next command
- If state is `INITIAL`: continue with research

### 0.2 Parse Input
- Read requirement file if `--input` is provided
- Interview user if no flags: task type, module, feature description

### 0.3 Create Context
Create `.opencode/memory-bank/{branch}/{FEATURE}-{dev}/context.md` with:
- Feature ID, Developer, Task Type, Module, Branch
- Current State: RESEARCH_IN_PROGRESS

## Step 1: Route by Task Type

### new (3 phases):
**Phase 1: Domain Knowledge Base**
- Research domain concepts, business rules, standard workflows
- Use WebFetch for external references
- Write `domain-knowledge.md`

**Phase 2: Codebase Analysis**
- Use Glob/Grep to explore existing codebase
- Identify patterns, existing entities, API structures
- Append findings to `evidence.md` with `[SCOPE:BD]` tags

**Phase 3: External References**
- Research best practices, similar implementations
- Append to `evidence.md` with `[SCOPE:SRS]`, `[SCOPE:DD]` tags

### enhancement (2 phases):
**Phase 1: Deep Codebase Scan**
- Focused analysis of affected modules
- Append to `evidence.md` with `[SCOPE:BD]`

**Phase 2: Impact Analysis**
- Trace dependencies, identify regression risks
- Append to `evidence.md` with `[SCOPE:DD]`

### bugfix (2 phases):
**Phase 1: Root Cause Analysis**
- Investigate bug report, trace error path
- Write findings with `[SCOPE:FIX]` tags

**Phase 2: Targeted Codebase Scan**
- Find similar issues, validate fix approach
- Append to `evidence.md`

## Step 2: Synthesize & Save

Validate evidence quality:
- Each section ≥ 2 evidence pieces with source citations
- Clear scope tags on all sections
- Structured, actionable format

Write final `evidence.md` to memory bank.

Update `context.md` state: `RESEARCHED`

## Output Files

| File | Location | Purpose |
|------|----------|---------|
| `context.md` | `.opencode/memory-bank/{branch}/{FEATURE}-{dev}/` | Central workflow state |
| `evidence.md` | Same | Structured evidence with [SCOPE:] tags |
| `domain-knowledge.md` | Same (new only) | Domain knowledge base |

## State Transition

```
INITIAL → RESEARCHED
```

## Quality Gate D1
After completion, verify:
- [ ] Evidence section ≥ 2 sources each
- [ ] Sources have citations
- [ ] Scope tags present for all sections
- [ ] Context.md state updated to RESEARCHED

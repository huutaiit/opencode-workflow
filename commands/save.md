---
description: Save conversation context to branch-aware memory bank with snapshot and decisions log
agent: orchestrator
subtask: true
---

# SAVE Command — Context Persistence

Save current conversation context to branch-aware memory bank.

## Input

$ARGUMENTS

Parse optional flags:
- `--tag <tag>` — Optional tag for the save (e.g., "post-research", "pre-execute")
- `--note <note>` — Optional note describing what was saved

## Step 1: Gather Metadata

Run git commands (read-only) to determine paths:
- `git config user.name` → Developer name
- `git branch --show-current` → Current branch
- `git rev-parse --show-toplevel` → Repo root
- `git log -1 --oneline` → Latest commit hash

Set paths:
- `BRANCH` = git branch name
- `DEVELOPER` = git user.name (lowercase, spaces → hyphens)
- `FEATURE` = from context.md (or prompt user if missing)
- `MEMORY_DIR` = `.opencode/memory-bank/{BRANCH}/{FEATURE}-{DEVELOPER}/`
- `SAVE_DIR` = `.opencode/memory-bank/{BRANCH}/saves/`

## Step 2: Read Current Context

If context.md exists in MEMORY_DIR:
- Read current state
- Read decisions log
- Read latest evidence summary

## Step 3: Create Snapshot

Create snapshot file at `{SAVE_DIR}/{timestamp}-save.md`:

```markdown
# Save Snapshot: {timestamp}

| Field | Value |
|-------|-------|
| Feature | {FEATURE} |
| Branch | {BRANCH} |
| Developer | {DEVELOPER} |
| State | {current_state} |
| Tag | {tag} |
| Note | {note} |
| Commit | {commit_hash} |

## Decisions Snapshot
{decisions_log_content}

## Context Summary
{summary_of_current_context}

## Key Artifacts
- context.md: {state}
- evidence.md: {exists/na}
- plan: {exists/na}
- design docs: {list}
```

## Step 4: Update Decisions Log

If context.md exists, prompt user to log key decisions made:
- Decision description
- Options considered
- Selected choice
- Rationale

Append to context.md decisions log.

## Step 5: Confirm

Display save confirmation:
```
✅ Saved to .opencode/memory-bank/{BRANCH}/saves/{timestamp}-save.md
   Branch: {BRANCH}
   State: {state}
   Tag: {tag || none}
```

## Memory Bank Structure

```
.opencode/memory-bank/
├── {branch}/
│   ├── {FEATURE}-{developer}/
│   │   ├── context.md
│   │   ├── evidence.md
│   │   ├── domain-knowledge.md (new features only)
│   │   ├── innovate-srs-selection.md
│   │   ├── innovate-technical-selection.md
│   │   ├── plans/
│   │   │   └── {feature}-implementation-plan.md
│   │   ├── execution-checkpoints/
│   │   │   └── execution-state.json
│   │   ├── validation-report.md
│   │   └── test-run-report.md
│   └── saves/
│       └── {timestamp}-save.md
└── {branch2}/...
```

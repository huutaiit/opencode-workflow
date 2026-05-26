---
description: Load saved context from branch-aware memory bank into conversation
agent: orchestrator
subtask: true
---

# RECALL Command — Context Restoration

Load previously saved context from memory bank into the current conversation.

## Input

$ARGUMENTS

Parse optional flags:
- `--tag <tag>` — Filter by tag
- `--list` — List available saves without loading
- `--latest` — Load most recent save

## Step 1: Gather Metadata

Run git commands (read-only):
- `git config user.name` → Developer name
- `git branch --show-current` → Current branch
- `git rev-parse --show-toplevel` → Repo root

Set paths:
- `BRANCH` = git branch name
- `DEVELOPER` = git user.name (lowercase, spaces → hyphens)
- `SAVE_DIR` = `.opencode/memory-bank/{BRANCH}/saves/`

## Step 2: List Available Saves

If `--list` is specified, display all saves:

```
Saves for branch '{BRANCH}':
  [1] 2026-03-30T10:00:00Z — tag: post-research — State: RESEARCHED
  [2] 2026-03-30T12:00:00Z — tag: pre-execute — State: PLAN_REVIEWED
```

If no saves found:
```
No saves found for branch '{BRANCH}'.
```

## Step 3: Select Save

If `--latest`:
- Select the most recent save

If no flags (or `--tag`):
- Display list of saves
- Ask user to select by number or tag
- Continue with selected save

## Step 4: Load Save

Read selected save file.

Display loaded context:

```
✅ Loaded save: {timestamp} — {tag}

| Field | Value |
|-------|-------|
| Feature | {FEATURE} |
| State | {state} |
| Branch | {BRANCH} |
| Note | {note} |

## Context Summary
{save_content_summary}

## Next Suggested Command
{based_on_state}
```

## State-Based Suggestions

| Loaded State | Suggested Next |
|--------------|----------------|
| RESEARCHED | `/innovate` |
| SRS_CREATED | `/innovate` (continues Part 2) |
| BD_DD_CREATED | `/plan` |
| PLAN_CREATED | Run `/plan-review` or wait for auto-chain |
| PLAN_REVIEWED | `/execute` |
| EXECUTED | `/validate` |
| VALIDATED | `/test run` |
| TESTED | Feature complete — commit changes |

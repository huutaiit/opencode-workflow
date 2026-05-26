---
description: List all features, contexts, and saves in the memory bank
---

# LIST Command — Memory Bank Index

List all features and saved contexts in the memory bank.

## Input

$ARGUMENTS

Parse optional flags:
- `--branch <name>` — Show only specific branch
- `--state <state>` — Filter features by state
- `--all` — Show full details

## Step 1: Gather Metadata

Run git commands:
- `git rev-parse --show-toplevel` → Repo root

Memory bank root: `.opencode/memory-bank/`

## Step 2: Scan Memory Bank

List all branches:
```
.opencode/memory-bank/
├── main/
│   ├── REQ-001-nguyen-van-a/ [RESEARCHED]
│   └── saves/
│       └── 2026-03-30T10:00:00Z-save.md
├── feature/cmn001-customer/
│   ├── REQ-002-tran-van-b/ [EXECUTED]
│   └── saves/
│       ├── 2026-03-29T08:00:00Z-save.md
│       └── 2026-03-30T09:00:00Z-save.md
└── feature/cmn002-category/
    └── (empty)
```

## Step 3: Display Summary

```
╔══════════════════════════════════════════════════════════╗
║                Memory Bank Index                         ║
╠══════════════════════════════════════════════════════════╣
║ Branch: main                                             ║
║  ├── REQ-001-nguyen-van-a → RESEARCHED (1 save)          ║
║                                                          ║
║ Branch: feature/cmn001-customer                          ║
║  ├── REQ-002-tran-van-b → EXECUTED (2 saves)             ║
║                                                          ║
║ Branch: feature/cmn002-category                          ║
║  └── (no active features)                                ║
╚══════════════════════════════════════════════════════════╝
```

## Step 4: Show Feature Details (with --all)

For each feature directory, show:
- State
- Task type
- Last modified date
- Number of saves
- Evidence present
- Plan present
- Design docs present

## State Color Key

| State | Symbol |
|-------|--------|
| RESEARCHED | 🔍 |
| SRS_CREATED | 📋 |
| BD_CREATED | 🏗️ |
| DD_CREATED | 📐 |
| PLAN_CREATED | 📝 |
| PLAN_REVIEWED | ✅ |
| EXECUTED | ⚙️ |
| VALIDATED | ✔️ |
| TESTED | 🎉 |

## Quick Actions

Based on displayed features, suggest:
- `/recall --latest` — Resume most recent feature
- `/recall --tag <tag>` — Resume tagged save

---
description: Command dashboard — list all available commands grouped by stage
---

# COMMANDS Command — Dashboard

Display all available commands grouped by workflow stage.

## Input

$ARGUMENTS

Parse optional flags:
- `--stage <1|2>` — Filter by stage
- `--setup` — Show only setup commands
- `--utility` — Show only utility commands
- `--search <term>` — Search commands by name/description

## Step 1: Display Overview

```
╔═══════════════════════════════════════════════════════════╗
║              opencode workflow — Command Dashboard         ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ┌─ SETUP ──────────────────────────────────────────┐    ║
║  │ /architect       Architecture documents (5 phases)│    ║
║  │ /config-project  Auto-detect tech stack           │    ║
║  └───────────────────────────────────────────────────┘    ║
║                                                           ║
║  ┌─ STAGE 1: DESIGN ───────────────────────────────┐     ║
║  │ /research        Knowledge base builder          │     ║
║  │ /innovate        Decision engine (2 parts)       │     ║
║  │ /design --srs    Software Requirements Spec      │     ║
║  │ /design --basic  Basic Design (Architecture)     │     ║
║  │ /design --detail Detail Design (FDD+BDD+API)    │     ║
║  │ /design --test   Test Plan                       │     ║
║  │ /design-review   Quality review for DD           │     ║
║  └───────────────────────────────────────────────────┘    ║
║                                                           ║
║  ┌─ STAGE 2: IMPLEMENTATION ───────────────────────┐     ║
║  │ /plan              Implementation plan           │     ║
║  │ /plan-review       Plan quality review (95%)     │     ║
║  │ /plan-optimize     Optimize plan when <95%      │     ║
║  │ /execute           Implement approved plan       │     ║
║  │ /validate          3-pass validation             │     ║
║  │ /test [run|scan|...] Run tests + coverage        │     ║
║  └───────────────────────────────────────────────────┘    ║
║                                                           ║
║  ┌─ UTILITY ───────────────────────────────────────┐     ║
║  │ /save [--tag]      Save context to memory bank   │     ║
║  │ /recall [--tag]    Load context from memory bank │     ║
║  │ /list              List all memories             │     ║
║  │ /guide [--option]  User guide (Vietnamese)       │     ║
║  │ /commands          This dashboard                │     ║
║  │ /reverse-dd        Reverse eng → Detail Design   │     ║
║  │ /review            Code review                   │     ║
║  │ /debug             Debugging assistance          │     ║
║  │ /refactor          Code refactoring              │     ║
║  │ /security-audit    Security audit                │     ║
║  │ /commit            Commit helper                 │     ║
║  │ /rapid             Rapid development             │     ║
║  │ /parallel          Parallel execution            │     ║
║  │ /mentor            Mentoring                     │     ║
║  │ /test-design       Test design                   │     ║
║  │ /verify-changes    Verify changes                │     ║
║  └───────────────────────────────────────────────────┘    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Step 2: State Machine Reference

```
State Machine:
═══════════════════════════════════════════════════════════════
INITIAL → RESEARCHED → INNOVATE_SRS → SRS_CREATED
  → INNOVATE_TECHNICAL → BD_CREATED → DD_CREATED
  → PLAN_CREATED → PLAN_REVIEWED → EXECUTED
  → VALIDATED → TESTED

Current state: Check .opencode/memory-bank/ for context.md
```

## Step 3: Workflow Modes

```
Modes:
  Full Mode:       /research → /innovate → /design → /plan → /execute
                   (user gõ 2 lệnh: research + plan, còn lại auto-chain)

  Arch-Ready Mode: /design --init → /design (BD+DD) → /plan → /execute
                   (khi đã có sẵn requirements)

  Bugfix Mode:     /research → /plan → /execute
                   (skip innovate/design)
```

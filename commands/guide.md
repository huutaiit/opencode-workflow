---
description: User guide for opencode workflow — workflow modes, command reference, quick start (Vietnamese)
---

# GUIDE Command — Hướng dẫn Workflow

Hướng dẫn sử dụng opencode workflow toàn diện.

## Input

$ARGUMENTS

Parse options:
- (no option) — Show available options
- `--workflow` — Giải thích 2-stage auto-chain workflow
- `--commands` — Danh sách tất cả commands
- `--status` — Trạng thái workflow hiện tại
- `--next` — Bước tiếp theo và gợi ý
- `--quick` — Quick start guide

## Step 1: Route Options

### No Option → Display Options

```
╔══════════════════════════════════════════════════╗
║          opencode workflow — Hướng dẫn            ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  --workflow    Giải thích 2-stage workflow       ║
║  --commands    Danh sách commands                ║
║  --status      Kiểm tra trạng thái hiện tại      ║
║  --next        Bước tiếp theo cần chạy           ║
║  --quick       Quick start guide                 ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

### `--workflow` → 2-Stage Auto-Chain

```
STAGE 1: Design Pipeline
═══════════════════════════════════════════════════════
  /research  →  /innovate  →  /design  →  /design-review
  (1 command)   (auto)        (auto)       (auto)

STAGE 2: Implementation Pipeline
═══════════════════════════════════════════════════════
  /plan  →  /plan-review  →  /execute  →  /validate  →  /test
  (1 cmd)   (auto)          (auto)       (auto)         (confirm)

User chỉ gõ 2 lệnh:  /research → /plan
Phần còn lại tự động chain.
```

### `--commands` → Danh sách Commands

```
SETUP:
  /architect          Architecture documents (5 phases)
  /config-project     Auto-detect tech stack

STAGE 1 — DESIGN:
  /research [--type] [--input] [--module]   Knowledge base builder
  /innovate                                  Decision engine (2 parts)
  /design --srs        Software Requirements Specification
  /design --basic      Basic Design (Architecture)
  /design --detail     Detail Design (FDD + BDD + API)
  /design --test       Test Plan
  /design-review       Quality review for Detail Design

STAGE 2 — IMPLEMENTATION:
  /plan [--persona]    Implementation plan
  /plan-review         Plan quality review (95% threshold)
  /plan-optimize       Optimize plan when <95%
  /execute             Implement approved plan
  /validate            3-pass validation
  /test run            Run tests + coverage report

UTILITY:
  /save [--tag] [--note]    Save context to memory bank
  /recall [--tag] [--list]   Load context from memory bank
  /list                      List all memories
  /guide [--option]          This guide
  /commands                  Command dashboard
  /review                    Code review
  /debug                     Debugging assistance
  /refactor                  Code refactoring
  /security-audit            Security audit
  /commit                    Commit helper
  /rapid                     Rapid development
  /parallel                  Parallel execution
  /mentor                    Mentoring
  /test-design               Test design
  /verify-changes            Verify changes
  /reverse-dd                Reverse engineering → Detail Design
```

### `--quick` → Quick Start Guide

```
╔══════════════════════════════════════════════════╗
║              QUICK START                          ║
╠══════════════════════════════════════════════════╣
║                                                   ║
║  1. Setup project:                                ║
║     /config-project   (auto-detect tech stack)    ║
║     /architect        (architecture docs)         ║
║                                                   ║
║  2. New feature (Full Mode):                      ║
║     /research --type new --input docs/REQ.md      ║
║     → Auto: innovate → design → design-review     ║
║     /plan                                         ║
║     → Auto: plan-review → execute → validate      ║
║     → Confirm: /test run                          ║
║                                                   ║
║  3. Bugfix (Bugfix Mode):                         ║
║     /research --type bugfix --input <description> ║
║     → Skip innovate/design → auto chain /plan     ║
║     /plan                                         ║
║                                                   ║
║  4. Quick design (Arch-Ready Mode):               ║
║     /design --init                                ║
║     /design --basic → /design --detail            ║
║     /plan                                         ║
║                                                   ║
╚══════════════════════════════════════════════════╝
```

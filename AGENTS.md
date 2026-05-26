# opencode-workflow

Two systems co-exist here: the **OpenCode Workflow** (root: `agents/`, `commands/`, `skills/`, `plugins/`) and the **EPS Framework** (`documents/` — npm package `eps-workflow`).

## OpenCode Workflow (root)

Template to copy into `.opencode/` in user projects. Folder name difference:

| Repo dir       | Install target           |
|----------------|--------------------------|
| `agents/`      | `.opencode/agent/`       |
| `commands/`    | `.opencode/command/`     |
| `skills/`      | `.opencode/skill/`       |
| `plugins/`     | `.opencode/plugin/`      |

- **7 agents**: orchestrator (primary), code-reviewer, debugger, docs-writer, security-auditor, refactorer, test-architect
- **30 commands**: see Command Dashboard below
- **7 plugins** (TypeScript): auto-format, notifications, parallel-guard, security-scan, verification, quality-gate, auto-chain, workflow-gate
- **7 skills**: analyzing-projects, designing-apis, designing-architecture, designing-tests, managing-git, optimizing-performance, parallel-execution

Key pattern: orchestrator launches parallel subagents in a **single message** — multiple Task calls in one message = parallel, separate messages = sequential.

### Command Dashboard

```
SETUP:
  /architect          Architecture documents (5 phases)
  /config-project     Auto-detect tech stack

STAGE 1 — DESIGN:
  /scan [--module|--all|--path]   Source code analysis + module registry
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
  /test [run|scan|...] Run tests + coverage

UTILITY:
  /save [--tag]        Save context to memory bank
  /recall [--tag]      Load context from memory bank
  /list                List all memories
  /guide [--option]    User guide (Vietnamese)
  /commands            Command dashboard
  /docs                Documentation
  /review              Code review
  /debug               Debugging assistance
  /refactor            Code refactoring
  /security-audit      Security audit
  /commit              Commit helper
  /rapid               Rapid development
  /parallel            Parallel execution
  /mentor              Mentoring
  /test-design         Test design
  /verify-changes      Verify changes
  /reverse-dd          Reverse eng → Detail Design
```

### State Machine (16 states)

```
INITIAL → RESEARCHED → INNOVATE_SRS → SRS_CREATED
  → INNOVATE_TECHNICAL → BD_CREATED → DD_CREATED → BD_DD_CREATED
  → PLAN_CREATED → PLAN_REVIEWED → EXECUTED
  → VALIDATED → TESTED
```

### Workflow Modes

```
Full Mode:       /research → /innovate → /design (SRS+BD+DD) → /plan → /execute
Arch-Ready Mode: /design --init → /design (BD+DD) → /plan → /execute
Bugfix Mode:     /research → /plan → /execute
```

### Auto-Chain

After each command, the system automatically chains to the next:
- `/research` → auto-chain `/innovate`
- `/innovate` (Part 1) → auto-chain Part 2 → auto-chain `/design --srs`
- `/design --srs` → auto-chain `/design --basic` → auto-chain `/design --detail`
- `/plan` → auto-chain `/plan-review` → auto-chain `/execute`
- `/execute` → auto-chain `/validate`
- `/validate` → confirm `/test run`

User only types **2 commands** per feature: `/research` + `/plan`.

### Architecture (6-Layer)

| Layer | Directory | Description |
|-------|-----------|-------------|
| L1 COMMAND | `commands/*.md` | User-facing commands |
| L2 MICRO-CMD | `commands/*/*.md` | Sub-workflow micro-commands |
| L3 SKILL | `skills/*/SKILL.md` | Reusable domain capabilities |
| L4 PLUGIN | `plugins/*.ts` | Runtime hooks and enforcement |
| L5 AGENT | `agents/*.md` | AI agent definitions |
| L6 MEMORY | `.opencode/memory-bank/` | Branch-aware context persistence |

### Quality Gates

| Gate | Phase | Criteria |
|------|-------|----------|
| D1 | Post-research | Evidence ≥2 sources/section with citations |
| D2 | Post-innovate | All decisions documented, user-approved |
| D3 | Post-design | SRS + BD complete, validated |
| D4 | Pre-plan | All design docs exist + validated |
| G0 | Pre-execute | Confidence ≥90% |
| Plan Review | Post-plan | Score ≥95% (else auto-optimize, max 3×) |
| Validation | Post-execute | 3-pass score ≥90% |

### Memory Bank Structure

```
.opencode/memory-bank/
├── {branch}/
│   ├── {FEATURE}-{developer}/
│   │   ├── context.md                  ← Central state + decisions log
│   │   ├── evidence.md                 ← Research evidence (scope-tagged)
│   │   ├── domain-knowledge.md         ← Domain KB (new features)
│   │   ├── innovate-srs-selection.md   ← SRS decisions
│   │   ├── innovate-technical-selection.md ← Technical decisions
│   │   ├── plans/
│   │   │   └── {feature}-implementation-plan.md
│   │   ├── execution-checkpoints/
│   │   │   └── execution-state.json    ← Resume data
│   │   ├── validation-report.md        ← 3-pass results
│   │   └── test-run-report.md          ← Test results
│   └── saves/
│       └── {timestamp}-save.md         ← Context snapshots
```

## EPS Framework (`documents/`)

npm package: `eps-workflow` (v1.0.34, Node >=18). Entry: `documents/cli.js` → `npx eps <command>`.

```
npx eps init          # Scaffold EPS into project
npx eps doctor        # Check symlinks, deps, config, RAG
npx eps sync-commands # Merge default commands (force overwrite)
npx eps test <sub>    # scan | generate | validate (--module <id> or --all)
```

EPS installs to `.claude/` in consumer projects with 4 symlinks: `core`, `specialists`, `guards`, `skills`. Postinstall also installs a `commit-msg` git hook that **rejects AI attribution** (Co-Authored-By lines).

### EPS Quality Gates

| Q1 | ≥80% evidence-based requirements |
| Q2 | FR/NFR IDs unique, terminology consistent |
| Q3 | Bilingual ratio ≥60% |
| Q4 | Interfaces only, no implementation code |

### EPS Architecture (6-layer)

L1 COMMAND (`commands/*.md`) → L2 MICRO-CMD (`commands/*/*.md`) → L3 SPECIALIST (`specialists/`) → L4 GUARD (`guards/hooks/*.js`) → L5 SKILL (`skills/`) → L6 ENGINE (`core/`)

### EPS Workflow Modes

```
Full Mode:       /research → /innovate → /design (SRS+BD+DD) → /plan → /execute
Arch-Ready Mode: /design --init → /design (BD+DD) → /plan → /execute
Bugfix Mode:     /research → /plan → /execute
```

### Testing

```bash
npm test                          # all
npm run test:unit                 # unit-only
npm run test:ops                  # ops-only
npm run test:integration          # integration
```

Tests run via `node tests/test-runner.js <filter>`.

## Critical Rules

- NEVER append AI attribution in commits
- Use EPS framework for code generation
- Evidence-based documentation only
- Path-scoped rules auto-loaded by `rules/*.md` frontmatter

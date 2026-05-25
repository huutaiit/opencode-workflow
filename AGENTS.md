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
- **12 commands**: `/review`, `/commit`, `/architect`, `/rapid`, `/debug`, `/refactor`, `/security-audit`, `/test-design`, `/docs`, `/parallel`, `/verify-changes`, `/mentor`
- **5 plugins** (TypeScript): auto-format, notifications, parallel-guard, security-scan, verification
- **7 skills**: analyzing-projects, designing-apis, designing-architecture, designing-tests, managing-git, optimizing-performance, parallel-execution

Key pattern: orchestrator launches parallel subagents in a **single message** — multiple Task calls in one message = parallel, separate messages = sequential.

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

## Critical Rules (from `documents/CLAUDE.md`)

- NEVER append AI attribution in commits (enforced by git hook on consumer projects)
- Use EPS framework for code generation
- Evidence-based documentation only
- Path-scoped rules auto-loaded by `rules/*.md` frontmatter

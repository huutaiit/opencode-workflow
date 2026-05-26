# SPEC-INTEGRATION — Rules ↔ Specialists ↔ Guards

> Three-layer enforcement architecture, single source of truth, alignment rules, drift detection.
>
> **Companion to**:
> - [SPEC-METADATA.md](./SPEC-METADATA.md) — 16 field definitions, validation rules
> - [SPEC-METADATA-STACKS.md](./SPEC-METADATA-STACKS.md) — Per-stack examples
>
> **When to read**: Auditing system integrity, adding new stacks, investigating enforcement gaps.

---

## 1. Problem Statement

EPS enforces architecture constraints through **three independent systems** that maintain **overlapping content** with **no documented single source of truth**:

| System | Location | Maintains | Loaded By |
|--------|----------|-----------|-----------|
| **Rules** | `defaults/rules/*.md` | Layer rules, naming, import rules | Claude Code rules engine (conversation start) |
| **Specialists** | `specialists/code/{stack}/*.md` | Same + patterns, code skeletons | `specialist-load.js` (workflow commands) |
| **Guards** | `guards/hooks/*.js` | Enforcement logic | Claude Code hooks (PreToolUse/PostToolUse) |

**Risk**: Update one system, forget the others → silent drift → architecture violations pass validation.

---

## 2. Three-Layer Enforcement Architecture

```
┌───────────────────────────────────────────────────────────────┐
│ Layer 1: RULES (defaults/rules/*.md)                          │
│                                                               │
│ Purpose: Project-configurable constraints                     │
│ Scope:   Path-scoped via frontmatter `paths:` glob            │
│ Loaded:  At conversation start by Claude Code rules engine    │
│ User:    Copies to project, customizes via # CONFIGURE:       │
│                                                               │
│ Files:                                                        │
│   backend-java.md        — Reactive (WebFlux + R2DBC)         │
│   modulith-java.md       — Clean-Modulith (Blocking + VT)    │
│   backend-fastapi.md     — Python FastAPI                     │
│   frontend-react.md      — React FSD                          │
│   frontend-nextjs.md     — NextJS Clean Architecture          │
│   infrastructure.md      — Docker, K8s, databases             │
│   quality-baseline.md    — Cross-stack quality rules           │
├───────────────────────────────────────────────────────────────┤
│ Layer 2: SPECIALISTS (specialists/code/{stack}/*.md)          │
│                                                               │
│ Purpose: Framework-maintained knowledge holders               │
│ Scope:   Per-stack, per-concern, per-variant                  │
│ Loaded:  By specialist-load.js during /plan, /execute, etc.   │
│ User:    Does NOT modify — maintained by EPS framework        │
│                                                               │
│ Contains:                                                     │
│   Architecture Metadata table (16 mandatory fields)           │
│   APPROVED / REJECTED patterns with code examples             │
│   Decision trees for pattern selection                        │
│   Cross-specialist delegation rules                           │
├───────────────────────────────────────────────────────────────┤
│ Layer 3: GUARDS (guards/hooks/*.js, guards/gates/*.js)        │
│                                                               │
│ Purpose: Runtime enforcement                                  │
│ Scope:   PreToolUse (before) / PostToolUse (after) hooks      │
│ Loaded:  By Claude Code hook system on every tool call        │
│ User:    Does NOT modify — maintained by EPS framework        │
│                                                               │
│ Hooks:                                                        │
│   architecture-awareness.js — Loads specialist metadata,      │
│     validates compatibility + duplicates before /design,      │
│     /plan, /execute                                           │
│   quality-check.js — Enforces quality-baseline.md rules       │
│     after Edit/Write operations                               │
│   workflow-gate.js — State machine validation before          │
│     phase transitions                                         │
│   commit-guard.js — Commit message + diff validation          │
│   auto-chain.js — Auto-chain workflow progression             │
│   quality-stop-gate.js — Quality threshold gate               │
│                                                               │
│ Gates:                                                        │
│   quality-gates.js — D1-D4 quality gate checks                │
│   arch-ready-gate.js — Architecture readiness validation      │
│   approve-innovate-dd.js — Innovate DD approval gate          │
│   test-quality-gate.js — Test quality thresholds              │
│   test-coverage-gate.js — Test coverage thresholds            │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

```
                    ┌──────────────┐
                    │ Conversation │
                    │    Start     │
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │ Rules Engine loads      │
              │ defaults/rules/*.md     │
              │ based on file paths     │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │ User runs /plan,        │
              │ /execute, /validate     │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ specialist-  │ │ Rules inform │ │ Guards run   │
  │ load.js      │ │ agent context│ │ on each tool │
  │ loads arch   │ │ (layer rules,│ │ call (pre/   │
  │ metadata     │ │ naming, etc.)│ │ post hooks)  │
  └──────┬───────┘ └──────────────┘ └──────┬───────┘
         │                                  │
         │    ┌─────────────────────────┐   │
         └───►│ architecture-awareness  │◄──┘
              │ .js loads specialist    │
              │ metadata to validate   │
              │ against layer rules    │
              └─────────────────────────┘
```

---

## 4. Single Source of Truth

| Constraint | Authoritative Source | Derived By | Enforced By |
|-----------|---------------------|------------|-------------|
| **Layer boundaries** (which layer can import which) | Architecture specialist (`## Architecture: Dependency Rules`) | `defaults/rules/{stack}.md` `## Layer Rules` | `architecture-awareness.js`, `/validate` Pass 1 D.3 |
| **Naming conventions** (file/class naming patterns) | Code specialist (`Naming Convention` field) | `defaults/rules/{stack}.md` `## Naming` | `/validate` Pass 1 D.1 |
| **Import restrictions** (Cannot Import per specialist) | Code specialist (`Cannot Import` field) | `defaults/rules/{stack}.md` `## Layer Rules` | `/validate` Pass 1 D.3, `architecture-awareness.js` |
| **Quality rules** (no `any`, i18n, centralized API) | `quality-baseline.md` rule file | (authoritative — not derived) | `quality-check.js` PostToolUse hook |
| **Variant selection** (Reactive vs Standard vs Modulith) | Stack config (`variants` in `stack-*.json`) | `defaults/rules/{stack}.md` `## Architecture` | Specialist `Variant` field, `/validate` |
| **Workflow state** (which phase can follow which) | `core/cli/actions/workflow-state.js` | (authoritative — not derived) | `workflow-gate.js` PreToolUse hook |

**Key principle**: Specialists are authoritative for architecture + code constraints. Rules files are **derived** (human-readable summaries). If they conflict, specialist wins.

---

## 5. Content Overlap Analysis

### 5.1 What Rules Files Contain That Specialists DON'T

| Content | Example | Why Only in Rules |
|---------|---------|------------------|
| **Variant selection guidance** | "DO NOT use Reactive/WebFlux for simple CRUD" | Project-level decision, not per-specialist |
| **Auth strategy options** | "Keycloak SSO / JWT / X-API-Key — choose one" | Configurable per project |
| **Module structure** | "common/ (shared), {app-name}/ (presentation), gateway/" | Maven/project layout, not code patterns |
| **Response format** | "Return Mono<ResponseEntity<T>> from all controllers" | Cross-cutting convention, not one specialist |
| **# CONFIGURE: markers** | User customization points | Rules are templates; specialists are fixed |
| **"When NOT to Apply"** | "DO NOT use FSD for <5 features" | Pragmatic guidance outside specialist scope |

### 5.2 What Specialists Contain That Rules Files DON'T

| Content | Example | Why Only in Specialists |
|---------|---------|------------------------|
| **Code patterns** (APPROVED/REJECTED) | Full code examples with "Why Approved" | Too verbose for rules files |
| **Pattern Numbers** | `42.1–42.6` cross-references | Internal specialist system |
| **File counts** | "~50 repository interfaces" | Estimation for agent scope planning |
| **Decision trees** | "Is it a simple query? → Pattern 97.1" | Agent routing logic |
| **Dependencies** | "io.github.resilience4j:resilience4j-spring-boot3" | pom.xml/package.json guidance |
| **Source Skeleton** | Exact file paths to scaffold | /execute file creation guidance |
| **Cross-specialist delegation** | "NL-to-SQL → delegate to llm-integration" | Inter-specialist routing |
| **Known issues/compromises** | "ViewModel in Infrastructure is pragmatic" | Architecture deviations documented |

### 5.3 What BOTH Contain (Overlap Zone — Drift Risk)

| Content | Rules File Section | Specialist Field | Drift Risk |
|---------|-------------------|-----------------|------------|
| Layer assignment | `## Layer Rules` | `Layer` metadata field | LOW — rarely changes |
| Import direction | `## Layer Rules` "depends on X ONLY" | `Imports From` metadata field | **MEDIUM** — new concerns added |
| Import restrictions | `## Layer Rules` "CANNOT import X" | `Cannot Import` metadata field | **MEDIUM** — new concerns added |
| File naming | `## Naming` | `Naming Convention` metadata field | LOW — established conventions |
| Architecture style | `## Architecture` | Architecture specialist content | LOW — foundational decision |

---

## 6. Alignment Requirements

When creating or updating ANY of the three layers:

| Action | Must Also Check/Update |
|--------|----------------------|
| Change architecture specialist dependency rules | `defaults/rules/{stack}.md` `## Layer Rules` |
| Change code specialist `Cannot Import` field | `defaults/rules/{stack}.md` `## Layer Rules` |
| Change code specialist `Naming Convention` | `defaults/rules/{stack}.md` `## Naming` |
| Add new specialist concern folder (e.g., `analytics/`) | Consider if rules file needs new section |
| Add new stack to EPS | Create `defaults/rules/{stack}.md` AND stack specialists |
| Change `quality-baseline.md` rules | Verify `quality-check.js` enforces them |
| Add new guard hook | Document in this file §2 (Three-Layer Architecture) |
| Change variant in stack config | Update corresponding rules file `## Architecture` section |

---

## 7. Rules File Specification

### 7.1 File Format

```markdown
---
paths:
  - "backend/**/*.java"     # glob patterns for path-scoping
  - "backend/**/*.xml"
alwaysApply: false           # optional: true = always loaded regardless of path
---
# {Stack} {Variant} Rules

## Architecture
- {Framework version}, {Language version}
- {Architecture style}
- Variant: {variant name}

## Layer Rules
- {layer}: {what it can/cannot import}

## Naming
- {file type}: {naming pattern} in {path}

## Auth
# CONFIGURE: choose auth strategy
- {option 1}
- {option 2}

## Response Format
- {response convention}

## Modules
# CONFIGURE: list project modules
- {module}: {description}

## KHI NAO KHONG AP DUNG (When NOT to Apply)
- {guidance on when this architecture is overkill}
```

### 7.2 Rules vs Specialists: Key Distinction

| Aspect | Rules (`defaults/rules/`) | Specialists (`specialists/code/`) |
|--------|--------------------------|----------------------------------|
| **Maintained by** | User (project-configurable) | EPS framework (fixed) |
| **Granularity** | Per-stack (1 file = 1 stack variant) | Per-concern (1 file = 1 specialist) |
| **Content** | Constraints + configuration | Patterns + code examples |
| **Customizable** | Yes (`# CONFIGURE:` markers) | No (framework-maintained) |
| **Loaded when** | Conversation start (always) | On-demand by workflow commands |
| **Parser** | Claude Code rules engine (frontmatter `paths:`) | `specialist-load.js` (`## Architecture Metadata` table) |

---

## 8. Guard Integration Points

| Guard File | Type | Trigger | What It Loads | Failure Behavior |
|-----------|------|---------|--------------|-----------------|
| `architecture-awareness.js` | PreToolUse | Before `/design`, `/plan`, `/execute` | Architecture specialist metadata | **Fail-open** (advisory, always exit 0) |
| `quality-check.js` | PostToolUse | After Edit/Write | `quality-baseline.md` rules | **Fail-closed** for CRITICAL (exit 2), WARNING logged |
| `workflow-gate.js` | PreToolUse | Before phase transitions | Workflow state machine | **Fail-closed** (blocks invalid transitions) |
| `commit-guard.js` | PreToolUse | Before git commit | Commit conventions | **Fail-closed** (blocks bad commits) |
| `auto-chain.js` | PostToolUse | After phase completion | Next phase determination | Advisory (suggests next command) |
| `quality-stop-gate.js` | Gate | Between phases | Quality thresholds | **Fail-closed** (blocks progression) |

### 8.1 architecture-awareness.js Data Flow

```
PreToolUse event
    │
    ├─ Detect EPS command (design/plan/execute)
    │
    ├─ Load architecture specialist metadata
    │   └─ parseArchMetadata() from specialist-load.js
    │
    ├─ Run checks based on command:
    │   ├─ pre-design: compatibility + duplicates
    │   ├─ pre-plan: compatibility + impact analysis
    │   └─ pre-execute: duplicate detection
    │
    └─ Output: advisory warnings (always exit 0)
```

### 8.2 quality-check.js Data Flow

```
PostToolUse event (Edit/Write)
    │
    ├─ Load quality-baseline.md rules
    │
    ├─ Check CRITICAL rules:
    │   ├─ Zero `any` types
    │   ├─ Centralized API client
    │   ├─ i18n keys from day 1
    │   ├─ No hardcoded credentials
    │   ├─ Coverage config present
    │   ├─ No empty architecture layers
    │   └─ Linter zero warnings
    │
    ├─ On CRITICAL violation: exit 2 (blocks operation)
    │   └─ After 3 failed fixes: downgrade to debt entry
    │
    └─ On WARNING: log to quality-debt.log
```

---

## 9. Drift Detection

### 9.1 Manual Checks

| Check | How |
|-------|-----|
| **Layer rules drift** | Compare architecture specialist `## Architecture: Dependency Rules` table with `defaults/rules/{stack}.md` `## Layer Rules` |
| **Naming drift** | Compare code specialist `Naming Convention` fields with `defaults/rules/{stack}.md` `## Naming` |
| **Import drift** | Compare code specialist `Cannot Import` fields with `defaults/rules/{stack}.md` `## Layer Rules` |
| **Guard coverage** | Verify every CRITICAL rule in `quality-baseline.md` is checked by `quality-check.js` |

### 9.2 Automated Validation

```bash
# Check rules-specialist alignment for a stack
node core/cli/ops.js specialist-validate --check-rules-alignment --stack <stack>

# Checks performed:
# 1. Every layer in rules file exists in architecture specialist
# 2. Every "CANNOT import" in rules matches specialist Cannot Import fields
# 3. Every naming pattern in rules matches specialist Naming Convention fields
# 4. Every CRITICAL rule in quality-baseline.md has enforcement in quality-check.js
```

### 9.3 Current Alignment Status (Audit 2026-04-07)

| Stack | Rules File | Architecture Specialist | Alignment |
|-------|-----------|------------------------|-----------|
| java-springboot (reactive) | `backend-java.md` | `backend-clean-architecture-specialist.md` | **95%+ aligned** — no contradictions |
| java-springboot (modulith) | `modulith-java.md` | `backend-clean-architecture-specialist.md` | **95%+ aligned** — variant-specific rules match |
| python-fastapi | `backend-fastapi.md` | `fastapi-architecture-specialist.md` | **95%+ aligned** |
| react-fsd | `frontend-react.md` | `react-fsd-architecture-specialist.md` | **95%+ aligned** — 6-layer hierarchy consistent |
| nextjs | `frontend-nextjs.md` | `nextjs-architecture-master-specialist.md` | **95%+ aligned** — 5-layer hierarchy consistent |
| nestjs | `backend-nestjs.md` | `nestjs-architecture-master-specialist.md` | **95%+ aligned** — Clean Architecture 4-layer, single variant, rules derived from arch master |
| python-odoo | (pending) | `odoo-module-architecture-specialist.md` | **PENDING** — rules file not yet created |
| infrastructure | `infrastructure.md` | (no architecture specialist) | N/A — infra rules are standalone |
| quality-baseline | `quality-baseline.md` | (cross-stack, not per-specialist) | Enforced by `quality-check.js` |

---

## 10. Adding New Stacks — Checklist

When adding a new stack to EPS:

- [ ] Create `defaults/rules/{stack}.md` with frontmatter `paths:` scoping
- [ ] Create `specialists/code/{stack}/` folder structure
- [ ] Create architecture specialist with `## Architecture:` 4 headings (per SPEC-METADATA.md §6.6)
- [ ] Create `_INDEX.md` with Pattern Number Registry
- [ ] Create `stack-{stack}.json` with `totalSpecialists`, `specialistGroups`, `architectureMaster`
- [ ] Verify rules file `## Layer Rules` aligns with architecture specialist `## Architecture: Dependency Rules`
- [ ] Verify rules file `## Naming` aligns with code specialists' `Naming Convention` fields
- [ ] Add stack to SPEC-METADATA.md §4.1 Layer table
- [ ] Run `specialist-validate --check-rules-alignment --stack {stack}`

---

## 11. Field Mapping Across Stacks

| # | Universal Field | Java | React/NextJS | C# | Python | NestJS | Odoo |
|---|----------------|------|-------------|-----|--------|--------|------|
| 1 | Layer | Layer | Layer | Layer | Layer | Layer | Layer |
| 2 | Directory/Package | Package | Directory Pattern | Namespace Pattern | Module Pattern | Directory Pattern | Directory Pattern |
| 3 | Variant | Variant | Variant | Variant | Variant | Variant | Variant (`enterprise`) |
| 4–10 | (same across all stacks) | — | — | — | — | — | — |
| 11 | Dependencies | Maven artifacts | npm packages | NuGet packages | pip packages | npm packages | `odoo.*` / `@odoo/owl` |
| 12–16 | (same across all stacks) | — | — | — | — | — | — |

**Stack-specific additional fields** (beyond 16 standard, OPTIONAL):

| Stack | Additional Field | Purpose |
|-------|-----------------|---------|
| Java | Maven Module, Base Class | Multi-module project, inheritance |
| React/NextJS | Barrel Export | Re-export from index.ts |
| C# | Project (.csproj) | Solution project mapping |
| Odoo | (none) | Flat module — 16 fields sufficient |

---

*SPEC-INTEGRATION — Rules ↔ Specialists ↔ Guards — EPS Framework*

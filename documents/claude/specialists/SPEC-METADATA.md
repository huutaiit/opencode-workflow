# SPEC-METADATA — Specialist Metadata Specification v2.4

> Single source of truth for specialist Architecture Metadata across ALL stacks.
> Every specialist file MUST conform to this spec for the system to parse, rank, match, and validate correctly.
>
> **This file** = core rules (16 fields, N/A policy, arch enforcement, validation). ~550 lines.
> **Companion files**:
> - [SPEC-METADATA-STACKS.md](./SPEC-METADATA-STACKS.md) — Per-stack examples (Java, React, C#, Python, NestJS, Flutter, Django, Odoo)
> - [SPEC-INTEGRATION.md](./SPEC-INTEGRATION.md) — 3-layer enforcement architecture (Rules ↔ Specialists ↔ Guards)

---

## 1. Why This Spec Exists

The `specialist-load.js` system parses the `## Architecture Metadata` table to:
- **Rank** specialists by variant + layer match (`rankSpecialists()`)
- **Filter** by variant compatibility (`checkVariantCompat()`)
- **Match** by source path (`matchSourcePath()` via _INDEX.md)
- **Validate** architecture compliance in `/validate` Pass 1
- **Select** per-step specialists in `/execute` via 5-dimension model (BD D5)

Without a standardized table, parsing fails silently — specialist loads but with `metadata: null`.

---

## 2. Architecture Metadata Table Format

The table MUST use this exact markdown format:

```markdown
## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ... |
| **Directory Pattern** | ... |
| ... | ... |
```

**Parser rules** (`parseArchMetadata()` in `core/cli/actions/specialist-load.js`):
- Matches section starting with `## Architecture Metadata`
- Reads until next `---` separator
- Extracts key from column 1 (lowercased, stripped of `**` and spaces)
- Extracts value from column 2

---

## 3. Field Definitions

### 3.1 System-Parsed Fields (9 fields — MANDATORY)

These fields are extracted by `parseArchMetadata()` and used by runtime logic.
Parser key = field name lowercased with spaces removed.

| # | Field Name | Parser Key | Used By | Required |
|---|-----------|-----------|---------|----------|
| 1 | **Layer** | `layer` | `rankSpecialists()` — layer:exact(30) scoring | MUST |
| 2 | **Directory Pattern** | `package` | Informational — maps to source directory | MUST |
| 3 | **Variant** | `variant` | `checkVariantCompat()` — penalty -10 on mismatch | MUST |
| 4 | **Naming Convention** | key contains `naming` | `/validate` Pass 1 D.1 — file naming check | MUST |
| 5 | **Imports From** | key contains `importsfrom` | `/validate` Pass 1 D.3 — architecture rules | MUST |
| 6 | **Cannot Import** | key contains `cannotimport` | `/validate` Pass 1 D.3 — violation detection | MUST |
| 7 | ~~**Framework**~~ | `framework` | ~~5-dimension D1~~ — **DEPRECATED v2.1**: derived from stack folder. Parser fallback: `meta.framework \|\| stackKey` | DERIVED |
| 8 | ~~**Architecture**~~ | `architecture` | ~~5-dimension D2~~ — **DEPRECATED v2.1**: derived from stack config default. Parser fallback: `meta.architecture \|\| 'ANY'` | DERIVED |
| 9 | ~~**Implementation Patterns**~~ | `implementationpatterns` | ~~5-dimension D5~~ — **DEPRECATED v2.1**: keyword matching moved to Activation Trigger `keywords:` field (#16) | DEPRECATED |

### 3.2 Guidance Fields (4 fields — MANDATORY)

Not parsed by `parseArchMetadata()` but critical for code generation agents.

| # | Field Name | Used By | Required |
|---|-----------|---------|----------|
| 10 | **Pattern Numbers** | Agent references specific patterns during code gen/review | MUST |
| 11 | **Source Paths** | Agent determines WHERE to create/modify files (skeleton enforcement) | MUST |
| 12 | **File Count** | Agent estimates scope and validates completeness | MUST |
| 13 | **Imported By** | Agent understands reverse dependencies — who consumes this code | MUST |

### 3.3 Technology Context Fields (3 fields — MANDATORY, v2.1)

These fields replace the deprecated Framework (#7), Architecture (#8), and Implementation Patterns (#9).
They answer: **what libraries does this specialist need?**, **when should you use it?**, and **what files does it create?**

| # | Field Name | Used By | Required |
|---|-----------|---------|----------|
| 7' | **Dependencies** | Agent knows what to add to pom.xml / package.json / requirements.txt | MUST |
| 8' | **When To Use** | Agent decides whether to load this specialist for a given task | MUST |
| 9' | **Source Skeleton** | Agent knows what files to scaffold when using this specialist | MUST |

**Why replaced**: Framework was always derivable from stack folder (`specialist-load.js` line 393: `meta.framework || stackKey`). Architecture was always derivable from stack config default (`meta.architecture || 'ANY'`). Implementation Patterns was 85% `N/A` across all stacks — keywords now live in Activation Trigger (#16).

### 3.4 Identity Fields (3 fields — MANDATORY, v2.0)

These fields define WHY the specialist exists and WHEN it activates. Without them, specialist selection is guesswork.

| # | Field Name | Parser Key | Used By | Required |
|---|-----------|-----------|---------|----------|
| 14 | **Specialist Type** | `specialisttype` | `rankSpecialists()` — type-based scoring: code(+20), rule-set(+10), architecture(+5) during `/execute` | MUST |
| 15 | **Purpose** | `purpose` | Agent understands WHY to load this specialist — concrete deliverable, not vague description | MUST |
| 16 | **Activation Trigger** | `activationtrigger` | `selectSpecialist()` — WHEN to activate: file patterns, step keywords, or workflow phase. **v2.1**: also carries D5 keyword matching (replaces Implementation Patterns) | MUST |

### 3.5 Total: 16 Fields

Every specialist MUST have all 16 fields. No exceptions.

**v2.1 field count**: 6 system-parsed + 4 guidance + 3 technology context + 3 identity = 16.

| Category | Fields | Count |
|----------|--------|-------|
| System-Parsed | Layer, Directory Pattern, Variant, Naming Convention, Imports From, Cannot Import | 6 |
| Guidance | Pattern Numbers, Source Paths, File Count, Imported By | 4 |
| Technology Context (v2.1) | Dependencies, When To Use, Source Skeleton | 3 |
| Identity (v2.0) | Specialist Type, Purpose, Activation Trigger | 3 |

---

## 4. Field Value Rules

### 4.1 Layer

Specifies which architecture layer(s) this specialist's code lives in.

**Allowed values** (from stack config `layerMappings`):

| Stack | Layers |
|-------|--------|
| java-spring-boot | Domain, Application, Infrastructure, Presentation, Test |
| typescript-nextjs (clean) | Domain, Infrastructure, Presentation, Core, Test |
| typescript-nextjs (FSD) | App, Pages, Widgets, Features, Entities, Shared, Test |
| typescript-react (layered) | Components, Hooks, Services, Store, Test |
| csharp-dotnet-core | Domain, Application, Infrastructure, WebAPI, Test |
| nestjs | Domain, Application, Infrastructure, Presentation, Test |
| python-fastapi | Application, Domain, Data Access, Presentation, Infrastructure, Test |
| python-django | Models, Views, Templates, Forms, Services, Test |
| python-odoo | Model, View, OWL, Controller, Report, Security, Business, Infrastructure, Testing |
| flutter-dart | Domain, Application, Infrastructure, Presentation, Test |

**Rules**:
- Multi-layer: comma-separated — `Presentation, Core`
- Cross-cutting: `ALL` — but MUST include justification in parentheses
  - GOOD: `ALL (cross-cutting — types defined and consumed in every layer)`
  - BAD: `ALL` (lazy, no explanation)
  - BAD: `ALL (cross-cutting)` (no explanation of WHY)
- Test layer: use `Test` (not ALL) for testing specialists
- Rule-set specialists (e.g., a11y): use the layer they APPLY TO — `Presentation`

### 4.2 Directory Pattern (Field #2)

Maps specialist to project directory structure. The **field name** varies by stack but the **parser key** is always `package`.

**Field Name Variants Per Stack**:

| Stack | Field Name in Table | Parser Key | Reason |
|-------|-------------------|-----------|--------|
| Java | **Package** | `package` | Java uses dot-separated package paths |
| TypeScript / React / NestJS | **Directory Pattern** | `package` | Directory-based structure |
| C# | **Namespace Pattern** | `package` | C# uses namespace hierarchy |
| Python (FastAPI/Django) | **Directory Pattern** | `package` | Module-based structure |
| Flutter/Dart | **Directory Pattern** | `package` | lib/-based structure |

**Format**: `{template}/` — with architecture-specific expansions.

| Stack Type | Format | Example |
|-----------|--------|---------|
| Java | Java package path | `{rootPackage}.domain.{moduleCode}` |
| TypeScript (multi-arch) | Per-architecture paths | `{hooks}/` — clean: `src/presentation/hooks/`, FSD: `src/shared/hooks/`, layered: `src/hooks/` |
| NestJS | Module-based path | `src/{module}/`, `src/{module}/{layer}/` |
| C# | Namespace + project | `{Project}.Domain.{Module}` |
| Python | Module path | `src/{domain}/`, `{app}.domain.{module}` |
| Flutter/Dart | lib/-based path | `lib/features/{feature}/`, `lib/core/` |

**Rules**:
- MUST show how the directory maps to each supported architecture
- For shared specialists (Architecture=ANY): list ALL architecture variants
- For project-specific specialists: use concrete path
- Field name MUST match the stack's convention (see table above); parser key is always `package`

### 4.3 Variant

Project variant compatibility.

| Value | Meaning |
|-------|---------|
| `ALL` | Compatible with every variant of this stack |
| Specific variant | Only for this variant — e.g., `Standard (JPA)`, `Reactive (R2DBC/WebFlux)` |
| Multiple | Comma-separated — `Standard (JPA), Reactive (R2DBC/WebFlux)` |

### 4.4 Pattern Numbers

Range of pattern IDs in this specialist.

**Format**: `{start}–{end}` (en-dash, not hyphen).

**Registry**: Pattern number ranges MUST be registered in the stack's `_INDEX.md` Pattern Number Registry.
Never reuse pattern numbers across specialists within the same stack.

### 4.5 Source Paths

Glob patterns specifying WHERE code for this specialist lives.

**Format**: Comma-separated glob patterns.

| Context | Example |
|---------|---------|
| Specific directory | `src/infrastructure/store/` |
| Glob pattern | `**/hooks/**/*.ts`, `**/hooks/**/*.tsx` |
| Multiple locations | `**/store/**`, `**/context/**`, `**/providers/**` |
| Colocated files | `**/__tests__/**`, `**/*.test.tsx` |

**Rules**:
- MUST use glob syntax that works across architectures (for shared specialists)
- MUST be specific enough to not match unrelated files
- Rule-set specialists: use paths of files the rules APPLY TO
- `N/A` is NEVER acceptable — even rule-set specialists have target paths

### 4.6 File Count

Estimated number of files this specialist covers in a typical project.

**Format**: Range or description.

| Example | When |
|---------|------|
| `15–50 custom hooks per project` | Countable standalone files |
| `~1:1 with source components, 50–200 test files` | Ratio-based |
| `Cross-cutting: applies to all component files` | Rule-set that applies everywhere |
| `6 files (store.ts + hooks.ts + 4 slice files)` | Project-specific, exact count |

**Rules**:
- `N/A` is NOT acceptable — provide an estimate or describe the scope
- For project-specific specialists: use actual count from codebase
- For shared specialists: use typical range based on evidence
- For `code` specialists: count files CREATED by this specialist
- For `rule-set` specialists: count files CHECKED/AFFECTED by this specialist (not files created)
  - GOOD: `Cross-cutting: applies to ~200–500 component files per enterprise app`
  - BAD: `N/A` (rule-set specialists still affect files — count them)
- For `architecture` specialists: count structure files or use `Cross-cutting: applies to all source files`

### 4.7 Naming Convention

File naming pattern for files created/governed by this specialist.

**Format**: Template with `{Entity}`, `{Name}`, `{feature}` placeholders.

| Stack | Example |
|-------|---------|
| Java | `{Entity}ServiceImpl.java`, `{Entity}Repository.java` |
| React | `use{Name}.ts`, `{Entity}Form.tsx`, `{Pattern}.tsx` |
| C# | `{Entity}Controller.cs`, `I{Entity}Service.cs` |

**Rules**:
- Rule-set specialists (e.g., a11y) that don't create files: `N/A (enforcement rules on existing components, not new file creation)` — with explicit justification
- Bare `N/A` is NOT acceptable

### 4.8 Imports From

Layer dependencies — what this specialist's code CAN import.

**Format**: `{Layer} ({specifics})`, comma-separated.

| Example | Meaning |
|---------|---------|
| `Domain (entity types/interfaces)` | Can import type definitions from domain |
| `Domain (entity types), Infrastructure (store selectors)` | Two layer dependencies |
| `ALL (test scope — imports whatever it tests)` | Test specialists import freely |
| `ALL (types reference types from any layer)` | Cross-cutting with justification |

**Rules**:
- Must reference LAYERS, not specific files
- `N/A` only for rule-set specialists (not code modules) — with justification
- Bare `N/A` is NOT acceptable for code-generating specialists

### 4.9 Cannot Import

Layer restrictions — what this specialist's code MUST NOT import.

**Format**: `{Layer/Module} ({reason})`, comma-separated.

| Example | Meaning |
|---------|---------|
| `Presentation/UI components (inversion of dependency)` | Store must not reference UI |
| `Infrastructure directly (no API calls), Features (must be feature-agnostic)` | UI patterns are pure |
| `Runtime implementation code (type files must be pure type definitions)` | Types purity |
| `Pages/App routing, other hooks' internal state` | Hook encapsulation |

**Rules**:
- Must explain WHY the restriction exists
- `N/A` only for test and rule-set specialists — with justification
- This field drives `/validate` architecture violation detection

### 4.10 Dependencies (v2.1 — replaces Framework)

Lists the concrete third-party libraries/packages this specialist requires.

**Format**: Comma-separated `{artifact}:{version}` (or `{package}` for JS/Python).

| Stack | Example |
|-------|---------|
| Java | `org.springframework.kafka:spring-kafka:3.x`, `org.springframework.cloud:spring-cloud-stream:2024.0` |
| NestJS | `@grpc/grpc-js`, `@nestjs/microservices`, `google-protobuf` |
| React | `@tanstack/react-query:5.x`, `axios:1.x` |
| Python | `celery>=5.3`, `redis>=5.0` |

**Rules**:
- List ONLY third-party dependencies (not framework core like `spring-boot-starter-web`)
- Include version constraints where meaningful (`:3.x`, `>=5.0`)
- For specialists that don't need extra deps: `None (uses framework core only)`
- `N/A` is NOT acceptable — every specialist either needs deps or uses core only

**Parser note**: Not system-parsed. Guidance for agent to know what to add to `pom.xml` / `package.json` / `requirements.txt`.

### 4.11 When To Use (v2.1 — replaces Architecture)

One-line decision criteria: **when should an agent load this specialist?**

**Format**: Short sentence describing the USE CASE, not the technology.

| Good | Bad |
|------|-----|
| `Event-driven async communication between microservices` | `Kafka messaging` (what technology, not when) |
| `Sync service-to-service communication with typed API contracts` | `gRPC patterns` (just a name) |
| `Circuit breaker, retry, and rate limiting for inter-service calls` | `Resilience` (too vague) |
| `OAuth2/OIDC authentication and JWT resource server` | `Security` (too vague) |

**Rules**:
- Focus on WHEN/WHY, not WHAT
- Must be actionable — an agent reading this can decide yes/no to load
- `N/A` is NOT acceptable
- Distinct from Purpose (#15): Purpose = what the specialist DELIVERS. When To Use = when to LOAD it.

### 4.12 Source Skeleton (v2.1 — replaces Implementation Patterns)

File templates that this specialist would scaffold in a new project.

**Format**: Comma-separated file paths using `{placeholders}`.

| Stack | Example |
|-------|---------|
| Java | `{sourceRoot}/infrastructure/kafka/{Topic}Producer.java`, `{sourceRoot}/infrastructure/kafka/{Topic}Consumer.java`, `{sourceRoot}/infrastructure/kafka/config/KafkaConfig.java` |
| NestJS | `proto/{service}.proto`, `src/infrastructure/grpc/{service}.grpc-client.ts`, `src/infrastructure/grpc/{service}.grpc-server.ts` |
| React | `src/hooks/use{Name}.ts`, `src/hooks/__tests__/use{Name}.test.ts` |
| Python | `{app}/tasks/{module}_tasks.py`, `{app}/tasks/celery_config.py` |

**Rules**:
- Use stack-appropriate placeholders: `{sourceRoot}`, `{rootPackage}`, `{Entity}`, `{Topic}`, `{service}`
- List the MINIMUM files needed to use this specialist's patterns
- For rule-set specialists: `N/A (enforcement rules, no files created)` — with justification
- For architecture specialists: list the STRUCTURE files (e.g., folder layout, config)

**Parser note**: Not system-parsed. Guidance for agent during `/execute` to know what files to create.

### 4.10–4.12 DEPRECATED Fields (v2.1)

The following fields are **DEPRECATED** as of v2.1. They MAY still appear in older specialist files but SHOULD be removed during updates.

| Old Field | Replacement | Why Deprecated |
|-----------|-------------|----------------|
| **Framework** | Derived from stack folder | Parser: `meta.framework \|\| stackKey` — always same as stack |
| **Architecture** | Derived from stack config | Parser: `meta.architecture \|\| 'ANY'` — redundant with stack default |
| **Implementation Patterns** | Activation Trigger `keywords:` | 85% were `N/A`. Keywords now in Activation Trigger (#16) |

**Migration**: When updating a specialist to v2.1, replace these 3 rows with Dependencies, When To Use, Source Skeleton.

### 4.13 Imported By

Reverse dependencies — what consumes this specialist's output.

**Format**: `{Layer/Component} ({how})`, comma-separated.

| Example | Meaning |
|---------|---------|
| `Presentation (components consume hooks)` | Components call hooks |
| `All page/feature components, Layouts` | Widely consumed |
| `None (terminal — test runner only)` | No reverse deps |
| `N/A (enforcement rules, not importable code)` | Rule-set specialist |

### 4.14 Specialist Type (v2.0)

Classifies what the specialist DOES — determines how the system uses it.

**Allowed values**:

| Value | Meaning | `/execute` behavior | Example |
|-------|---------|-------------------|---------|
| `code` | **Generates or modifies code** — has concrete file output, naming conventions, import rules | Agent creates/modifies files following specialist patterns | react-hooks-patterns, nestjs-typeorm-patterns, java-domain |
| `rule-set` | **Enforces rules during review/validate** — does NOT create files, applied to existing code | Agent checks existing code against rules, flags violations | react-accessibility, react-perf-critical, web-design-guidelines |
| `architecture` | **Defines structure and makes design decisions** — input for `/plan` and `/design`, rarely used in `/execute` | Agent references during planning phase to decide folder structure, layer boundaries | react-architecture-styles, react-composition, frontend-architecture-styles |

**Rules**:
- Every specialist MUST be exactly ONE type — no multi-type
- `code` specialists MUST have concrete Naming Convention (not N/A)
- `code` specialists MUST have concrete Imports From / Cannot Import (not N/A)
- `rule-set` specialists MAY have N/A for Naming Convention, Imports From, Cannot Import — but MUST justify
- `architecture` specialists MAY have N/A for File Count — but MUST have concrete Directory Pattern

**Anti-pattern**: A specialist that "does everything" is poorly designed. If a specialist both generates code AND enforces rules, split it into two specialists.

### 4.15 Purpose (v2.0)

Concrete answer to: **WHY does this specialist exist? What deliverable does it produce?**

**Format**: One sentence starting with a verb — what the specialist DELIVERS.

| Type | Good Purpose | Bad Purpose |
|------|-------------|-------------|
| `code` | "Generate custom React hooks with proper dependency arrays, cleanup, and TypeScript typing" | "React hooks patterns" (vague, no deliverable) |
| `code` | "Generate TanStack Query hooks with typed responses, error handling, and cache invalidation" | "Data fetching" (too generic) |
| `rule-set` | "Enforce WCAG 2.1 AA compliance on React components — aria labels, keyboard navigation, focus management" | "Accessibility rules" (what rules? for what?) |
| `rule-set` | "Detect and prevent React re-render performance issues — unnecessary renders, missing memo, expensive computations in render" | "Performance" (performance of what?) |
| `architecture` | "Define project folder structure for chosen architecture (FSD/atomic/layered/clean) with layer boundaries and import rules" | "Architecture styles" (which styles? for what decision?) |

**Rules**:
- MUST start with a verb: Generate, Enforce, Define, Validate, Create, Configure
- MUST be specific enough that an agent knows what to DO with this specialist
- MUST NOT be just the specialist name rephrased
- Max 1 sentence (concise — not a paragraph)

### 4.16 Activation Trigger (v2.0)

Concrete answer to: **WHEN should the system load this specialist?**

**Format**: Structured trigger conditions.

| Trigger Type | Format | Example |
|-------------|--------|---------|
| **File-based** | `files: {glob}` | `files: **/hooks/**/*.ts, **/hooks/**/*.tsx` |
| **Keyword-based** | `keywords: {word1}, {word2}` | `keywords: customHook, useEffect, hookExtraction` |
| **Phase-based** | `phase: {workflow-phase}` | `phase: /plan, /design --basic` |
| **Combined** | Multiple triggers (OR logic) | `files: **/hooks/**; keywords: customHook, useReducer` |

**Rules by type**:

| Specialist Type | Required Triggers | Example |
|----------------|-------------------|---------|
| `code` | `files:` (primary) + `keywords:` (secondary) | `files: **/store/**; keywords: stateColocation, zustand` |
| `rule-set` | `files:` (what files to check) + `keywords:` (when reviewing) | `files: **/components/**/*.tsx; keywords: a11y, aria, keyboard` |
| `architecture` | `phase:` (primary) + `keywords:` (secondary) | `phase: /plan, /design; keywords: folderStructure, layerBoundary` |

**Anti-pattern**: `keywords: react` — too broad, matches everything. Keywords must be specific to THIS specialist's domain.

### 4.17 Cross-Specialist Dependencies (v2.3)

Specialists often reference or depend on other specialists. These dependencies affect load order, delegation, and architecture compliance.

**Types of cross-specialist relationships**:

| Relationship | Direction | Example |
|-------------|-----------|---------|
| **Delegates to** | This specialist → other specialist | nl-to-sql delegates LLM client setup to llm-integration specialist |
| **Consumed by** | Other specialist → this specialist | llm-integration consumed by nl-to-sql, chatbot, summarization |
| **Architecture governs** | Architecture specialist → code specialists | clean-architecture governs all code specialists via layer rules |
| **Variant restricts** | Variant-specific → ALL | reactive-r2dbc replaces standard-jpa when variant is Reactive |

**Documentation rules**:
- Use `## SCOPE > What You DON'T Handle` section to list delegation targets
- Format: `{concern} → Delegate to {specialist-name}-specialist`
- Use `## DECISION TREE` to show routing between specialists
- Do NOT create circular dependencies (A delegates to B, B delegates to A)

**Architecture compliance chain**:
```
Architecture specialist (defines layer rules)
    ↓ governs
Code specialists (MUST comply with layer rules)
    ↓ validated by
Rule-set specialists (checks compliance during /validate)
```

**Example** (from analytics folder):
```markdown
## SCOPE > What You DON'T Handle
- NL-to-SQL / text-to-query → Delegate to nl-to-sql-specialist
- LLM API client setup → Delegate to llm-integration-specialist
- Database schema design → Delegate to migration-specialist
```

---

## 5. N/A Policy

`N/A` is a signal that analysis was NOT done. It is acceptable ONLY when:

| Field | N/A Acceptable? | When |
|-------|----------------|------|
| Layer | NEVER | Always has a layer |
| Directory Pattern | NEVER | Always maps to a directory |
| Variant | NEVER | At minimum, `ALL` |
| Pattern Numbers | NEVER | Always has patterns |
| Source Paths | NEVER | Always has target paths |
| File Count | NEVER | Estimate if exact count unknown |
| Naming Convention | Only for rule-set specialists | Must explain: "N/A (enforcement rules on existing components, not new file creation)" |
| Imports From | Only for rule-set specialists | Must explain: "N/A (rule set applied to components, not a code module)" |
| Cannot Import | Only for test + rule-set specialists | Must explain why |
| ~~Framework~~ | DEPRECATED v2.1 | Derived from stack folder |
| ~~Architecture~~ | DEPRECATED v2.1 | Derived from stack config |
| ~~Implementation Patterns~~ | DEPRECATED v2.1 | Keywords moved to Activation Trigger |
| Dependencies (v2.1) | NEVER | At minimum, `None (uses framework core only)` |
| When To Use (v2.1) | NEVER | Every specialist has a use case |
| Source Skeleton (v2.1) | Only for rule-set specialists | Must explain: "N/A (enforcement rules, no files created)" |
| Imported By | Only for test + rule-set | Must explain |
| Specialist Type | NEVER | Must be exactly one of: `code`, `rule-set`, `architecture` |
| Purpose | NEVER | Every specialist must justify its existence |
| Activation Trigger | NEVER | Every specialist must define when it activates |

**Key principle**: Bare `N/A` without justification is ALWAYS a spec violation. If `N/A` is truly correct, explain WHY.

---

## 6. Architecture Specialist Enforcement

> Source: FIX-FRONTEND-SPECIALIST-ENFORCEMENT — 1 heading mismatch caused 6-failure cascade.

### 6.1 Required: 4 Parser-Compatible Headings

Every specialist with `Specialist Type: architecture` MUST include these **exact headings**:

```markdown
## Architecture: Folder Tree
## Architecture: Dependency Rules
## Architecture: File Type Mapping
## Architecture: Feature Completeness
```

**Parser regex** (from `context-loading.md`):
```javascript
/##\s*Architecture:\s*Folder Tree[^\n]*\n([\s\S]*?)(?=\n##\s*Architecture:|\n##\s*[A-Z]|\n---)/i
/##\s*Architecture:\s*Dependency Rules[^\n]*\n([\s\S]*?)(?=\n##\s*Architecture:|\n##\s*[A-Z]|\n---)/i
/##\s*Architecture:\s*File Type Mapping[^\n]*\n([\s\S]*?)(?=\n##\s*Architecture:|\n##\s*[A-Z]|\n---)/i
/##\s*Architecture:\s*Feature Completeness[^\n]*\n([\s\S]*?)(?=\n##\s*Architecture:|\n##\s*[A-Z]|\n---)/i
```

**Content rules**:
- `Dependency Rules` MUST include `| From | Can Import | Cannot Import |` table + `FORBIDDEN:` section
- `File Type Mapping` MUST include `| File Type | Layer | Path Pattern |` table
- `Feature Completeness` MUST have checkbox lists (`- [ ]`)

### 6.2 Required: _INDEX.md Architecture Master Entry

Parser patterns (any of these formats):
```
| ... Architecture Master ... | `architecture/{filename}.md` |     // backtick (recommended)
**[{filename}.md](./architecture/{filename}.md)**                  // markdown link
| ... Architecture Master ... | architecture/{filename}.md |       // bare path
```

### 6.3 Architecture Activation Trigger

Architecture specialists MUST use `phase: ALL`:
```markdown
| **Activation Trigger** | phase: ALL (/plan, /execute, /validate, /design); keywords: architecture, folder, path |
```

---

## 7. Stack Config Registration

Every specialist MUST be registered in `stack-{name}.json`. Without registration, `specialist-load.js` cannot discover it.

| Rule | Description |
|------|-------------|
| **R1** | Every specialist file MUST appear in `specialistGroups` or variant `specialists` map |
| **R2** | `totalSpecialists` MUST match actual file count |
| **R3** | `architectureMaster` MUST exist if architecture specialist exists |
| **R4** | Update BOTH stack config AND `_INDEX.md` when adding specialists |

---

## 8. Validation

### 8.1 Automated Checks

```bash
node core/cli/ops.js specialist-validate --file <specialist.md>
```

| # | Check | Severity |
|---|-------|----------|
| 1 | `## Architecture Metadata` section exists | CRITICAL |
| 2 | All 16 mandatory fields present | CRITICAL |
| 3 | No bare `N/A` without justification | CRITICAL |
| 4 | `Pattern Numbers` format is `N.N–N.N` | ERROR |
| 5 | `Source Paths` contains at least one glob | ERROR |
| 6 | `Layer` is not bare `ALL` without justification | ERROR |
| 7 | `Specialist Type` is one of: `code`, `rule-set`, `architecture` | CRITICAL |
| 8 | `Purpose` starts with a verb | ERROR |
| 9 | `Activation Trigger` has `files:`, `keywords:`, or `phase:` | ERROR |
| 10 | Type-consistency: `code` → Naming Convention NOT N/A | ERROR |
| 11 | If `architecture`: 4 `## Architecture:` headings present (§6.1) | CRITICAL |
| 12 | If `architecture`: Dependency Rules has 3-column table | CRITICAL |
| 13 | If `architecture`: Dependency Rules has `FORBIDDEN:` section | ERROR |
| 14 | If `architecture`: File Type Mapping has 3-column table | ERROR |
| 15 | If `architecture`: Feature Completeness has checkbox lists | ERROR |
| 16 | If `architecture`: Activation Trigger includes `phase: ALL` | ERROR |
| 17 | Stack _INDEX.md has "Architecture Master" entry | ERROR |
| 18 | Specialist registered in `stack-{name}.json` (§7) | ERROR |
| 19 | `totalSpecialists` matches actual file count | WARN |
| 20 | `Cannot Import` references LAYERS, not packages | WARN |
| 21 | `Imports From` references LAYERS, not specialist names | WARN |
| 22 | No legacy JSON `## Metadata` block | ERROR |
| 23 | `code` type has `files:` in Activation Trigger | ERROR |

### 8.2 Quality Gate

- Before generating specialist files: validate template against this spec
- After generating: validate output against this spec
- In `/validate` Pass 1: parse metadata and check field completeness

---

## 9. Per-Stack & Integration References

| Document | Content | When to read |
|----------|---------|-------------|
| [SPEC-METADATA-STACKS.md](./SPEC-METADATA-STACKS.md) | Per-stack examples (Java, React, C#, Python, NestJS, Flutter, Django, Odoo), type examples, migration status | Creating specialist for a specific stack |
| [SPEC-INTEGRATION.md](./SPEC-INTEGRATION.md) | 3-layer enforcement (Rules ↔ Specialists ↔ Guards), field mapping, drift detection, alignment rules | Auditing system, adding new stacks |

---

*SPEC-METADATA — Specialist Metadata Specification v2.4 — EPS Framework*

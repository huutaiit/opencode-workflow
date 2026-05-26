# SPEC-METADATA-STACKS — Per-Stack Adaptation Guide

> Per-stack metadata examples, type examples, and migration status.
> **Read [SPEC-METADATA.md](./SPEC-METADATA.md) first** — core rules (16 fields, N/A policy, validation).
> This file: look up YOUR stack → copy the example → adapt for your specialist.

---

## 6.1 Java Spring Boot (reference standard)

```markdown
| **Layer** | Domain |
| **Package** | `{rootPackage}.domain.{moduleCode}` |
| **Maven Module** | common |
| **Variant** | Standard (JPA) |
| **Pattern Numbers** | 4.1–4.N |
| **Source Paths** | `{sourceRoot}/domain/{moduleCode}/` |
| **File Count** | ~100 entities |
| **Naming Convention** | `{DomainPrefix}{Type}{Entity}.java` |
| **Base Class** | `AbstractAuditingEntity<Long>` |
| **Imports From** | (nothing — innermost layer) |
| **Cannot Import** | Application, Infrastructure, REST |
| **Dependencies** | None (uses Spring Data JPA core) |
| **When To Use** | Domain entity creation with audit fields, validation, JPA relationships |
| **Source Skeleton** | `{sourceRoot}/domain/{moduleCode}/{DomainPrefix}M{Entity}.java`, `{sourceRoot}/domain/{moduleCode}/{DomainPrefix}M{Entity}Callback.java` |
| **Specialist Type** | code |
| **Purpose** | Generate JPA domain entities with audit fields, validation constraints, and relationship mappings |
| **Activation Trigger** | files: **/domain/**/*.java; keywords: entity, domainModel, jpaEntity |
```

Additional Java-specific fields (beyond the 16 standard):
- **Maven Module**: maps to multi-module project structure
- **Base Class**: Java uses inheritance; important for code generation

#### Java Spring Boot — v2.1 Migration Example (kafka-specialist)

**BEFORE** (v2.0 — 3 redundant fields):
```markdown
| **Framework** | java-spring-boot |
| **Architecture** | clean-architecture |
| **Implementation Patterns** | N/A |
```

**AFTER** (v2.1 — 3 technology context fields):
```markdown
| **Dependencies** | org.springframework.kafka:spring-kafka:3.x, org.springframework.cloud:spring-cloud-stream:2024.0 |
| **When To Use** | Event-driven async communication between microservices, topic-based pub/sub, multi-partition processing |
| **Source Skeleton** | `{sourceRoot}/infrastructure/kafka/{Topic}Producer.java`, `{sourceRoot}/infrastructure/kafka/{Topic}Consumer.java`, `{sourceRoot}/infrastructure/kafka/config/KafkaConfig.java` |
```

---

## 6.2 React / Next.js (shared specialists)

```markdown
| **Layer** | Presentation, Core |
| **Directory Pattern** | `{hooks}/` — clean: `src/presentation/hooks/`, FSD: `src/shared/hooks/`, layered: `src/hooks/` |
| **Variant** | ALL |
| **Pattern Numbers** | 101.1–101.12 |
| **Source Paths** | `**/hooks/**/*.ts`, `**/hooks/**/*.tsx` |
| **File Count** | 15–50 custom hooks per project |
| **Naming Convention** | `use{Name}.ts`, `use{Name}.tsx` |
| **Imports From** | Domain (entity types/interfaces), Infrastructure (store selectors) |
| **Imported By** | Presentation (components consume hooks) |
| **Cannot Import** | Pages/App routing, other hooks' internal state |
| **Dependencies** | None (uses React core hooks) |
| **When To Use** | Custom hook extraction, shared stateful logic, effect encapsulation |
| **Source Skeleton** | `{hooks}/use{Name}.ts`, `{hooks}/__tests__/use{Name}.test.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate custom React hooks with proper dependency arrays, cleanup functions, and TypeScript typing |
| **Activation Trigger** | files: **/hooks/**/*.ts, **/hooks/**/*.tsx; keywords: customHook, useEffect, hookExtraction, effectCleanup |
```

React-specific adaptations:
- **Directory Pattern** replaces **Package** (React uses directories, not packages)
- **Imported By** replaces **Base Class** (React uses composition, not inheritance)
- Source Paths use globs to cover multiple architectures

---

## 6.3 C# .NET Core

```markdown
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Project}.WebAPI.Controllers` |
| **Variant** | simplified-clean |
| **Pattern Numbers** | 1.1–1.20 |
| **Source Paths** | `**/Controllers/**/*.cs`, `**/Endpoints/**/*.cs` |
| **File Count** | 10–30 controller files |
| **Naming Convention** | `{Entity}Controller.cs`, `{Entity}Endpoint.cs` |
| **Imports From** | Application (IService interfaces), Domain (DTOs) |
| **Imported By** | None (HTTP entry point — terminal) |
| **Cannot Import** | Infrastructure (repositories), Domain (entities directly) |
| **Dependencies** | Microsoft.AspNetCore.Mvc.Core |
| **When To Use** | REST API endpoint creation with routing, model binding, validation |
| **Source Skeleton** | `{Project}.WebAPI/Controllers/{Entity}Controller.cs`, `{Project}.WebAPI/Endpoints/{Entity}Endpoint.cs` |
| **Specialist Type** | code |
| **Purpose** | Generate ASP.NET Core controllers with routing, model binding, and standardized error responses |
| **Activation Trigger** | files: **/Controllers/**/*.cs, **/Endpoints/**/*.cs; keywords: apiController, endpointRouting, modelValidation |
```

C#-specific adaptations:
- **Namespace Pattern** replaces **Package** (C# uses namespaces, not packages)
- **Project** field may be added (maps to .csproj in solution)

---

## 6.4 Python FastAPI / Django

```markdown
| **Layer** | Presentation |
| **Module Pattern** | `{app}.api.routes.{module}` |
| **Variant** | ALL |
| **Pattern Numbers** | 1.1–1.N |
| **Source Paths** | `**/routes/**/*.py`, `**/api/**/*.py` |
| **File Count** | 5–20 route files |
| **Naming Convention** | `{module}_routes.py`, `{module}_router.py` |
| **Imports From** | Application (services), Domain (schemas/models) |
| **Imported By** | Main app (router registration) |
| **Cannot Import** | Infrastructure (DB sessions directly) |
| **Dependencies** | fastapi>=0.110, pydantic>=2.0 |
| **When To Use** | REST API route creation with dependency injection and Pydantic response models |
| **Source Skeleton** | `{app}/api/routes/{module}_routes.py`, `{app}/api/schemas/{module}_schema.py` |
| **Specialist Type** | code |
| **Purpose** | Generate FastAPI route handlers with dependency injection, Pydantic response models, and error handling |
| **Activation Trigger** | files: **/routes/**/*.py, **/api/**/*.py; keywords: routeHandler, dependencyInjection, responseModel, fastApiEndpoint |
```

Python-specific adaptations:
- **Module Pattern** replaces **Package** (Python uses module paths)

---

## 6.5 Specialist Type Examples (v2.0)

Three concrete examples showing how the 3 identity fields differ by type.

#### Type: `code` — React Hooks Patterns (101.x)

```markdown
| **Specialist Type** | code |
| **Purpose** | Generate custom React hooks with proper dependency arrays, cleanup functions, and TypeScript typing |
| **Activation Trigger** | files: **/hooks/**/*.ts, **/hooks/**/*.tsx; keywords: customHook, useEffect, hookExtraction, useReducer |
```

**Why `code`**: This specialist produces FILES — `use{Name}.ts` hooks. It has naming conventions, import rules, and concrete code patterns.

#### Type: `rule-set` — React Accessibility (104.x)

```markdown
| **Specialist Type** | rule-set |
| **Purpose** | Enforce WCAG 2.1 AA compliance on React components — validate aria labels, keyboard navigation, focus management, and semantic HTML |
| **Activation Trigger** | files: **/components/**/*.tsx, **/pages/**/*.tsx; keywords: a11y, aria, keyboard, focusManagement, wcag |
```

**Why `rule-set`**: This specialist does NOT create files. It REVIEWS existing components and flags violations. Used during `/validate` and code review, not `/execute`.

#### Type: `architecture` — React Architecture Styles (116.x)

```markdown
| **Specialist Type** | architecture |
| **Purpose** | Define project folder structure for chosen architecture (FSD/atomic/layered/clean) with layer boundaries, import rules, and migration paths |
| **Activation Trigger** | phase: /plan, /design --basic; keywords: folderStructure, layerBoundary, architectureChoice, fsd, atomicDesign |
```

**Why `architecture`**: This specialist makes DESIGN DECISIONS — which architecture to use, how to organize folders. It's input for `/plan` and `/design`, not for file generation.

#### Selection Priority During `/execute`

When multiple specialists match a step, type determines priority:

```
1. code specialist (score +20)   → Agent generates code following patterns
2. rule-set specialist (score +10) → Agent validates generated code against rules
3. architecture specialist (score +5) → Agent references for structural decisions
```

A single step may load 1 `code` specialist (primary) + 1 `rule-set` specialist (secondary). Architecture specialists are rarely loaded during `/execute` — they serve `/plan` and `/design`.

---

## 6.6 Legacy Format Migration

Legacy JSON `## Metadata` format → replace with `## Architecture Metadata` table. Parser only recognizes table format.

#### Migration Status

| Stack | Total | Migrated | % |
|-------|-------|----------|---|
| java-springboot | 87 | 87 | 100% |
| python-fastapi | 57 | 57 | 100% |
| reactjs-fsd | 37 | 37 | 100% |
| flutter-dart | 66 | 66 | 100% |
| python-odoo | 35 | 35 | 100% |
| typescript-nextjs | — | — | TBD |
| nestjs | — | — | TBD |
| csharp-dotnet | — | — | TBD |
| python-django | — | — | TBD |

---

## 6.7 Additional Per-Stack Adaptation Guides

### 6.7.1 NestJS

```markdown
| **Layer** | Application |
| **Directory Pattern** | `src/application/{feature}/` |
| **Variant** | ALL |
| **Naming Convention** | `{action}-{entity}.use-case.ts` → `{Action}{Entity}UseCase` with `execute()` |
| **Imports From** | Domain (entities, ports, value objects) |
| **Cannot Import** | Infrastructure (use case must not import repositories directly), Presentation (no HTTP context) |
| **Dependencies** | `@nestjs/common` (for @Injectable, @Inject) |
| **Specialist Type** | code |
| **Activation Trigger** | files: src/application/**/*.use-case.ts; keywords: useCase, execute, injectable, inject |
```

NestJS-specific: Clean Architecture 4-Layer, UseCase pattern (not Service), Port/Adapter DI with Symbol tokens.

### 6.7.2 Flutter/Dart

```markdown
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/` |
| **Variant** | ALL |
| **Naming Convention** | `{feature}_page.dart`, `{feature}_widget.dart`, `{feature}_controller.dart` |
| **Imports From** | Domain (entities, value objects), Application (use cases, BLoC) |
| **Cannot Import** | Infrastructure (no direct repository access from UI) |
| **Dependencies** | `flutter_bloc: ^8.0` or `riverpod: ^2.0` |
| **Specialist Type** | code |
| **Activation Trigger** | files: lib/features/**/presentation/**/*.dart; keywords: statefulWidget, bloc, riverpod |
```

### 6.7.3 Python Django

```markdown
| **Layer** | Views |
| **Directory Pattern** | `{app}/views/`, `{app}/api/` |
| **Variant** | ALL |
| **Naming Convention** | `views.py`, `{resource}_views.py`, `serializers.py` |
| **Imports From** | Models (Django ORM), Forms, Services |
| **Cannot Import** | Templates directly, Management commands |
| **Dependencies** | `djangorestframework>=3.14` |
| **Specialist Type** | code |
| **Activation Trigger** | files: **/views/**/*.py; keywords: apiView, viewSet, serializer |
```

### 6.7.4 Python Odoo 18 Enterprise

Odoo has a **unique architecture** — ORM-centric, module-based, dual frontend (XML views + OWL JS).

##### Odoo Layer System

| Layer | Directory | Description |
|-------|-----------|-------------|
| **Model** | `{module}/models/` | ORM models — fields, business logic, computed fields, constraints |
| **View** | `{module}/views/` | XML view definitions — form, list, kanban, search |
| **OWL** | `{module}/static/src/js/`, `{module}/static/src/views/` | Client-side JS — OWL components, ListController, patches, services |
| **Controller** | `{module}/controllers/` | HTTP endpoints — REST API, RPC |
| **Report** | `{module}/report/` | PDF/HTML reports — QWeb server-side |
| **Security** | `{module}/security/` | Access rights CSV + record rules XML |
| **Business** | `{module}/data/`, `{module}/wizard/` | Cron jobs, wizards, mail, workflows |
| **Infrastructure** | `{module}/`, `odoo.conf` | Module structure, deployment |
| **Testing** | `{module}/tests/` | Unit + integration tests |

**Key difference**: Model layer = Domain + Application + Repository (all in one). No separate service/repository layer.

##### Odoo Metadata Examples

**Backend (Model)**:
```markdown
| **Layer** | Model |
| **Directory Pattern** | `{module}/models/{model_name}.py` |
| **Variant** | enterprise |
| **Imports From** | `odoo.models`, `odoo.fields`, `odoo.api` |
| **Cannot Import** | N/A (foundational) |
| **Dependencies** | None (uses Odoo core only) |
| **Specialist Type** | code |
```

**Frontend (OWL)**:
```markdown
| **Layer** | OWL |
| **Directory Pattern** | `{module}/static/src/js/{component}/` |
| **Variant** | enterprise |
| **Imports From** | `@odoo/owl`, `@web/core/registry`, `@web/core/utils/hooks` |
| **Cannot Import** | Python model files (JS runs client-side only) |
| **Dependencies** | `@odoo/owl:2.x` (bundled with Odoo) |
| **Specialist Type** | code |
```

##### Odoo-Specific Adaptations

| Adaptation | Detail |
|-----------|--------|
| **Variant = enterprise** | All specialists target Enterprise (Community is subset) |
| **Imports From — dual** | Backend: `odoo.*`. Frontend: `@odoo/owl`, `@web/*` |
| **Cannot Import — asymmetric** | Model: N/A (foundational). OWL: Python files. View: N/A (declarative) |
| **No additional fields** | Flat module structure — 16 standard fields sufficient |

##### Odoo Specialist Inventory (105+ specialists, range 401–509)

| Group | Count | Pattern Range |
|-------|-------|--------------|
| Core ORM | 9 | 401–409 |
| Extension | 5 | 410–414 |
| UI | 6 | 415–417, 507–509 |
| Data | 4 | 418–421 |
| Business | 3 | 422–424 |
| Testing | 2 | 425–426 |
| Infra | 3 | 427–428, 506 |
| Domain | 73 | 429–505 |

---

*SPEC-METADATA-STACKS — Per-Stack Adaptation Guide | Companion to [SPEC-METADATA.md](./SPEC-METADATA.md)*

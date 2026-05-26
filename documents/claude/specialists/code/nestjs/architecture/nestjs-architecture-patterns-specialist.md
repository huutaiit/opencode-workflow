# NestJS Architecture Patterns Specialist — Architecture
# NestJSアーキテクチャパターンスペシャリスト — アーキテクチャ
# Chuyen Gia Pattern Kien Truc NestJS — Kien Truc

**Version**: 1.0.0
**Technology**: NestJS 10+ Architecture Patterns
**Aspect**: Architecture Patterns
**Category**: architecture
**Purpose**: Knowledge provider for NestJS architectural patterns — modular monolith, microservices, hexagonal, layered, feature-sliced, and when to use each

---

## Metadata

```json
{
  "id": "nestjs-architecture-patterns-specialist",
  "technology": "NestJS 10+ Architecture Patterns",
  "aspect": "Architecture Patterns",
  "category": "architecture",
  "subcategory": "nestjs",
  "lines": 330,
  "token_cost": 2000,
  "version": "1.0.0",
  "evidence": [
    "E1: Architecture patterns — modular monolith, microservices, hexagonal",
    "E2: NestJS module system — natural fit for modular architecture",
    "E3: Migration patterns — monolith to microservices evolution"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (architectural guidance) |
| **Variant** | ALL |
| **Pattern Numbers** | 261.1–261.6 |
| **Directory Pattern** | N/A (architectural guidance — cross-cutting) |
| **Dependencies** | none (architectural guidance) |
| **When To Use** | Architecture design decisions and patterns selection |
| **Source Skeleton** | N/A (guidance only, applies to project structure decisions) |
| **Specialist Type** | code |
| **Purpose** | NestJS architecture patterns — microservices, monolith, modular monolith decision framework |
| **Activation Trigger** | phase: /design, /plan; keywords: architecturePattern, microservices, monolith, modular |

---

## Role

You are a **NestJS Architecture Patterns Specialist**. You supply guidance on choosing and implementing architectural patterns in NestJS — modular monolith, microservices, hexagonal/ports-adapters, layered, and feature-sliced architectures with their trade-offs.

---

## Patterns

### Pattern 261.1: Modular Monolith

**Description**: Single deployable, internally modular — best starting point.

```
src/
├── modules/
│   ├── order/           # Feature module (self-contained)
│   │   ├── order.module.ts
│   │   ├── order.controller.ts
│   │   ├── order.service.ts
│   │   ├── order.repository.ts
│   │   ├── order.entity.ts
│   │   └── dto/
│   ├── payment/
│   ├── user/
│   └── notification/
├── shared/              # Cross-cutting utilities
└── app.module.ts        # Root module imports all feature modules
```

**When to use**: Starting projects, teams ≤5, moderate complexity
**Pros**: Simple deployment, easy debugging, refactor freely
**Cons**: Scales vertically only, one language/runtime

---

### Pattern 261.2: Microservices

**Description**: Independent services, each with own DB, communicate via gRPC/RabbitMQ.

```
apps/
├── auth-service/        # NestJS microservice (own DB)
├── lending-service/     # NestJS microservice (own DB)
├── risk-service/        # NestJS microservice (own DB)
├── notification-service/
└── api-gateway/         # BFF — aggregates services

# Communication:
# External (clients → gateway): REST/GraphQL
# Internal (service → service): gRPC for sync, RabbitMQ for async
```

**When to use**: Independent scaling, team autonomy, >5 devs
**Pros**: Independent deployment, technology freedom, fault isolation
**Cons**: Network complexity, distributed transactions, debugging difficulty

---

### Pattern 261.3: Hexagonal (Ports & Adapters)

**Description**: Business logic at center, adapters on the edges.

```
src/
├── core/                # Business logic (no framework deps)
│   ├── domain/          # Entities, value objects
│   ├── ports/           # Input ports (use cases) + Output ports (interfaces)
│   └── services/        # Domain services
├── adapters/
│   ├── driving/         # Input adapters (controllers, CLI, message consumers)
│   │   ├── rest/
│   │   └── grpc/
│   └── driven/          # Output adapters (DB, cache, external APIs)
│       ├── persistence/
│       ├── messaging/
│       └── external/
└── config/              # Framework configuration
```

**When to use**: Complex domain, multiple interfaces (REST + gRPC + CLI)
**Pros**: Core is testable without infrastructure, easy to swap adapters
**Cons**: More files, more indirection, learning curve

---

### Pattern 261.4: Decision Matrix

| Criteria | Modular Monolith | Microservices | Hexagonal |
|----------|-----------------|---------------|-----------|
| Team size | 1-5 | 5+ | 2+ |
| Deployment | Single | Multiple | Either |
| Complexity | Low-Medium | High | Medium |
| Testing | Easy | Hard (distributed) | Easy (core testable) |
| Scaling | Vertical | Horizontal per service | Either |
| Best for | MVPs, startups | Enterprise, high scale | Complex domain logic |

---

### Pattern 261.5: Monolith to Microservices Migration

**Description**: Extract services from modular monolith gradually.

```
Phase 1: Modular Monolith
  - All features in one NestJS app
  - Modules communicate via direct import

Phase 2: Event-Based Decoupling
  - Replace direct imports with events (@nestjs/event-emitter)
  - Modules communicate via events, not imports

Phase 3: Extract Service
  - Move module to separate NestJS app
  - Replace in-process events with RabbitMQ messages
  - Extract DB tables to service's own database

Phase 4: Full Microservices
  - Each service independently deployable
  - API gateway aggregates external-facing APIs
```

---

### Pattern 261.6: Feature-Sliced Architecture

**Description**: Organize by feature (vertical slice), not by technical layer.

```
src/
├── features/
│   ├── create-order/
│   │   ├── create-order.controller.ts
│   │   ├── create-order.use-case.ts
│   │   ├── create-order.dto.ts
│   │   └── create-order.test.ts
│   ├── cancel-order/
│   │   ├── cancel-order.controller.ts
│   │   ├── cancel-order.use-case.ts
│   │   └── cancel-order.test.ts
│   └── list-orders/
├── shared/
│   ├── entities/
│   └── repositories/
└── app.module.ts
```

**When to use**: Rapid development, feature-focused teams
**Pros**: Each feature is self-contained, easy to find related code
**Cons**: Shared entity management harder, may duplicate code

---

## Best Practices

- Start with modular monolith — extract to microservices when needed
- Module boundaries = bounded contexts — one module per domain concept
- Never share databases between microservices — each service owns its data
- Events for async communication, gRPC for sync between services
- Feature modules should be independently testable with mocked dependencies

---

## Abnormal Case Patterns

1. **Distributed monolith** — Microservices that share DB and deploy together. Fix: either merge or truly separate data.
2. **Big ball of mud** — No module boundaries, everything imports everything. Fix: enforce module exports, use events.
3. **Premature microservices** — Split into 10 services on day 1. Fix: start modular monolith, extract when proven need.
4. **Shared entity between services** — Two services modify same table. Fix: one service owns, others consume via API/events.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (261.1-261.6)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Architecture Patterns Specialist — Architecture | EPS v3.2*

# Test Plan Specialist — NestJS Unit Testing (Strategy + Routing)
# テストプランスペシャリスト — NestJSユニットテスト（戦略＋ルーティング）
# Chuyen Gia Ke Hoach Test — Unit Test NestJS (Chien Luoc + Routing)

**Version**: 2.0.0
**Stack**: TypeScript/NestJS | **Type**: Unit Testing — Strategy Hub
**Purpose**: Unit test strategy for NestJS Clean Architecture — layer routing table, coverage targets, mock strategy, test naming conventions. Routes to layer-specific test plan specialists for detailed patterns.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (unit tests span all layers) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-UNIT |
| **Directory Pattern** | `src/**/*.spec.ts` |
| **Naming Convention** | `{file-under-test}.spec.ts` (co-located with source) |
| **Imports From** | ALL (test files import SUT from any layer) |
| **Imported By** | N/A (test files are not imported) |
| **Cannot Import** | N/A |
| **Dependencies** | jest, @nestjs/testing, ts-jest |
| **When To Use** | Every feature — unit test strategy routing based on which layers the feature touches |
| **Source Skeleton** | `src/{layer}/{feature}/**/*.spec.ts` |
| **Specialist Type** | code |
| **Purpose** | Unit test strategy hub — routes DD/Plan/Execute to correct layer-specific test plan |
| **Activation Trigger** | files: **/*.spec.ts; keywords: unitTest, jest, mock, coverage, testStrategy |

---

## Layer Routing Table

When generating test code, load the appropriate layer-specific TPS:

| Layer | Test Plan | File | Load When |
|-------|-----------|------|-----------|
| Domain | TPS-NESTJS-UNIT-DOMAIN | `tps-nestjs-unit-domain.md` | Testing entities, VOs, domain exceptions, domain events |
| Application | TPS-NESTJS-UNIT-APP | `tps-nestjs-unit-application.md` | Testing use cases, mappers, DTOs, event emission |
| Infrastructure | TPS-NESTJS-UNIT-INFRA | `tps-nestjs-unit-infrastructure.md` | Testing repositories, cache, HTTP clients, auth strategies |
| Presentation | TPS-NESTJS-UNIT-PRES | `tps-nestjs-unit-presentation.md` | Testing controllers, guards, pipes, interceptors, filters |

**Routing logic for specialist-load**:
```
source-path contains "domain/"         → load TPS-NESTJS-UNIT-DOMAIN
source-path contains "application/"    → load TPS-NESTJS-UNIT-APP
source-path contains "infrastructure/" → load TPS-NESTJS-UNIT-INFRA
source-path contains "presentation/"   → load TPS-NESTJS-UNIT-PRES
source-path contains ".spec.ts"        → infer layer from directory, load matching TPS
```

---

## Unit Test Strategy Overview

### What to Unit Test (per layer)

| Layer | Test Focus | DI Strategy | Framework |
|-------|-----------|-------------|-----------|
| **Domain** | Entity invariants, VO validation, state transitions, domain events | **No DI** — pure TypeScript `new Entity()` | Jest only |
| **Application** | UseCase orchestration, mapper accuracy, DTO validation, event emission | **Mock ports** via `{ provide: TOKEN, useValue: mock }` | Jest + @nestjs/testing |
| **Infrastructure** | Repository queries, cache hit/miss, HTTP client responses, auth strategy | **Test containers** for DB/Redis, **mock HTTP** for external | Jest + testcontainers |
| **Presentation** | Controller routing, guard authorization, pipe validation, interceptor behavior, filter mapping | **Mock use cases** — thin layer delegation | Jest + @nestjs/testing |

### What NOT to Unit Test

- Framework internals (NestJS DI resolution, TypeORM query builder internals)
- Third-party library behavior (class-validator rules, Passport internals)
- Integration flows (API → DB → response) → use integration tests

---

## Coverage Targets (Aggregate)

| Layer | Target | Rationale |
|-------|--------|-----------|
| Domain entities + VOs | **≥95%** | Core business rules — highest coverage |
| Application use cases | **≥90%** | Business orchestration — all success + error paths |
| Application mappers | **≥100%** | Data accuracy — one wrong field = production bug |
| Application DTOs | **≥90%** | Input validation — valid + each invalid field |
| Infrastructure repos | **≥80%** | Covered deeper by integration tests |
| Infrastructure clients | **≥90%** | External service error handling |
| Presentation controllers | **≥80%** | Thin — verify delegation, not logic |
| Presentation guards | **≥95%** | Security-critical — every role combination |
| Presentation pipes | **≥95%** | Input sanitization — every edge case |
| Presentation filters | **≥100%** | Every domain exception → HTTP status mapping |
| **Overall** | **≥85%** | Weighted average across layers |

---

## Mock Strategy (Clean Architecture DI)

### Port Mock Pattern (Application layer)

```typescript
// Standard mock for domain port — used in ALL application layer tests
const mockOrderRepo: jest.Mocked<OrderRepositoryPort> = {
  findById: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  findByCustomer: jest.fn(),
};

// Wire via NestJS test module
const module = await Test.createTestingModule({
  providers: [
    CreateOrderUseCase,
    { provide: ORDER_REPOSITORY, useValue: mockOrderRepo },
    { provide: EventEmitter2, useValue: { emit: jest.fn() } },
  ],
}).compile();
```

### Service Mock Pattern (Presentation layer)

```typescript
// Mock use case for controller tests
const mockCreateOrder: jest.Mocked<CreateOrderUseCase> = {
  execute: jest.fn(),
};

const module = await Test.createTestingModule({
  controllers: [OrderController],
  providers: [
    { provide: CreateOrderUseCase, useValue: mockCreateOrder },
  ],
}).compile();
```

### No-Mock Pattern (Domain layer)

```typescript
// Domain tests: NO mocks, NO DI — pure TypeScript
const order = Order.create('customer-1', [
  OrderItem.create('product-1', 2, Money.create(50, 'USD')),
]);
expect(order.total).toBe(100);
```

---

## Test Naming Convention

```typescript
// Pattern: should {expected behavior} [when {condition}]
describe('CreateOrderUseCase', () => {
  describe('execute()', () => {
    it('should create order with PENDING status', async () => { ... });
    it('should emit OrderCreatedEvent after save', async () => { ... });
    it('should throw InsufficientStockException when inventory unavailable', async () => { ... });
    it('should NOT save order when inventory reservation fails', async () => { ... });
  });
});

// Test ID convention for plan traceability:
// @DisplayName or it('T{step}.{seq}: ...') matches plan Section 3.1
it('T1.1: should create order with PENDING status', async () => { ... });
it('T1.2: should throw on empty items', async () => { ... });
```

---

## Test File Organization

```
src/
├── domain/order/entities/
│   ├── order.entity.ts
│   └── order.entity.spec.ts          ← co-located with source
├── application/order/
│   ├── create-order.use-case.ts
│   └── create-order.use-case.spec.ts ← co-located
├── infrastructure/persistence/
│   ├── order.repository.ts
│   └── order.repository.spec.ts      ← co-located (uses test containers)
└── presentation/controllers/
    ├── order.controller.ts
    └── order.controller.spec.ts       ← co-located
```

**Rule**: Test file ALWAYS co-located with source file (not in separate `__tests__/` directory).

---

## Anti-Patterns (Cross-Layer)

| # | Anti-Pattern | Layer | Why Wrong | Correct |
|---|-------------|-------|-----------|---------|
| 1 | Import real DB in use case test | Application | Tests infrastructure, not logic | Mock port |
| 2 | `Test.createTestingModule()` for domain entity | Domain | Domain is pure TS | Direct instantiation |
| 3 | Test mock call count without purpose | All | Fragile, tests implementation | Assert behavior outcomes |
| 4 | Shared mutable state between tests | All | Flaky, order-dependent | Fresh mock/state per test |
| 5 | Skip error path testing | All | Misses production failures | ≥40% abnormal test cases |
| 6 | Over-mocking (mock the SUT itself) | All | Tests nothing useful | Mock dependencies, not SUT |

---

## Jest Configuration

```javascript
// jest.config.ts
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/node_modules/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 },
  },
  // Parallel execution (safe — each test has isolated mocks)
  maxWorkers: '50%',
};
```

---

## Quality Checklist

- [ ] **Q1**: Layer routing table complete (domain, application, infrastructure, presentation)?
- [ ] **Q2**: Coverage targets per layer defined?
- [ ] **Q3**: Mock strategy per layer documented (no-mock, port-mock, service-mock)?
- [ ] **Q4**: Anti-patterns listed with corrections?

---

*Test Plan Specialist — NestJS Unit Testing (Strategy + Routing) v2.0 | EPS v10.0*

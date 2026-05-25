# Test Plan Specialist — Laravel Unit Testing (Strategy + Routing)
# テストプランスペシャリスト — Laravelユニットテスト（戦略＋ルーティング）
# Chuyen Gia Ke Hoach Test — Unit Test Laravel (Chien Luoc + Routing)

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Unit Testing Strategy
**Category**: test-plan
**Purpose**: Test plan for unit test strategy — layer routing, coverage targets, mock strategy, Pest + PHPUnit + Mockery tooling

---

## Metadata

```json
{
  "id": "tps-laravel-unit",
  "technology": "Laravel 11+ Testing",
  "aspect": "Unit Testing Strategy",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 280,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Pest PHP 3.x — expressive test syntax with Laravel plugin",
    "E2: PHPUnit 11.x — underlying test engine for Laravel 11",
    "E3: Mockery 1.6 — mock framework integrated via Laravel TestCase"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-UNIT |
| **Directory Pattern** | `tests/Unit/` |
| **Naming Convention** | `{Entity}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Unit test strategy hub — routes to layer-specific test plans |
| **Activation Trigger** | keywords: test, unit test, pest, phpunit, coverage, mock |

---

## Layer Routing Table

| Layer | Test Plan | File | Load When |
|-------|-----------|------|-----------|
| Domain | TPS-LARAVEL-UNIT-DOMAIN | `tps-laravel-unit-domain.md` | Testing entities, VOs, domain services, invariants |
| Application | TPS-LARAVEL-UNIT-APP | `tps-laravel-unit-application.md` | Testing services, actions, handlers, DTOs |
| Infrastructure | TPS-LARAVEL-UNIT-INFRA | `tps-laravel-unit-infrastructure.md` | Testing repositories, adapters, providers |
| Presentation | TPS-LARAVEL-UNIT-PRES | `tps-laravel-unit-presentation.md` | Testing controllers, form requests, middleware, resources |

**Routing logic for specialist-load**:
```
source-path contains "Domain/"         → load TPS-LARAVEL-UNIT-DOMAIN
source-path contains "Application/"    → load TPS-LARAVEL-UNIT-APP
source-path contains "Infrastructure/" → load TPS-LARAVEL-UNIT-INFRA
source-path contains "Http/"           → load TPS-LARAVEL-UNIT-PRES
```

---

## Unit Test Strategy Overview

### What to Unit Test (per layer)

| Layer | Test Focus | DI Strategy | Framework |
|-------|-----------|-------------|-----------|
| **Domain** | Entity invariants, VO validation, state transitions | **No DI** — pure PHP `new Entity()` | Pest only |
| **Application** | Service orchestration, action accuracy, DTO validation | **Mock interfaces** via Mockery | Pest + Mockery |
| **Infrastructure** | Repository contracts, adapter responses, provider bindings | **Laravel test helpers** for container | Pest + Laravel plugin |
| **Presentation** | Controller routing, form request rules, middleware, API resources | **Mock services** — thin layer | Pest + Laravel HTTP tests |

### What NOT to Unit Test

- Framework internals (Eloquent query builder, validation engine)
- Third-party package behavior (Spatie, Laravel Cashier internals)
- Integration flows (HTTP request -> DB -> response) -> use Feature tests

---

## Tooling: Pest + PHPUnit + Mockery

### Pest Configuration

```php
// tests/Pest.php
uses(Tests\TestCase::class)->in('Feature');
uses(Tests\TestCase::class)->in('Unit');

// Custom expectations
expect()->extend('toBeMoneyEqual', function (int $expected) {
    return $this->amount->equals($expected);
});
```

### PHPUnit Configuration

```xml
<!-- phpunit.xml -->
<phpunit colors="true" testdox="true">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <coverage>
        <include>
            <directory suffix=".php">app</directory>
        </include>
    </coverage>
</phpunit>
```

### Mockery Patterns

```php
// Port mock (Application layer)
$orderRepo = Mockery::mock(OrderRepositoryInterface::class);
$orderRepo->shouldReceive('save')->once()->andReturn($order);

// Spy (verify interaction without stubbing)
$eventDispatcher = Mockery::spy(EventDispatcherInterface::class);
// ...after SUT execution...
$eventDispatcher->shouldHaveReceived('dispatch')->with(OrderCreated::class);
```

---

## Coverage Targets (Aggregate)

| Layer | Target | Rationale |
|-------|--------|-----------|
| Domain entities + VOs | **>=95%** | Core business rules — highest coverage |
| Application services | **>=90%** | Business orchestration — all paths |
| Application DTOs | **>=90%** | Input validation — valid + invalid |
| Infrastructure repos | **>=80%** | Deeper coverage via Feature tests |
| Presentation controllers | **>=80%** | Thin — verify delegation |
| Presentation form requests | **>=95%** | Input validation — security critical |
| Presentation middleware | **>=95%** | Security — every branch |
| **Overall** | **>=85%** | Weighted average across layers |

---

## Test Naming Convention

```php
// Pest: descriptive closure-based naming
it('creates order with PENDING status', function () { ... });
it('throws InsufficientStockException when inventory unavailable', function () { ... });
it('does NOT save order when validation fails', function () { ... });

// Grouped by class/method
describe('CreateOrderAction', function () {
    it('creates order with valid data', function () { ... });
    it('rejects empty line items', function () { ... });
});
```

---

## Test File Organization

```
tests/
├── Unit/
│   ├── Domain/
│   │   ├── Order/
│   │   │   ├── OrderEntityTest.php
│   │   │   └── MoneyValueObjectTest.php
│   │   └── Customer/
│   ├── Application/
│   │   ├── Order/
│   │   │   ├── CreateOrderActionTest.php
│   │   │   └── OrderDtoTest.php
│   │   └── Payment/
│   ├── Infrastructure/
│   │   ├── Persistence/
│   │   │   └── EloquentOrderRepositoryTest.php
│   │   └── External/
│   └── Http/
│       ├── Controllers/
│       │   └── OrderControllerTest.php
│       ├── Requests/
│       │   └── StoreOrderRequestTest.php
│       └── Middleware/
└── Feature/
```

---

## Anti-Patterns (Cross-Layer)

| # | Anti-Pattern | Layer | Why Wrong | Correct |
|---|-------------|-------|-----------|---------|
| 1 | Use DB in unit test | Application | Tests infrastructure, not logic | Mock interface |
| 2 | `$this->app->make()` for domain entity | Domain | Domain is pure PHP | Direct instantiation |
| 3 | Assert mock call count without reason | All | Fragile — tests implementation | Assert behavior |
| 4 | Shared state between tests | All | Flaky, order-dependent | Fresh state per test |
| 5 | Skip error path testing | All | Misses production failures | >=40% abnormal cases |
| 6 | Over-mocking (mock the SUT) | All | Tests nothing useful | Mock dependencies only |

---

## Quality Checklist

- [ ] **Q1**: Layer routing table complete (domain, application, infrastructure, presentation)?
- [ ] **Q2**: Coverage targets per layer defined?
- [ ] **Q3**: Mock strategy per layer documented (no-mock, port-mock, service-mock)?
- [ ] **Q4**: Pest + PHPUnit + Mockery tooling configured?

---

*Test Plan Specialist — Laravel Unit Testing (Strategy + Routing) v1.0 | EPS v3.2*

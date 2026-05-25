# Test Plan Specialist — NestJS Unit Testing: Domain Layer
# テストプランスペシャリスト — NestJS ドメイン層ユニットテスト
# Chuyen Gia Test — Unit Test Domain Layer NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Unit Testing — Domain Layer
**Purpose**: Domain layer unit testing — entity invariants, value object equality/validation, domain exceptions, domain events, pure TypeScript testing (no NestJS DI)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-UNIT-DOMAIN |
| **Directory Pattern** | `src/domain/**/*.spec.ts` |
| **Naming Convention** | `{entity}.entity.spec.ts`, `{name}.vo.spec.ts` |
| **Imports From** | Domain only (entities, VOs, exceptions — NO infrastructure) |
| **Imported By** | N/A (test files) |
| **Cannot Import** | Infrastructure, Application, Presentation (domain tests are pure TS) |
| **Dependencies** | jest (NO @nestjs/testing — domain is framework-free) |
| **When To Use** | DD/Plan generates domain entities, value objects, or domain exceptions |
| **Source Skeleton** | `src/domain/{feature}/entities/{entity}.entity.spec.ts` |
| **Specialist Type** | code |
| **Purpose** | Domain layer unit testing — entity invariants, value object equality/validation, domain exceptions, domain events, pure TypeScript testing |
| **Activation Trigger** | files: **/domain/**/*.spec.ts; keywords: domainTest, entityTest, valueObjectTest, invariant |

---

## Key Principle

Domain tests are **pure TypeScript** — NO `Test.createTestingModule()`, NO `@nestjs/testing`, NO DI container. Just `new Entity()` or `Entity.create()` and assertions.

---

## Patterns

### Pattern UT-D.1: Entity Invariant Testing

```typescript
// domain/order/entities/order.entity.spec.ts
describe('Order', () => {
  describe('create()', () => {
    it('should create order with PENDING status', () => {
      const order = Order.create('customer-1', [
        OrderItem.create('product-1', 2, Money.create(100, 'USD')),
      ]);
      expect(order.id).toBeDefined();
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.customerId).toBe('customer-1');
    });

    it('should reject empty items', () => {
      expect(() => Order.create('customer-1', []))
        .toThrow(EmptyOrderException);
    });

    it('should calculate total from items', () => {
      const order = Order.create('c1', [
        OrderItem.create('p1', 2, Money.create(50, 'USD')),  // 100
        OrderItem.create('p2', 1, Money.create(75, 'USD')),  // 75
      ]);
      expect(order.total).toBe(175);
    });
  });

  describe('approve()', () => {
    it('should transition PENDING → APPROVED', () => {
      const order = Order.create('c1', [validItem]);
      order.approve();
      expect(order.status).toBe(OrderStatus.APPROVED);
    });

    it('should reject transition from non-PENDING state', () => {
      const order = Order.create('c1', [validItem]);
      order.approve(); // APPROVED
      expect(() => order.approve())
        .toThrow(InvalidOrderTransitionException);
    });
  });

  describe('domain events', () => {
    it('should emit OrderCreated event on create', () => {
      const order = Order.create('c1', [validItem]);
      expect(order.domainEvents).toHaveLength(1);
      expect(order.domainEvents[0]).toBeInstanceOf(OrderCreatedEvent);
    });

    it('should clear events after collection', () => {
      const order = Order.create('c1', [validItem]);
      order.clearEvents();
      expect(order.domainEvents).toHaveLength(0);
    });
  });
});
```

---

### Pattern UT-D.2: Value Object Testing

```typescript
// domain/financial/value-objects/money.vo.spec.ts
describe('Money', () => {
  describe('create()', () => {
    it('should create with valid amount and currency', () => {
      const money = Money.create(100.50, 'USD');
      expect(money.amount).toBe(100.50);
      expect(money.currency).toBe('USD');
    });

    it('should reject negative amount', () => {
      expect(() => Money.create(-10, 'USD')).toThrow(NegativeAmountException);
    });

    it('should reject unsupported currency', () => {
      expect(() => Money.create(100, 'XYZ')).toThrow(UnsupportedCurrencyException);
    });
  });

  describe('arithmetic', () => {
    it('should add same currency', () => {
      const a = Money.create(100, 'USD');
      const b = Money.create(50.25, 'USD');
      expect(a.add(b).amount).toBe(150.25);
    });

    it('should reject adding different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(50, 'EUR');
      expect(() => usd.add(eur)).toThrow(CurrencyMismatchException);
    });

    it('should reject subtract below zero', () => {
      const a = Money.create(50, 'USD');
      const b = Money.create(100, 'USD');
      expect(() => a.subtract(b)).toThrow(InsufficientFundsException);
    });
  });

  describe('equality', () => {
    it('should be equal for same amount and currency', () => {
      expect(Money.create(100, 'USD').equals(Money.create(100, 'USD'))).toBe(true);
    });

    it('should not be equal for different amounts', () => {
      expect(Money.create(100, 'USD').equals(Money.create(101, 'USD'))).toBe(false);
    });
  });

  describe('rounding', () => {
    it('should round HALF_UP for financial precision', () => {
      const money = Money.create(100.555, 'USD').round(2);
      expect(money.amount).toBe(100.56); // HALF_UP
    });
  });
});
```

---

### Pattern UT-D.3: Domain Exception Testing

```typescript
// domain/exceptions/insufficient-funds.exception.spec.ts
describe('InsufficientFundsException', () => {
  it('should contain account and requested amount', () => {
    const ex = new InsufficientFundsException('acc-1', Money.create(1000, 'USD'), Money.create(500, 'USD'));
    expect(ex.message).toContain('acc-1');
    expect(ex.requestedAmount.amount).toBe(1000);
    expect(ex.availableBalance.amount).toBe(500);
  });

  it('should NOT extend HttpException (domain purity)', () => {
    const ex = new InsufficientFundsException('acc-1', Money.create(100, 'USD'), Money.create(50, 'USD'));
    expect(ex).not.toBeInstanceOf(HttpException); // import from @nestjs/common FORBIDDEN in domain
    expect(ex).toBeInstanceOf(DomainException); // base domain exception
  });
});
```

---

### Pattern UT-D.4: Aggregate Boundary Testing

```typescript
// Test aggregate root enforces invariants across child entities
describe('LoanApplication (Aggregate)', () => {
  it('should not allow disbursement exceeding approved amount', () => {
    const loan = LoanApplication.create({ amount: Money.create(10000, 'USD'), term: 12 });
    loan.approve(Money.create(8000, 'USD')); // approved less than requested

    expect(() => loan.disburse(Money.create(10000, 'USD')))
      .toThrow(DisbursementExceedsApprovedAmountException);
  });

  it('should enforce repayment order (oldest installment first)', () => {
    const loan = createDisbursedLoan();
    const payment = Money.create(500, 'USD');
    loan.applyRepayment(payment);

    expect(loan.installments[0].status).toBe('PAID');
    expect(loan.installments[1].status).toBe('PENDING');
  });
});
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | `Test.createTestingModule()` for domain entity | Domain is pure TS — no DI needed | `new Entity()` or `Entity.create()` |
| 2 | Import `HttpException` in domain test | Proves domain couples to framework | Domain exceptions extend `DomainException` only |
| 3 | Mock domain entity methods | Entity under test = SUT, not a dependency | Only mock external collaborators |
| 4 | Test private methods directly | Tests implementation, not behavior | Test via public API (create, approve, etc.) |

---

## Coverage Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| Entity create/factory | 100% | Every creation path including validation |
| State transitions | 100% | Every valid + invalid transition |
| Value Objects | 100% | Equality, arithmetic, validation — all pure |
| Domain Exceptions | 90% | Message format, properties |
| Domain Events | 80% | Event creation, properties |

---

*Test Plan Specialist — NestJS Unit Testing: Domain Layer | EPS v10.0*

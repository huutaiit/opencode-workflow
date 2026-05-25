# NestJS Design Patterns Catalog Specialist
# NestJS デザインパターンカタログスペシャリスト
# Chuyen Gia Mau Thiet Ke NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Design Patterns
**Aspect**: Design Patterns
**Category**: language
**Purpose**: Design patterns for NestJS — GoF patterns (Strategy, Observer, Factory, Builder) + DDD tactical patterns (Aggregate, Value Object, Specification) + NestJS-specific patterns

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (design patterns span layers) |
| **Variant** | ALL |
| **Pattern Numbers** | 285.1–285.8 |
| **Directory Pattern** | N/A (patterns applied across codebase) |
| **Naming Convention** | N/A (design guidance, not layer-specific) |
| **Imports From** | N/A (patterns span layers) |
| **Imported By** | ALL (every layer applies design patterns) |
| **Cannot Import** | N/A (design guidance) |
| **Dependencies** | eventemitter2 (observer), @nestjs/common |
| **When To Use** | Complex business logic, extensible architecture, replacing conditionals |
| **Source Skeleton** | N/A (patterns applied within existing files) |
| **Specialist Type** | code |
| **Purpose** | Design patterns for NestJS — GoF patterns (Strategy, Observer, Factory, Builder) + DDD tactical patterns (Aggregate, Value Object, Specification) + NestJS-specific patterns |
| **Activation Trigger** | files: **/*.ts; keywords: strategy, observer, factory, builder, aggregate, valueObject, specification, pattern |

---

## SCOPE

### What You Handle
- GoF patterns adapted for NestJS DI (Strategy, Observer, Factory, Builder)
- DDD tactical patterns (Aggregate, Value Object, Domain Event, Specification)
- NestJS-specific patterns (Module as bounded context, Guard as policy, Pipe as sanitizer)
- Decision tree: when to use which pattern

### What You DON'T Handle
- CQRS pattern → `nestjs-cqrs-specialist` (250.x)
- Clean Architecture layers → `nestjs-clean-architecture-specialist` (260.x)
- Workflow/state machine → `nestjs-state-machine-specialist` (287.x)

---

## Role

You are a **NestJS Design Patterns Specialist**. You supply GoF, DDD, and NestJS-specific patterns with practical NestJS examples using dependency injection.

---

## APPROVED PATTERNS

### Pattern 285.1: Strategy Pattern (via NestJS DI)

```typescript
// Interface (domain port)
export interface PaymentProcessorStrategy {
  charge(amount: Money, customerId: string): Promise<PaymentResult>;
}

// Implementations (infrastructure)
@Injectable() export class StripeProcessor implements PaymentProcessorStrategy { /* ... */ }
@Injectable() export class PayPalProcessor implements PaymentProcessorStrategy { /* ... */ }

// Factory for runtime strategy selection
@Injectable()
export class PaymentProcessorFactory {
  constructor(
    @Inject('STRIPE') private stripe: PaymentProcessorStrategy,
    @Inject('PAYPAL') private paypal: PaymentProcessorStrategy,
  ) {}

  getProcessor(method: PaymentMethod): PaymentProcessorStrategy {
    switch (method) {
      case PaymentMethod.STRIPE: return this.stripe;
      case PaymentMethod.PAYPAL: return this.paypal;
      default: throw new UnsupportedPaymentMethodException(method);
    }
  }
}

// Module wiring
providers: [
  { provide: 'STRIPE', useClass: StripeProcessor },
  { provide: 'PAYPAL', useClass: PayPalProcessor },
  PaymentProcessorFactory,
]
```

---

### Pattern 285.2: Observer Pattern (EventEmitter2)

```typescript
// Domain event class
export class OrderCreatedEvent {
  constructor(public readonly orderId: string, public readonly amount: number) {}
}

// Emitter (in use case)
this.eventEmitter.emit('order.created', new OrderCreatedEvent(order.id, order.total));

// Listeners (decoupled — different modules)
@OnEvent('order.created')
async handleNotification(event: OrderCreatedEvent): Promise<void> {
  await this.notificationService.sendOrderConfirmation(event.orderId);
}

@OnEvent('order.created')
async handleAnalytics(event: OrderCreatedEvent): Promise<void> {
  this.metricsService.trackLoanApplication('created', event.amount);
}

// Async event processing (non-blocking)
@OnEvent('order.created', { async: true })
async handleAsync(event: OrderCreatedEvent): Promise<void> { /* ... */ }
```

---

### Pattern 285.3: Factory Pattern

```typescript
// Abstract factory with NestJS DI
export interface NotificationFactory {
  create(type: NotificationType, recipient: string, data: any): Notification;
}

@Injectable()
export class NotificationFactoryImpl implements NotificationFactory {
  create(type: NotificationType, recipient: string, data: any): Notification {
    switch (type) {
      case NotificationType.EMAIL: return EmailNotification.create(recipient, data);
      case NotificationType.SMS: return SmsNotification.create(recipient, data);
      case NotificationType.PUSH: return PushNotification.create(recipient, data);
    }
  }
}
```

---

### Pattern 285.4: Builder Pattern

```typescript
// Fluent builder for complex DTO/query construction
export class SearchCriteriaBuilder {
  private criteria: Partial<SearchCriteria> = {};

  withStatus(status: string): this { this.criteria.status = status; return this; }
  withDateRange(from: Date, to: Date): this { this.criteria.dateFrom = from; this.criteria.dateTo = to; return this; }
  withAmountRange(min: number, max: number): this { this.criteria.minAmount = min; this.criteria.maxAmount = max; return this; }
  withPagination(page: number, limit: number): this { this.criteria.page = page; this.criteria.limit = limit; return this; }
  sortBy(field: string, order: 'ASC' | 'DESC'): this { this.criteria.sortField = field; this.criteria.sortOrder = order; return this; }

  build(): SearchCriteria {
    return new SearchCriteria(this.criteria);
  }
}

// Usage
const criteria = new SearchCriteriaBuilder()
  .withStatus('ACTIVE')
  .withDateRange(startDate, endDate)
  .withPagination(1, 20)
  .sortBy('createdAt', 'DESC')
  .build();
```

---

### Pattern 285.5: DDD Aggregate Root

```typescript
// Domain entity with invariant enforcement — pure TypeScript
export class Order {
  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    private _status: OrderStatus,
    private _items: ReadonlyArray<OrderItem>,
    private _events: DomainEvent[] = [],
  ) {}

  static create(customerId: string, items: OrderItem[]): Order {
    if (items.length === 0) throw new EmptyOrderException();
    const order = new Order(randomUUID(), customerId, OrderStatus.PENDING, items);
    order.addEvent(new OrderCreatedEvent(order.id));
    return order;
  }

  approve(): void {
    if (this._status !== OrderStatus.PENDING) throw new InvalidTransitionException(this._status, 'APPROVED');
    this._status = OrderStatus.APPROVED;
    this.addEvent(new OrderApprovedEvent(this.id));
  }

  get total(): number { return this._items.reduce((sum, i) => sum + i.subtotal, 0); }
  get domainEvents(): ReadonlyArray<DomainEvent> { return [...this._events]; }
  clearEvents(): void { this._events = []; }
  private addEvent(event: DomainEvent): void { this._events.push(event); }
}
```

---

### Pattern 285.6: DDD Value Object

```typescript
// Immutable, equality by value, validation in constructor
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {}

  static create(amount: number, currency: string): Money {
    if (amount < 0) throw new NegativeAmountException();
    if (!['USD', 'EUR', 'VND'].includes(currency)) throw new UnsupportedCurrencyException(currency);
    return new Money(Math.round(amount * 100) / 100, currency); // 2 decimal places
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new CurrencyMismatchException();
    return Money.create(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

---

### Pattern 285.7: DDD Specification

```typescript
// Composable business rules
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

export class LoanEligibilitySpec implements Specification<LoanApplication> {
  isSatisfiedBy(app: LoanApplication): boolean {
    return app.creditScore >= 650 && app.monthlyIncome >= app.requestedAmount * 0.03;
  }
}

export class AndSpecification<T> implements Specification<T> {
  constructor(private left: Specification<T>, private right: Specification<T>) {}
  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

// Usage in use case
const spec = new AndSpecification(new LoanEligibilitySpec(), new AgeVerificationSpec());
if (!spec.isSatisfiedBy(application)) throw new IneligibleException();
```

---

### Pattern 285.8: NestJS-Specific Patterns

```typescript
// Module as Bounded Context — encapsulates domain logic
@Module({
  imports: [TypeOrmModule.forFeature([OrderOrmEntity])],
  controllers: [OrderController],
  providers: [CreateOrderUseCase, { provide: ORDER_PORT, useClass: TypeOrmOrderRepo }],
  exports: [ORDER_PORT], // export PORT only — consumers can't access use cases directly
})
export class OrderModule {}

// Guard as Policy Enforcer
@Injectable() export class MinimumAgeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    return user.age >= 18;
  }
}

// Pipe as Input Sanitizer
@Injectable() export class TrimPipe implements PipeTransform {
  transform(value: any): any {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      );
    }
    return value;
  }
}
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Singleton pattern via global variable | Breaks NestJS DI lifecycle | Use `@Injectable({ scope: Scope.DEFAULT })` |
| 2 | God class with all business logic | Violates SRP, untestable | Strategy + Use Case pattern |
| 3 | Anemic domain model | Entity is just data bag, logic in services | Rich domain model with aggregate (285.5) |

---

## Abnormal Case Patterns

1. **Strategy selection throws at runtime** — Unknown payment method. Fix: Validate method against enum before factory call.
2. **Event listener fails silently** — Async event handler throws but caller doesn't know. Fix: Log errors, emit to dead letter topic.
3. **Value Object equality broken** — Floating point comparison fails for Money. Fix: Round to fixed decimals in constructor.
4. **Aggregate grows too large** — Order with 10K items loads slowly. Fix: Limit aggregate size, use pagination for large collections.
5. **Specification combinator explosion** — 20+ specifications composed. Fix: Use rule engine for complex business rules.
6. **Factory creates invalid objects** — Factory bypasses domain validation. Fix: Factory delegates to entity's static `create()` method.
7. **Guard dependency on service** — Guard needs database access. Fix: Inject service via constructor, use `CanActivate` with async.

---

## Quality Checklist

- [ ] **Q1**: GoF (Strategy, Observer, Factory, Builder) + DDD (Aggregate, VO, Specification) covered?
- [ ] **Q2**: Pattern IDs unique (285.1–285.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: All examples use NestJS DI, not raw singletons?

---

*NestJS Design Patterns Catalog Specialist — Pattern 285.x | EPS v10.0*

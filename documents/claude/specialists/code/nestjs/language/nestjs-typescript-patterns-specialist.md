# NestJS TypeScript Patterns Specialist — Language
# NestJS TypeScriptパターンスペシャリスト — 言語
# Chuyen Gia Pattern TypeScript NestJS — Ngon Ngu

**Version**: 1.0.0
**Technology**: TypeScript 5.x Design Patterns for NestJS
**Aspect**: TypeScript Design Patterns
**Category**: language
**Purpose**: Knowledge provider for TypeScript design patterns in NestJS — strategy, factory, builder, template method, branded types, discriminated unions for domain modeling

---

## Metadata

```json
{
  "id": "nestjs-typescript-patterns-specialist",
  "technology": "TypeScript 5.x Design Patterns",
  "aspect": "TypeScript Design Patterns",
  "category": "language",
  "subcategory": "nestjs",
  "lines": 380,
  "token_cost": 2300,
  "version": "1.0.0",
  "evidence": [
    "E1: Gang of Four patterns adapted to TypeScript — strategy, factory, builder",
    "E2: TypeScript-specific patterns — branded types, utility types, conditional types",
    "E3: NestJS DI integration — patterns that leverage the IoC container"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 246.1–246.8 |
| **Directory Pattern** | N/A (cross-cutting TypeScript patterns) |
| **Dependencies** | typescript (built-in) |
| **When To Use** | TypeScript language patterns applicable to all NestJS code |
| **Source Skeleton** | src/**/*.ts |
| **Specialist Type** | code |
| **Purpose** | Advanced TypeScript patterns — decorators, mixins, conditional types, branded types |
| **Activation Trigger** | files: **/*.ts; keywords: decorator, mixin, conditionalType, branded, mapped |

---

## Role

You are a **NestJS TypeScript Patterns Specialist**. You supply GoF and TypeScript-specific design patterns adapted for NestJS — leveraging the DI container for strategy, factory patterns, and TypeScript's type system for domain modeling (branded types, value objects, discriminated unions).

---

## Patterns

### Pattern 246.1: Strategy Pattern with DI

**Category**: Behavioral
**Description**: Swappable algorithms via NestJS DI — inject strategy at module level.

```typescript
// Domain interface
export interface PricingStrategy {
  calculate(amount: number, term: number): number;
}

// Implementations
@Injectable()
export class FlatRatePricing implements PricingStrategy {
  calculate(amount: number, term: number): number {
    return amount * 0.05 * term;
  }
}

@Injectable()
export class CompoundPricing implements PricingStrategy {
  calculate(amount: number, term: number): number {
    return amount * Math.pow(1.05, term) - amount;
  }
}

// Module — swap strategy without changing consumers
@Module({
  providers: [
    { provide: 'PRICING_STRATEGY', useClass: CompoundPricing },
    LoanService, // injects @Inject('PRICING_STRATEGY')
  ],
})
export class LoanModule {}
```

---

### Pattern 246.2: Factory Pattern

**Category**: Creational
**Description**: Create domain objects via factory — encapsulate creation logic.

```typescript
// Abstract factory
export class NotificationFactory {
  static create(type: NotificationType, data: NotificationData): Notification {
    switch (type) {
      case 'EMAIL': return new EmailNotification(data.recipient, data.subject, data.body);
      case 'SMS': return new SmsNotification(data.phone, data.message);
      case 'PUSH': return new PushNotification(data.deviceToken, data.title, data.body);
      default: throw new Error(`Unknown notification type: ${type}`);
    }
  }
}

// NestJS DI factory provider
{
  provide: 'NOTIFICATION_SENDER',
  useFactory: (config: ConfigService, email: EmailService, sms: SmsService) => {
    const channel = config.get('NOTIFICATION_CHANNEL');
    if (channel === 'email') return email;
    if (channel === 'sms') return sms;
    throw new Error(`Unknown channel: ${channel}`);
  },
  inject: [ConfigService, EmailService, SmsService],
}
```

---

### Pattern 246.3: Builder Pattern for Complex DTOs

**Category**: Creational
**Description**: Fluent builder for constructing complex objects step-by-step.

```typescript
export class LoanApplicationBuilder {
  private application: Partial<LoanApplication> = {};

  withBorrower(borrowerId: string): this {
    this.application.borrowerId = borrowerId;
    return this;
  }

  withAmount(amount: number, currency: string = 'VND'): this {
    this.application.amount = amount;
    this.application.currency = currency;
    return this;
  }

  withTerm(months: number): this {
    this.application.termMonths = months;
    return this;
  }

  withCollateral(collateral: CollateralInfo): this {
    this.application.collateral = collateral;
    return this;
  }

  build(): LoanApplication {
    if (!this.application.borrowerId) throw new Error('borrowerId required');
    if (!this.application.amount) throw new Error('amount required');
    if (!this.application.termMonths) throw new Error('termMonths required');
    return this.application as LoanApplication;
  }
}

// Usage
const app = new LoanApplicationBuilder()
  .withBorrower('user-123')
  .withAmount(50_000_000, 'VND')
  .withTerm(12)
  .build();
```

---

### Pattern 246.4: Branded Types (Nominal Typing)

**Category**: TypeScript-Specific
**Description**: Prevent primitive type confusion with branded types.

```typescript
// Branded types — prevent mixing up different string IDs
type Brand<T, B> = T & { readonly __brand: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type LoanId = Brand<string, 'LoanId'>;

// Constructor functions
const UserId = (id: string): UserId => id as UserId;
const OrderId = (id: string): OrderId => id as OrderId;
const LoanId = (id: string): LoanId => id as LoanId;

// Prevents accidental mixing
function findLoan(id: LoanId): Promise<Loan> { /* ... */ }
findLoan(UserId('abc')); // TS Error! UserId is not assignable to LoanId
findLoan(LoanId('abc')); // OK
```

---

### Pattern 246.5: Value Objects

**Category**: Domain Modeling
**Description**: Immutable, self-validating value types.

```typescript
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {}

  static create(amount: number, currency: string): Money {
    if (amount < 0) throw new Error('Amount cannot be negative');
    if (!['VND', 'USD', 'JPY'].includes(currency)) throw new Error(`Invalid currency: ${currency}`);
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
    return Money.create(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

---

### Pattern 246.6: Template Method with Abstract Class

**Category**: Behavioral
**Description**: Define algorithm skeleton, let subclasses fill steps.

```typescript
export abstract class BaseUseCase<Input, Output> {
  async execute(input: Input): Promise<Output> {
    this.validate(input);
    const result = await this.doExecute(input);
    await this.postExecute(input, result);
    return result;
  }

  protected abstract validate(input: Input): void;
  protected abstract doExecute(input: Input): Promise<Output>;
  protected async postExecute(input: Input, result: Output): Promise<void> {
    // Optional hook — subclasses can override for events, logging
  }
}

@Injectable()
export class CreateOrderUseCase extends BaseUseCase<CreateOrderDto, Order> {
  protected validate(input: CreateOrderDto) {
    if (input.items.length === 0) throw new BusinessRuleViolation('Order must have items');
  }
  protected async doExecute(input: CreateOrderDto): Promise<Order> {
    return this.orderRepo.save(Order.create(input));
  }
  protected async postExecute(input: CreateOrderDto, result: Order) {
    this.eventEmitter.emit('order.created', new OrderCreatedEvent(result));
  }
}
```

---

## Best Practices

### Pattern Selection
- Strategy + DI: for swappable algorithms (pricing, notification, scoring)
- Factory: for creating domain objects with complex initialization
- Builder: for constructing objects with many optional fields
- Branded types: for ID types that shouldn't be mixed
- Value objects: for domain primitives (Money, Email, PhoneNumber)

### TypeScript-Specific
- Prefer `readonly` for immutable properties
- Use `satisfies` operator (TS 5.x) for type-checked object literals
- Avoid `class` for simple data — use `type` or `interface` + factory function

---

## Abnormal Case Patterns

1. **Strategy not injectable** — Missing @Injectable() on implementation. Fix: decorate all strategy implementations.
2. **Builder allows invalid state** — build() called before all required fields. Fix: validate in build(), throw descriptive error.
3. **Branded type lost at boundary** — API returns plain string, brand is erased. Fix: re-brand at deserialization boundary.
4. **Value object equality by reference** — `money1 === money2` is false for same values. Fix: implement `.equals()` method.
5. **Template method too rigid** — Every subclass overrides everything. Fix: make more steps optional with default implementations.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (246.1-246.6)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS TypeScript Patterns Specialist — Language | EPS v3.2*

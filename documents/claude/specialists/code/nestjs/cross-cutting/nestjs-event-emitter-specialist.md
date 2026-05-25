# NestJS Event Emitter Specialist — Cross-Cutting
# NestJSイベントエミッタースペシャリスト — 横断的関心事
# Chuyen Gia Event Emitter NestJS — Cat Ngang

**Version**: 1.0.0
**Technology**: NestJS 10+ @nestjs/event-emitter
**Aspect**: In-Process Event System
**Category**: cross-cutting
**Purpose**: Knowledge provider for NestJS in-process event system — @OnEvent listeners, typed events, async handling, event ordering, transactional outbox, module decoupling

---

## Metadata

```json
{
  "id": "nestjs-event-emitter-specialist",
  "technology": "NestJS 10+ @nestjs/event-emitter",
  "aspect": "In-Process Event System",
  "category": "cross-cutting",
  "subcategory": "nestjs",
  "lines": 380,
  "token_cost": 2300,
  "version": "1.0.0",
  "evidence": [
    "E1: @nestjs/event-emitter — EventEmitter2-based in-process event system",
    "E2: Domain event patterns — decouple modules without direct imports",
    "E3: Event-driven architecture — async processing, eventual consistency"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 241.1–241.8 |
| **Directory Pattern** | `src/application/listeners/` |
| **Naming Convention** | `{entity}-{action}.event.ts`, `{entity}-{action}.listener.ts` |
| **Imports From** | Domain (event data types), Infrastructure (external publishers for outbox) |
| **Imported By** | Application (services emit events), Infrastructure (listeners trigger side effects) |
| **Cannot Import** | Presentation (events are internal) |
| **Dependencies** | @nestjs/event-emitter, eventemitter2 |
| **When To Use** | In-process event system for module decoupling within single service |
| **Source Skeleton** | src/application/events/{entity}-{action}.event.ts, src/application/listeners/{entity}-{action}.listener.ts |
| **Specialist Type** | code |
| **Purpose** | Event emitter patterns — in-process events, async event handling, typed events |
| **Activation Trigger** | files: **/listeners/**; keywords: eventEmitter2, onEvent, emit, eventPayload |

> **See also**: nestjs-domain-events-saga (227) for inter-service events via message broker

---

## Role

You are a **NestJS Event Emitter Specialist**. You supply patterns for in-process event communication using @nestjs/event-emitter — typed events, sync/async listeners, event ordering, error handling, and module decoupling. This is for INTRA-service events; for INTER-service events, see domain-events-saga specialist.

**Used by**: Any code agent implementing module decoupling or async side effects within a service
**Not used by**: Non-NestJS stacks, inter-service messaging (use RabbitMQ/Kafka)

---

## Patterns

### Pattern 241.1: EventEmitterModule Setup

**Category**: Event Fundamentals
**Description**: Register EventEmitterModule globally for in-process event bus.

```typescript
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,         // disable wildcard patterns (performance)
      delimiter: '.',          // event namespace separator
      maxListeners: 20,        // prevent memory leak warnings
      verboseMemoryLeak: true, // log which listeners exceed max
    }),
  ],
})
export class AppModule {}
```

**Key Points**:
- `forRoot()` once in AppModule — all modules can emit/listen
- `maxListeners: 20` — increase if many legitimate listeners, investigate if unexpected
- Disable wildcard for performance unless glob-matching is needed

---

### Pattern 241.2: Typed Event Classes

**Category**: Event Fundamentals
**Description**: Strong-typed event classes with domain data.

```typescript
// application/events/order-created.event.ts
export class OrderCreatedEvent {
  static readonly EVENT_NAME = 'order.created';

  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly items: { productId: string; quantity: number }[],
    public readonly totalAmount: number,
    public readonly createdAt: Date = new Date(),
  ) {}
}

// application/events/payment-completed.event.ts
export class PaymentCompletedEvent {
  static readonly EVENT_NAME = 'payment.completed';

  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly method: PaymentMethod,
  ) {}
}
```

**Key Points**:
- Static EVENT_NAME constant — single source of truth for event key
- Immutable properties (readonly) — events are facts, never modified after creation
- Include timestamp — essential for ordering and debugging

---

### Pattern 241.3: Emitting Events from Services

**Category**: Event Fundamentals
**Description**: Services emit events after successful business operations.

```typescript
@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = Order.create(dto);
    const saved = await this.orderRepo.save(order);

    // Emit AFTER successful persistence — never before
    this.eventEmitter.emit(
      OrderCreatedEvent.EVENT_NAME,
      new OrderCreatedEvent(saved.id, saved.customerId, saved.items, saved.totalAmount),
    );

    return saved;
  }
}
```

**Key Points**:
- Emit AFTER successful DB write — prevents events for failed operations
- Use typed event class — not raw objects
- Emitter is synchronous by default — listeners execute in same tick

---

### Pattern 241.4: @OnEvent Listeners

**Category**: Event Fundamentals
**Description**: Declarative event listeners with @OnEvent decorator.

```typescript
@Injectable()
export class OrderNotificationListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(OrderCreatedEvent.EVENT_NAME)
  async handleOrderCreated(event: OrderCreatedEvent) {
    await this.notificationService.sendOrderConfirmation(event.orderId, event.customerId);
  }
}

@Injectable()
export class OrderAnalyticsListener {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @OnEvent(OrderCreatedEvent.EVENT_NAME, { async: true })
  async handleOrderAnalytics(event: OrderCreatedEvent) {
    await this.analyticsService.trackOrderCreated({
      orderId: event.orderId,
      amount: event.totalAmount,
      itemCount: event.items.length,
    });
  }
}
```

**Key Points**:
- Multiple listeners for same event — different concerns, different classes
- `{ async: true }` — listener runs asynchronously, doesn't block emitter
- Listener failures don't propagate to emitter by default with async: true

---

### Pattern 241.5: Async vs Sync Listeners

**Category**: Advanced Events
**Description**: Choose sync for critical side effects, async for non-critical.

```typescript
// SYNC listener — failure stops the emitter (use for critical flows)
@OnEvent(PaymentCompletedEvent.EVENT_NAME)
async handlePaymentSync(event: PaymentCompletedEvent) {
  // If this fails, the emitter's try/catch will catch it
  await this.orderService.markAsPaid(event.orderId);
}

// ASYNC listener — failure is isolated (use for non-critical flows)
@OnEvent(PaymentCompletedEvent.EVENT_NAME, { async: true })
async handlePaymentNotification(event: PaymentCompletedEvent) {
  // If this fails, emitter continues normally
  await this.emailService.sendPaymentReceipt(event.orderId);
}
```

**Key Points**:
- Sync (default): error propagates to emitter — use for must-succeed flows
- Async (`async: true`): fire-and-forget — use for notifications, analytics, logging
- Mix both: critical listener sync + non-critical listeners async

---

### Pattern 241.6: Error Handling in Listeners

**Category**: Advanced Events
**Description**: Prevent listener failures from crashing the application.

```typescript
@Injectable()
export class ResilientEventListener {
  private readonly logger = new Logger(ResilientEventListener.name);

  @OnEvent(OrderCreatedEvent.EVENT_NAME, { async: true })
  async handleOrderCreated(event: OrderCreatedEvent) {
    try {
      await this.processEvent(event);
    } catch (error) {
      this.logger.error(
        `Failed to process ${OrderCreatedEvent.EVENT_NAME} for order ${event.orderId}`,
        error.stack,
      );
      // Option 1: Push to retry queue
      await this.retryQueue.add('order-created-retry', event, { attempts: 3, backoff: 5000 });
      // Option 2: Store in dead letter for manual review
      // await this.deadLetterService.store(OrderCreatedEvent.EVENT_NAME, event, error);
    }
  }
}
```

---

### Pattern 241.7: Event-Driven Module Decoupling

**Category**: Advanced Events
**Description**: Replace direct module imports with events for loose coupling.

```typescript
// BEFORE: OrderModule imports NotificationModule (tight coupling)
@Injectable()
export class OrderService {
  constructor(private notificationService: NotificationService) {} // direct dependency
  async create(dto) {
    const order = await this.save(dto);
    await this.notificationService.send(order); // coupled
  }
}

// AFTER: OrderModule emits events, NotificationModule listens (decoupled)
@Injectable()
export class OrderService {
  constructor(private eventEmitter: EventEmitter2) {} // no notification dependency
  async create(dto) {
    const order = await this.save(dto);
    this.eventEmitter.emit('order.created', new OrderCreatedEvent(order)); // decoupled
  }
}
// NotificationModule handles event independently — no import from OrderModule
```

**Key Points**:
- Events break circular dependencies between modules
- Emitter doesn't know (or care) who listens
- Adding new listeners requires NO changes to the emitter

---

### Pattern 241.8: Event Registry & Documentation

**Category**: Advanced Events
**Description**: Central registry of all events for discoverability.

```typescript
// application/events/event-registry.ts
export const EVENT_CATALOG = {
  // Order domain
  'order.created': { payload: OrderCreatedEvent, emitter: 'OrderService', critical: true },
  'order.cancelled': { payload: OrderCancelledEvent, emitter: 'OrderService', critical: true },
  // Payment domain
  'payment.completed': { payload: PaymentCompletedEvent, emitter: 'PaymentService', critical: true },
  'payment.failed': { payload: PaymentFailedEvent, emitter: 'PaymentService', critical: false },
  // Notification (async, non-critical)
  'notification.sent': { payload: NotificationSentEvent, emitter: 'NotificationService', critical: false },
} as const;
```

---

## Best Practices

### Event Design
- Events are past tense — `OrderCreated`, not `CreateOrder` (that's a command)
- Events are immutable facts — readonly properties, no methods
- Include enough data for listeners to act without querying back

### Scope
- In-process events (@nestjs/event-emitter) = INTRA-service communication
- Inter-service events = use RabbitMQ/Kafka (see domain-events-saga specialist)
- Never use in-process events for cross-service communication

### Reliability
- Sync listeners for must-succeed operations (update order status)
- Async listeners for best-effort operations (email, analytics, logging)
- Always add error handling in async listeners — unhandled rejections crash Node.js

---

## Testing Patterns

```typescript
// 1. Test event emission
it('should emit order.created after save', async () => {
  const emitSpy = jest.spyOn(eventEmitter, 'emit');
  await orderService.createOrder(createOrderDto);
  expect(emitSpy).toHaveBeenCalledWith(
    'order.created',
    expect.any(OrderCreatedEvent),
  );
});
```

```typescript
// 2. Test listener handles event
it('should send notification on order.created', async () => {
  const event = new OrderCreatedEvent('order-1', 'customer-1', [], 100);
  await listener.handleOrderCreated(event);
  expect(notificationService.sendOrderConfirmation).toHaveBeenCalledWith('order-1', 'customer-1');
});
```

```typescript
// 3. Test listener error isolation
it('should not throw on listener failure', async () => {
  notificationService.sendOrderConfirmation.mockRejectedValue(new Error('SMTP down'));
  const event = new OrderCreatedEvent('order-1', 'customer-1', [], 100);
  // Async listener — should not propagate error
  await expect(listener.handleOrderCreated(event)).resolves.not.toThrow();
});
```

---

## Abnormal Case Patterns

1. **Memory leak warning** — Too many listeners for same event. Fix: increase maxListeners or investigate duplicate registrations.

2. **Event emitted before DB commit** — Transaction rolls back but event already processed. Fix: emit AFTER successful save, or use outbox pattern.

3. **Listener error crashes sync flow** — Sync listener throws, breaks the emitter's caller. Fix: use `{ async: true }` for non-critical listeners.

4. **Event ordering not guaranteed** — Multiple async listeners execute in non-deterministic order. Fix: if ordering matters, use single listener with sequential steps.

5. **Circular event chain** — Event A triggers listener that emits Event B, which triggers listener that emits Event A. Fix: never emit events in response to the same event chain. Use saga pattern instead.

6. **Event payload too large** — Embedding full entity in event. Fix: include only IDs and essential data — listeners can query if needed.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (241.1-241.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Event Emitter Specialist — Cross-Cutting | EPS v3.2*

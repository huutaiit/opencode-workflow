# NestJS Domain Events & Saga Specialist — Cross-Cutting
# NestJSドメインイベント＆サーガスペシャリスト — 横断的関心事
# Chuyen Gia Su Kien Mien va Saga NestJS — Cat Ngang

**Version**: 1.0.0
**Technology**: NestJS 10+ Domain Events & Saga Orchestration
**Aspect**: Domain Events & Saga
**Category**: cross-cutting
**Purpose**: Knowledge provider for NestJS domain event handling — event bus, saga orchestration, compensating actions, dead letter queues, idempotent consumers, outbox pattern

---

## Metadata

```json
{
  "id": "nestjs-domain-events-saga-specialist",
  "technology": "NestJS 10+ Domain Events & Saga Orchestration",
  "aspect": "Domain Events & Saga",
  "category": "cross-cutting",
  "subcategory": "nestjs",
  "lines": 280,
  "token_cost": 1700,
  "version": "1.0.0",
  "evidence": [
    "E1: Domain events — immutable event objects, event-driven communication between services",
    "E2: Saga orchestration — long-running process coordination with compensating actions",
    "E3: RabbitMQ messaging — exchange/queue topology for reliable event propagation",
    "E4: Idempotent consumers — deduplication strategies for at-least-once delivery"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 227.1–227.10 |
| **Directory Pattern** | `src/application/events/`, `src/application/sagas/` |
| **Naming Convention** | `{entity}-{action}.event.ts`, `{event}.handler.ts`, `{process}.saga.ts`, `dead-letter.handler.ts` |
| **Imports From** | Domain (event types, entity references), Application (use cases triggered by events), Infrastructure (RabbitMQ adapters) |
| **Imported By** | Application (use cases emit events), Infrastructure (message bus publishes/consumes events) |
| **Cannot Import** | Presentation (events are internal, not HTTP concern) |
| **Dependencies** | @nestjs/microservices, amqplib |
| **When To Use** | Inter-service event-driven communication via message broker |
| **Source Skeleton** | src/application/events/{entity}-{action}.event.ts, src/application/sagas/{process}.saga.ts |
| **Specialist Type** | code |
| **Purpose** | Domain events and saga patterns — event-driven architecture, process managers |
| **Activation Trigger** | files: **/events/**, **/sagas/**; keywords: domainEvent, saga, eventHandler, processManager |

---

## Role

You are a **NestJS Domain Events & Saga Specialist**. Your responsibility is to provide domain event and saga orchestration best practices for NestJS microservice projects following clean architecture. You supply patterns for domain event modeling, event bus configuration, saga coordination, compensating actions, dead letter queues, idempotent consumers, outbox pattern, and event versioning.

**Used by**: Any code agent working with NestJS event-driven flows and inter-service choreography
**Not used by**: Non-NestJS stacks, monolith projects without event-driven architecture

---

## Patterns

### Pattern 227.1–227.5: Domain Events & Saga Fundamentals (HIGH)

```
227.1 Domain event: Immutable event class with aggregate ID, timestamp, payload.
      Events represent facts that happened in the domain — never mutate after creation.
```

```typescript
export class OrderCreatedEvent {
  readonly occurredAt = new Date();
  constructor(
    readonly aggregateId: string,
    readonly payload: { customerId: string; totalAmount: number },
  ) {}
}
```

```
227.2 Event handler: @EventPattern or custom handler that reacts to domain events.
      Handlers are decoupled from emitters — one event can trigger multiple handlers.
```

```typescript
@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  constructor(private readonly notificationService: NotificationService) {}
  async handle(event: OrderCreatedEvent): Promise<void> {
    await this.notificationService.sendOrderConfirmation(event.aggregateId);
  }
}
```

```
227.3 Event bus: RabbitMQ exchanges/queues for inter-service event propagation.
      Use topic exchange for flexible routing — binding keys match event types.
```

```typescript
@Module({
  imports: [
    ClientsModule.register([{
      name: 'EVENT_BUS',
      transport: Transport.RMQ,
      options: { urls: [process.env.RABBITMQ_URL], queue: 'orders-events' },
    }]),
  ],
})
export class MessagingModule {}
```

```
227.4 Saga orchestration: Long-running process coordinator across multiple services.
      Saga tracks state transitions and dispatches commands to participating services.
```

```typescript
@Injectable()
export class LoanApprovalSaga {
  constructor(private readonly commandBus: CommandBus) {}
  @Saga()
  loanApproval = (events$: Observable<IEvent>) =>
    events$.pipe(
      ofType(CreditCheckedEvent),
      filter((e) => e.approved),
      map((e) => new DisburseFundsCommand(e.loanId, e.amount)),
    );
}
```

```
227.5 Compensating actions: Rollback steps when saga step fails (e.g., refund on loan failure).
      Each saga step defines a compensating command executed in reverse order on failure.
```

```typescript
@Injectable()
export class PaymentCompensation {
  constructor(private readonly paymentService: PaymentService) {}
  async compensate(context: { paymentId: string }): Promise<void> {
    await this.paymentService.refund(context.paymentId);
  }
}
```

### Pattern 227.6–227.10: Advanced Event Patterns (MEDIUM-HIGH)

```
227.6 Dead letter queue: Failed messages routed to DLQ for manual review/retry.
      Configure RabbitMQ x-dead-letter-exchange for automatic DLQ routing on nack.
```

```typescript
@MessagePattern('order.created')
async handleOrder(@Payload() data: OrderEvent, @Ctx() context: RmqContext) {
  try {
    await this.orderService.process(data);
    context.getChannelRef().ack(context.getMessage());
  } catch {
    context.getChannelRef().nack(context.getMessage(), false, false); // routes to DLQ
  }
}
```

```
227.7 Idempotent consumer: Use event ID + processed set to prevent duplicate handling.
      Store processed event IDs in Redis or DB — skip if already seen.
```

```typescript
@Injectable()
export class IdempotentConsumer {
  constructor(private readonly redis: RedisService) {}
  async processOnce(eventId: string, handler: () => Promise<void>): Promise<void> {
    const exists = await this.redis.sismember('processed_events', eventId);
    if (exists) return;
    await handler();
    await this.redis.sadd('processed_events', eventId);
  }
}
```

```
227.8 Event sourcing light: Store key domain events for audit trail.
      Persist events alongside state changes — not full event sourcing, but selective audit.
```

```typescript
@Injectable()
export class EventStore {
  constructor(@InjectRepository(StoredEvent) private readonly repo: Repository<StoredEvent>) {}
  async append(aggregateId: string, event: object): Promise<void> {
    await this.repo.save({
      aggregateId, eventType: event.constructor.name,
      payload: JSON.stringify(event), occurredAt: new Date(),
    });
  }
}
```

```
227.9 Outbox pattern: Write event + business data in same transaction, publish async.
      Separate publisher reads outbox table and publishes pending events periodically.
```

```typescript
async createOrder(dto: CreateOrderDto, queryRunner: QueryRunner): Promise<void> {
  const order = queryRunner.manager.create(Order, dto);
  await queryRunner.manager.save(order);
  await queryRunner.manager.save(OutboxMessage, {
    eventType: 'OrderCreated', payload: JSON.stringify(order),
    published: false,
  });
  await queryRunner.commitTransaction();
}
```

```
227.10 Event versioning: Schema evolution strategy for backward-compatible events.
       Include version field in events — consumers handle multiple versions gracefully.
```

```typescript
export class OrderCreatedEventV2 {
  readonly version = 2;
  constructor(
    readonly aggregateId: string,
    readonly payload: { customerId: string; totalAmount: number; currency: string },
  ) {}
}
// Consumer checks event.version and handles V1 (no currency) and V2 accordingly
```

---

## Best Practices

### Event Design
- Events should be immutable facts — once published, their schema and payload must not be modified retroactively
- Include `eventId`, `timestamp`, `aggregateId`, and `version` in every event envelope for traceability
- Keep event payloads small — include only the data consumers need; use entity references (IDs) for large data, letting consumers fetch if needed
- Name events in past tense (`OrderPlaced`, `PaymentCompleted`) to clearly communicate that they represent something that already happened

### Saga Design
- Define compensating actions for every forward step before implementing the saga — no step without a rollback plan
- Keep sagas linear where possible; avoid branching saga flows that create exponential compensation paths
- Set explicit timeouts on each saga step to prevent indefinite blocking from unresponsive services
- Store saga state persistently (DB, not in-memory) to survive process restarts

### Reliability
- Use the outbox pattern to guarantee event publication within the same database transaction as the business operation
- Implement idempotent consumers with event ID deduplication — at-least-once delivery is the norm in distributed systems
- Configure dead letter queues for every consumer to capture unprocessable messages without blocking the main queue
- Monitor dead letter queue depth with alerts to catch poisoned messages early

### Message Broker
- Use durable queues with acknowledgment to prevent message loss on broker restart
- Configure appropriate prefetch/concurrency limits to prevent consumer overload
- Separate event topics by bounded context (e.g., `order.events`, `payment.events`) to enable independent scaling

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Event with too much data | Tight coupling; consumers break when producer schema changes; large payloads strain broker | Include only essential identifiers and deltas; let consumers query for full state if needed |
| Mutable events | Consumers receive inconsistent versions; impossible to replay accurately | Treat events as immutable; publish a new correction event rather than modifying the original |
| Saga without compensation | Partial failure leaves system in inconsistent state permanently | Define compensating action for every forward step; test compensation paths explicitly |
| Synchronous event processing | Publisher blocks until all handlers complete; defeats purpose of event-driven design | Use async event dispatch via message broker; handler failures should not affect the publisher |
| No dead letter queue | Poison messages block the queue; consumers retry forever | Configure DLQ per consumer; alert on DLQ depth; implement DLQ processor for manual review |

## Testing Patterns

### Test Event Emission
```typescript
describe('OrderService', () => {
  it('should emit OrderPlaced event on successful creation', async () => {
    const spy = jest.spyOn(eventBus, 'publish');
    await orderService.createOrder({ customerId: 'C1', items: [{ sku: 'A' }] });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'OrderPlaced', aggregateId: expect.any(String) }),
    );
  });
});
```

### Test Saga Compensation
```typescript
it('should compensate when payment fails after inventory reserved', async () => {
  inventoryService.reserve.mockResolvedValue({ reserved: true });
  paymentService.charge.mockRejectedValue(new Error('Insufficient funds'));
  await saga.execute(orderData);
  expect(inventoryService.release).toHaveBeenCalledWith(orderData.items);
  expect(orderRepository.updateStatus).toHaveBeenCalledWith(orderData.id, 'CANCELLED');
});
```

### Test Dead Letter Handler
```typescript
it('should move poison message to dead letter queue after max retries', async () => {
  const poisonEvent = { eventId: 'E1', type: 'OrderPlaced', payload: { invalid: true } };
  for (let i = 0; i < 3; i++) {
    await expect(consumer.handle(poisonEvent)).rejects.toThrow();
  }
  expect(dlqService.enqueue).toHaveBeenCalledWith(
    expect.objectContaining({ eventId: 'E1', retryCount: 3 }),
  );
});
```

---

## Abnormal Case Patterns (8 patterns)

1. **Event lost between publish and consume** — Service crashes after business logic but before event publish. Fix: Use outbox pattern (227.9) to guarantee event delivery within the same transaction.

2. **Duplicate event processing causes double side-effects** — At-least-once delivery triggers handler twice. Fix: Implement idempotent consumer (227.7) with event ID deduplication via Redis or DB unique constraint.

3. **Saga stuck in intermediate state** — Downstream service unavailable, saga never completes. Fix: Add timeout + compensating actions (227.5). Use dead letter queue (227.6) for failed steps and alerting.

4. **Breaking event schema change** — New field added as required, old consumers fail deserialization. Fix: Use event versioning (227.10) with version field. New fields must be optional or use a new event version.

5. **Event ordering violated** — Consumer processes events out of order (e.g., `OrderShipped` before `OrderPlaced`) due to concurrent publishing or partitioning. Fix: Use partition keys based on aggregate ID to guarantee ordering per entity; implement sequence number validation in consumer.

6. **Poison message blocks queue** — A single malformed message causes consumer to crash and requeue repeatedly, blocking all subsequent messages. Fix: Implement max retry count with exponential backoff; move to dead letter queue after threshold; never requeue indefinitely.

7. **Schema evolution breaks consumer** — Producer adds new event version with structural changes; consumers on old version fail deserialization. Fix: Use event versioning with `version` field; make all new fields optional; maintain backward compatibility for at least N-1 version.

8. **Saga timeout set too long** — Saga waits minutes for an unresponsive service, holding resources and blocking dependent workflows. Fix: Set aggressive per-step timeouts (seconds, not minutes); trigger compensation immediately on timeout; alert operations team for investigation.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3, E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (227.1-227.10), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Domain Events & Saga Specialist — Cross-Cutting | EPS v3.2*

# NestJS CQRS Specialist — Patterns
# NestJS CQRSスペシャリスト — パターン
# Chuyen Gia CQRS NestJS — Pattern

**Version**: 1.0.0
**Technology**: NestJS 10+ @nestjs/cqrs
**Aspect**: CQRS Pattern
**Category**: patterns
**Purpose**: Knowledge provider for NestJS CQRS — command bus, query bus, event bus, command/query handlers, saga, event sourcing integration

---

## Metadata

```json
{
  "id": "nestjs-cqrs-specialist",
  "technology": "NestJS 10+ @nestjs/cqrs",
  "aspect": "CQRS Pattern",
  "category": "patterns",
  "subcategory": "nestjs",
  "lines": 400,
  "token_cost": 2400,
  "version": "1.0.0",
  "evidence": [
    "E1: @nestjs/cqrs module — CommandBus, QueryBus, EventBus",
    "E2: CQRS pattern — separate read/write models for scalability",
    "E3: Event sourcing basics — event store, projections"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 250.1–250.8 |
| **Directory Pattern** | `src/application/commands/`, `src/application/queries/` |
| **Dependencies** | @nestjs/cqrs |
| **When To Use** | Command Query Responsibility Segregation with event-driven side effects |
| **Source Skeleton** | src/application/commands/{action}.command.ts, src/application/queries/{action}.query.ts, src/application/events/{entity}-{action}.handler.ts |
| **Specialist Type** | code |
| **Purpose** | CQRS pattern — command/query separation, handlers, event sourcing |
| **Activation Trigger** | files: **/commands/**, **/queries/**; keywords: cqrs, commandHandler, queryHandler, eventSourcing |

---

## Role

You are a **NestJS CQRS Specialist**. You supply patterns for Command Query Responsibility Segregation in NestJS — using @nestjs/cqrs module for command/query separation, event-driven side effects, and saga orchestration.

---

## Patterns

### Pattern 250.1: Module Setup

**Category**: CQRS Fundamentals
**Description**: Register CqrsModule and wire command/query/event handlers.

```typescript
@Module({
  imports: [CqrsModule],
  controllers: [OrderController],
  providers: [
    // Commands
    CreateOrderHandler,
    CancelOrderHandler,
    // Queries
    GetOrderHandler,
    ListOrdersHandler,
    // Events
    OrderCreatedHandler,
    OrderCancelledHandler,
    // Sagas
    OrderSaga,
  ],
})
export class OrderModule {}
```

---

### Pattern 250.2: Commands

**Category**: CQRS Fundamentals
**Description**: Commands represent write intentions — one handler per command.

```typescript
// Command
export class CreateOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly items: { productId: string; quantity: number }[],
  ) {}
}

// Handler
@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    @Inject(ORDER_REPOSITORY) private repo: OrderRepositoryPort,
    private publisher: EventPublisher,
  ) {}

  async execute(command: CreateOrderCommand): Promise<string> {
    const order = Order.create(command.customerId, command.items);
    await this.repo.save(order);
    order.commit(); // publish domain events
    return order.id;
  }
}

// Controller dispatches command
@Post()
async create(@Body() dto: CreateOrderDto) {
  const orderId = await this.commandBus.execute(new CreateOrderCommand(dto.customerId, dto.items));
  return { id: orderId };
}
```

---

### Pattern 250.3: Queries

**Category**: CQRS Fundamentals
**Description**: Queries for read operations — can use optimized read models.

```typescript
// Query
export class GetOrderQuery {
  constructor(public readonly orderId: string) {}
}

// Handler
@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(@Inject(ORDER_READ_REPOSITORY) private readRepo: OrderReadPort) {}

  async execute(query: GetOrderQuery): Promise<OrderReadModel> {
    const order = await this.readRepo.findById(query.orderId);
    if (!order) throw new EntityNotFoundException('Order', query.orderId);
    return order;
  }
}

// Controller dispatches query
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.queryBus.execute(new GetOrderQuery(id));
}
```

---

### Pattern 250.4: Domain Events

**Category**: CQRS Events
**Description**: Events published after aggregate changes — trigger side effects.

```typescript
// Aggregate root with events
export class Order extends AggregateRoot {
  create(customerId: string, items: OrderItem[]) {
    // ... business logic
    this.apply(new OrderCreatedEvent(this.id, customerId, items));
  }

  cancel(reason: string) {
    if (this.status !== OrderStatus.PENDING) {
      throw new BusinessRuleViolation('Only pending orders can be cancelled');
    }
    this.apply(new OrderCancelledEvent(this.id, reason));
  }
}

// Event handler — side effect
@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  constructor(private notificationService: NotificationService) {}

  handle(event: OrderCreatedEvent) {
    this.notificationService.sendOrderConfirmation(event.orderId);
  }
}
```

---

### Pattern 250.5: Saga

**Category**: CQRS Advanced
**Description**: Saga coordinates multi-step processes triggered by events.

```typescript
@Injectable()
export class OrderSaga {
  @Saga()
  orderCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(OrderCreatedEvent),
      map(event => new ReserveInventoryCommand(event.orderId, event.items)),
    );
  };

  @Saga()
  inventoryReserved = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(InventoryReservedEvent),
      map(event => new InitiatePaymentCommand(event.orderId, event.amount)),
    );
  };
}
```

**Key Points**:
- Saga receives events, produces commands — orchestrates the flow
- Use RxJS operators for filtering, mapping, debouncing
- Compensating commands for failure handling (rollback inventory on payment failure)

---

### Pattern 250.6: When to Use CQRS

**Category**: Decision Guide
**Description**: CQRS adds complexity — use only when benefits outweigh cost.

| Scenario | CQRS? | Why |
|----------|-------|-----|
| Simple CRUD | No | Overhead not justified |
| Different read/write models | Yes | Separate optimization |
| High read/write ratio disparity | Yes | Scale reads independently |
| Complex domain with events | Yes | Natural fit with DDD |
| Multi-service orchestration | Yes | Saga pattern for coordination |
| Audit trail required | Yes | Event sourcing adds history |

---

## Best Practices

- Command = write (mutate state), Query = read (no side effects)
- Commands return minimal data (ID or void) — never return full entities
- Queries can use denormalized read models for performance
- Events are past tense (OrderCreated, not CreateOrder)
- Sagas only produce commands — never access repos directly

---

## Abnormal Case Patterns

1. **Command handler not found** — Handler not in module providers. Fix: register handler in module.
2. **Saga infinite loop** — Event triggers command that produces same event. Fix: break cycle with status checks.
3. **Query modifies state** — Query handler writes to DB. Fix: queries must be read-only.
4. **Event lost** — No handler registered for event. Fix: register all event handlers in module.
5. **Compensation not implemented** — Payment fails but inventory still reserved. Fix: add compensating command in saga.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (250.1-250.6)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS CQRS Specialist — Patterns | EPS v3.2*

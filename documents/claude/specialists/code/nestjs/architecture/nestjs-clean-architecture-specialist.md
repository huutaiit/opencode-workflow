# NestJS Clean Architecture Specialist — Architecture
# NestJSクリーンアーキテクチャスペシャリスト — アーキテクチャ
# Chuyen Gia Kien Truc Sach NestJS — Kien Truc

**Version**: 1.0.0
**Technology**: NestJS 10+ Clean Architecture
**Aspect**: Clean Architecture
**Category**: architecture
**Purpose**: Knowledge provider for NestJS clean architecture — layer separation (domain, application, infrastructure, presentation), dependency rule, port/adapter pattern, DI wiring

---

## Metadata

```json
{
  "id": "nestjs-clean-architecture-specialist",
  "technology": "NestJS 10+ Clean Architecture",
  "aspect": "Clean Architecture",
  "category": "architecture",
  "subcategory": "nestjs",
  "lines": 380,
  "token_cost": 2300,
  "version": "1.0.0",
  "evidence": [
    "E1: Uncle Bob Clean Architecture — dependency rule, use cases, entities",
    "E2: NestJS DI container — natural fit for port/adapter wiring",
    "E3: p2plend architecture — real-world NestJS clean architecture implementation"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (architectural guidance — implementation patterns for all layers) |
| **Variant** | ALL |
| **Pattern Numbers** | 260.1–260.8 |
| **Directory Pattern** | `src/{layer}/` (applies to all 4 layers) |
| **Naming Convention** | Per file type — see Architecture Master 0.3 |
| **Imports From** | N/A (cross-cutting — patterns span layers) |
| **Imported By** | ALL (every code specialist references these patterns) |
| **Cannot Import** | N/A (defines implementation patterns, not constraints) |
| **Dependencies** | @nestjs/common, @nestjs/core, typeorm, class-validator |
| **When To Use** | Implementing Clean Architecture layers in NestJS — entity, use case, repository, controller patterns |
| **Source Skeleton** | `apps/{service}/src/{layer}/` |
| **Specialist Type** | code |
| **Purpose** | Implementation patterns for NestJS clean architecture — layer code examples, DI wiring, port/adapter, module organization |
| **Activation Trigger** | files: **/domain/**/*.ts, **/application/**/*.ts, **/infrastructure/**/*.ts, **/presentation/**/*.ts; keywords: cleanArchitecture, layerSeparation, portAdapter, useCase |

---

## Role

You are a **NestJS Clean Architecture Specialist**. You supply patterns for implementing clean architecture in NestJS — 4-layer separation, dependency inversion via ports and adapters, domain purity, and NestJS module organization aligned with architectural boundaries.

---

## Patterns

### Pattern 260.1: Layer Structure

```
src/
├── domain/                 # Layer 1: Enterprise Business Rules
│   ├── entities/           # Domain entities (pure TS, no decorators)
│   ├── value-objects/      # Value objects (Money, Email, etc.)
│   ├── ports/              # Repository/service interfaces + tokens
│   ├── exceptions/         # Domain exceptions (no HttpException)
│   └── events/             # Domain event classes
│
├── application/            # Layer 2: Application Business Rules
│   ├── use-cases/          # Command/Query handlers
│   ├── dto/                # Input/Output DTOs
│   ├── mappers/            # Entity ↔ DTO mappers
│   └── services/           # Application services (orchestration)
│
├── infrastructure/         # Layer 3: Interface Adapters
│   ├── persistence/        # TypeORM entities, repositories
│   ├── messaging/          # RabbitMQ, gRPC clients
│   ├── external/           # Third-party API clients
│   ├── config/             # Configuration
│   └── cache/              # Redis adapters
│
└── presentation/           # Layer 4: Frameworks & Drivers
    ├── controllers/        # HTTP controllers
    ├── gateways/           # WebSocket gateways
    ├── guards/             # Auth guards
    ├── interceptors/       # HTTP interceptors
    ├── filters/            # Exception filters
    └── pipes/              # Validation pipes
```

---

### Pattern 260.2: Dependency Rule

**Description**: Dependencies point inward. Outer layers depend on inner layers, NEVER the reverse.

```
Presentation → Application → Domain (← Infrastructure implements Domain ports)

Allowed:
  Controller → UseCase → DomainService → Entity
  Repository (infra) implements RepositoryPort (domain)

Forbidden:
  Domain → TypeORM (infrastructure)
  Domain → HttpException (presentation)
  Application → Express Request (presentation)
```

```typescript
// Domain defines the port (interface)
// domain/ports/order-repository.port.ts
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export interface OrderRepositoryPort {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
}

// Infrastructure implements the port
// infrastructure/persistence/typeorm-order.repository.ts
@Injectable()
export class TypeOrmOrderRepository implements OrderRepositoryPort { /* ... */ }

// Module wires port to implementation
{ provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository }
```

---

### Pattern 260.3: Domain Layer (Pure TypeScript)

```typescript
// domain/entities/order.entity.ts — NO decorators, NO framework imports
export class Order {
  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    private _status: OrderStatus,
    private _items: OrderItem[],
  ) {}

  static create(customerId: string, items: OrderItem[]): Order {
    if (items.length === 0) throw new EmptyOrderException();
    return new Order(randomUUID(), customerId, OrderStatus.PENDING, items);
  }

  approve(): void {
    if (this._status !== OrderStatus.PENDING) {
      throw new InvalidOrderTransitionException(this._status, OrderStatus.APPROVED);
    }
    this._status = OrderStatus.APPROVED;
  }

  get totalAmount(): number {
    return this._items.reduce((sum, item) => sum + item.subtotal, 0);
  }
}
```

---

### Pattern 260.4: Application Layer (Use Cases)

```typescript
// application/use-cases/create-order.use-case.ts
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private orderRepo: OrderRepositoryPort,
    @Inject(INVENTORY_PORT) private inventory: InventoryPort,
    private eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreateOrderDto): Promise<OrderResponseDto> {
    // 1. Validate business rules via domain
    const order = Order.create(dto.customerId, dto.items.map(OrderItem.create));

    // 2. Check inventory via port
    await this.inventory.reserve(order.items);

    // 3. Persist via port
    const saved = await this.orderRepo.save(order);

    // 4. Emit event
    this.eventEmitter.emit('order.created', new OrderCreatedEvent(saved));

    return OrderMapper.toResponse(saved);
  }
}
```

---

### Pattern 260.5: Infrastructure Layer (Adapters)

```typescript
// infrastructure/persistence/typeorm-order.repository.ts
@Injectable()
export class TypeOrmOrderRepository implements OrderRepositoryPort {
  constructor(@InjectRepository(OrderOrmEntity) private repo: Repository<OrderOrmEntity>) {}

  async findById(id: string): Promise<Order | null> {
    const entity = await this.repo.findOne({ where: { id }, relations: ['items'] });
    return entity ? OrderMapper.toDomain(entity) : null;
  }

  async save(order: Order): Promise<Order> {
    const ormEntity = OrderMapper.toOrm(order);
    const saved = await this.repo.save(ormEntity);
    return OrderMapper.toDomain(saved);
  }
}

// Note: Domain Order ≠ TypeORM OrderOrmEntity
// Mapper converts between them — domain stays pure
```

---

### Pattern 260.6: Presentation Layer (Thin Controllers)

```typescript
@Controller('orders')
export class OrderController {
  constructor(
    private createOrder: CreateOrderUseCase,
    private findOrder: FindOrderUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.createOrder.execute(dto); // delegate immediately
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    return this.findOrder.execute(id);
  }
}
// Controllers: validate input → delegate to use case → return result. Nothing else.
```

---

### Pattern 260.7: Module Organization

```typescript
// Feature module — aligns with bounded context
@Module({
  imports: [TypeOrmModule.forFeature([OrderOrmEntity, OrderItemOrmEntity])],
  controllers: [OrderController],
  providers: [
    // Use cases
    CreateOrderUseCase,
    FindOrderUseCase,
    // Port implementations
    { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },
    { provide: INVENTORY_PORT, useClass: HttpInventoryAdapter },
    // Mappers
    OrderMapper,
  ],
  exports: [ORDER_REPOSITORY], // only export ports, not use cases
})
export class OrderModule {}
```

---

## Layer Import Rules

| From \ To | Domain | Application | Infrastructure | Presentation |
|-----------|--------|-------------|---------------|-------------|
| **Domain** | Self | No | No | No |
| **Application** | Yes | Self | No | No |
| **Infrastructure** | Yes (implements) | Yes (for DI) | Self | No |
| **Presentation** | No | Yes | No | Self |

---

## Best Practices

- Domain entities are PURE TypeScript — no `@Entity`, no `@Injectable`, no `HttpException`
- Use cases are the API of the application layer — one use case per business operation
- Infrastructure adapters are swappable — switch from TypeORM to Prisma without changing domain
- Controllers are thin — validate + delegate + return, no business logic

---

## Abnormal Case Patterns

1. **Domain imports TypeORM** — `@Entity()` on domain class. Fix: separate ORM entity from domain entity.
2. **Controller has business logic** — if/else validation in controller. Fix: move to use case or domain.
3. **Use case imports Express** — `@Req() request` passed to use case. Fix: extract needed data in controller, pass DTO.
4. **Repository returns ORM entity** — Controller sees TypeORM columns. Fix: mapper converts ORM → Domain in repository.
5. **Circular dependency** — OrderModule imports PaymentModule and vice versa. Fix: use events or shared interface module.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (260.1–260.8)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Clean Architecture Specialist — Pattern 260.x | EPS v10.0*

> **Architecture definitions moved to Pattern 0.x** (`nestjs-architecture-master-specialist.md`).
> This file covers **implementation patterns only** (260.1–260.8: layer examples, DI wiring, code skeletons).

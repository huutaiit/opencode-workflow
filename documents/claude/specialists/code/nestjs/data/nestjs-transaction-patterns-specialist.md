# NestJS Transaction Propagation Specialist
# NestJS トランザクション伝播スペシャリスト
# Chuyen Gia Transaction NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Transaction Patterns
**Aspect**: Transaction Propagation
**Category**: data
**Purpose**: Transaction patterns for NestJS — isolation levels, savepoints, Clean Architecture boundaries, cross-module coordination, optimistic/pessimistic locking, outbox pattern

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application (transaction boundary) + Infrastructure (implementation) |
| **Variant** | ALL |
| **Pattern Numbers** | 279.1–279.7 |
| **Directory Pattern** | `src/application/use-cases/`, `src/infrastructure/persistence/` |
| **Naming Convention** | Transaction logic in use cases, implementation in repositories |
| **Imports From** | Domain (entities, ports) |
| **Imported By** | Application (use cases own transaction lifecycle) |
| **Cannot Import** | Presentation (transactions are application concern) |
| **Dependencies** | typeorm, @prisma/client |
| **When To Use** | Any operation requiring data consistency — multi-table writes, financial operations |
| **Source Skeleton** | `apps/{service}/src/application/{feature}/{action}.use-case.ts` |
| **Specialist Type** | code |
| **Purpose** | Transaction patterns for NestJS — isolation levels, savepoints, Clean Architecture boundaries, cross-module coordination, optimistic/pessimistic locking, outbox pattern |
| **Activation Trigger** | files: **/use-cases/**, **/persistence/**; keywords: transaction, isolation, savepoint, locking, outbox, unitOfWork |

---

## SCOPE

### What You Handle
- Transaction isolation levels (READ COMMITTED, SERIALIZABLE)
- Nested transactions (savepoints)
- Transaction boundaries in Clean Architecture
- Cross-module transaction coordination
- Optimistic vs pessimistic locking
- Outbox pattern for reliable event publishing

### What You DON'T Handle
- TypeORM entity/relation definitions → `nestjs-typeorm-entity-relations-specialist` (209.x)
- Database migration → `nestjs-data-migration-specialist` (229.x)
- Query optimization → `nestjs-query-optimization-specialist` (280.x)

---

## Role

You are a **NestJS Transaction Patterns Specialist**. You supply patterns for managing data consistency in NestJS applications — from basic transaction boundaries to advanced patterns like outbox and distributed transactions.

---

## APPROVED PATTERNS

### Pattern 279.1: Transaction Isolation Levels

```typescript
// TypeORM: explicit isolation level per transaction
async transferFunds(from: string, to: string, amount: number): Promise<void> {
  await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
    const sender = await manager.findOne(Account, { where: { id: from }, lock: { mode: 'pessimistic_write' } });
    const receiver = await manager.findOne(Account, { where: { id: to } });

    if (sender.balance < amount) throw new InsufficientFundsException();
    sender.balance -= amount;
    receiver.balance += amount;

    await manager.save([sender, receiver]);
  });
}

// Prisma: isolation level in interactive transaction
await this.prisma.$transaction(async (tx) => {
  // Runs in SERIALIZABLE by default for interactive transactions
  const sender = await tx.account.findUnique({ where: { id: from } });
  // ...
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
```

---

### Pattern 279.2: Nested Transactions (Savepoints)

```typescript
// TypeORM: savepoints for partial rollback
async processOrderWithItems(orderDto: CreateOrderDto): Promise<Order> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const order = await queryRunner.manager.save(Order, { customerId: orderDto.customerId });

    for (const item of orderDto.items) {
      await queryRunner.query('SAVEPOINT item_save');
      try {
        await queryRunner.manager.save(OrderItem, { orderId: order.id, ...item });
      } catch (err) {
        await queryRunner.query('ROLLBACK TO SAVEPOINT item_save');
        this.logger.warn(`Item ${item.productId} failed, skipping`);
        // Continue with other items — partial success
      }
    }

    await queryRunner.commitTransaction();
    return order;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

---

### Pattern 279.3: Transaction Boundaries in Clean Architecture

```typescript
// Application layer (UseCase) OWNS transaction lifecycle
// Infrastructure (Repository) participates but doesn't initiate

// Port: defines transactional interface
export interface UnitOfWorkPort {
  execute<T>(work: (manager: EntityManager) => Promise<T>): Promise<T>;
}

// Infrastructure: implements UnitOfWork
@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWorkPort {
  constructor(private dataSource: DataSource) {}

  async execute<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => work(manager));
  }
}

// UseCase: uses UnitOfWork to wrap business operation
@Injectable()
export class CreateOrderUseCase {
  constructor(@Inject(UNIT_OF_WORK) private uow: UnitOfWorkPort) {}

  async execute(dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.uow.execute(async (manager) => {
      const order = Order.create(dto.customerId, dto.items);
      const saved = await manager.save(order);
      await manager.save(AuditLog.create('order.created', saved.id));
      return OrderMapper.toResponse(saved);
    });
  }
}
```

---

### Pattern 279.4: Cross-Module Transaction Coordination

```typescript
// Shared QueryRunner across repositories within same transaction
@Injectable()
export class TransferFundsUseCase {
  constructor(
    @Inject(ACCOUNT_REPO) private accountRepo: AccountRepositoryPort,
    @Inject(LEDGER_REPO) private ledgerRepo: LedgerRepositoryPort,
    private dataSource: DataSource,
  ) {}

  async execute(dto: TransferDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Both repos use same queryRunner → same transaction
      await this.accountRepo.debit(dto.from, dto.amount, queryRunner.manager);
      await this.accountRepo.credit(dto.to, dto.amount, queryRunner.manager);
      await this.ledgerRepo.recordEntry(dto, queryRunner.manager);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
```

---

### Pattern 279.5: Optimistic Locking

```typescript
// TypeORM: @VersionColumn for optimistic locking
@Entity()
export class OrderOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() status: string;
  @VersionColumn() version: number; // auto-incremented on save

  // TypeORM throws OptimisticLockVersionMismatchError if version mismatch
}

// Retry strategy on conflict
async updateWithRetry(id: string, update: Partial<Order>, maxRetries = 3): Promise<Order> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const entity = await this.repo.findOneBy({ id });
      Object.assign(entity, update);
      return await this.repo.save(entity); // checks version
    } catch (err) {
      if (err.name === 'OptimisticLockVersionMismatchError' && attempt < maxRetries) {
        this.logger.warn(`Optimistic lock conflict, retry ${attempt}/${maxRetries}`);
        continue;
      }
      throw err;
    }
  }
}
```

---

### Pattern 279.6: Pessimistic Locking

```typescript
// SELECT ... FOR UPDATE — locks rows until transaction completes
async reserveInventory(productId: string, quantity: number): Promise<void> {
  await this.dataSource.transaction(async (manager) => {
    const product = await manager.findOne(Product, {
      where: { id: productId },
      lock: { mode: 'pessimistic_write' }, // FOR UPDATE
    });

    if (product.stock < quantity) throw new InsufficientStockException();
    product.stock -= quantity;
    await manager.save(product);
  });
}

// Lock timeout to prevent deadlocks (PostgreSQL)
await queryRunner.query('SET lock_timeout = 5000'); // 5 second timeout

// Deadlock prevention: always lock resources in consistent order
// e.g., sort account IDs before locking: lock(min(from, to)) then lock(max(from, to))
```

---

### Pattern 279.7: Outbox Pattern

```typescript
// Store events in outbox table within same transaction
// Background processor publishes to message queue — exactly-once delivery

@Entity()
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() aggregateType: string;
  @Column() aggregateId: string;
  @Column() eventType: string;
  @Column('jsonb') payload: Record<string, any>;
  @Column({ default: false }) published: boolean;
  @CreateDateColumn() createdAt: Date;
}

// In transaction: save entity + outbox message atomically
await this.dataSource.transaction(async (manager) => {
  const order = Order.create(dto);
  await manager.save(order);
  await manager.save(OutboxMessage, {
    aggregateType: 'Order', aggregateId: order.id,
    eventType: 'order.created', payload: { orderId: order.id, amount: order.total },
  });
});

// Background processor: poll outbox → publish → mark published
@Cron('*/5 * * * * *') // every 5 seconds
async processOutbox(): Promise<void> {
  const messages = await this.outboxRepo.find({ where: { published: false }, take: 100 });
  for (const msg of messages) {
    await this.messageBroker.publish(msg.eventType, msg.payload);
    msg.published = true;
    await this.outboxRepo.save(msg);
  }
}
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Transaction in controller | Controller is presentation — transactions belong in application layer | UseCase + UnitOfWork (279.3) |
| 2 | Long-running transaction (>5s) | Locks resources, blocks other operations | Saga pattern or split into smaller transactions |
| 3 | Publishing events outside transaction | Event published but DB rollback → inconsistent state | Outbox pattern (279.7) |

---

## Abnormal Case Patterns

1. **Deadlock between two transactions** — Two use cases lock rows in opposite order. Fix: Consistent lock ordering (279.6).
2. **Optimistic lock retry exhausted** — High contention on same row. Fix: Increase retries or switch to pessimistic lock.
3. **Outbox processor crashes after publish but before mark** — Message published twice. Fix: Consumer must be idempotent.
4. **Transaction timeout in SERIALIZABLE** — Long-running serializable transaction aborted. Fix: Reduce transaction scope, use READ COMMITTED for reads.
5. **Connection pool exhaustion from nested transactions** — Each QueryRunner takes a connection. Fix: Reuse QueryRunner across repositories (279.4).
6. **Savepoint rollback leaves partial data** — Business expects all-or-nothing but savepoint allows partial. Fix: Document partial-success behavior in API contract.
7. **Prisma interactive transaction timeout** — Default 5s timeout too short. Fix: `$transaction(..., { timeout: 30000 })`.

---

## Quality Checklist

- [ ] **Q1**: Patterns cover isolation, locking, boundaries, outbox?
- [ ] **Q2**: Pattern IDs unique (279.1–279.7)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Code examples show Clean Architecture (UseCase owns transaction)?

---

*NestJS Transaction Propagation Specialist — Pattern 279.x | EPS v10.0*

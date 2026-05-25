# NestJS TypeORM Queries & Migrations Specialist — Data
# NestJS TypeORMクエリ＆マイグレーションスペシャリスト — データ
# Chuyen Gia Truy Van va Migration TypeORM NestJS — Du Lieu

**Version**: 2.0.0
**Technology**: NestJS 10+ TypeORM Queries & Migrations
**Aspect**: TypeORM Queries & Migrations
**Category**: data
**Purpose**: Knowledge provider for TypeORM QueryBuilder, transactions, N+1 prevention, soft delete, index optimization, migration strategy, seed data

---

## Metadata

```json
{
  "id": "nestjs-typeorm-queries-migrations-specialist",
  "technology": "NestJS 10+ TypeORM Queries & Migrations",
  "aspect": "TypeORM Queries & Migrations",
  "category": "data",
  "subcategory": "nestjs",
  "lines": 480,
  "token_cost": 2900,
  "version": "2.0.0",
  "evidence": [
    "E1: TypeORM QueryBuilder — dynamic queries, joins, subqueries, aggregations",
    "E4: Transaction patterns — DataSource.transaction, QueryRunner, isolation levels",
    "E5: Migration strategy — generate, run, rollback, zero-downtime"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 209.9–209.18 |
| **Directory Pattern** | `src/infrastructure/persistence/` |
| **Dependencies** | @nestjs/typeorm, typeorm, pg |
| **When To Use** | Advanced TypeORM queries, transactions, migrations |
| **Source Skeleton** | src/infrastructure/database/migrations/{timestamp}-{name}.ts |
| **Specialist Type** | code |
| **Purpose** | TypeORM advanced queries and migrations — QueryBuilder, raw queries, migration patterns |
| **Activation Trigger** | files: **/persistence/**; keywords: queryBuilder, createQueryBuilder, migration, typeorm |

> **See also**: nestjs-typeorm-entity-relations (209.1-209.8) for entity design and repository patterns

---

## Role

You are a **NestJS TypeORM Queries & Migrations Specialist**. You supply patterns for advanced TypeORM queries — QueryBuilder, transactions, N+1 prevention, performance optimization, index strategy, migration management, and seed data.

---

## Patterns

### Pattern 209.9: QueryBuilder Fundamentals

**Category**: Queries
**Description**: Dynamic queries with createQueryBuilder for complex filtering.

```typescript
async searchOrders(filters: OrderSearchDto): Promise<OrderEntity[]> {
  const qb = this.repo.createQueryBuilder('order')
    .leftJoinAndSelect('order.items', 'item')
    .leftJoinAndSelect('order.customer', 'customer');

  if (filters.status) qb.andWhere('order.status = :status', { status: filters.status });
  if (filters.minAmount) qb.andWhere('order.totalAmount >= :min', { min: filters.minAmount });
  if (filters.customerId) qb.andWhere('order.customerId = :cid', { cid: filters.customerId });
  if (filters.search) {
    qb.andWhere('(customer.name ILIKE :search OR order.reference ILIKE :search)', {
      search: `%${filters.search}%`,
    });
  }

  return qb
    .orderBy('order.createdAt', 'DESC')
    .skip((filters.page - 1) * filters.limit)
    .take(filters.limit)
    .getMany();
}
```

**Key Points**:
- Always use parameterized queries (`:param`) — prevents SQL injection
- `leftJoinAndSelect` loads relations in single query — prevents N+1
- Chain `.andWhere()` conditionally — only apply provided filters

---

### Pattern 209.10: Aggregation Queries

**Category**: Queries
**Description**: SUM, COUNT, AVG with QueryBuilder and raw results.

```typescript
async getOrderStats(customerId: string): Promise<OrderStats> {
  const result = await this.repo.createQueryBuilder('order')
    .select('COUNT(*)', 'totalOrders')
    .addSelect('SUM(order.totalAmount)', 'totalSpent')
    .addSelect('AVG(order.totalAmount)', 'avgOrderAmount')
    .addSelect('MAX(order.createdAt)', 'lastOrderDate')
    .where('order.customerId = :cid', { cid: customerId })
    .andWhere('order.deletedAt IS NULL')
    .getRawOne();

  return {
    totalOrders: parseInt(result.totalOrders),
    totalSpent: parseFloat(result.totalSpent) || 0,
    avgOrderAmount: parseFloat(result.avgOrderAmount) || 0,
    lastOrderDate: result.lastOrderDate ? new Date(result.lastOrderDate) : null,
  };
}
```

---

### Pattern 209.11: Subqueries

**Category**: Queries
**Description**: Nested queries for complex filtering.

```typescript
// Find customers who have placed more than 5 orders
async findFrequentCustomers(): Promise<UserEntity[]> {
  const subQuery = this.orderRepo.createQueryBuilder('order')
    .select('order.customerId')
    .groupBy('order.customerId')
    .having('COUNT(*) > :minOrders', { minOrders: 5 });

  return this.userRepo.createQueryBuilder('user')
    .where(`user.id IN (${subQuery.getQuery()})`)
    .setParameters(subQuery.getParameters())
    .getMany();
}
```

---

### Pattern 209.12: Transactions

**Category**: Data Integrity
**Description**: Multi-table writes with atomicity guarantee.

```typescript
// Method 1: DataSource.transaction (simple)
async createOrderWithPayment(dto: CreateOrderDto): Promise<Order> {
  return this.dataSource.transaction(async (manager) => {
    const order = manager.create(OrderEntity, { ...dto, status: OrderStatus.PENDING });
    const savedOrder = await manager.save(order);

    const payment = manager.create(PaymentEntity, {
      orderId: savedOrder.id,
      amount: dto.totalAmount,
      status: PaymentStatus.PENDING,
    });
    await manager.save(payment);

    // Update inventory
    for (const item of dto.items) {
      await manager.decrement(InventoryEntity, { productId: item.productId }, 'quantity', item.quantity);
    }

    return OrderMapper.toDomain(savedOrder);
  });
}

// Method 2: QueryRunner (fine-grained control)
async transferWithIsolation(from: string, to: string, amount: number) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');

  try {
    const fromAccount = await queryRunner.manager.findOne(AccountEntity, { where: { id: from } });
    if (fromAccount.balance < amount) throw new InsufficientBalanceException();

    await queryRunner.manager.decrement(AccountEntity, { id: from }, 'balance', amount);
    await queryRunner.manager.increment(AccountEntity, { id: to }, 'balance', amount);

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

**Key Points**:
- `DataSource.transaction()` — simple, auto-commit/rollback
- `QueryRunner` — manual control, custom isolation levels
- Always release QueryRunner in `finally` — prevents connection leak
- `SERIALIZABLE` for financial operations — strictest isolation

---

### Pattern 209.13: N+1 Prevention

**Category**: Performance
**Description**: Strategies to avoid N+1 query problem.

```typescript
// Strategy 1: find() with relations
const orders = await this.repo.find({ relations: ['items', 'customer'] });

// Strategy 2: QueryBuilder with leftJoinAndSelect
const orders = await this.repo.createQueryBuilder('order')
  .leftJoinAndSelect('order.items', 'item')
  .leftJoinAndSelect('order.customer', 'customer')
  .getMany();

// Strategy 3: Separate queries (when join is too expensive)
const orders = await this.repo.find();
const orderIds = orders.map(o => o.id);
const items = await this.itemRepo.find({ where: { orderId: In(orderIds) } });
// Group items by orderId and assign
```

---

### Pattern 209.14: Optimistic Locking

**Category**: Concurrency
**Description**: Version column prevents concurrent modification.

```typescript
@Entity()
export class OrderEntity {
  @VersionColumn()
  version: number;
}

// Update with version check — throws OptimisticLockVersionMismatchError on conflict
async updateOrder(id: string, dto: UpdateOrderDto): Promise<Order> {
  const entity = await this.repo.findOneBy({ id });
  Object.assign(entity, dto);
  try {
    return await this.repo.save(entity); // checks version automatically
  } catch (error) {
    if (error.name === 'OptimisticLockVersionMismatchError') {
      throw new ConflictException('Order was modified by another process');
    }
    throw error;
  }
}
```

---

### Pattern 209.15: Index Strategy

**Category**: Performance
**Description**: Proper indexing for query performance.

```typescript
@Entity('orders')
@Index(['customerId', 'status']) // composite for WHERE customerId AND status
@Index(['createdAt'])             // for ORDER BY createdAt
@Index(['status', 'createdAt'])   // for WHERE status ORDER BY createdAt
export class OrderEntity {
  @Column({ name: 'customer_id' })
  @Index() // single column for WHERE customerId only
  customerId: string;
}
```

**Key Points**:
- Index columns used in WHERE, ORDER BY, JOIN ON
- Composite index: leftmost column first (most selective)
- Use `EXPLAIN ANALYZE` to verify query uses index
- Don't over-index — each index slows INSERT/UPDATE

---

### Pattern 209.16: Migration Management

**Category**: Database Lifecycle
**Description**: Generate, run, and manage migrations safely.

```bash
# Generate migration from entity changes
npx typeorm migration:generate -d src/data-source.ts src/migrations/AddOrderStatus

# Run pending migrations
npx typeorm migration:run -d src/data-source.ts

# Revert last migration
npx typeorm migration:revert -d src/data-source.ts
```

```typescript
// Generated migration
export class AddOrderStatus1709123456789 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "priority" varchar NOT NULL DEFAULT 'normal'`);
    await queryRunner.query(`CREATE INDEX "IDX_order_priority" ON "orders" ("priority")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_order_priority"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "priority"`);
  }
}
```

---

### Pattern 209.17: Zero-Downtime Migration

**Category**: Database Lifecycle
**Description**: Safe migration patterns that don't lock tables or break running app.

```
Safe operations (no downtime):
✅ ADD COLUMN with DEFAULT
✅ CREATE INDEX CONCURRENTLY
✅ ADD nullable column

Unsafe operations (requires care):
⚠️ DROP COLUMN — deploy code first that doesn't use column, then migrate
⚠️ RENAME COLUMN — add new column → copy data → deploy code → drop old
⚠️ CHANGE TYPE — add new column → backfill → switch → drop old
```

---

### Pattern 209.18: Seed Data

**Category**: Database Lifecycle
**Description**: Initial data seeding for development and testing.

```typescript
// src/database/seeds/seed.ts
async function seed() {
  const dataSource = await createDataSource();

  const roles = [
    { name: 'admin', permissions: ['*'] },
    { name: 'user', permissions: ['read'] },
  ];
  await dataSource.getRepository(RoleEntity).save(roles);

  const admin = dataSource.getRepository(UserEntity).create({
    email: 'admin@example.com',
    name: 'Admin',
    roles: [roles[0]],
  });
  await dataSource.getRepository(UserEntity).save(admin);

  await dataSource.destroy();
}
seed();
```

---

## Best Practices

### Queries
- Always parameterize — `:param` syntax, never string concatenation
- Use `getMany()` for entities, `getRawMany()` for aggregations
- Limit results — never `find()` without pagination on large tables

### Transactions
- Keep transactions short (<5 seconds)
- Use SERIALIZABLE only for financial/critical operations
- Always release QueryRunner in finally block

### Migrations
- Never `synchronize: true` in production
- Review generated migration SQL before running
- Test migration + rollback before deploying

---

## Abnormal Case Patterns

1. **Transaction not rolling back** — Multiple repos without shared manager. Fix: use `DataSource.transaction()` with its EntityManager.
2. **Migration drift** — Manual DB changes diverge from migrations. Fix: always use `migration:generate`.
3. **Slow query on large table** — Missing index. Fix: `EXPLAIN ANALYZE` to find missing indexes.
4. **Optimistic lock false positive** — Version incremented by unrelated update. Fix: load fresh entity before modification.
5. **Connection leak** — QueryRunner not released. Fix: always `release()` in finally.
6. **Zero-downtime migration fails** — Column dropped while app still reads it. Fix: two-phase deploy (code first, migration second).

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E4, E5)?
- [ ] **Q2**: Pattern IDs unique (209.9-209.18)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS TypeORM Queries & Migrations Specialist — Data | EPS v3.2*

# NestJS Query Optimization Specialist
# NestJS クエリ最適化スペシャリスト
# Chuyen Gia Toi Uu Truy Van NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Query Optimization
**Aspect**: Query Optimization
**Category**: data
**Purpose**: Query optimization for NestJS — N+1 prevention, connection pooling, QueryBuilder patterns, read replicas, slow query detection, indexing strategy

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (persistence) |
| **Variant** | ALL |
| **Pattern Numbers** | 280.1–280.6 |
| **Directory Pattern** | `src/infrastructure/persistence/` |
| **Naming Convention** | Query logic in repository implementations |
| **Imports From** | Domain (entities, ports) |
| **Imported By** | Application (use cases call optimized queries via ports) |
| **Cannot Import** | Presentation (data optimization is infrastructure concern) |
| **Dependencies** | typeorm, @prisma/client |
| **When To Use** | Performance optimization — N+1 prevention, large dataset handling, read-heavy workloads |
| **Source Skeleton** | `apps/{service}/src/infrastructure/persistence/{entity}.repository.ts` |
| **Specialist Type** | code |
| **Purpose** | Query optimization for NestJS — N+1 prevention, connection pooling, QueryBuilder patterns, read replicas, slow query detection, indexing strategy |
| **Activation Trigger** | files: **/persistence/**; keywords: queryBuilder, eagerLoading, connectionPool, readReplica, slowQuery, index |

---

## SCOPE

### What You Handle
- N+1 query prevention (eager loading, DataLoader)
- Connection pooling configuration
- Complex QueryBuilder patterns
- Read replica routing
- Slow query detection and monitoring
- Database indexing strategy

### What You DON'T Handle
- Entity/relation definitions → `nestjs-typeorm-entity-relations-specialist` (209.x)
- Transaction management → `nestjs-transaction-patterns-specialist` (279.x)
- Full-text search → `nestjs-elasticsearch-specialist` (257.x)

---

## Role

You are a **NestJS Query Optimization Specialist**. You supply patterns for optimizing database queries in NestJS applications — from N+1 prevention to connection pooling and read replica routing.

---

## APPROVED PATTERNS

### Pattern 280.1: N+1 Query Prevention

```typescript
// ❌ N+1 problem: 1 query for orders + N queries for items
const orders = await this.orderRepo.find(); // SELECT * FROM orders
for (const order of orders) {
  order.items = await this.itemRepo.find({ where: { orderId: order.id } }); // N queries
}

// ✅ Eager loading with TypeORM relations
const orders = await this.orderRepo.find({
  relations: ['items', 'items.product'], // JOIN in single query
});

// ✅ QueryBuilder with explicit JOIN
const orders = await this.orderRepo.createQueryBuilder('o')
  .leftJoinAndSelect('o.items', 'item')
  .leftJoinAndSelect('item.product', 'product')
  .where('o.status = :status', { status: 'ACTIVE' })
  .getMany();

// ✅ DataLoader for GraphQL (batch N queries into 1)
@Injectable({ scope: Scope.REQUEST })
export class OrderItemsLoader {
  constructor(private itemRepo: ItemRepository) {}

  private loader = new DataLoader<string, Item[]>(async (orderIds) => {
    const items = await this.itemRepo.find({ where: { orderId: In([...orderIds]) } });
    return orderIds.map(id => items.filter(item => item.orderId === id));
  });

  load(orderId: string): Promise<Item[]> { return this.loader.load(orderId); }
}
```

---

### Pattern 280.2: Connection Pooling

```typescript
// TypeORM connection pool configuration
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  extra: {
    max: 20,              // max connections in pool
    min: 5,               // min idle connections
    idleTimeoutMillis: 30000,  // close idle connections after 30s
    connectionTimeoutMillis: 3000, // fail fast if no connection available
  },
  logging: ['error', 'warn'], // production: errors only
});

// Prisma connection pool
// datasource db { provider = "postgresql" url = env("DATABASE_URL") }
// DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=10"

// Monitor pool: custom health indicator
@Injectable()
export class DbPoolHealthIndicator extends HealthIndicator {
  async isHealthy(): Promise<HealthIndicatorResult> {
    const pool = this.dataSource.driver.master; // pg Pool instance
    const { totalCount, idleCount, waitingCount } = pool;
    const healthy = waitingCount < totalCount * 0.8; // <80% waiting
    return this.getStatus('db-pool', healthy, { totalCount, idleCount, waitingCount });
  }
}
```

---

### Pattern 280.3: Complex QueryBuilder Patterns

```typescript
// Dynamic filter building from SearchCriteria DTO
async findWithFilters(criteria: OrderSearchDto): Promise<PaginatedResult<Order>> {
  const qb = this.repo.createQueryBuilder('o')
    .leftJoinAndSelect('o.customer', 'c');

  // Dynamic WHERE conditions
  if (criteria.status) qb.andWhere('o.status = :status', { status: criteria.status });
  if (criteria.minAmount) qb.andWhere('o.totalAmount >= :min', { min: criteria.minAmount });
  if (criteria.customerId) qb.andWhere('o.customerId = :cid', { cid: criteria.customerId });
  if (criteria.dateFrom) qb.andWhere('o.createdAt >= :from', { from: criteria.dateFrom });

  // Subquery example
  if (criteria.hasPayment) {
    qb.andWhere(qb2 => {
      const sub = qb2.subQuery().select('p.orderId').from(Payment, 'p').where('p.status = :ps', { ps: 'COMPLETED' }).getQuery();
      return 'o.id IN ' + sub;
    });
  }

  // Dynamic sorting
  const sortField = criteria.sortBy || 'createdAt';
  qb.orderBy(`o.${sortField}`, criteria.sortOrder || 'DESC');

  // Pagination
  const [items, total] = await qb.skip(criteria.offset).take(criteria.limit).getManyAndCount();
  return { items, total, page: Math.floor(criteria.offset / criteria.limit) + 1 };
}
```

---

### Pattern 280.4: Read Replica Routing

```typescript
// TypeORM: multiple data sources
TypeOrmModule.forRoot({
  type: 'postgres',
  replication: {
    master: { host: process.env.DB_MASTER_HOST, port: 5432, username: '...', password: '...', database: '...' },
    slaves: [
      { host: process.env.DB_REPLICA_1_HOST, port: 5432, username: '...', password: '...', database: '...' },
      { host: process.env.DB_REPLICA_2_HOST, port: 5432, username: '...', password: '...', database: '...' },
    ],
  },
});

// TypeORM automatically routes: SELECT → replica, INSERT/UPDATE/DELETE → master
// Force master for read-after-write consistency:
const order = await this.repo.findOne({ where: { id }, lock: { mode: 'pessimistic_read' } }); // forces master

// Custom decorator for explicit routing
export function UseReplica() {
  return SetMetadata('db-source', 'replica');
}
```

---

### Pattern 280.5: Slow Query Detection

```typescript
// TypeORM: log queries exceeding threshold
TypeOrmModule.forRoot({
  maxQueryExecutionTime: 1000, // log queries > 1s
  logging: ['error', 'warn', 'query'], // enable query logging
  logger: new CustomTypeOrmLogger(), // custom logger with metrics
});

// Prisma: query event monitoring
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    metrics.slowQueryCounter.inc({ table: extractTable(e.query) });
  }
});

// EXPLAIN ANALYZE integration for debugging
async explainQuery(query: string, params: any[]): Promise<string> {
  const result = await this.dataSource.query(`EXPLAIN ANALYZE ${query}`, params);
  return result.map(r => r['QUERY PLAN']).join('\n');
}
```

---

### Pattern 280.6: Indexing Strategy

```typescript
// TypeORM: declarative index via decorators
@Entity()
@Index(['status', 'createdAt']) // composite index for common filter + sort
@Index(['customerId'])          // FK index for JOIN performance
export class OrderOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() status: string;
  @Column() customerId: string;
  @CreateDateColumn() createdAt: Date;

  // Partial index (PostgreSQL) — index only active orders
  @Index('idx_active_orders', { where: '"status" = \'ACTIVE\'' })
  @Column() totalAmount: number;
}

// Migration-based index for more control
export class AddOrderIndexes implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Concurrent index creation (no table lock in PostgreSQL)
    await queryRunner.query('CREATE INDEX CONCURRENTLY idx_order_status_date ON orders (status, created_at DESC)');
  }
}

// Monitor index usage (PostgreSQL)
// SELECT indexrelname, idx_scan, idx_tup_read FROM pg_stat_user_indexes WHERE schemaname = 'public';
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | `SELECT *` without specifying columns | Fetches unnecessary data, wastes bandwidth | `.select(['o.id', 'o.status'])` in QueryBuilder |
| 2 | `find()` without limit | Returns entire table for large datasets | Always paginate: `.take(limit).skip(offset)` |
| 3 | Index on every column | Write performance degradation, storage waste | Index only columns used in WHERE/JOIN/ORDER BY |

---

## Abnormal Case Patterns

1. **N+1 detected in production** — Response time degrades with data growth. Fix: Enable query logging, identify missing relations.
2. **Connection pool exhausted** — All connections busy, new requests timeout. Fix: Increase pool size, check for connection leaks (unreleased QueryRunners).
3. **Read replica stale data** — User updates then immediately reads stale data from replica. Fix: Route read-after-write to master.
4. **Index not used despite existing** — Query planner chooses seq scan. Fix: ANALYZE table, check if index columns match query predicates.
5. **Slow query in batch job** — Nightly batch locks tables for minutes. Fix: Cursor-based processing, read replica for batch reads.
6. **Memory spike from large result set** — TypeORM loads 100K entities into memory. Fix: Use `.stream()` for large datasets.
7. **Prisma query timeout** — Complex aggregation exceeds default timeout. Fix: `$queryRaw` with explicit timeout for analytics queries.

---

## Quality Checklist

- [ ] **Q1**: Patterns cover N+1, pooling, QueryBuilder, replicas, indexing?
- [ ] **Q2**: Pattern IDs unique (280.1–280.6)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Both TypeORM and Prisma examples provided?

---

*NestJS Query Optimization Specialist — Pattern 280.x | EPS v10.0*

# Test Plan Specialist — NestJS Integration Testing: Database
# テストプランスペシャリスト — NestJS データベース統合テスト
# Chuyen Gia Test — Integration Test Database NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Integration Testing — Database
**Purpose**: Database integration testing — test containers (PostgreSQL, Redis), TypeORM/Prisma with real DB, migration testing, seed data, transaction isolation testing

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-INT-DB |
| **Directory Pattern** | `test/integration/database/**/*.spec.ts` |
| **Naming Convention** | `{entity}.repository.integration.spec.ts` |
| **Imports From** | Infrastructure (repositories, data source) |
| **Imported By** | N/A |
| **Cannot Import** | Presentation |
| **Dependencies** | jest, @testcontainers/postgresql, @testcontainers/redis, typeorm |
| **When To Use** | DD/Plan generates repositories, migrations, complex queries |
| **Source Skeleton** | `test/integration/database/` |
| **Specialist Type** | code |
| **Purpose** | Database integration testing — test containers (PostgreSQL, Redis), TypeORM/Prisma with real DB, migration testing, seed data, transaction isolation testing |
| **Activation Trigger** | files: **/integration/database/**; keywords: databaseTest, testContainers, repositoryIntegration, migration |

---

## Patterns

### Pattern INT-DB.1: Test Container Setup (Shared per Suite)

```typescript
// test/integration/database/setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

let pgContainer: StartedPostgreSqlContainer;
let dataSource: DataSource;

export async function setupTestDb(): Promise<DataSource> {
  pgContainer = await new PostgreSqlContainer('postgres:16')
    .withDatabase('test_db')
    .withReuse()  // reuse container across test files (faster)
    .start();

  dataSource = new DataSource({
    type: 'postgres', url: pgContainer.getConnectionUri(),
    entities: ['src/infrastructure/persistence/entities/**/*.entity.ts'],
    synchronize: true,
  });
  await dataSource.initialize();
  return dataSource;
}

export async function teardownTestDb(): Promise<void> {
  await dataSource?.destroy();
  await pgContainer?.stop();
}

export async function cleanDb(ds: DataSource): Promise<void> {
  const entities = ds.entityMetadatas;
  for (const entity of entities) {
    await ds.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
}
```

### Pattern INT-DB.2: Repository Integration with Real DB

```typescript
describe('TypeOrmOrderRepository (integration)', () => {
  let ds: DataSource;
  let repo: TypeOrmOrderRepository;

  beforeAll(async () => { ds = await setupTestDb(); repo = new TypeOrmOrderRepository(ds.getRepository(OrderOrmEntity)); }, 30000);
  afterAll(() => teardownTestDb());
  afterEach(() => cleanDb(ds));

  it('should persist order with items and retrieve with relations', async () => {
    const order = Order.create('c1', [OrderItem.create('p1', 2, Money.create(50, 'USD'))]);
    await repo.save(order);
    const found = await repo.findById(order.id);
    expect(found.items).toHaveLength(1);
    expect(found.total).toBe(100);
  });

  it('should handle concurrent optimistic lock correctly', async () => {
    const order = await repo.save(Order.create('c1', [validItem]));
    // Simulate concurrent update
    const copy1 = await repo.findById(order.id);
    const copy2 = await repo.findById(order.id);
    copy1.approve();
    await repo.save(copy1);
    copy2.approve();
    await expect(repo.save(copy2)).rejects.toThrow(); // optimistic lock violation
  });
});
```

### Pattern INT-DB.3: Migration Testing

```typescript
describe('Migrations (integration)', () => {
  let ds: DataSource;
  beforeAll(async () => { ds = await setupTestDb(); });
  afterAll(() => teardownTestDb());

  it('should run all migrations successfully', async () => {
    const migrationDs = new DataSource({ ...ds.options, synchronize: false, migrations: ['src/infrastructure/persistence/migrations/*.ts'] });
    await migrationDs.initialize();
    await migrationDs.runMigrations();
    const tables = await migrationDs.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    expect(tables.length).toBeGreaterThan(0);
    await migrationDs.destroy();
  });

  it('should rollback last migration without error', async () => {
    const migrationDs = new DataSource({ ...ds.options, synchronize: false, migrations: ['src/infrastructure/persistence/migrations/*.ts'] });
    await migrationDs.initialize();
    await migrationDs.runMigrations();
    await migrationDs.undoLastMigration();
    await migrationDs.destroy();
  });
});
```

### Pattern INT-DB.4: Transaction Isolation Testing

```typescript
it('should prevent dirty reads with READ COMMITTED', async () => {
  const qr1 = ds.createQueryRunner();
  const qr2 = ds.createQueryRunner();
  await qr1.connect(); await qr2.connect();
  await qr1.startTransaction('READ COMMITTED');
  await qr2.startTransaction('READ COMMITTED');

  // qr1 updates but doesn't commit
  await qr1.query("UPDATE orders SET status = 'APPROVED' WHERE id = $1", [orderId]);

  // qr2 should NOT see uncommitted change
  const result = await qr2.query("SELECT status FROM orders WHERE id = $1", [orderId]);
  expect(result[0].status).toBe('PENDING'); // still PENDING

  await qr1.rollbackTransaction();
  await qr2.rollbackTransaction();
  await qr1.release(); await qr2.release();
});
```

---

## Why Test Containers, Not Mocks? (Negative Examples)

```typescript
// ❌ MOCK: This test passes but HIDES a real bug
const mockRepo = { find: jest.fn().mockResolvedValue([mockOrder]) };
// Test passes ✅ but in production:
// - TypeORM generates: SELECT * FROM orders WHERE status = $1 ORDER BY "createdAt" DESC
// - PostgreSQL: column "createdAt" → must be quoted (case-sensitive)
// - Mock doesn't validate SQL syntax → bug found in production only

// ❌ MOCK: Query returns wrong data due to relation misconfiguration
const mockOrder = { id: '1', items: [{ id: 'i1' }] };
mockRepo.find.mockResolvedValue([mockOrder]);
// Test passes ✅ but in production:
// - TypeORM JOIN is misconfigured (wrong FK column)
// - Items array is always empty in real DB
// - Mock always returns hardcoded data → never catches JOIN bugs

// ✅ TEST CONTAINER: Same query runs against real PostgreSQL
// - SQL syntax validated by real DB engine
// - JOINs resolved against real FK constraints
// - Type mismatches caught (varchar vs uuid, timestamp vs date)
// - Connection pool behavior tested (leak detection)
```

## When to Use Test Containers vs Mocks

| Use Test Container | Use Mock |
|-------------------|----------|
| Repository CRUD operations | Application layer UseCase logic |
| Complex queries (JOIN, GROUP BY) | Simple port interface calls |
| Migration up/down | Domain entity unit tests |
| Transaction isolation | Controller routing tests |
| Connection pool behavior | Guard/Pipe/Interceptor tests |

**Rule**: If the test validates **data correctness** → test container. If it validates **logic flow** → mock.

---

## Coverage Target

| Scope | Target |
|-------|--------|
| Repository CRUD | 100% of port methods |
| Complex queries (JOIN, subquery) | 80% |
| Migrations up/down | 100% |
| Transaction isolation | Critical paths |

---

*Test Plan Specialist — NestJS Integration Testing: Database | EPS v10.0*

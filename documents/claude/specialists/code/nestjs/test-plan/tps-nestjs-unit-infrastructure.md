# Test Plan Specialist — NestJS Unit Testing: Infrastructure Layer
# テストプランスペシャリスト — NestJS インフラ層ユニットテスト
# Chuyen Gia Test — Unit Test Infrastructure Layer NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Unit Testing — Infrastructure Layer
**Purpose**: Infrastructure layer unit testing — repository with test containers, cache behavior, external client mocking, auth strategy testing, message producer/consumer testing

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-UNIT-INFRA |
| **Directory Pattern** | `src/infrastructure/**/*.spec.ts` |
| **Naming Convention** | `{entity}.repository.spec.ts`, `{service}.client.spec.ts` |
| **Imports From** | Domain (entities, ports), Infrastructure (SUT) |
| **Imported By** | N/A (test files) |
| **Cannot Import** | Presentation (infrastructure tests don't know controllers) |
| **Dependencies** | jest, @nestjs/testing, testcontainers, @testcontainers/postgresql |
| **When To Use** | DD/Plan generates repositories, external clients, cache services, auth strategies |
| **Source Skeleton** | `src/infrastructure/persistence/{entity}.repository.spec.ts` |
| **Specialist Type** | code |
| **Purpose** | Infrastructure layer unit testing — repository with test containers, cache behavior, external client mocking, auth strategy testing |
| **Activation Trigger** | files: **/infrastructure/**/*.spec.ts; keywords: repositoryTest, cacheTest, clientTest, testContainers |

---

## Key Principle

Infrastructure tests verify **adapter correctness** — does the TypeORM repository correctly implement the domain port? Use **test containers** for real DB tests, **mock HTTP** for external clients.

---

## Patterns

### Pattern UT-I.1: Repository Testing with Test Containers

```typescript
// infrastructure/persistence/order.repository.spec.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

describe('TypeOrmOrderRepository', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repo: TypeOrmOrderRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    dataSource = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
      entities: [OrderOrmEntity, OrderItemOrmEntity],
      synchronize: true, // OK for tests only
    });
    await dataSource.initialize();
    repo = new TypeOrmOrderRepository(dataSource.getRepository(OrderOrmEntity));
  }, 30000); // 30s timeout for container startup

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE order_items, orders CASCADE');
  });

  it('should save and retrieve order with items', async () => {
    const order = Order.create('c1', [OrderItem.create('p1', 2, Money.create(50, 'USD'))]);
    const saved = await repo.save(order);

    const found = await repo.findById(saved.id);
    expect(found).not.toBeNull();
    expect(found.customerId).toBe('c1');
    expect(found.items).toHaveLength(1);
  });

  it('should return null for non-existent ID', async () => {
    const found = await repo.findById('non-existent-uuid');
    expect(found).toBeNull();
  });

  it('should correctly map domain→ORM→domain (round-trip)', async () => {
    const original = Order.create('c1', [
      OrderItem.create('p1', 3, Money.create(33.33, 'USD')),
    ]);
    await repo.save(original);
    const retrieved = await repo.findById(original.id);

    expect(retrieved.total).toBeCloseTo(original.total, 2);
    expect(retrieved.status).toBe(original.status);
  });
});
```

---

### Pattern UT-I.2: Cache Service Testing

```typescript
// infrastructure/cache/order-cache.spec.ts
describe('OrderCacheService', () => {
  let cacheService: OrderCacheService;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as any;
    const module = await Test.createTestingModule({
      providers: [
        OrderCacheService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();
    cacheService = module.get(OrderCacheService);
  });

  it('should return cached order if exists', async () => {
    cacheManager.get.mockResolvedValue(cachedOrder);
    const result = await cacheService.getOrder('order-1');
    expect(result).toEqual(cachedOrder);
    expect(cacheManager.get).toHaveBeenCalledWith('order:order-1');
  });

  it('should return null on cache miss', async () => {
    cacheManager.get.mockResolvedValue(null);
    const result = await cacheService.getOrder('order-1');
    expect(result).toBeNull();
  });

  it('should set cache with TTL on save', async () => {
    await cacheService.setOrder('order-1', orderData);
    expect(cacheManager.set).toHaveBeenCalledWith('order:order-1', orderData, { ttl: 300 });
  });

  it('should invalidate cache on delete', async () => {
    await cacheService.invalidateOrder('order-1');
    expect(cacheManager.del).toHaveBeenCalledWith('order:order-1');
  });
});
```

---

### Pattern UT-I.3: External HTTP Client Testing

```typescript
// infrastructure/http/payment-gateway.client.spec.ts
describe('PaymentGatewayClient', () => {
  let client: PaymentGatewayClient;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    httpService = { get: jest.fn(), post: jest.fn() } as any;
    const module = await Test.createTestingModule({
      providers: [
        PaymentGatewayClient,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();
    client = module.get(PaymentGatewayClient);
  });

  it('should call gateway API and return transaction ID', async () => {
    httpService.post.mockReturnValue(of({
      data: { transactionId: 'tx-123', status: 'SUCCESS' },
      status: 200, headers: {}, statusText: 'OK', config: {} as any,
    }));

    const result = await client.charge({ amount: 100, currency: 'USD', customerId: 'c1' });
    expect(result.transactionId).toBe('tx-123');
  });

  it('should throw PaymentFailedException on 4xx', async () => {
    httpService.post.mockReturnValue(throwError(() => ({
      response: { status: 422, data: { error: 'INSUFFICIENT_FUNDS' } },
    })));

    await expect(client.charge({ amount: 100, currency: 'USD', customerId: 'c1' }))
      .rejects.toThrow(PaymentFailedException);
  });

  it('should throw ServiceUnavailableException on 5xx/timeout', async () => {
    httpService.post.mockReturnValue(throwError(() => ({
      code: 'ECONNABORTED', message: 'timeout',
    })));

    await expect(client.charge({ amount: 100, currency: 'USD', customerId: 'c1' }))
      .rejects.toThrow(ServiceUnavailableException);
  });
});
```

---

### Pattern UT-I.4: Auth Strategy Testing

```typescript
// infrastructure/auth/jwt.strategy.spec.ts
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepo: jest.Mocked<UserRepositoryPort>;

  beforeEach(async () => {
    userRepo = { findById: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
      ],
    }).compile();
    strategy = module.get(JwtStrategy);
  });

  it('should return user from valid JWT payload', async () => {
    userRepo.findById.mockResolvedValue(mockUser);
    const result = await strategy.validate({ sub: 'user-1', email: 'test@test.com' });
    expect(result.id).toBe('user-1');
  });

  it('should throw UnauthorizedException if user not found', async () => {
    userRepo.findById.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'deleted-user', email: '' }))
      .rejects.toThrow(UnauthorizedException);
  });
});
```

---

### Pattern UT-I.5: Message Producer Testing

```typescript
// infrastructure/messaging/order-event.producer.spec.ts
describe('OrderEventProducer', () => {
  let producer: OrderEventProducer;
  let kafkaProducer: jest.Mocked<Producer>;

  beforeEach(() => {
    kafkaProducer = { send: jest.fn(), connect: jest.fn(), disconnect: jest.fn() } as any;
    producer = new OrderEventProducer(kafkaProducer);
  });

  it('should publish to correct topic with order ID as key', async () => {
    await producer.publishOrderCreated({ orderId: 'o1', amount: 100 });
    expect(kafkaProducer.send).toHaveBeenCalledWith({
      topic: 'order.created',
      messages: [{ key: 'o1', value: expect.stringContaining('"orderId":"o1"') }],
    });
  });

  it('should propagate correlation ID in headers', async () => {
    await producer.publishOrderCreated({ orderId: 'o1', amount: 100 }, 'corr-123');
    const call = kafkaProducer.send.mock.calls[0][0];
    expect(call.messages[0].headers['x-correlation-id']).toBe('corr-123');
  });
});
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Mock TypeORM Repository methods | Tests mock, not real SQL | Use test containers for repository tests (UT-I.1) |
| 2 | Use `synchronize: true` in production | Drops/alters tables destructively | Only in test containers, never in real DB |
| 3 | No cleanup between tests | Data leaks cause flaky tests | `TRUNCATE CASCADE` in afterEach |
| 4 | Test HTTP client with real API | Flaky, slow, rate-limited | Mock HttpService (UT-I.3) |

---

## Coverage Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| Repository (with test containers) | 80% | CRUD + complex queries — real DB |
| Cache services | 90% | Cache hit/miss/invalidation paths |
| External HTTP clients | 90% | Success + error + timeout paths |
| Auth strategies | 90% | Valid + invalid + expired token |
| Message producers | 80% | Topic, key, headers, serialization |

---

*Test Plan Specialist — NestJS Unit Testing: Infrastructure Layer | EPS v10.0*

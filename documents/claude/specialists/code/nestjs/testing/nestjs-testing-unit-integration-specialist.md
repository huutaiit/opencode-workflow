# NestJS Testing Unit & Integration Specialist — Testing
# NestJSユニット＆統合テストスペシャリスト — テスト
# Chuyen Gia Test Don Vi va Tich Hop NestJS — Test

**Version**: 2.0.0
**Technology**: NestJS 10+ Jest + @nestjs/testing
**Aspect**: Unit & Integration Testing
**Category**: testing
**Purpose**: Knowledge provider for NestJS unit and integration testing — Jest setup, TestingModule, mock strategies, DI overrides, service tests, controller tests, database integration tests

---

## Metadata

```json
{
  "id": "nestjs-testing-unit-integration-specialist",
  "technology": "NestJS 10+ Jest Testing",
  "aspect": "Unit & Integration Testing",
  "category": "testing",
  "subcategory": "nestjs",
  "lines": 450,
  "token_cost": 2700,
  "version": "2.0.0",
  "evidence": [
    "E1: Jest — test runner, assertions, mocking, coverage",
    "E2: @nestjs/testing — TestingModule, overrideProvider for DI-aware tests",
    "E3: Clean architecture testing — test each layer independently"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (testing cross-cutting) |
| **Variant** | ALL |
| **Pattern Numbers** | 211.1–211.10 |
| **Directory Pattern** | `src/**/*.spec.ts` |
| **Dependencies** | @nestjs/testing, jest, supertest |
| **When To Use** | Unit and integration testing with TestingModule and mocks |
| **Source Skeleton** | src/**/*.spec.ts, test/**/*.e2e-spec.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS testing — unit tests with Jest, mock providers, testing module setup |
| **Activation Trigger** | files: **/*.spec.ts; keywords: jest, testingModule, mockProvider, describe, it |

> **See also**: nestjs-testing-advanced (265) for contract/property-based/load testing

---

## Role

You are a **NestJS Testing Unit & Integration Specialist**. You supply patterns for unit and integration testing in NestJS — Jest configuration, TestingModule setup, mock strategies, service testing, controller testing, and database integration testing.

---

## Patterns

### Pattern 211.1: Jest Configuration

```typescript
// jest.config.ts
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@libs/(.*)': '<rootDir>/../libs/$1',
  },
};
```

---

### Pattern 211.2: TestingModule Setup

```typescript
describe('OrderService', () => {
  let service: OrderService;
  let mockRepo: jest.Mocked<OrderRepositoryPort>;
  let mockEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    mockRepo = { findById: jest.fn(), save: jest.fn(), delete: jest.fn() };
    mockEmitter = { emit: jest.fn() } as any;

    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: ORDER_REPOSITORY, useValue: mockRepo },
        { provide: EventEmitter2, useValue: mockEmitter },
      ],
    }).compile();

    service = module.get(OrderService);
  });
});
```

**Key Points**:
- Provide only the service under test + its direct dependencies
- Mock all external dependencies (repo, event emitter, other services)
- `jest.Mocked<T>` for type-safe mock creation
- New TestingModule per test (`beforeEach`) — prevent state leakage

---

### Pattern 211.3: Service Unit Tests

```typescript
describe('OrderService.createOrder', () => {
  it('should create order with PENDING status', async () => {
    const dto: CreateOrderDto = { customerId: 'cust-1', items: [{ productId: 'p1', quantity: 2 }] };
    mockRepo.save.mockResolvedValue(new OrderBuilder().withStatus(OrderStatus.PENDING).build());

    const result = await service.createOrder(dto);

    expect(result.status).toBe(OrderStatus.PENDING);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockEmitter.emit).toHaveBeenCalledWith('order.created', expect.any(Object));
  });

  it('should throw on empty items', async () => {
    const dto = { customerId: 'cust-1', items: [] };
    await expect(service.createOrder(dto)).rejects.toThrow(EmptyOrderException);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('should throw on duplicate reference', async () => {
    mockRepo.save.mockRejectedValue({ code: '23505' }); // unique constraint
    await expect(service.createOrder(validDto)).rejects.toThrow(DuplicateOrderException);
  });
});
```

---

### Pattern 211.4: Domain Entity Tests

```typescript
describe('Order', () => {
  it('should create with PENDING status', () => {
    const order = Order.create('customer-1', [OrderItem.create('prod-1', 2, 100)]);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.totalAmount.amount).toBe(200);
  });

  it('should transition PENDING → APPROVED', () => {
    const order = new OrderBuilder().withStatus(OrderStatus.PENDING).build();
    order.approve();
    expect(order.status).toBe(OrderStatus.APPROVED);
  });

  it('should reject APPROVED → APPROVED transition', () => {
    const order = new OrderBuilder().withStatus(OrderStatus.APPROVED).build();
    expect(() => order.approve()).toThrow(InvalidOrderTransitionException);
  });
});
```

---

### Pattern 211.5: Controller Tests

```typescript
describe('OrderController', () => {
  let controller: OrderController;
  let mockCreateOrder: jest.Mocked<CreateOrderUseCase>;

  beforeEach(async () => {
    mockCreateOrder = { execute: jest.fn() } as any;
    const module = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: CreateOrderUseCase, useValue: mockCreateOrder }],
    }).compile();
    controller = module.get(OrderController);
  });

  it('should delegate to use case', async () => {
    const dto = { customerId: 'c1', items: [{ productId: 'p1', quantity: 1 }] };
    mockCreateOrder.execute.mockResolvedValue({ id: 'order-1', status: 'PENDING' });

    const result = await controller.create(dto);
    expect(result.id).toBe('order-1');
    expect(mockCreateOrder.execute).toHaveBeenCalledWith(dto);
  });
});
```

---

### Pattern 211.6: E2E Integration Test

```typescript
describe('Orders API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(createTestDataSource())
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => await app.close());

  it('POST /orders returns 201', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({ customerId: 'uuid', items: [{ productId: 'p1', quantity: 2 }] })
      .expect(201)
      .expect(res => expect(res.body.id).toBeDefined());
  });

  it('GET /orders/:id returns 404 for missing', () => {
    return request(app.getHttpServer())
      .get('/orders/nonexistent-uuid')
      .expect(404);
  });
});
```

---

### Pattern 211.7: Mock Patterns Reference

```typescript
// Repository mock
const mockRepo: jest.Mocked<OrderRepositoryPort> = {
  findById: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  findByCustomer: jest.fn(),
};

// ConfigService mock
const mockConfig = { get: jest.fn((key: string) => ({ DB_HOST: 'localhost' }[key])) };

// EventEmitter mock
const mockEmitter = { emit: jest.fn(), emitAsync: jest.fn() };

// Logger mock (suppress output)
const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

// HttpService mock
const mockHttp = { get: jest.fn(), post: jest.fn() };
```

---

### Pattern 211.8: Module Override Patterns

```typescript
// Override specific provider in existing module
const module = await Test.createTestingModule({
  imports: [OrderModule],
})
  .overrideProvider(ORDER_REPOSITORY)
  .useValue(mockRepo)
  .overrideProvider(EventEmitter2)
  .useValue(mockEmitter)
  .compile();

// Override guard
const module = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideGuard(JwtAuthGuard)
  .useValue({ canActivate: () => true })
  .compile();
```

---

## Test Organization

```
src/
├── domain/
│   ├── entities/
│   │   ├── order.entity.ts
│   │   └── order.entity.spec.ts      # domain logic tests
│   └── value-objects/
│       ├── money.ts
│       └── money.spec.ts
├── application/
│   ├── use-cases/
│   │   ├── create-order.use-case.ts
│   │   └── create-order.use-case.spec.ts  # use case tests (mock ports)
├── infrastructure/
│   ├── persistence/
│   │   ├── typeorm-order.repository.ts
│   │   └── typeorm-order.repository.integration.spec.ts  # real DB
├── presentation/
│   ├── controllers/
│   │   ├── order.controller.ts
│   │   └── order.controller.spec.ts   # controller unit test
└── test/
    └── orders.e2e-spec.ts             # full E2E with supertest
```

---

## Best Practices

- Unit tests: mock everything except the unit under test
- Integration tests: real DB, mock external services
- E2E tests: full app, test HTTP request → response
- Test file next to source file (`.spec.ts` convention)
- `beforeEach` for fresh TestingModule — prevent test coupling

---

## Abnormal Case Patterns

1. **Tests share state** — Singleton provider retains data. Fix: new TestingModule in `beforeEach`.
2. **Mock not reset** — `jest.fn()` retains call history. Fix: `jest.clearAllMocks()` in `beforeEach`.
3. **Integration test slow** — DB setup per test. Fix: truncate tables, don't recreate schema.
4. **Override doesn't work** — Wrong provider token. Fix: use exact Symbol/class as registered.
5. **E2E test 500** — Missing global pipe. Fix: apply `useGlobalPipes` in test setup.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (211.1-211.8)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Testing Unit & Integration Specialist — Testing | EPS v3.2*

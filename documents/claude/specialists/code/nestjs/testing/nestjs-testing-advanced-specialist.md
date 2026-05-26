# NestJS Testing Advanced Specialist — Testing
# NestJS高度テストスペシャリスト — テスト
# Chuyen Gia Test Nang Cao NestJS — Test

**Version**: 1.0.0
**Technology**: NestJS 10+ Advanced Testing
**Aspect**: Advanced Testing Patterns
**Category**: testing
**Purpose**: Knowledge provider for NestJS advanced testing — contract testing, mutation testing, property-based testing, load testing, test data builders, HTTP mocking with nock

---

## Metadata

```json
{
  "id": "nestjs-testing-advanced-specialist",
  "technology": "NestJS 10+ Advanced Testing",
  "aspect": "Advanced Testing Patterns",
  "category": "testing",
  "subcategory": "nestjs",
  "lines": 320,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Nock — HTTP request mocking for external API testing",
    "E2: Contract testing — Pact for consumer-driven API contracts",
    "E3: Test data builder pattern — fluent, readable test setup"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (testing cross-cutting) |
| **Variant** | ALL |
| **Pattern Numbers** | 265.1–265.6 |
| **Directory Pattern** | `test/**/*.e2e-spec.ts`, `src/**/*.spec.ts` |
| **Dependencies** | nock, fast-check, @pact-foundation/pact |
| **When To Use** | Contract testing, property-based testing, HTTP mocking, load testing |
| **Source Skeleton** | test/contracts/*.pact.ts, test/load/*.k6.js |
| **Specialist Type** | code |
| **Purpose** | Advanced testing — E2E tests, test containers, performance testing, mocking strategies |
| **Activation Trigger** | files: **/*.e2e-spec.ts, **/*.spec.ts; keywords: supertest, testContainers, e2e, advanced |

---

## Patterns

### Pattern 265.1: HTTP Mocking with Nock

```typescript
import nock from 'nock';

describe('PaymentGateway', () => {
  afterEach(() => nock.cleanAll());

  it('should process payment', async () => {
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .reply(200, { id: 'ch_123', status: 'succeeded', amount: 5000 });

    const result = await paymentService.charge({ amount: 5000, currency: 'usd' });
    expect(result.status).toBe('succeeded');
  });

  it('should handle gateway timeout', async () => {
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .replyWithError({ code: 'ETIMEDOUT' });

    await expect(paymentService.charge({ amount: 5000 }))
      .rejects.toThrow(PaymentGatewayException);
  });
});
```

### Pattern 265.2: Test Data Builder

```typescript
export class OrderBuilder {
  private data: Partial<Order> = {
    id: randomUUID(),
    customerId: randomUUID(),
    status: OrderStatus.PENDING,
    items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
    createdAt: new Date(),
  };

  withStatus(status: OrderStatus): this { this.data.status = status; return this; }
  withCustomer(id: string): this { this.data.customerId = id; return this; }
  withItems(items: OrderItem[]): this { this.data.items = items; return this; }
  withAmount(amount: number): this {
    this.data.items = [{ productId: 'prod-1', quantity: 1, price: amount }];
    return this;
  }
  build(): Order { return this.data as Order; }
}

// Usage — clean, readable tests
const order = new OrderBuilder().withStatus(OrderStatus.APPROVED).withAmount(5000).build();
```

### Pattern 265.3: Contract Testing (Pact)

```typescript
// Consumer test — define expected API contract
describe('Order Service Consumer', () => {
  const provider = new PactV3({ consumer: 'lending-service', provider: 'order-service' });

  it('should get order by ID', async () => {
    provider.addInteraction({
      states: [{ description: 'order exists' }],
      uponReceiving: 'a request for order by ID',
      withRequest: { method: 'GET', path: '/orders/123' },
      willRespondWith: {
        status: 200,
        body: { id: string('123'), status: string('ACTIVE'), amount: number(5000) },
      },
    });

    await provider.executeTest(async (mockServer) => {
      const client = new OrderClient(mockServer.url);
      const order = await client.getById('123');
      expect(order.id).toBe('123');
    });
  });
});
```

### Pattern 265.4: Property-Based Testing

```typescript
import fc from 'fast-check';

describe('Money value object', () => {
  it('should always be non-negative after addition', () => {
    fc.assert(fc.property(
      fc.nat(), fc.nat(), // generate random non-negative integers
      (a, b) => {
        const money1 = Money.create(a, 'USD');
        const money2 = Money.create(b, 'USD');
        expect(money1.add(money2).amount).toBeGreaterThanOrEqual(0);
      },
    ));
  });

  it('addition should be commutative', () => {
    fc.assert(fc.property(fc.nat(), fc.nat(), (a, b) => {
      const m1 = Money.create(a, 'USD');
      const m2 = Money.create(b, 'USD');
      expect(m1.add(m2).equals(m2.add(m1))).toBe(true);
    }));
  });
});
```

### Pattern 265.5: Database Test Utilities

```typescript
// Fixture factory for integration tests
export class TestFixtures {
  constructor(private dataSource: DataSource) {}

  async createUser(overrides?: Partial<UserEntity>): Promise<UserEntity> {
    const repo = this.dataSource.getRepository(UserEntity);
    return repo.save(repo.create({
      email: `test-${randomUUID()}@example.com`,
      name: 'Test User',
      ...overrides,
    }));
  }

  async createOrder(user: UserEntity, overrides?: Partial<OrderEntity>): Promise<OrderEntity> {
    const repo = this.dataSource.getRepository(OrderEntity);
    return repo.save(repo.create({
      customerId: user.id,
      status: OrderStatus.PENDING,
      totalAmount: 1000,
      ...overrides,
    }));
  }

  async cleanup() {
    await this.dataSource.query('TRUNCATE TABLE orders, users CASCADE');
  }
}
```

### Pattern 265.6: Load Testing with k6

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // ramp up
    { duration: '1m', target: 50 },    // sustain
    { duration: '10s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],    // <1% error rate
  },
};

export default function () {
  const res = http.get('http://localhost:3000/orders');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## Best Practices

- Test data builders > raw object literals — more readable, less brittle
- Nock for external APIs — never call real services in unit tests
- Contract tests between services — catch breaking API changes early
- Property-based testing for domain logic — find edge cases you didn't think of
- Load test regularly — not just before release

---

## Abnormal Case Patterns

1. **Nock not cleaned** — Mocks leak between tests. Fix: `nock.cleanAll()` in afterEach.
2. **Test data coupling** — Tests depend on specific IDs. Fix: use builders with random defaults.
3. **Contract drift** — Provider changes without updating Pact. Fix: run Pact verify in provider CI.
4. **Flaky load test** — Results vary. Fix: stable test environment, warm up before measuring.

---

*NestJS Testing Advanced Specialist — Testing | EPS v3.2*

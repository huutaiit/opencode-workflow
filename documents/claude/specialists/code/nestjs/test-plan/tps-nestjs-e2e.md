# Test Plan Specialist — NestJS E2E Testing
# テストプランスペシャリスト — NestJS E2Eテスト
# Chuyen Gia Ke Hoach Test — E2E Test NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: E2E Testing
**Purpose**: E2E test strategy for NestJS — Supertest HTTP testing, test containers for real databases, auth helpers, database seeding, CI pipeline integration

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test (cross-cutting) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-E2E |
| **Directory Pattern** | `test/**/*.e2e-spec.ts` |
| **Naming Convention** | `{feature}.e2e-spec.ts` |
| **Imports From** | ALL (E2E tests exercise the full stack) |
| **Imported By** | N/A (test files are not imported) |
| **Cannot Import** | N/A (test scope) |
| **Dependencies** | @nestjs/testing, supertest, testcontainers, @testcontainers/postgresql |
| **When To Use** | E2E test planning — full HTTP request/response cycle testing |
| **Source Skeleton** | `test/{feature}.e2e-spec.ts` |
| **Specialist Type** | code |
| **Purpose** | E2E test patterns for NestJS — Supertest, test containers, auth mocking, database seeding, CI integration |
| **Activation Trigger** | files: test/**/*.e2e-spec.ts; keywords: e2e, endToEnd, supertest, testcontainers |
| **Testing Framework** | Jest + Supertest + @nestjs/testing + Testcontainers |

---

## E2E Test Strategy

### What to E2E Test
- **Controllers**: Full HTTP request → response cycle (status codes, headers, body)
- **Auth flows**: Login → token → authorized request → response
- **API contracts**: Request/response DTOs match OpenAPI spec
- **Error responses**: Validation errors, 404s, 401s, 403s return correct format
- **Database operations**: CRUD via API → verify database state
- **Cross-module flows**: Order → Payment → Notification (multi-service if applicable)

### What NOT to E2E Test
- Individual service logic (unit test)
- External API integrations (mock at infrastructure boundary)
- Performance (separate performance test plan — TPS-NESTJS-PERFORMANCE)

---

## Test Structure

### Basic E2E Test Setup

```typescript
// test/order.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OrderController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create order and return 201', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({ customerId: 'uuid-123', items: [{ productId: 'p1', quantity: 2 }] })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.status).toBe('PENDING');
        });
    });

    it('should return 400 for invalid body', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({}) // missing required fields
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeInstanceOf(Array);
        });
    });
  });

  describe('GET /orders/:id', () => {
    it('should return 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .get('/orders/non-existent-uuid')
        .expect(404);
    });
  });
});
```

### Test Containers (Real Database)

```typescript
// test/setup/test-database.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let pgContainer: StartedPostgreSqlContainer;

export async function setupTestDatabase(): Promise<string> {
  pgContainer = await new PostgreSqlContainer('postgres:16')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  return pgContainer.getConnectionUri();
}

export async function teardownTestDatabase(): Promise<void> {
  if (pgContainer) await pgContainer.stop();
}

// In test file:
beforeAll(async () => {
  const dbUrl = await setupTestDatabase();
  process.env.DATABASE_URL = dbUrl;
  // ... create app with real DB
});

afterAll(async () => {
  await app.close();
  await teardownTestDatabase();
});
```

### Authentication Test Helpers

```typescript
// test/helpers/auth.helper.ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

export async function getAuthToken(
  app: INestApplication,
  credentials: { email: string; password: string },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send(credentials)
    .expect(200);
  return res.body.accessToken;
}

export function authRequest(app: INestApplication, token: string) {
  return {
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) =>
      request(app.getHttpServer()).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

// Usage in test:
describe('Protected endpoints', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken(app, { email: 'admin@test.com', password: 'pass' });
  });

  it('should return 401 without token', () => {
    return request(app.getHttpServer()).get('/orders').expect(401);
  });

  it('should return 200 with valid token', () => {
    return authRequest(app, token).get('/orders').expect(200);
  });
});
```

### Mock Auth Guard (Skip Auth in Tests)

```typescript
// test/helpers/mock-auth.guard.ts
import { CanActivate, ExecutionContext } from '@nestjs/common';

export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = { id: 'test-user-id', role: 'admin' }; // inject mock user
    return true;
  }
}

// Override in test module:
const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
  .overrideGuard(JwtAuthGuard)
  .useClass(MockAuthGuard)
  .compile();
```

### Database Seeding

```typescript
// test/helpers/seed.helper.ts
import { DataSource } from 'typeorm';

export async function seedTestData(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    // Insert seed data
    await queryRunner.query(`INSERT INTO users (id, email, role) VALUES ($1, $2, $3)`,
      ['test-user-id', 'admin@test.com', 'admin']);

    await queryRunner.query(`INSERT INTO products (id, name, price) VALUES ($1, $2, $3)`,
      ['p1', 'Test Product', 100]);

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}

export async function cleanTestData(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repo = dataSource.getRepository(entity.name);
    await repo.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
}
```

---

## CI Pipeline Integration

### Jest Configuration for E2E

```javascript
// test/jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testTimeout": 30000,
  "maxWorkers": 1
}
```

### Docker Compose for Test Dependencies

```yaml
# docker/docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:16
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports: ['5433:5432']
    tmpfs: /var/lib/postgresql/data  # RAM disk for speed

  redis-test:
    image: redis:7-alpine
    ports: ['6380:6379']
```

### CI Script

```bash
# Run E2E tests in CI
docker compose -f docker/docker-compose.test.yml up -d
sleep 5  # wait for containers
DATABASE_URL=postgresql://test:test@localhost:5433/test_db \
REDIS_URL=redis://localhost:6380 \
npx jest --config test/jest-e2e.json --runInBand
docker compose -f docker/docker-compose.test.yml down
```

---

## Best Practices

- Run E2E tests with `--runInBand` (sequential) — avoid port/DB conflicts
- Use `testcontainers` for isolated, reproducible test databases
- Reset database state between tests (`TRUNCATE CASCADE` or test transactions)
- Mock external services at infrastructure boundary (not at controller level)
- Test error responses with same rigor as success responses
- Keep E2E test suite fast (<60s) — test happy paths + critical error paths, leave edge cases for unit tests

---

## Abnormal Case Patterns

1. **Port conflict** — app already running on same port. Fix: use `app.listen(0)` for random port in tests.
2. **Database state leakage** — test A's data affects test B. Fix: TRUNCATE between tests or use transactions.
3. **Timeout on container startup** — Testcontainers slow in CI. Fix: increase `testTimeout`, use health check wait.
4. **Auth token expired mid-test** — long-running test suite. Fix: generate fresh token per describe block.
5. **Flaky tests due to async events** — domain event not processed before assertion. Fix: wait for event or use `jest.advanceTimersByTime()`.

---

## Quality Checklist

- [ ] **Q1**: All API endpoints covered (at least happy path + 1 error path)?
- [ ] **Q2**: Auth flows tested (login, protected endpoint, forbidden)?
- [ ] **Q3**: Database operations verified (create → read → verify state)?
- [ ] **Q4**: Error responses match API contract (status code, body format)?

---

*Test Plan Specialist — NestJS E2E Testing | EPS v10.0*

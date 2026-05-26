# Test Plan Specialist — NestJS Integration Testing (Strategy + Routing)
# テストプランスペシャリスト — NestJS統合テスト（戦略＋ルーティング）
# Chuyen Gia Ke Hoach Test — Integration Test NestJS (Chien Luoc + Routing)

**Version**: 2.0.0
**Stack**: TypeScript/NestJS | **Type**: Integration Testing — Strategy Hub
**Purpose**: Integration test strategy for NestJS — concern routing (database, messaging, API contract), environment setup, test container orchestration, CI pipeline integration

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (integration tests exercise multiple layers) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-INTEGRATION |
| **Directory Pattern** | `test/integration/**/*.spec.ts`, `test/contract/**/*.pact.spec.ts` |
| **Naming Convention** | `{feature}.integration.spec.ts`, `{consumer}-{provider}.pact.spec.ts` |
| **Imports From** | ALL (integration tests exercise full stack) |
| **Imported By** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | jest, supertest, @nestjs/testing, testcontainers, @pact-foundation/pact |
| **When To Use** | Every feature — integration test strategy routing based on which concerns the feature touches |
| **Source Skeleton** | `test/integration/`, `test/contract/` |
| **Specialist Type** | code |
| **Purpose** | Integration test strategy hub — routes DD/Plan/Execute to correct concern-specific test plan |
| **Activation Trigger** | files: **/integration/**/*.spec.ts, **/contract/**; keywords: integrationTest, testContainer, pact, contract |

---

## Concern Routing Table

| Concern | Test Plan | File | Load When |
|---------|-----------|------|-----------|
| Database | TPS-NESTJS-INT-DB | `tps-nestjs-integration-database.md` | Testing repositories with real DB, migrations, transaction isolation |
| Messaging | TPS-NESTJS-INT-MSG | `tps-nestjs-integration-messaging.md` | Testing Kafka/RabbitMQ round-trip, DLQ, message ordering |
| API Contract | TPS-NESTJS-INT-CONTRACT | `tps-nestjs-integration-api-contract.md` | Testing cross-service contracts (Pact), OpenAPI compliance |
| E2E (HTTP) | TPS-NESTJS-E2E | `tps-nestjs-e2e.md` | Testing full HTTP request/response cycle via Supertest |

---

## Integration Test Strategy Overview

### What to Integration Test

| Concern | Test Focus | Environment |
|---------|-----------|-------------|
| **Database** | Repository queries against real DB, migration up/down, transaction isolation, concurrent access | Test containers (PostgreSQL, Redis) |
| **Messaging** | Producer → consumer round-trip, DLQ after retries, message ordering, idempotency | Test containers (Kafka, RabbitMQ) |
| **API Contract** | Cross-service contract verification (Pact), OpenAPI schema compliance, backward compatibility | Pact mock server + real app |
| **E2E (HTTP)** | Full request cycle: auth → validation → business logic → DB → response | Test containers + real app |

### What NOT to Integration Test

- Unit-level business logic (entity invariants, mapper accuracy) → unit tests
- UI rendering → frontend tests
- External third-party APIs (Stripe, Keycloak) → mock at boundary, verify via contract tests

---

## Test Container Orchestration

```typescript
// test/integration/setup/global-setup.ts
// Shared containers across all integration test suites

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

let pgContainer, redisContainer;

export async function setup() {
  pgContainer = await new PostgreSqlContainer('postgres:16').withReuse().start();
  redisContainer = await new RedisContainer('redis:7').withReuse().start();

  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
}

export async function teardown() {
  await pgContainer?.stop();
  await redisContainer?.stop();
}
```

```javascript
// jest.integration.config.ts
export default {
  testRegex: '.*\\.integration\\.spec\\.ts$',
  globalSetup: './test/integration/setup/global-setup.ts',
  globalTeardown: './test/integration/setup/global-setup.ts',
  testTimeout: 30000,
  maxWorkers: 1, // sequential — shared DB
};
```

---

## Database Cleanup Strategies

| Strategy | When | How |
|----------|------|-----|
| TRUNCATE CASCADE | Between test suites | `TRUNCATE TABLE orders, users CASCADE` |
| Transaction rollback | Per test | `queryRunner.startTransaction()` → test → `rollback()` |
| Separate DB per worker | Parallel execution | `test_db_${JEST_WORKER_ID}` |
| Fresh container per suite | Maximum isolation | `new PostgreSqlContainer().start()` per describe |

**Default**: TRUNCATE CASCADE between suites (balance speed vs isolation).

---

## CI Pipeline Integration

```yaml
# .github/workflows/integration-tests.yml
integration-tests:
  runs-on: ubuntu-latest
  services:
    postgres: { image: 'postgres:16', env: { POSTGRES_DB: test, POSTGRES_PASSWORD: test }, ports: ['5432:5432'] }
    redis: { image: 'redis:7', ports: ['6379:6379'] }

  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/test
        REDIS_URL: redis://localhost:6379

    # Contract tests (separate step — needs Pact broker)
    - run: npm run test:contract
    - run: npx pact-broker publish ./pacts --broker-base-url $PACT_BROKER_URL
```

---

## Coverage Targets

| Scope | Target | Measurement |
|-------|--------|-------------|
| API endpoints | 100% of routes | Supertest coverage |
| Database operations | 100% of repository port methods | Test container tests |
| Message flows | 100% of event types | Kafka/RabbitMQ integration |
| Cross-service contracts | 100% of inter-service calls | Pact consumer/provider |
| Error responses | All HTTP error codes (400, 401, 403, 404, 409, 500) | Supertest assertions |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Use `synchronize: true` as migration substitute | Hides migration bugs | Run real migrations in test containers |
| 2 | Shared state between integration tests | Flaky — order-dependent failures | TRUNCATE between suites |
| 3 | Mock the database in integration tests | Defeats the purpose of integration testing | Use test containers |
| 4 | Skip contract tests | Cross-service bugs found only in production | Pact consumer + provider tests |
| 5 | Integration tests in same CI job as unit tests | Slow, blocks fast feedback | Separate CI jobs (parallel) |

---

## Quality Checklist

- [ ] **Q1**: Concern routing table complete (database, messaging, contract, E2E)?
- [ ] **Q2**: Test container setup documented (PostgreSQL, Redis, Kafka)?
- [ ] **Q3**: Database cleanup strategy defined?
- [ ] **Q4**: CI pipeline integration documented?

---

*Test Plan Specialist — NestJS Integration Testing (Strategy + Routing) v2.0 | EPS v10.0*

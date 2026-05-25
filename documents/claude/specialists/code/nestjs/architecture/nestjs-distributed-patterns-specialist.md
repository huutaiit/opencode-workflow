# NestJS Distributed Patterns Specialist — Architecture
# NestJS分散パターンスペシャリスト — アーキテクチャ
# Chuyen Gia Pattern Phan Tan NestJS — Kien Truc

**Version**: 1.0.0
**Technology**: NestJS 10+ Distributed Systems
**Aspect**: Distributed Patterns
**Category**: architecture
**Purpose**: Knowledge provider for NestJS distributed patterns — saga, outbox, two-phase commit, event sourcing, distributed locking, idempotency, eventual consistency

---

## Metadata

```json
{
  "id": "nestjs-distributed-patterns-specialist",
  "technology": "NestJS 10+ Distributed Systems",
  "aspect": "Distributed Patterns",
  "category": "architecture",
  "subcategory": "nestjs",
  "lines": 350,
  "token_cost": 2100,
  "version": "1.0.0",
  "evidence": [
    "E1: Distributed systems — CAP theorem, eventual consistency, saga pattern",
    "E2: Outbox pattern — reliable event publishing with transactional guarantee",
    "E3: Distributed locking — Redis-based locks for concurrent operations"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 262.1–262.7 |
| **Directory Pattern** | N/A (distributed systems guidance — cross-cutting) |
| **Dependencies** | none (architectural guidance) |
| **When To Use** | Architecture design decisions and patterns selection |
| **Source Skeleton** | N/A (guidance only, applies to project structure decisions) |
| **Specialist Type** | code |
| **Purpose** | Distributed patterns — saga, outbox, event sourcing, CQRS at system level |
| **Activation Trigger** | phase: /design, /plan; keywords: distributedSystem, saga, outbox, eventSourcing, consistency |

---

## Role

You are a **NestJS Distributed Patterns Specialist**. You supply patterns for building reliable distributed systems with NestJS — saga orchestration, transactional outbox, distributed locking, idempotent operations, and eventual consistency strategies.

---

## Patterns

### Pattern 262.1: Saga Orchestration

**Description**: Coordinate multi-service transactions with compensating actions.

```typescript
@Injectable()
export class CreateLoanSaga {
  async execute(dto: CreateLoanDto): Promise<LoanResult> {
    const steps: SagaStep[] = [];

    try {
      // Step 1: Create loan record
      const loan = await this.loanService.create(dto);
      steps.push({ service: 'loan', action: 'create', id: loan.id });

      // Step 2: Reserve collateral
      await this.collateralService.reserve(loan.id, dto.collateralId);
      steps.push({ service: 'collateral', action: 'reserve', id: dto.collateralId });

      // Step 3: Assess risk
      const risk = await this.riskService.assess(loan);
      steps.push({ service: 'risk', action: 'assess', id: risk.id });

      return { loan, risk };
    } catch (error) {
      // Compensate in reverse order
      await this.compensate(steps.reverse());
      throw new SagaFailedException('CreateLoan', error.message);
    }
  }

  private async compensate(steps: SagaStep[]): Promise<void> {
    for (const step of steps) {
      try {
        if (step.action === 'create') await this.loanService.cancel(step.id);
        if (step.action === 'reserve') await this.collateralService.release(step.id);
        if (step.action === 'assess') await this.riskService.revoke(step.id);
      } catch (compError) {
        this.logger.error(`Compensation failed for ${step.service}.${step.action}`, compError);
        // Log to dead letter for manual resolution
      }
    }
  }
}
```

**Key Points**:
- Each step has a compensating action — undo on failure
- Compensate in reverse order — last step first
- Log compensation failures — manual resolution needed for unrecoverable cases

---

### Pattern 262.2: Transactional Outbox

**Description**: Reliable event publishing — save event + business data in same DB transaction.

```typescript
@Injectable()
export class OutboxOrderService {
  constructor(private dataSource: DataSource) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async manager => {
      // 1. Save business data
      const order = manager.create(OrderEntity, dto);
      const saved = await manager.save(order);

      // 2. Save outbox event in SAME transaction
      const outboxEvent = manager.create(OutboxEventEntity, {
        aggregateId: saved.id,
        eventType: 'order.created',
        payload: JSON.stringify({ orderId: saved.id, customerId: dto.customerId }),
        status: 'PENDING',
      });
      await manager.save(outboxEvent);

      return saved;
      // Both saved or both rolled back — guaranteed consistency
    });
  }
}

// Background job — poll and publish outbox events
@Cron(CronExpression.EVERY_5_SECONDS)
async publishOutboxEvents() {
  const events = await this.outboxRepo.find({ where: { status: 'PENDING' }, take: 100 });
  for (const event of events) {
    try {
      await this.rabbitMQ.publish(event.eventType, JSON.parse(event.payload));
      event.status = 'PUBLISHED';
      event.publishedAt = new Date();
    } catch (error) {
      event.retryCount++;
      if (event.retryCount > 5) event.status = 'FAILED';
    }
    await this.outboxRepo.save(event);
  }
}
```

---

### Pattern 262.3: Distributed Locking with Redis

```typescript
@Injectable()
export class DistributedLock {
  constructor(private redis: RedisService) {}

  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const lockKey = `lock:${key}`;
    const lockValue = randomUUID();

    // Acquire lock
    const acquired = await this.redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
    if (!acquired) throw new ConflictException(`Resource ${key} is locked`);

    try {
      return await fn();
    } finally {
      // Release lock — only if we still own it (Lua script for atomicity)
      const script = `if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end`;
      await this.redis.eval(script, 1, lockKey, lockValue);
    }
  }
}

// Usage — prevent concurrent loan processing
await this.lock.withLock(`loan:${loanId}`, 30000, async () => {
  const loan = await this.loanRepo.findById(loanId);
  loan.approve();
  await this.loanRepo.save(loan);
});
```

---

### Pattern 262.4: Idempotent Operations

```typescript
@Injectable()
export class IdempotencyService {
  constructor(private redis: RedisService) {}

  async executeOnce<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const existing = await this.redis.get(`idempotent:${key}`);
    if (existing) return JSON.parse(existing);

    const result = await fn();
    await this.redis.set(`idempotent:${key}`, JSON.stringify(result), 'EX', ttl);
    return result;
  }
}

// Usage — payment processing with idempotency key
async processPayment(idempotencyKey: string, dto: PaymentDto) {
  return this.idempotency.executeOnce(idempotencyKey, 86400, async () => {
    return this.paymentGateway.charge(dto);
  });
}
```

---

### Pattern 262.5: Eventual Consistency

```typescript
// Service A: publishes event after local transaction
async createOrder(dto): Promise<Order> {
  const order = await this.orderRepo.save(Order.create(dto));
  await this.messageBroker.publish('order.created', { orderId: order.id });
  return order;
}

// Service B: eventually consistent — processes event asynchronously
@MessagePattern('order.created')
async handleOrderCreated(data: { orderId: string }) {
  // May arrive seconds or minutes later — that's OK
  await this.inventoryService.reserve(data.orderId);
}
// Services are EVENTUALLY consistent — not immediately
```

---

## Decision Guide

| Pattern | Use When |
|---------|----------|
| Saga | Multi-service write operation that needs all-or-nothing |
| Outbox | Reliable event publishing after DB write |
| Distributed Lock | Only one instance should process a resource |
| Idempotency | Operation may be retried (network failures, queues) |
| Eventual Consistency | Services can tolerate brief inconsistency |

---

## Best Practices

- Prefer eventual consistency over distributed transactions — simpler, more available
- Always implement compensating actions for saga steps
- Outbox pattern: poll-based publishing is simpler and more reliable than CDC
- Distributed locks: short TTL (10-30s), always release in finally block
- Idempotency: use client-provided key (Idempotency-Key header)

---

## Abnormal Case Patterns

1. **Saga partial completion** — Compensation fails. Fix: dead letter + manual resolution queue.
2. **Outbox table grows** — Published events not cleaned. Fix: scheduled job deletes published events older than 7d.
3. **Lock not released** — Process crashes while holding lock. Fix: TTL ensures auto-release.
4. **Idempotency key reuse** — Different operations with same key. Fix: scope key to operation type.
5. **Clock skew** — Distributed lock TTL inconsistent across nodes. Fix: use Redis TTL (server-side).

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (262.1-262.5)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Distributed Patterns Specialist — Architecture | EPS v3.2*

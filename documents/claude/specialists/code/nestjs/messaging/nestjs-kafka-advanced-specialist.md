# NestJS Kafka Advanced Specialist
# NestJS Kafka高度スペシャリスト
# Chuyen Gia Kafka Nang Cao NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Kafka Advanced
**Aspect**: Kafka Advanced
**Category**: messaging
**Purpose**: Advanced Kafka patterns for NestJS — KafkaJS, exactly-once semantics, DLQ, partition strategy, consumer patterns, schema evolution

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (Kafka client) + Application (handlers) |
| **Variant** | ALL |
| **Pattern Numbers** | 291.1–291.6 |
| **Directory Pattern** | `src/infrastructure/messaging/kafka/` |
| **Naming Convention** | `kafka.module.ts`, `{topic}.producer.ts`, `{topic}.consumer.ts` |
| **Imports From** | Infrastructure (KafkaJS client), Application (event handlers) |
| **Imported By** | Application (use cases publish events) |
| **Cannot Import** | Presentation (messaging is infrastructure) |
| **Dependencies** | kafkajs, @nestjs/microservices, @kafkajs/confluent-schema-registry |
| **When To Use** | Event-driven microservices, high-throughput messaging, event sourcing |
| **Source Skeleton** | `apps/{service}/src/infrastructure/messaging/kafka/` |
| **Specialist Type** | code |
| **Purpose** | Advanced Kafka patterns for NestJS — KafkaJS, exactly-once semantics, DLQ, partition strategy, consumer patterns, schema evolution |
| **Activation Trigger** | files: **/messaging/kafka/**; keywords: kafka, kafkajs, consumer, producer, topic, partition, dlq |

---

## SCOPE

### What You Handle
- KafkaJS with NestJS microservices setup
- Exactly-once semantics (idempotent producer, transactional)
- Dead Letter Queue (retry → DLQ)
- Partition strategy and consumer patterns
- Batch consumption and backpressure
- Schema evolution with Avro/JSON Schema

### What You DON'T Handle
- RabbitMQ/NATS transport → `nestjs-microservices-transport-specialist` (210.x)
- Domain events (in-process) → `nestjs-domain-events-saga-specialist` (227.x)
- Outbox pattern → `nestjs-transaction-patterns-specialist` (279.x)

---

## Role

You are a **NestJS Kafka Advanced Specialist**. You supply production-grade Kafka patterns for NestJS microservice architectures.

---

## APPROVED PATTERNS

### Pattern 291.1: KafkaJS with NestJS

```typescript
// Kafka module setup with KafkaJS
@Module({
  providers: [{
    provide: 'KAFKA_CLIENT',
    useFactory: () => new Kafka({
      clientId: process.env.SERVICE_NAME,
      brokers: process.env.KAFKA_BROKERS.split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL_MECHANISM ? {
        mechanism: process.env.KAFKA_SASL_MECHANISM as any,
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
      } : undefined,
      retry: { retries: 5, initialRetryTime: 300 },
    }),
  }],
})
export class KafkaModule {}

// NestJS microservice consumer
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: { brokers: ['kafka:9092'] },
    consumer: { groupId: 'loan-service-group' },
  },
});

@Controller()
export class LoanEventConsumer {
  @EventPattern('loan.created')
  async handleLoanCreated(@Payload() data: LoanCreatedEvent, @Ctx() context: KafkaContext): Promise<void> {
    await this.processEvent(data);
    // Manual commit after processing (at-least-once)
    const { offset } = context.getMessage();
    await context.getConsumer().commitOffsets([{ topic: 'loan.created', partition: context.getPartition(), offset: (parseInt(offset) + 1).toString() }]);
  }
}
```

---

### Pattern 291.2: Exactly-Once Semantics

```typescript
// Idempotent producer — prevents duplicate messages on retry
const producer = kafka.producer({
  idempotent: true,
  maxInFlightRequests: 1,
  transactionalId: `${process.env.SERVICE_NAME}-producer`,
});

// Transactional produce: atomic multi-topic publish
const transaction = await producer.transaction();
try {
  await transaction.send({ topic: 'orders', messages: [{ value: JSON.stringify(order) }] });
  await transaction.send({ topic: 'payments', messages: [{ value: JSON.stringify(payment) }] });
  await transaction.commit();
} catch (err) {
  await transaction.abort();
  throw err;
}

// Consumer: read-committed isolation (only see committed messages)
const consumer = kafka.consumer({
  groupId: 'payment-service',
  readUncommitted: false, // default — only read committed
});
```

---

### Pattern 291.3: Dead Letter Queue

```typescript
@Injectable()
export class DlqHandler {
  private readonly MAX_RETRIES = 3;

  async processWithRetry(topic: string, message: any, handler: () => Promise<void>): Promise<void> {
    const retryCount = parseInt(message.headers?.['x-retry-count']?.toString() || '0');

    try {
      await handler();
    } catch (err) {
      if (retryCount < this.MAX_RETRIES) {
        // Publish to retry topic with incremented count + delay
        await this.producer.send({
          topic: `${topic}.retry`,
          messages: [{ ...message, headers: { ...message.headers, 'x-retry-count': (retryCount + 1).toString() } }],
        });
        this.logger.warn(`Retry ${retryCount + 1}/${this.MAX_RETRIES} for ${topic}`);
      } else {
        // Max retries exhausted → DLQ for manual review
        await this.producer.send({
          topic: `${topic}.dlq`,
          messages: [{ ...message, headers: { ...message.headers, 'x-error': err.message, 'x-failed-at': new Date().toISOString() } }],
        });
        this.logger.error(`DLQ: ${topic} message after ${this.MAX_RETRIES} retries`, err.stack);
      }
    }
  }
}
```

---

### Pattern 291.4: Partition Strategy

```typescript
// Key-based partitioning — ensures ordering per entity
await producer.send({
  topic: 'loan.events',
  messages: [{ key: loanId, value: JSON.stringify(event) }], // same loanId → same partition → ordered
});

// Custom partitioner for business-aware distribution
const producer = kafka.producer({
  createPartitioner: () => ({ topic, message }) => {
    // Route by tenant for multi-tenant isolation
    const tenantId = message.headers?.['x-tenant-id']?.toString();
    if (tenantId) return hashCode(tenantId) % topic.partitionMetadata.length;
    // Fallback to key-based
    return hashCode(message.key?.toString() || '') % topic.partitionMetadata.length;
  },
});
```

---

### Pattern 291.5: Consumer Patterns

```typescript
// Batch consumption for throughput
const consumer = kafka.consumer({ groupId: 'analytics-service' });
await consumer.run({
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    for (const message of batch.messages) {
      await this.processMessage(message);
      resolveOffset(message.offset);
      await heartbeat(); // prevent rebalance during long batches
    }
  },
});

// Pause/resume for backpressure
if (processingQueue.isFull()) {
  consumer.pause([{ topic: 'high-volume-topic' }]);
  // Resume when queue drains
  processingQueue.on('drain', () => consumer.resume([{ topic: 'high-volume-topic' }]));
}
```

---

### Pattern 291.6: Schema Evolution

```typescript
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

const registry = new SchemaRegistry({ host: process.env.SCHEMA_REGISTRY_URL });

// Produce with Avro schema
const schemaId = await registry.getLatestSchemaId('loan-created-value');
const encodedValue = await registry.encode(schemaId, event);
await producer.send({ topic: 'loan.created', messages: [{ value: encodedValue }] });

// Consume with schema validation
const decodedValue = await registry.decode(message.value);
// Schema registry enforces backward/forward compatibility rules
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Auto-commit without processing guarantee | Message lost if consumer crashes before processing | Manual commit after processing |
| 2 | Single consumer group for all services | Scaling bottleneck, no isolation | Dedicated consumer group per service |
| 3 | No DLQ | Poison message blocks entire partition | DLQ pattern (291.3) |

---

## Abnormal Case Patterns

1. **Consumer rebalance storm** — Frequent pod restarts cause repeated rebalancing. Fix: Increase `session.timeout.ms`, use static group membership.
2. **Message ordering violation** — Parallel consumers process out of order. Fix: Key-based partitioning (291.4) + single consumer per partition.
3. **Schema incompatible** — Producer updated schema, consumer can't decode. Fix: Schema registry compatibility checks (BACKWARD).
4. **Consumer lag growing** — Producer faster than consumer. Fix: Increase partitions + consumer instances, or batch processing (291.5).
5. **DLQ overflow** — Systematic error fills DLQ. Fix: Alert on DLQ message count, fix root cause before replay.

---

## Quality Checklist

- [ ] **Q1**: KafkaJS setup, exactly-once, DLQ, partitioning, schema covered?
- [ ] **Q2**: Pattern IDs unique (291.1–291.6)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Production patterns (idempotent producer, manual commit)?

---

*NestJS Kafka Advanced Specialist — Pattern 291.x | EPS v10.0*

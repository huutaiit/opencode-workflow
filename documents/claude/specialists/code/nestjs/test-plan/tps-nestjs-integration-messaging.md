# Test Plan Specialist — NestJS Integration Testing: Messaging
# テストプランスペシャリスト — NestJS メッセージング統合テスト
# Chuyen Gia Test — Integration Test Messaging NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Integration Testing — Messaging
**Purpose**: Messaging integration testing — RabbitMQ/Kafka with test containers, producer/consumer round-trip, DLQ behavior, message ordering, idempotency testing

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-INT-MSG |
| **Directory Pattern** | `test/integration/messaging/**/*.spec.ts` |
| **Naming Convention** | `{topic}.messaging.integration.spec.ts` |
| **Imports From** | Infrastructure (producers, consumers, Kafka/RabbitMQ clients) |
| **Imported By** | N/A |
| **Cannot Import** | Presentation |
| **Dependencies** | jest, testcontainers, @testcontainers/kafka, @testcontainers/rabbitmq |
| **When To Use** | DD/Plan generates message producers, consumers, event handlers |
| **Source Skeleton** | `test/integration/messaging/` |
| **Specialist Type** | code |
| **Purpose** | Messaging integration testing — RabbitMQ/Kafka with test containers, producer/consumer round-trip, DLQ behavior, message ordering, idempotency testing |
| **Activation Trigger** | files: **/integration/messaging/**; keywords: kafkaTest, rabbitmqTest, messagingIntegration, dlqTest |

---

## Patterns

### Pattern INT-MSG.1: Kafka Test Container

```typescript
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';

let kafkaContainer: StartedKafkaContainer;

beforeAll(async () => {
  kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.5.0')
    .withExposedPorts(9093)
    .start();
  process.env.KAFKA_BROKERS = kafkaContainer.getBootstrapServers();
}, 60000);

afterAll(async () => { await kafkaContainer?.stop(); });
```

### Pattern INT-MSG.2: Producer → Consumer Round-Trip

```typescript
describe('Order Event Pipeline (integration)', () => {
  it('should produce and consume order.created event', async () => {
    const receivedMessages: any[] = [];

    // Start consumer
    await consumer.subscribe({ topic: 'order.created' });
    await consumer.run({
      eachMessage: async ({ message }) => {
        receivedMessages.push(JSON.parse(message.value.toString()));
      },
    });

    // Produce event
    await producer.send({
      topic: 'order.created',
      messages: [{ key: 'order-1', value: JSON.stringify({ orderId: 'order-1', amount: 100 }) }],
    });

    // Wait for consumer to process (with timeout)
    await waitFor(() => receivedMessages.length > 0, { timeout: 10000 });

    expect(receivedMessages[0].orderId).toBe('order-1');
    expect(receivedMessages[0].amount).toBe(100);
  });
});
```

### Pattern INT-MSG.3: DLQ Testing

```typescript
it('should route failed messages to DLQ after 3 retries', async () => {
  const dlqMessages: any[] = [];

  // Consumer that always fails
  await consumer.run({
    eachMessage: async () => { throw new Error('Processing failed'); },
  });

  // DLQ consumer
  await dlqConsumer.subscribe({ topic: 'order.created.dlq' });
  await dlqConsumer.run({
    eachMessage: async ({ message }) => {
      dlqMessages.push({ value: JSON.parse(message.value.toString()), headers: message.headers });
    },
  });

  // Produce poison message
  await producer.send({ topic: 'order.created', messages: [{ value: JSON.stringify({ bad: true }) }] });

  await waitFor(() => dlqMessages.length > 0, { timeout: 30000 });

  expect(dlqMessages[0].headers['x-retry-count'].toString()).toBe('3');
  expect(dlqMessages[0].headers['x-error']).toBeDefined();
});
```

### Pattern INT-MSG.4: Message Ordering Testing

```typescript
it('should preserve order for messages with same key', async () => {
  const received: string[] = [];

  await consumer.run({
    eachMessage: async ({ message }) => { received.push(message.value.toString()); },
  });

  // Send 5 messages with same key (same partition)
  for (let i = 1; i <= 5; i++) {
    await producer.send({
      topic: 'order.events',
      messages: [{ key: 'order-1', value: `event-${i}` }],
    });
  }

  await waitFor(() => received.length >= 5, { timeout: 10000 });

  expect(received).toEqual(['event-1', 'event-2', 'event-3', 'event-4', 'event-5']);
});
```

### Pattern INT-MSG.5: Idempotency Testing

```typescript
it('should process duplicate message only once', async () => {
  let processCount = 0;
  const idempotencyKey = 'idem-key-1';

  await consumer.run({
    eachMessage: async ({ message }) => {
      const key = message.headers['x-idempotency-key']?.toString();
      if (await this.idempotencyStore.exists(key)) return; // skip duplicate
      await this.idempotencyStore.set(key);
      processCount++;
    },
  });

  // Send same message twice
  const msg = { key: 'order-1', value: '{"orderId":"o1"}', headers: { 'x-idempotency-key': idempotencyKey } };
  await producer.send({ topic: 'test', messages: [msg] });
  await producer.send({ topic: 'test', messages: [msg] });

  await waitFor(() => processCount >= 1, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000)); // wait for potential duplicate

  expect(processCount).toBe(1); // processed only once
});
```

---

## Coverage Target

| Scope | Target |
|-------|--------|
| Producer → Consumer round-trip | 100% of event types |
| DLQ flow | 100% (retry exhaustion → DLQ) |
| Message ordering | Critical topics |
| Idempotency | All consumers |

---

*Test Plan Specialist — NestJS Integration Testing: Messaging | EPS v10.0*

# Test Plan Specialist — FastAPI Integration Testing: Messaging
# テストプランスペシャリスト — FastAPI Integration Testing: Messaging
# Chuyen Gia Test — FastAPI Integration Testing: Messaging

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Messaging integration - Celery/Redis/RabbitMQ task testing, Kafka with aiokafka, event round-trip, DLQ

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-MSG |
| **Specialist Type** | code |
| **Purpose** | Messaging integration - Celery/Redis/RabbitMQ task testing, Kafka with aiokafka, event round-trip, DLQ |

---

## Patterns

### Pattern INT-MSG.1: Celery Task Testing

celery_app.conf.update(task_always_eager=True, task_eager_propagates=True). task.delay(args). assert result == expected. Tests task logic without broker.

---

### Pattern INT-MSG.2: Celery with Real Broker

RedisContainer for Celery broker. task.apply_async(). Wait for result with timeout. Verify side effects (DB updated, event emitted).

---

### Pattern INT-MSG.3: Kafka with aiokafka

KafkaContainer + AIOKafkaProducer/Consumer. Produce message -> consume -> verify payload. Test DLQ routing on consumer failure.

---

### Pattern INT-MSG.4: Background Task Testing

FastAPI BackgroundTasks mock. response = await client.post("/orders"). Verify background task was enqueued. Test task execution separately.

---

## ❌ Negative Example

BAD: task_always_eager hides serialization bugs (datetime not JSON serializable). GOOD: Also test with real broker for serialization.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Integration Testing: Messaging | EPS v10.0*

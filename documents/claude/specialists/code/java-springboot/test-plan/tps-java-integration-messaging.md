# Test Plan Specialist — Java Integration Testing: Messaging
# テストプランスペシャリスト — Java メッセージング統合テスト
# Chuyen Gia Test — Integration Test Messaging Java

**Version**: 1.0.0
**Technology**: Kafka + @EmbeddedKafka / Testcontainers
**Aspect**: Integration Testing: Messaging
**Category**: backend
**Purpose**: Messaging integration testing — Kafka producer/consumer round-trip, DLQ, ordering, idempotency, Spring Cloud Stream

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-MSG |
| **Specialist Type** | code |
| **Purpose** | Messaging integration testing — Kafka producer/consumer round-trip, DLQ, ordering, idempotency, Spring Cloud Stream |

---

## Patterns

### Pattern INT-MSG.1: Kafka with @EmbeddedKafka

@EmbeddedKafka annotation for lightweight Kafka broker in test. KafkaTemplate send → @KafkaListener receive. Verify message body + headers.

---

### Pattern INT-MSG.2: Kafka with Testcontainers

Full KafkaContainer for production-like behavior. Test partition assignment, consumer group rebalance, exactly-once semantics.

---

### Pattern INT-MSG.3: DLQ Testing

Send poison message → consumer fails → retry 3x → DLQ topic receives message. Verify DLQ headers (x-retry-count, x-error, x-original-topic).

---

### Pattern INT-MSG.4: Message Ordering

Send 5 messages with same key → verify consumer processes in order. Test with single and multiple partitions.

---

### Pattern INT-MSG.5: Idempotency

Send duplicate messages (same idempotency key) → verify processed only once. Check DB state: exactly 1 record created.

---

## ❌ Negative Example

❌ Mock KafkaTemplate: hides serialization bugs, ignores partition behavior. ✅ @EmbeddedKafka: real Kafka, catches message format issues.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Integration Testing: Messaging | EPS v10.0*

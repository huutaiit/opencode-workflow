# Test Plan Specialist — Java Performance Testing: Load
# テストプランスペシャリスト — Java 負荷テスト
# Chuyen Gia Test — Performance Load Test Java

**Version**: 1.0.0
**Technology**: Gatling + k6 + Spring Boot Actuator
**Aspect**: Performance Testing: Load
**Category**: backend
**Purpose**: Load testing — Gatling/k6 scripts, load profiles, JVM-specific monitoring (heap, GC, thread pool), SLA targets for reactive/standard

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | PERF-L |
| **Specialist Type** | code |
| **Purpose** | Load testing — Gatling/k6 scripts, load profiles, JVM-specific monitoring (heap, GC, thread pool), SLA targets for reactive/standard |

---

## Patterns

### Pattern PERF-L.1: Gatling Simulation

Scala DSL: setUp(scn.inject(rampUsers(100).during(60))).protocols(httpProtocol). Assertions: global.responseTime.percentile3.lt(500), global.failedRequests.percent.lt(1).

---

### Pattern PERF-L.2: k6 for Java API

Same k6 patterns as NestJS but targeting Java endpoints. Compare reactive vs standard latency. Monitor JVM metrics via /actuator/prometheus.

---

### Pattern PERF-L.3: JVM Monitoring Under Load

Monitor via Actuator: jvm_memory_used_bytes, jvm_gc_pause_seconds, jvm_threads_live. Alert: GC pause > 200ms, heap > 80%, thread pool exhausted.

---

### Pattern PERF-L.4: Reactive vs Standard Comparison

Same load profile on reactive (Netty, event loop) vs standard (Tomcat, thread-per-request). Reactive should handle 5-10x more concurrent connections with same resources.

---

### Pattern PERF-L.5: Connection Pool (R2DBC/HikariCP)

Stress test: 200 concurrent requests with pool size 20. R2DBC: r2dbc.pool.acquired/idle metrics. HikariCP: hikaricp.connections.active/pending.

---

## ❌ Negative Example

❌ Load test against H2: tests framework speed, not production DB. ✅ Load test against staging with real Postgres + Redis.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Performance Testing: Load | EPS v10.0*

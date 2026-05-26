# Performance Testing Specialist — Java Spring Boot (Strategy + Routing)
# パフォーマンステストスペシャリスト — Java Spring Boot（戦略＋ルーティング）
# Chuyen Gia Performance Testing — Java Spring Boot (Chien Luoc + Routing)

**Version**: 2.0.0
**Technology**: Gatling + k6 + JFR + async-profiler
**Aspect**: Performance Testing — Strategy Hub
**Category**: backend
**Purpose**: Performance test strategy for Java — load/stress routing, JVM-specific monitoring (heap, GC, thread pool, Netty event loop), reactive vs standard comparison

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | TPS-JAVA-PERFORMANCE |
| **Specialist Type** | code |
| **Purpose** | Performance test strategy hub — routes to load or stress test plans |
| **Activation Trigger** | files: **/performance/**; keywords: gatling, k6, loadTest, jfr, gcTuning |

---

## Concern Routing Table

| Concern | Test Plan | File |
|---------|-----------|------|
| Load Testing | TPS-JAVA-PERF-LOAD | `tps-java-performance-load.md` |
| Stress & JVM | TPS-JAVA-PERF-STRESS | `tps-java-performance-stress.md` |

## JVM-Specific SLA Targets

| Metric | Target | Tool |
|--------|--------|------|
| p95 latency | < 500ms | Gatling/k6 |
| p99 latency | < 1000ms | Gatling/k6 |
| GC max pause | < 200ms | JFR / -Xlog:gc* |
| Heap after full GC | Stable (not growing) | JVisualVM / Prometheus |
| Thread pool utilization | < 80% | Actuator /actuator/metrics |
| R2DBC pool pending | < 5 | r2dbc-pool metrics |
| Error rate | < 1% | Gatling assertions |

## Reactive vs Standard Performance Profile

| Metric | Reactive (Netty) | Standard (Tomcat) |
|--------|-----------------|-------------------|
| Max concurrent connections | 10,000+ (non-blocking) | 200-400 (thread-per-request) |
| Memory per connection | ~KB (event loop) | ~1MB (thread stack) |
| CPU under I/O wait | Low (non-blocking) | High (threads blocked) |
| Suitable for | High-concurrency, I/O-heavy | CPU-heavy, simple CRUD |

---

*Test Plan Specialist — Java Performance Testing (Strategy + Routing) v2.0 | EPS v10.0*

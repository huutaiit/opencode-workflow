# Test Plan Specialist — Java Performance Testing: Stress
# テストプランスペシャリスト — Java ストレステスト
# Chuyen Gia Test — Performance Stress Test Java

**Version**: 1.0.0
**Technology**: Gatling + JVM Profiling (JFR/async-profiler) + GC Analysis
**Aspect**: Performance Testing: Stress
**Category**: backend
**Purpose**: Stress testing — JVM memory leak detection, GC tuning, thread dump analysis, R2DBC connection leak, Netty event loop saturation

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | PERF-S |
| **Specialist Type** | code |
| **Purpose** | Stress testing — JVM memory leak detection, GC tuning, thread dump analysis, R2DBC connection leak, Netty event loop saturation |

---

## Patterns

### Pattern PERF-S.1: JVM Memory Leak Detection

Soak test 4h + monitor jvm_memory_used_bytes. Compare heap after forced GC at T=0, T=1h, T=2h, T=4h. Growth >20% = leak. Use JFR for allocation profiling.

---

### Pattern PERF-S.2: GC Tuning for Reactive

G1GC: -XX:MaxGCPauseMillis=100. ZGC for ultra-low pause. Monitor: jvm_gc_pause_seconds_max, jvm_gc_pause_seconds_count. Target: max pause < 50ms.

---

### Pattern PERF-S.3: Thread Dump Analysis

Under stress: jcmd <pid> Thread.print. Check for: BLOCKED threads (deadlock), WAITING threads (connection pool exhausted), excessive thread count (Tomcat thread leak).

---

### Pattern PERF-S.4: R2DBC Connection Pool Stress

Pool size 10, send 100 concurrent requests. Monitor r2dbc.pool.pending-acquire-queue-size. If queue grows → pool too small or connection leak.

---

### Pattern PERF-S.5: Netty Event Loop Saturation (Reactive)

Monitor: reactor_netty_bytebuf_allocator_used_heap_memory, reactor_netty_tcp_server_data_received_bytes. Blocking call on event loop → all requests stall.

---

## ❌ Negative Example

❌ Only test with -Xmx2g: hides OOM that occurs at production -Xmx512m. ✅ Test with production-like memory limits.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Performance Testing: Stress | EPS v10.0*

# Test Plan Specialist — FastAPI Performance Testing: Stress
# テストプランスペシャリスト — FastAPI Performance Testing: Stress
# Chuyen Gia Test — FastAPI Performance Testing: Stress

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Stress testing - memory leak in async, event loop blocking detection, connection pool exhaustion, GC pressure

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | PERF-S |
| **Specialist Type** | code |
| **Purpose** | Stress testing - memory leak in async, event loop blocking detection, connection pool exhaustion, GC pressure |

---

## Patterns

### Pattern PERF-S.1: Async Memory Leak Detection

Soak test 4h. Monitor: process RSS via /proc/self/status or psutil. Growing RSS after GC = leak. Common cause: unclosed async generators, accumulated asyncio tasks.

---

### Pattern PERF-S.2: Event Loop Blocking Detection

asyncio.get_event_loop().slow_callback_duration = 0.1. Any sync call (time.sleep, open(), requests.get) blocking > 100ms gets logged. Test: no blocking warnings under load.

---

### Pattern PERF-S.3: Connection Pool Exhaustion

pool_size=5, fire 50 concurrent async queries. asyncpg.exceptions.TooManyConnectionsError should NOT occur. If occurs: pool config wrong or connection leak (session not closed).

---

### Pattern PERF-S.4: Python GC Pressure

gc.set_debug(gc.DEBUG_STATS). Under load: gc.collect() frequency and pause time. If GC runs >10x/sec -> too many short-lived objects. Profile with tracemalloc.

---

## ❌ Negative Example

BAD: Test with -Xmx equivalent (no memory limit). GOOD: Test with production-like container memory limit (256MB-512MB).

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Performance Testing: Stress | EPS v10.0*

# Test Plan Specialist — FastAPI Performance Testing (Strategy + Routing)
# テストプランスペシャリスト — FastAPI Performance Testing (Strategy + Routing)
# Chuyen Gia Test — FastAPI Performance Testing (Strategy + Routing)

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Performance strategy - Locust/k6, async event loop monitoring, connection pool, uvicorn worker tuning

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | ROUTING |
| **Specialist Type** | code |
| **Purpose** | Performance strategy - Locust/k6, async event loop monitoring, connection pool, uvicorn worker tuning |

---

## Patterns

### Pattern ROUTING: Concern Table

Load: tps-fastapi-performance-load.md | Stress: tps-fastapi-performance-stress.md

---

### Pattern ASYNC-SLA: FastAPI-Specific SLA

p95 < 200ms (FastAPI is async — should be faster than sync frameworks). p99 < 500ms. Throughput: > 500 RPS per uvicorn worker.

---

### Pattern UVICORN: Worker Tuning

workers = 2 * CPU + 1 (CPU-bound). workers = 4 * CPU (I/O-bound async). Monitor: uvicorn.workers.active, asyncio event loop lag.

---

## ❌ Negative Example

BAD: Test with 1 worker (dev mode). GOOD: Test with production worker count (uvicorn --workers N).

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Performance Testing (Strategy + Routing) | EPS v10.0*

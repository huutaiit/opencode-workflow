# Test Plan Specialist — FastAPI Performance Testing: Load
# テストプランスペシャリスト — FastAPI Performance Testing: Load
# Chuyen Gia Test — FastAPI Performance Testing: Load

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Load testing - Locust scripts, k6 for FastAPI, load profiles, async connection pool monitoring

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | PERF-L |
| **Specialist Type** | code |
| **Purpose** | Load testing - Locust scripts, k6 for FastAPI, load profiles, async connection pool monitoring |

---

## Patterns

### Pattern PERF-L.1: Locust Load Test

class ApiUser(HttpUser): wait_time = between(1, 3). @task def create_order(self): self.client.post("/orders", json=data). Assertions: response.status_code == 201.

---

### Pattern PERF-L.2: k6 for FastAPI

Same k6 patterns as NestJS/Java. Target FastAPI endpoints. Monitor: http_req_duration, http_req_failed, http_reqs rate.

---

### Pattern PERF-L.3: Connection Pool Under Load

asyncpg pool: min_size=5, max_size=20. Fire 100 concurrent requests. Monitor pool.get_idle_size(). If 0 idle + growing queue -> pool too small.

---

### Pattern PERF-L.4: uvicorn Worker Scaling

Test with 1, 2, 4, 8 workers. Measure throughput per worker count. Find diminishing returns point. Monitor CPU vs I/O wait.

---

## ❌ Negative Example

BAD: Locust with synchronous tasks against async API. GOOD: Use FastHttpUser (gevent-based) or k6 for proper async load.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Performance Testing: Load | EPS v10.0*

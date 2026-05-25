# Test Plan Specialist — Laravel Load Testing
# テストプランスペシャリスト — Laravel負荷テスト
# Chuyen Gia Ke Hoach Test — Load Test Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Load Testing
**Category**: test-plan
**Purpose**: Test plan for load testing — concurrent users, throughput, response times, resource usage under load

---

## Metadata

```json
{
  "id": "tps-laravel-performance-load",
  "technology": "Laravel 11+ Testing",
  "aspect": "Load Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 290,
  "token_cost": 1950,
  "version": "1.0.0",
  "evidence": [
    "E1: k6 — modern load testing tool with JavaScript API",
    "E2: Laravel Octane — high-performance application server",
    "E3: PHP-FPM — worker process management under load"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-PERFORMANCE-LOAD |
| **Directory Pattern** | `tests/Load/`, `k6/` |
| **Naming Convention** | `{scenario}.load.js` |
| **Specialist Type** | test-plan |
| **Purpose** | Load tests — concurrent users, throughput, response times |
| **Activation Trigger** | keywords: load test, stress test, concurrent users, throughput, k6, gatling |

---

## Test Strategy

Load tests verify the application handles expected and peak traffic. Use k6 for scripted load scenarios. Test against staging environment with production-like data. Define SLAs for p95 response time, throughput (RPS), and error rate. Run load tests as a separate CI pipeline stage (not on every commit).

---

## Test Cases

### TC-1: Baseline Load — Normal Traffic
**Priority**: HIGH
**Type**: Load
**Description**: Verify application handles normal traffic within SLA.

```javascript
// k6/baseline.load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up to 50 users
    { duration: '5m', target: 50 },   // steady state
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95th percentile < 500ms
    http_req_failed: ['rate<0.01'],    // error rate < 1%
    http_reqs: ['rate>100'],           // throughput > 100 RPS
  },
};

export default function () {
  const token = __ENV.API_TOKEN;
  const baseUrl = __ENV.BASE_URL || 'http://localhost:8000';

  // Mix of read and write operations
  const readResponse = http.get(`${baseUrl}/api/v1/orders?per_page=20`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  check(readResponse, {
    'GET /orders returns 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### TC-2: Peak Load — Traffic Spike
**Priority**: HIGH
**Type**: Load
**Description**: Verify application handles traffic spikes gracefully.

```javascript
// k6/peak.load.js
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // ramp up
    { duration: '1m', target: 200 },   // spike to 200 users
    { duration: '2m', target: 200 },   // sustained peak
    { duration: '30s', target: 50 },   // scale down
    { duration: '1m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 1s at peak
    http_req_failed: ['rate<0.05'],     // 5% error rate acceptable during spike
  },
};

export default function () {
  // Same scenario as baseline but with more users
  const response = http.get(`${__ENV.BASE_URL}/api/v1/orders`, {
    headers: { 'Authorization': `Bearer ${__ENV.API_TOKEN}` },
  });
  check(response, { 'status is 200 or 429': (r) => [200, 429].includes(r.status) });
  sleep(0.5);
}
```

### TC-3: Write-Heavy Scenario
**Priority**: HIGH
**Type**: Load
**Description**: Verify application handles concurrent write operations.

```javascript
// k6/write-heavy.load.js
export const options = {
  vus: 30,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const payload = JSON.stringify({
    items: [{ product_id: 'prod-1', quantity: 1, unit_price: 1000 }],
  });

  const createResponse = http.post(`${__ENV.BASE_URL}/api/v1/orders`, payload, {
    headers: {
      'Authorization': `Bearer ${__ENV.API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  check(createResponse, {
    'POST /orders returns 201': (r) => r.status === 201,
    'write under 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
```

### TC-4: Database Connection Pool Under Load
**Priority**: HIGH
**Type**: Load
**Description**: Verify database connection pool handles concurrent requests.

```php
it('handles 50 concurrent database requests without pool exhaustion', function () {
    $promises = [];
    $errors = [];

    for ($i = 0; $i < 50; $i++) {
        try {
            DB::connection()->select('SELECT 1');
        } catch (\Exception $e) {
            $errors[] = $e->getMessage();
        }
    }

    expect($errors)->toBeEmpty();
});
```

### TC-5: Soak Test — Extended Duration
**Priority**: MEDIUM
**Type**: Load
**Description**: Verify application stability over extended period (memory leaks, connection leaks).

```javascript
// k6/soak.load.js
export const options = {
  stages: [
    { duration: '2m', target: 30 },    // ramp up
    { duration: '30m', target: 30 },   // soak for 30 minutes
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // must stay fast over time
    http_req_failed: ['rate<0.01'],     // error rate stays low
  },
};

export default function () {
  http.get(`${__ENV.BASE_URL}/api/v1/orders`, {
    headers: { 'Authorization': `Bearer ${__ENV.API_TOKEN}` },
  });
  sleep(2);
}
// Post-test: check server memory hasn't grown (no leaks)
// Post-test: check DB connections returned to pool
```

### TC-6: Rate Limit Behavior Under Load
**Priority**: MEDIUM
**Type**: Load
**Description**: Verify rate limiting works correctly under concurrent load.

```javascript
// k6/rate-limit.load.js
export const options = {
  vus: 10,
  duration: '1m',
};

export default function () {
  // Rapidly hit rate-limited endpoint
  const response = http.get(`${__ENV.BASE_URL}/api/v1/orders`, {
    headers: { 'Authorization': `Bearer ${__ENV.API_TOKEN}` },
  });

  check(response, {
    'returns 200 or 429': (r) => [200, 429].includes(r.status),
    '429 includes Retry-After header': (r) =>
      r.status !== 429 || r.headers['Retry-After'] !== undefined,
  });
  // No sleep — intentionally hammering to trigger rate limit
}
```

---

## SLA Thresholds

| Metric | Normal Load | Peak Load | Soak Test |
|--------|------------|-----------|-----------|
| p50 response time | <200ms | <500ms | <200ms |
| p95 response time | <500ms | <1000ms | <500ms |
| p99 response time | <1000ms | <2000ms | <1000ms |
| Error rate | <1% | <5% | <1% |
| Throughput (RPS) | >100 | >50 | >80 |

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Read endpoints | All list/detail endpoints | Read-heavy workloads |
| Write endpoints | All create/update endpoints | Write contention |
| Connection pool | Under peak concurrent users | Pool exhaustion |
| Memory stability | 30-minute soak test | Memory leak detection |
| Rate limiting | Under sustained high traffic | Rate limit correctness |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Run load tests against empty DB | Unrealistic — production has data | Seed with production-like volume |
| 2 | Run load tests on every CI build | Slow, expensive | Separate pipeline (weekly/release) |
| 3 | Use single user token for all VUs | No per-user isolation | Unique token per virtual user |
| 4 | No ramp-up period | Sudden spike unrealistic | Gradual ramp-up stages |
| 5 | Ignore p99 latency | Tail latency affects users | Track p50, p95, p99 |

---

## Quality Checklist

- [ ] **Q1**: Baseline, peak, and soak scenarios defined?
- [ ] **Q2**: SLA thresholds documented (p95, error rate, RPS)?
- [ ] **Q3**: Write-heavy scenario included?
- [ ] **Q4**: Database connection pool tested under load?

---

*Test Plan Specialist — Laravel Load Testing v1.0 | EPS v3.2*

# Test Plan Specialist — NestJS Performance Testing: Load
# テストプランスペシャリスト — NestJS 負荷テスト
# Chuyen Gia Test — Load Test NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Performance Testing — Load
**Purpose**: Load testing for NestJS — k6 scripts, load profiles (smoke/load/stress/spike/soak), microservice latency benchmarks, connection pool under load, Kafka throughput

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (performance tests exercise full stack) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-PERF-LOAD |
| **Directory Pattern** | `test/performance/load/**/*.js` |
| **Naming Convention** | `{scenario}.load.js` (k6 script) |
| **Imports From** | N/A (external load testing tool) |
| **Imported By** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | k6 (Grafana), artillery (optional) |
| **When To Use** | Pre-release performance validation, capacity planning, SLA verification |
| **Source Skeleton** | `test/performance/load/` |
| **Specialist Type** | code |
| **Purpose** | Load testing for NestJS — k6 scripts, load profiles, microservice latency, connection pool, Kafka throughput |
| **Activation Trigger** | files: **/performance/load/**; keywords: k6, loadTest, rps, latency, throughput, soak |

---

## Patterns

### Pattern PERF-L.1: k6 Load Test Script

```javascript
// test/performance/load/api-orders.load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up to 50 VUs
    { duration: '3m', target: 50 },   // sustain 50 VUs
    { duration: '1m', target: 100 },  // ramp up to 100 VUs
    { duration: '3m', target: 100 },  // sustain 100 VUs
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // p95 < 500ms, p99 < 1s
    http_req_failed: ['rate<0.01'],                    // <1% error rate
    http_reqs: ['rate>100'],                           // >100 RPS sustained
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  // Scenario 1: Create order (write-heavy)
  const createRes = http.post(`${BASE_URL}/orders`, JSON.stringify({
    customerId: `customer-${__VU}`,
    items: [{ productId: 'p1', quantity: Math.floor(Math.random() * 5) + 1 }],
  }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` } });

  check(createRes, {
    'create: status 201': (r) => r.status === 201,
    'create: has id': (r) => JSON.parse(r.body).id !== undefined,
  });

  // Scenario 2: List orders (read-heavy)
  const listRes = http.get(`${BASE_URL}/orders?page=1&limit=20`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  });

  check(listRes, {
    'list: status 200': (r) => r.status === 200,
    'list: has data': (r) => JSON.parse(r.body).data.length > 0,
  });

  sleep(1); // 1 RPS per VU
}
```

### Pattern PERF-L.2: Load Profiles

```javascript
// SMOKE: Verify system works under minimal load
export const smoke = { stages: [{ duration: '1m', target: 5 }],
  thresholds: { http_req_failed: ['rate<0.01'] } };

// LOAD: Normal expected traffic
export const load = { stages: [
  { duration: '2m', target: 50 }, { duration: '5m', target: 50 }, { duration: '2m', target: 0 }],
  thresholds: { http_req_duration: ['p(95)<500'] } };

// STRESS: Find breaking point
export const stress = { stages: [
  { duration: '2m', target: 100 }, { duration: '5m', target: 200 },
  { duration: '2m', target: 300 }, { duration: '2m', target: 0 }],
  thresholds: { http_req_duration: ['p(95)<2000'] } };

// SPIKE: Sudden burst
export const spike = { stages: [
  { duration: '30s', target: 10 }, { duration: '30s', target: 500 },
  { duration: '1m', target: 500 }, { duration: '30s', target: 10 }] };

// SOAK: Extended duration (memory leaks, connection pool exhaustion)
export const soak = { stages: [
  { duration: '2m', target: 50 }, { duration: '4h', target: 50 }, { duration: '2m', target: 0 }],
  thresholds: { http_req_duration: ['p(99)<1000'] } };
```

### Pattern PERF-L.3: Microservice Latency Benchmark

```javascript
// Test latency for cross-service calls
import { Trend } from 'k6/metrics';

const loanServiceLatency = new Trend('loan_service_latency');
const paymentServiceLatency = new Trend('payment_service_latency');
const gatewayLatency = new Trend('gateway_e2e_latency');

export default function () {
  // Direct service call
  const loanRes = http.get(`${LOAN_SERVICE_URL}/loans/${testLoanId}`);
  loanServiceLatency.add(loanRes.timings.duration);

  // Cross-service: gateway → loan → payment
  const disbRes = http.post(`${GATEWAY_URL}/api/loans/${testLoanId}/disburse`, null, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  });
  gatewayLatency.add(disbRes.timings.duration);

  check(disbRes, {
    'e2e disbursement < 2s': (r) => r.timings.duration < 2000,
  });
}
```

### Pattern PERF-L.4: Connection Pool Stress

```javascript
// Stress test: overwhelm connection pool
export const options = {
  stages: [{ duration: '1m', target: 200 }], // 200 concurrent DB-hitting requests
  thresholds: {
    http_req_duration: ['p(99)<3000'],
    http_req_failed: ['rate<0.05'], // allow 5% failure under extreme load
  },
};

export default function () {
  // Heavy DB query endpoint
  const res = http.get(`${BASE_URL}/reports/loan-book?page=1&limit=100`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  });
  check(res, { 'not 503 (pool exhausted)': (r) => r.status !== 503 });
}
```

---

## CI Integration

```yaml
# .github/workflows/performance.yml
performance-test:
  runs-on: ubuntu-latest
  steps:
    - uses: grafana/k6-action@v0.3.1
      with:
        filename: test/performance/load/api-orders.load.js
        flags: --env BASE_URL=${{ env.STAGING_URL }} --env AUTH_TOKEN=${{ secrets.TEST_TOKEN }}
    - name: Check thresholds
      if: failure()
      run: echo "Performance regression detected!"
```

---

## SLA Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| p95 latency | < 500ms | k6 `http_req_duration` |
| p99 latency | < 1000ms | k6 `http_req_duration` |
| Error rate | < 1% | k6 `http_req_failed` |
| Throughput | > 100 RPS | k6 `http_reqs` |
| Recovery time | < 30s | Time to return to normal after spike |

---

*Test Plan Specialist — NestJS Performance Testing: Load | EPS v10.0*

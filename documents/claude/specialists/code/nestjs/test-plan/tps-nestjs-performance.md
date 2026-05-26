# Test Plan Specialist — NestJS Performance Testing (Strategy + Routing)
# テストプランスペシャリスト — NestJSパフォーマンステスト（戦略＋ルーティング）
# Chuyen Gia Ke Hoach Test — Performance Test NestJS (Chien Luoc + Routing)

**Version**: 2.0.0
**Stack**: TypeScript/NestJS | **Type**: Performance Testing — Strategy Hub
**Purpose**: Performance test strategy for NestJS — load/stress routing, SLA targets, k6 profiles, Node.js-specific monitoring (event loop, GC, heap), CI integration

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (performance tests exercise full stack) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-PERFORMANCE |
| **Directory Pattern** | `test/performance/**/*.js` |
| **Naming Convention** | `{scenario}.{type}.js` (k6 scripts) |
| **Imports From** | N/A (external testing tools) |
| **Imported By** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | k6 (Grafana), clinic.js, 0x, artillery (optional) |
| **When To Use** | Pre-release validation, capacity planning, SLA verification, regression detection |
| **Source Skeleton** | `test/performance/` |
| **Specialist Type** | code |
| **Purpose** | Performance test strategy hub — routes to load or stress test plans based on testing goal |
| **Activation Trigger** | files: **/performance/**; keywords: performanceTest, loadTest, stressTest, k6, latency, throughput |

---

## Concern Routing Table

| Concern | Test Plan | File | Load When |
|---------|-----------|------|-----------|
| Load Testing | TPS-NESTJS-PERF-LOAD | `tps-nestjs-performance-load.md` | Verifying SLAs, throughput, latency under expected/peak load |
| Stress & Resource | TPS-NESTJS-PERF-STRESS | `tps-nestjs-performance-stress.md` | Finding breaking points, memory leaks, event loop lag, GC pressure |

---

## Performance Test Strategy Overview

### Test Type Decision Matrix

| Goal | Test Type | Tool | Duration | When |
|------|----------|------|----------|------|
| Verify SLA (p95 < 500ms) | **Load** | k6 | 10-15 min | Every release |
| Find breaking point | **Stress** | k6 | 15-30 min | Monthly / major changes |
| Detect memory leaks | **Soak** | k6 + Prometheus | 4-8 hours | Monthly |
| Test sudden traffic burst | **Spike** | k6 | 5-10 min | Before marketing events |
| Basic sanity | **Smoke** | k6 | 1-2 min | Every CI build |
| CPU hotspot analysis | **Profile** | clinic.js / 0x | N/A | When latency regresses |

### Node.js-Specific Monitoring

| Metric | Source | Alert Threshold | Dashboard |
|--------|--------|----------------|-----------|
| Event loop lag | `monitorEventLoopDelay()` | p99 > 100ms | Grafana: Node.js Runtime |
| Heap used | `process.memoryUsage().heapUsed` | > 80% of --max-old-space-size | Grafana: Node.js Runtime |
| RSS memory | `process.memoryUsage().rss` | > 450MB (of 512MB container) | Grafana: Node.js Runtime |
| GC pause duration | `--trace-gc` flag | Single pause > 200ms | Log analysis |
| Active handles | `process._getActiveHandles().length` | Growing over time = leak | Grafana: Node.js Runtime |
| DB connection pool | `pg_pool_available_connections` | Available < 2 | Grafana: Database |
| Kafka consumer lag | `kafka_consumer_lag` | Growing continuously | Grafana: Kafka |

---

## SLA Targets (Default — override per project)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **p50 latency** | < 100ms | k6 `http_req_duration` |
| **p95 latency** | < 500ms | k6 `http_req_duration` |
| **p99 latency** | < 1000ms | k6 `http_req_duration` |
| **Error rate** | < 1% | k6 `http_req_failed` |
| **Throughput** | > 100 RPS per service | k6 `http_reqs` |
| **Recovery time** | < 30s after spike | Manual observation |
| **Memory stability** | RSS growth < 20% in 4h soak | Prometheus |
| **Event loop lag** | p99 < 100ms under load | `monitorEventLoopDelay()` |

---

## Performance Test Profiles

```
SMOKE (CI — every build):
  Duration: 1 min | VUs: 5 | Goal: verify system responds
  
LOAD (staging — every release):
  Ramp: 50 VUs → sustain 5 min → ramp to 100 → sustain 3 min → ramp down
  Goal: verify SLA under expected peak traffic

STRESS (staging — monthly):
  Ramp: 100 → 200 → 300 → 400 VUs
  Goal: find breaking point, measure degradation curve

SPIKE (staging — before events):
  Ramp: 10 → 500 VUs in 30s → sustain 1 min → back to 10
  Goal: test auto-scaling and recovery

SOAK (staging — monthly):
  Duration: 4+ hours | VUs: 50 (steady)
  Goal: detect memory leaks, connection pool exhaustion, log rotation
```

---

## CI Pipeline Integration

```yaml
# Fast smoke test: runs on every PR
performance-smoke:
  runs-on: ubuntu-latest
  steps:
    - run: k6 run --duration 1m --vus 5 test/performance/load/smoke.load.js
      env: { BASE_URL: http://localhost:3000 }

# Full load test: runs on release branch
performance-load:
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/release/*'
  steps:
    - run: k6 run test/performance/load/api-orders.load.js
      env: { BASE_URL: ${{ secrets.STAGING_URL }}, AUTH_TOKEN: ${{ secrets.TEST_TOKEN }} }
```

---

## Performance Regression Detection

```
Baseline → Measure → Compare → Alert

1. BASELINE: Record p95 latency for each endpoint after release N
2. MEASURE: Run same load test for release N+1
3. COMPARE: If p95 increased > 20% → regression detected
4. ALERT: Block release, investigate with clinic.js flamegraph

Storage: k6 results → InfluxDB → Grafana dashboard with baseline overlay
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Run load tests against production | Risk outage for real users | Use staging with production-like infra |
| 2 | No baseline comparison | Can't detect regression | Store baselines per release |
| 3 | Test with mock DB | Tests HTTP framework, not real performance | Use real DB (test containers or staging) |
| 4 | Skip soak tests | Memory leaks only visible after hours | Monthly soak tests (4h minimum) |
| 5 | Hard-coded auth tokens in scripts | Token expires, tests fail | Generate tokens in k6 setup() |

---

## Quality Checklist

- [ ] **Q1**: Concern routing (load, stress) defined?
- [ ] **Q2**: SLA targets documented with measurement method?
- [ ] **Q3**: Node.js-specific metrics (event loop, GC, heap) monitored?
- [ ] **Q4**: CI pipeline with smoke test on every PR?

---

*Test Plan Specialist — NestJS Performance Testing (Strategy + Routing) v2.0 | EPS v10.0*

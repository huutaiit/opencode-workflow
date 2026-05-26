# Test Plan Specialist — NestJS Performance Testing: Stress & Resource
# テストプランスペシャリスト — NestJS ストレス＆リソーステスト
# Chuyen Gia Test — Stress & Resource Test NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Performance Testing — Stress & Resource
**Purpose**: Stress and resource testing — memory leak detection, event loop lag, connection pool exhaustion, Kafka consumer lag, Node.js profiling, GC pressure

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (stress tests exercise full stack) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-PERF-STRESS |
| **Directory Pattern** | `test/performance/stress/**/*.js` |
| **Naming Convention** | `{concern}.stress.js` |
| **Imports From** | N/A (external testing tools) |
| **Imported By** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | k6, clinic.js (doctor, flame, bubbleprof), 0x (flamegraph) |
| **When To Use** | Pre-release stability validation, memory leak detection, capacity planning |
| **Source Skeleton** | `test/performance/stress/` |
| **Specialist Type** | code |
| **Purpose** | Stress and resource testing — memory leak detection, event loop lag, connection pool exhaustion, Kafka consumer lag, Node.js profiling |
| **Activation Trigger** | files: **/performance/stress/**; keywords: memoryLeak, eventLoopLag, connectionPool, gcPressure, stress, profiling |

---

## Patterns

### Pattern PERF-S.1: Memory Leak Detection

```javascript
// Soak test + memory monitoring
// Run: k6 run --duration 4h memory-soak.stress.js
// Monitor: watch node process RSS via Prometheus

export const options = {
  stages: [{ duration: '2m', target: 30 }, { duration: '4h', target: 30 }, { duration: '2m', target: 0 }],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // degradation = possible leak
  },
};

// After test, check Grafana dashboard:
// - process_resident_memory_bytes should be STABLE (not growing)
// - If RSS grows >50% over 4h → memory leak confirmed
// - nodejs_heap_size_used_bytes should return to baseline after GC

// CLI alternative (no Grafana):
// node --inspect main.js → Chrome DevTools → Memory tab → Heap Snapshots at T=0, T=1h, T=2h
```

### Pattern PERF-S.2: Event Loop Lag Monitoring

```typescript
// Infrastructure: event loop lag health indicator
import { monitorEventLoopDelay } from 'perf_hooks';

@Injectable()
export class EventLoopHealthIndicator extends HealthIndicator {
  private histogram = monitorEventLoopDelay({ resolution: 20 });

  constructor() { super(); this.histogram.enable(); }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const p99 = this.histogram.percentile(99) / 1e6; // ns → ms
    return this.getStatus('event-loop', p99 < 100, { p99Ms: Math.round(p99) });
    // ALERT if p99 > 100ms — event loop is being blocked
  }
}

// Test: verify event loop stays healthy under load
// k6 stress test → query /health/live → check event-loop.p99Ms < 100
```

### Pattern PERF-S.3: Connection Pool Exhaustion

```javascript
// Stress test: exhaust DB connection pool
export const options = {
  scenarios: {
    constant_load: { executor: 'constant-arrival-rate', rate: 500, duration: '2m', preAllocatedVUs: 200 },
  },
};

export default function () {
  // Each request uses a DB connection
  const res = http.get(`${BASE_URL}/orders?page=1&limit=10`);
  check(res, {
    'not 503': (r) => r.status !== 503,
    'not timeout': (r) => r.timings.duration < 5000,
  });
}

// Expected behavior:
// - Pool size 20, 500 RPS → queuing occurs
// - Response time increases but no 503
// - If 503 appears → pool too small or connection leak
//
// Monitor: pg_pool_available_connections metric
// Fix: Increase pool size OR fix connection leaks (unreleased QueryRunners)
```

### Pattern PERF-S.4: Kafka Consumer Lag

```bash
# Monitor consumer lag during load
# Tool: kafka-consumer-groups CLI or Burrow

# Check lag while producer sends 10K messages/sec
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group loan-service-group --describe

# Expected: LAG column should stay < 1000
# If LAG grows continuously → consumer too slow
# Fix: increase partitions + consumer instances, or batch processing (291.5)
```

### Pattern PERF-S.5: Node.js Profiling

```bash
# CPU profiling with clinic.js
npx clinic doctor -- node dist/main.js
# → generates HTML report showing event loop delays, I/O, GC

# Flamegraph for CPU hotspots
npx clinic flame -- node dist/main.js
# → shows which functions consume most CPU time

# Bubbleprof for async bottlenecks
npx clinic bubbleprof -- node dist/main.js
# → visualizes async operations and where time is spent waiting

# 0x flamegraph (lightweight alternative)
npx 0x dist/main.js
# → generates interactive flamegraph SVG
```

### Pattern PERF-S.6: GC Pressure Testing

```bash
# Run with GC logging
node --trace-gc --max-old-space-size=512 dist/main.js

# Expected: GC pauses < 50ms, frequency < 1/sec under load
# Red flags:
# - GC pause > 200ms → stop-the-world blocking event loop
# - GC frequency > 5/sec → allocation rate too high
# - Heap growing despite GC → memory leak

# Automated check:
node --expose-gc -e "
  global.gc();
  const before = process.memoryUsage().heapUsed;
  // ... run workload ...
  global.gc();
  const after = process.memoryUsage().heapUsed;
  const leaked = after - before;
  if (leaked > 10 * 1024 * 1024) console.error('LEAK: ' + (leaked/1024/1024).toFixed(1) + 'MB');
"
```

---

## Stress Test Checklist

| Test | Pass Criteria | Tool |
|------|-------------|------|
| Memory stability (4h soak) | RSS growth < 20% | k6 + Prometheus |
| Event loop lag | p99 < 100ms under load | monitorEventLoopDelay |
| Connection pool | No 503 at 500 RPS | k6 + pg_pool metrics |
| Kafka consumer lag | Lag < 1000 at 10K msg/sec | kafka-consumer-groups |
| GC pause | Max pause < 200ms | --trace-gc |
| CPU hotspots | No single function > 30% CPU | clinic flame |

---

*Test Plan Specialist — NestJS Performance Testing: Stress & Resource | EPS v10.0*

# NestJS Performance Specialist — Performance
# NestJSパフォーマンススペシャリスト — パフォーマンス
# Chuyen Gia Hieu Nang NestJS — Hieu Nang

**Version**: 1.0.0
**Technology**: NestJS 10+ Performance Optimization
**Aspect**: Performance
**Category**: performance
**Purpose**: Knowledge provider for NestJS performance — async optimization, memory profiling, query optimization, connection pooling, lazy loading, Node.js event loop, caching strategies

---

## Metadata

```json
{
  "id": "nestjs-performance-specialist",
  "technology": "NestJS 10+ Performance",
  "aspect": "Performance Optimization",
  "category": "performance",
  "subcategory": "nestjs",
  "lines": 350,
  "token_cost": 2100,
  "version": "1.0.0",
  "evidence": [
    "E1: Node.js performance — event loop, memory management, profiling",
    "E2: TypeORM query optimization — N+1, eager/lazy loading, query plans",
    "E3: NestJS caching — cache interceptor, Redis, memoization"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 255.1–255.8 |
| **Directory Pattern** | N/A (cross-cutting performance patterns) |
| **Dependencies** | none (Node.js built-in + profiling tools) |
| **When To Use** | Performance optimization — async patterns, N+1 prevention, memory management |
| **Source Skeleton** | N/A (cross-cutting guidance, applies to all source files) |
| **Specialist Type** | code |
| **Purpose** | NestJS performance optimization — caching, lazy loading, compression, clustering |
| **Activation Trigger** | files: **/*.ts; keywords: performance, optimization, caching, compression, cluster |

---

## Role

You are a **NestJS Performance Specialist**. You supply patterns for optimizing NestJS application performance — efficient async operations, database query optimization, connection pool tuning, caching strategies, memory leak prevention, and Node.js event loop health.

---

## Patterns

### Pattern 255.1: Parallel Async Operations

```typescript
// SLOW — sequential (3 seconds total)
const users = await this.userService.findAll();      // 1s
const orders = await this.orderService.findAll();     // 1s
const stats = await this.analyticsService.getSummary(); // 1s

// FAST — parallel (1 second total)
const [users, orders, stats] = await Promise.all([
  this.userService.findAll(),
  this.orderService.findAll(),
  this.analyticsService.getSummary(),
]);

// Partial failure tolerance
const results = await Promise.allSettled([
  this.primaryService.getData(),
  this.fallbackService.getData(),
]);
```

---

### Pattern 255.2: N+1 Query Prevention

```typescript
// BAD — N+1: 1 query for orders + N queries for customers
const orders = await this.orderRepo.find();
for (const order of orders) {
  order.customer = await this.customerRepo.findById(order.customerId); // N queries!
}

// GOOD — eager loading: 1 query with JOIN
const orders = await this.orderRepo.find({
  relations: ['customer', 'items'],
});

// GOOD — QueryBuilder with selective joins
const orders = await this.orderRepo.createQueryBuilder('order')
  .leftJoinAndSelect('order.customer', 'customer')
  .leftJoinAndSelect('order.items', 'item')
  .where('order.status = :status', { status: 'ACTIVE' })
  .getMany();
```

---

### Pattern 255.3: Connection Pool Tuning

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  extra: {
    max: 20,              // max pool size (default: 10)
    min: 5,               // keep 5 connections warm
    idleTimeoutMillis: 30000,   // close idle after 30s
    connectionTimeoutMillis: 5000, // fail if can't connect in 5s
  },
})
```

**Key Points**:
- Pool size = number of concurrent DB queries your app can make
- Rule of thumb: pool_size = (CPU cores * 2) + effective_disk_spindles
- Monitor with `pg_stat_activity` — if connections often at max, increase pool

---

### Pattern 255.4: Response Caching

```typescript
// Cache interceptor with Redis
@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest();
    if (req.method !== 'GET') return undefined; // only cache GET
    return `cache:${req.url}`;
  }
}

// Usage
@UseInterceptors(HttpCacheInterceptor)
@CacheTTL(60) // 60 seconds
@Get('popular')
getPopularProducts() { return this.productService.findPopular(); }
```

---

### Pattern 255.5: Memory Leak Prevention

```typescript
// Common leak: unbounded in-memory cache
// BAD
const cache = new Map(); // grows forever

// GOOD — use LRU cache with max size
import { LRUCache } from 'lru-cache';
const cache = new LRUCache({ max: 500, ttl: 1000 * 60 * 5 });

// Common leak: event listener not removed
@Injectable()
export class MyService implements OnModuleDestroy {
  private handler = this.onEvent.bind(this);

  onModuleInit() { this.emitter.on('event', this.handler); }
  onModuleDestroy() { this.emitter.off('event', this.handler); } // cleanup!
}
```

---

### Pattern 255.6: Event Loop Monitoring

```typescript
// Detect event loop lag — warning sign of blocking code
import { monitorEventLoopDelay } from 'perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

// Expose in health check
@Get('health/event-loop')
getEventLoopHealth() {
  return {
    min: histogram.min / 1e6,   // convert ns to ms
    max: histogram.max / 1e6,
    mean: histogram.mean / 1e6,
    p99: histogram.percentile(99) / 1e6,
    healthy: histogram.mean / 1e6 < 100, // >100ms mean = problem
  };
}
```

---

### Pattern 255.7: Streaming Large Datasets

```typescript
// BAD — load all into memory
const allOrders = await this.orderRepo.find(); // 100K rows in memory!
return allOrders.map(o => this.serialize(o));

// GOOD — stream with cursor
@Get('export')
async exportCsv(@Res() res: Response) {
  res.setHeader('Content-Type', 'text/csv');
  res.write('id,customer,amount,status\n');

  const stream = await this.orderRepo.createQueryBuilder('order')
    .stream();

  stream.on('data', (row) => {
    res.write(`${row.id},${row.customer_id},${row.total_amount},${row.status}\n`);
  });
  stream.on('end', () => res.end());
}
```

---

## Best Practices

### Database
- Use `explain analyze` for slow queries — understand query plan
- Index columns used in WHERE, ORDER BY, JOIN ON
- Avoid `SELECT *` — specify needed columns with QueryBuilder `.select()`
- Batch INSERT/UPDATE — use `save([array])` not loop of `save(single)`

### Node.js
- Never block the event loop — no CPU-heavy sync code in request handlers
- Use worker threads for CPU-intensive tasks (PDF gen, image processing)
- Set `--max-old-space-size=512` in production — match K8s memory limit

### Caching
- Cache at the right level: HTTP (CDN) > Application (Redis) > Query (DB)
- Short TTL (30-60s) for frequently changing data
- Cache invalidation on write — or accept eventual consistency

---

## Abnormal Case Patterns

1. **Event loop blocked** — Synchronous crypto/JSON.parse on large payload. Fix: use async alternatives or worker threads.
2. **Memory leak** — Unbounded cache or unreleased DB connections. Fix: LRU cache, connection pool, cleanup in onModuleDestroy.
3. **N+1 queries** — 1000 SQL queries for 1 page. Fix: eager loading or DataLoader pattern.
4. **Pool exhaustion** — All connections busy, new queries queue/timeout. Fix: increase pool, add connection timeout.
5. **Cold start slow** — Heavy initialization on startup. Fix: lazy-load non-critical modules.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (255.1-255.7)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Performance Specialist — Performance | EPS v3.2*

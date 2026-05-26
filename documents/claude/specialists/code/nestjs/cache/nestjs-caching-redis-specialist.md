# NestJS Caching & Performance Specialist — Data
# NestJSキャッシュ＆パフォーマンススペシャリスト — データ
# Chuyen Gia Cache va Hieu Nang NestJS — Du Lieu

**Version**: 1.0.0
**Technology**: NestJS 10+ Caching (Redis)
**Aspect**: Caching & Performance
**Category**: data
**Purpose**: Knowledge provider for cache module configuration, Redis adapter, cache interceptor, invalidation strategies, and performance optimization in NestJS clean architecture

---

## Metadata

```json
{
  "id": "nestjs-caching-performance-specialist",
  "technology": "NestJS 10+ Caching (Redis)",
  "aspect": "Caching & Performance",
  "category": "data",
  "subcategory": "nestjs",
  "lines": 230,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: Performance patterns — caching strategies, lazy loading, response optimization",
    "E4: Optimization — connection pooling, memory management, async hooks",
    "E5: p2plend Redis — real-world Redis caching patterns in microservice architecture"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 212.1–212.8 |
| **Directory Pattern** | `src/infrastructure/cache/` |
| **Naming Convention** | `{module}-cache.adapter.ts`, `cache.config.ts`, `redis.provider.ts` |
| **Imports From** | Infrastructure only (Redis client, CacheModule) |
| **Imported By** | Application (use cases use cache port interfaces), Presentation (cache interceptor on controllers) |
| **Cannot Import** | Domain (cache is infrastructure concern), Presentation (no controller references) |
| **Dependencies** | @nestjs/cache-manager, cache-manager, ioredis |
| **When To Use** | Response caching, session storage, rate limiting with Redis |
| **Source Skeleton** | src/infrastructure/cache/cache.module.ts, src/infrastructure/cache/{concern}.cache.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS caching with Redis — cache-manager, TTL, invalidation, cache-aside pattern |
| **Activation Trigger** | files: **/cache/**; keywords: cacheManager, cacheInterceptor, redis, ttl |

---

## Role

You are a **NestJS Caching & Performance Specialist**. Your responsibility is to provide caching and performance optimization best practices for NestJS microservice projects following clean architecture. You supply patterns for CacheModule configuration, Redis adapter setup, cache interceptor usage, TTL/key management, manual cache operations, event-driven invalidation, cache-aside pattern, and general performance optimizations including lazy loading and compression.

**Used by**: Any code agent working with caching or performance tuning in NestJS
**Not used by**: Stateless microservices with no caching requirements, non-NestJS stacks

---

## Patterns

### Pattern 212.1–212.4: Cache Module & Interceptor (HIGH)

```
212.1 CacheModule: CacheModule.registerAsync with Redis store configuration.
      Register cache module at app level with Redis store for distributed caching across instances.
```

```typescript
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT'),
        ttl: 300, // 5 minutes default
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

```
212.2 @CacheInterceptor: @UseInterceptors(CacheInterceptor) for automatic GET caching.
      Apply at controller or method level — automatically caches GET responses by URL.
```

```typescript
@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductController {
  @Get()
  findAll(): Promise<Product[]> {
    return this.productService.findAll(); // cached automatically
  }

  @Post()
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productService.create(dto); // POST not cached
  }
}
```

```
212.3 @CacheTTL / @CacheKey: Control TTL and custom cache keys per endpoint.
      Override default TTL and auto-generated key for fine-grained cache control.
```

```typescript
@Get(':id')
@CacheKey('product-detail')
@CacheTTL(600) // 10 minutes
async findOne(@Param('id') id: string): Promise<Product> {
  return this.productService.findById(id);
}
```

```
212.4 Manual cache: Inject CACHE_MANAGER, cache.get/set/del for fine-grained control.
      Use manual cache for complex invalidation logic or non-HTTP contexts (services, workers).
```

```typescript
@Injectable()
export class ProductCacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async getOrLoad(id: string): Promise<Product> {
    const cached = await this.cache.get<Product>(`product:${id}`);
    if (cached) return cached;
    const product = await this.productRepo.findById(id);
    await this.cache.set(`product:${id}`, product, 600);
    return product;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(`product:${id}`);
  }
}
```

### Pattern 212.5–212.6: Redis & Invalidation (MEDIUM-HIGH)

```
212.5 Redis adapter: ioredis configuration with connection pooling.
      Use ioredis for production — supports cluster mode, sentinel, and connection pooling.
```

```typescript
import Redis from 'ioredis';

export const RedisProvider = {
  provide: 'REDIS',
  useFactory: (config: ConfigService) => new Redis({
    host: config.get('REDIS_HOST'),
    port: config.get('REDIS_PORT'),
    password: config.get('REDIS_PASSWORD'),
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  }),
  inject: [ConfigService],
};
```

```
212.6 Cache invalidation: Event-driven invalidation on data mutations.
      Emit domain events on write operations — cache listeners invalidate affected keys.
```

```typescript
@Injectable()
export class ProductService {
  constructor(
    private productRepo: IProductRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.update(id, dto);
    this.eventEmitter.emit('product.updated', { id });
    return product;
  }
}

@Injectable()
export class ProductCacheListener {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  @OnEvent('product.updated')
  async handleProductUpdate(payload: { id: string }): Promise<void> {
    await this.cache.del(`product:${payload.id}`);
  }
}
```

### Pattern 212.7–212.8: Advanced Patterns (MEDIUM)

```
212.7 Cache-aside pattern: Check cache -> miss -> load from DB -> store in cache.
      Standard read-through pattern — application manages cache population explicitly.
```

```typescript
@Injectable()
export class UserCacheAdapter implements IUserCachePort {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private userRepo: IUserRepository,
  ) {}

  async findById(id: string): Promise<User> {
    const key = `user:${id}`;
    let user = await this.cache.get<User>(key);
    if (!user) {
      user = await this.userRepo.findById(id);
      if (user) await this.cache.set(key, user, 300);
    }
    return user;
  }
}
```

```
212.8 Performance: Lazy module loading, async hooks optimization, compression.
      Combine caching with lazy loading for rarely-used modules and response compression.
```

```typescript
// Lazy load heavy report module
@Injectable()
export class ReportTrigger {
  constructor(private lazyLoader: LazyModuleLoader) {}
  async generate() {
    const { ReportModule } = await import('./report.module');
    const ref = await this.lazyLoader.load(() => ReportModule);
    return ref.get(ReportService).build();
  }
}

// Enable compression middleware
const app = await NestFactory.create(AppModule);
app.use(compression());
```

---

## Best Practices

### Cache Design
- Cache at the service layer, not the controller — keeps caching logic close to business rules and testable in isolation
- Use consistent key naming conventions (e.g., `entity:id:field`) across all services to simplify debugging and invalidation
- Prefer `CacheInterceptor` for read-heavy endpoints; use programmatic `cacheManager.get/set` for complex invalidation flows
- Always define a maximum cache size policy (LRU eviction) to prevent unbounded memory growth

### TTL Strategy
- Set explicit TTL on every cache entry — never rely on infinite TTL defaults
- Use shorter TTLs (30-60s) for frequently changing data, longer TTLs (5-30min) for reference/static data
- Implement TTL jitter (random offset +-10%) to prevent synchronized expiration across keys

### Invalidation
- Prefer event-driven invalidation (publish on write, invalidate on event) over time-based expiration for consistency-critical data
- Use cache tags or key prefixes to enable bulk invalidation (e.g., invalidate all keys starting with `user:123:`)
- Always invalidate in the same transaction boundary as the write to prevent stale reads

### Redis Operations
- Use Redis pipelines for batch operations to reduce round-trip latency
- Configure `maxmemory-policy` (recommend `allkeys-lru`) to handle memory pressure gracefully
- Monitor Redis slow log and memory usage with periodic `INFO` commands or external monitoring

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Cache everything blindly | Memory bloat, evicts important keys, caches rarely accessed data | Profile access patterns; cache only hot paths with measurable read frequency |
| No TTL on cache entries | Stale data served indefinitely, memory never reclaimed | Set explicit TTL on every `set()` call; enforce via wrapper utility |
| Cache logic in controller | Violates separation of concerns, duplicated across endpoints | Move caching to service layer or use `CacheInterceptor` decorator |
| Manual JSON serialization | Inconsistent formats, broken deserialization, type safety lost | Use `class-transformer` with `CacheModule` serializer option or ioredis built-in serialization |
| Caching sensitive data (passwords, tokens) | Security breach if Redis is compromised or logs are exposed | Exclude sensitive fields before caching; audit cache contents periodically |
| Single Redis instance without replication | Single point of failure; data loss on crash | Use Redis Sentinel or Redis Cluster for HA in production |

## Testing Patterns

### Test Cache Hit and Miss
```typescript
describe('CacheService', () => {
  it('should return cached value on hit', async () => {
    await cacheManager.set('user:1', { id: 1, name: 'Test' }, 60);
    const result = await service.findUser(1);
    expect(result).toEqual({ id: 1, name: 'Test' });
    expect(dbService.findById).not.toHaveBeenCalled();
  });

  it('should query DB on cache miss', async () => {
    dbService.findById.mockResolvedValue({ id: 1, name: 'Test' });
    const result = await service.findUser(1);
    expect(dbService.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1, name: 'Test' });
  });
});
```

### Test TTL Expiry
```typescript
it('should return fresh data after TTL expires', async () => {
  await cacheManager.set('product:1', { price: 100 }, 1); // 1 second TTL
  await new Promise(resolve => setTimeout(resolve, 1100));
  dbService.findById.mockResolvedValue({ price: 200 });
  const result = await service.findProduct(1);
  expect(result.price).toBe(200);
});
```

### Test Cache Invalidation
```typescript
it('should invalidate cache on update', async () => {
  await cacheManager.set('user:1', { id: 1, name: 'Old' });
  await service.updateUser(1, { name: 'New' });
  const cached = await cacheManager.get('user:1');
  expect(cached).toBeUndefined();
});
```

---

## Abnormal Case Patterns (8 patterns)

1. **Cache stampede** — Multiple requests hit expired cache simultaneously, all query DB. Fix: Use mutex/lock (e.g., `redlock`) so only one request populates cache while others wait.

2. **Stale cache after write** — Data updated in DB but cache still serves old value. Fix: Invalidate cache in the same transaction or use event-driven invalidation on every write path.

3. **Redis connection exhaustion** — Too many connections without pooling. Fix: Configure `maxRetriesPerRequest` and use connection pooling via ioredis, monitor with Redis `INFO clients`.

4. **CacheInterceptor caching error responses** — 500 errors cached and served to subsequent requests. Fix: Implement custom interceptor that only caches successful (2xx) responses.

5. **Redis memory full (OOM)** — Redis rejects writes with `OOM command not allowed` when `maxmemory` reached. Fix: Configure `maxmemory-policy` to `allkeys-lru`, set appropriate `maxmemory` limit, add memory usage alerting at 80% threshold.

6. **Cache key collision** — Different entities map to the same cache key due to weak naming (e.g., just using numeric ID without entity prefix). Fix: Use structured key format `{entity}:{id}:{version}` and validate key uniqueness in code review.

7. **Serialization mismatch** — Object cached with one serializer (e.g., JSON) but deserialized with different class expectations, losing type information or methods. Fix: Use consistent serializer configuration across all cache operations; validate deserialized shape with `class-transformer` `plainToInstance`.

8. **Redis pub/sub message lost during subscriber restart** — Messages published while subscriber is disconnected are never delivered (Redis pub/sub has no persistence). Fix: Use Redis Streams instead of pub/sub for durable messaging, or implement outbox pattern with polling for critical invalidation events.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E4, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (212.1-212.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Caching & Performance Specialist — Data | EPS v3.2*

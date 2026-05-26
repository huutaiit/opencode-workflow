# Java Performance Specialist
# Javaパフォーマンススペシャリスト
# Chuyên Gia Hiệu Suất Java

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (WebFlux + R2DBC)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Cross-cutting |
| **Package** | All layers |
| **Maven Module** | all modules |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 25.1–25.4 |
| **Source Paths** | N/A — advisory patterns |
| **File Count** | N/A |
| **Naming Convention** | N/A |
| **Base Class** | N/A |
| **Imports From** | N/A (advisory) |
| **Cannot Import** | N/A (advisory) |
| **Dependencies** | None (JVM tuning + Spring optimization) |
| **When To Use** | JVM performance tuning, connection pooling, reactive backpressure |
| **Source Skeleton** | N/A (performance patterns applied across codebase) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce performance best practices — JVM tuning, connection pool sizing, N+1 prevention, caching strategy |
| **Activation Trigger** | files: **/*.java; keywords: performance, latency, n+1, cacheOptimization, connectionPool, jvmTuning |

---

## ROLE

You are a **Java Performance Specialist**.

**Your ONLY responsibility** | あなたの唯一の責任 | Trách nhiệm duy nhất của bạn: Provide guidance on JVM tuning, memory optimization, database performance, caching strategies, and profiling for Spring Boot applications. | JVMチューニング、メモリ最適化、データベースパフォーマンス、キャッシング戦略、Spring Bootアプリケーションのプロファイリングに関するガイダンスを提供します | Cung cấp hướng dẫn về JVM tuning, memory optimization, database performance, caching strategies và profiling cho ứng dụng Spring Boot.

**Used by**: Agent-03 (Context Engineering) during /plan command execution

**Not used by**: /validate command (that uses `.claude/agents/backend-specialist.md`)

---

## SCOPE

### What You Handle

- JVM tuning (GC selection, heap sizing, GC logging)
- Memory leak detection (heap dumps, MAT analysis)
- Profiling tools (JProfiler, VisualVM, Async Profiler)
- Database optimization (N+1 queries, R2DBC connection pooling, query plans)
- Caching strategies (Redis, Caffeine, reactive cache-aside)
- Event loop configuration (Netty), R2DBC connection pool
- Performance monitoring (Micrometer, Prometheus)

### ❌ What You DON'T Handle

- Frontend performance (Next.js/React) → Delegate to `nextjs-perf-specialist`
- Security hardening → Delegate to `java-security-specialist`
- Testing strategies → Delegate to `java-testing-specialist`
- Database schema design → Delegate to `postgres-schema-specialist`

---

## APPROVED PATTERNS

### Pattern 25.1: Cache-Aside + Connection Pooling

#### Reactive
```java
@Service
@RequiredArgsConstructor
public class UserService {

    // Cache-aside with ReactiveRedisTemplate (replaces @Cacheable for reactive)
    public Mono<CmnMCustomer> findByIdCached(Long id) {
        String key = "customer:" + id;
        return reactiveRedisTemplate.opsForValue().get(key)
            .switchIfEmpty(
                repository.findById(id)
                    .flatMap(entity -> reactiveRedisTemplate.opsForValue()
                        .set(key, entity, Duration.ofMinutes(30))
                        .thenReturn(entity))
            );
    }

    // Offload blocking I/O to bounded elastic scheduler
    public Mono<byte[]> generateReport(Long userId) {
        return Mono.fromCallable(() -> blockingReportService.generate(userId))
            .subscribeOn(Schedulers.boundedElastic());
    }
}

// R2DBC Connection Pool (replaces HikariCP)
@Configuration
public class DatabaseConfig {
    @Bean
    ConnectionPool connectionPool(ConnectionFactory connectionFactory) {
        return new ConnectionPool(ConnectionPoolConfiguration.builder(connectionFactory)
            .maxSize(20).initialSize(5)
            .maxIdleTime(Duration.ofMinutes(30))
            .maxCreateConnectionTime(Duration.ofSeconds(5)).build());
    }
}
```

#### Clean-Modulith / Standard
```java
@Service
@RequiredArgsConstructor
public class UserService {

    private final RedisTemplate<String, Object> redisTemplate;

    // Cache-aside with RedisTemplate (or use @Cacheable)
    @SuppressWarnings("unchecked")
    public CmnMCustomer findByIdCached(Long id) {
        String key = "customer:" + id;
        var cached = (CmnMCustomer) redisTemplate.opsForValue().get(key);
        if (cached != null) return cached;
        var entity = repository.findById(id).orElseThrow();
        redisTemplate.opsForValue().set(key, entity, Duration.ofMinutes(30));
        return entity;
    }

    // Blocking I/O runs naturally on virtual threads — no scheduler needed
    public byte[] generateReport(Long userId) {
        return blockingReportService.generate(userId);
    }
}

// HikariCP (auto-configured by Spring Boot)
// Tune via application.yml:
// spring.datasource.hikari.maximum-pool-size: 20
// spring.datasource.hikari.minimum-idle: 5
```

### ANTI-PATTERNS to AVOID

```java
// ❌ BAD: N+1 query problem
public List<UserDTO> getUsersWithOrders() {
    List<User> users = userRepository.findAll();
    return users.stream()
            .map(user -> {
                // This triggers 1 query per user!
                List<Order> orders = orderRepository.findByUserId(user.getId());
                return new UserDTO(user, orders);
            })
            .toList();
}

// ❌ BAD: @Cacheable with Mono/Flux (does not work correctly)
@Cacheable("allCustomers")
public Flux<CmnMCustomer> getAllCustomers() {
    return repository.findAll();  // Caches the Publisher, NOT the data!
}

// ❌ BAD: Blocking I/O on Netty event loop
@GetMapping("/users/{id}/report")
public Mono<Report> generateReport(@PathVariable Long id) {
    Thread.sleep(5000);  // Blocks Netty event loop thread!
    return ResponseEntity.ok(report);
}
```

---

## KEYWORDS

- performance, optimization, slow, latency, memory leak, heap
- GC, garbage collection, profiling, N+1, cache, connection pool
- JProfiler, VisualVM, R2DBC pool, Redis, Caffeine, Netty, event loop

---

### Pattern 25.2: JVM Tuning (G1GC for Spring Boot)
```bash
# ✅ Recommended JVM flags for Spring Boot production
java -Xms2g -Xmx2g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+PrintGCDetails \
  -XX:+PrintGCDateStamps \
  -Xloggc:/var/log/app-gc.log \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/var/log/app-heap-dump.hprof \
  -jar app.jar
```

### Pattern 25.3: N+1 Query Prevention

#### Reactive (R2DBC)
```java
// R2DBC does not support @EntityGraph — use Mono.zip or native JOIN
public Mono<UserWithOrders> findUserWithOrders(Long userId) {
    return Mono.zip(
        userRepository.findById(userId),
        orderRepository.findByUserId(userId).collectList()
    ).map(tuple -> new UserWithOrders(tuple.getT1(), tuple.getT2()));
}
```

#### Clean-Modulith (Spring Data JDBC + JdbcClient)
```java
// Spring Data JDBC loads aggregate children automatically
// For cross-aggregate, use JdbcClient JOIN:
public UserWithOrders findUserWithOrders(Long userId) {
    var user = userRepository.findById(userId).orElseThrow();
    var orders = orderRepository.findByUserId(userId);
    return new UserWithOrders(user, orders);
}

// Or use @Query with JOIN for single query:
@Query("SELECT u.*, o.order_id, o.total_amount FROM users u " +
       "LEFT JOIN orders o ON u.user_id = o.user_id WHERE u.user_id IN (:ids)")
List<UserOrderProjection> findUsersWithOrders(List<Long> ids);
```

### Pattern 25.4: Redis Caching

#### Reactive
```java
// @Cacheable does NOT work with Mono/Flux — use ReactiveRedisTemplate
@Service
@RequiredArgsConstructor
public class CachedCustomerService {
    private final ReactiveRedisTemplate<String, CmnMCustomer> redisTemplate;
    private final CmnMCustomerRepository repository;

    public Mono<CmnMCustomer> findByIdCached(Long id) {
        String key = "customer:" + id;
        return redisTemplate.opsForValue().get(key)
            .switchIfEmpty(
                repository.findById(id)
                    .flatMap(entity -> redisTemplate.opsForValue()
                        .set(key, entity, Duration.ofMinutes(10))
                        .thenReturn(entity))
            );
    }
}
```

#### Clean-Modulith / Standard
```java
// @Cacheable works with blocking return types
@Service
@RequiredArgsConstructor
public class CachedCustomerService {
    private final CmnMCustomerRepository repository;

    @Cacheable(value = "customers", key = "#id")
    public CmnMCustomer findByIdCached(Long id) {
        return repository.findById(id).orElseThrow();
    }

    @CacheEvict(value = "customers", key = "#id")
    public void evictCache(Long id) { /* Spring handles eviction */ }
}
```

---

### Pattern 25.5: JMH Microbenchmarking (Variant: ALL)

```java
// pom.xml: add jmh-core + jmh-generator-annprocess
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@State(Scope.Benchmark)
@Warmup(iterations = 3, time = 1)
@Measurement(iterations = 5, time = 1)
@Fork(2)
public class SerializationBenchmark {

    private ObjectMapper objectMapper;
    private OrderDTO sampleOrder;

    @Setup
    public void setup() {
        objectMapper = new ObjectMapper();
        sampleOrder = new OrderDTO(1L, "ORD-001", List.of(
            new OrderItemDTO(1L, "Widget", 10, BigDecimal.valueOf(29.99))));
    }

    @Benchmark
    public String jackson() throws Exception {
        return objectMapper.writeValueAsString(sampleOrder);
    }

    @Benchmark
    public byte[] jacksonBytes() throws Exception {
        return objectMapper.writeValueAsBytes(sampleOrder);
    }

    public static void main(String[] args) throws Exception {
        org.openjdk.jmh.Main.main(args);
    }
}
```
- **NEVER** use `System.currentTimeMillis()` for microbenchmarks — JIT, GC, warm-up skew results
- Place JMH benchmarks in `src/test/java` with separate Maven profile
- Use `@Param` for parameterized benchmarks (e.g., different collection sizes)

### Pattern 25.6: SQL Query Analysis with EXPLAIN ANALYZE (Variant: ALL)

```sql
-- PostgreSQL: always use EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT c.id, c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE c.status = 'ACTIVE'
GROUP BY c.id, c.name
ORDER BY order_count DESC
LIMIT 20;

-- Key metrics to check:
-- Seq Scan → add index if row count > ~1000
-- Nested Loop → consider Hash Join for large datasets
-- Buffers: shared hit vs shared read — low hit ratio = increase shared_buffers
-- Rows (actual vs estimated) — large mismatch = run ANALYZE on table
```

```java
// Enable slow query logging in Spring Boot
// application.yml
spring:
  jpa:
    properties:
      hibernate:
        generate_statistics: true    # log query stats (dev only!)
        session.events.log.LOG_QUERIES_SLOWER_THAN_MS: 100

logging:
  level:
    org.hibernate.SQL: DEBUG                    # log SQL
    org.hibernate.stat: DEBUG                   # log statistics
    org.hibernate.orm.jdbc.bind: TRACE          # log bind parameters
```

### Pattern 25.7: Backpressure Strategies (Variant: ALL)

```java
// Reactive backpressure — control flow between publisher and subscriber
Flux<DataChunk> dataStream = dataService.streamLargeDataset();

// Strategy 1: Buffer with bounded capacity
dataStream
    .onBackpressureBuffer(1024,
        dropped -> log.warn("Dropped: {}", dropped.id()),
        BufferOverflowStrategy.DROP_OLDEST)
    .subscribe(this::process);

// Strategy 2: Drop — fast consumer, ok to lose some events
dataStream
    .onBackpressureDrop(dropped -> metrics.counter("backpressure.dropped").increment())
    .subscribe(this::process);

// Strategy 3: Latest — always process most recent
dataStream
    .onBackpressureLatest()
    .subscribe(this::process);

// Strategy 4: Rate-limit with limitRate
dataStream
    .limitRate(100)        // request 100 items at a time (prefetch)
    .delayElements(Duration.ofMillis(10))  // throttle processing
    .subscribe(this::process);

// Non-reactive: BlockingQueue as backpressure mechanism
BlockingQueue<Task> taskQueue = new ArrayBlockingQueue<>(1000);
// Producer blocks when queue full → natural backpressure
taskQueue.put(task);  // blocks if capacity reached
```

---

## Related Specialists

- `cache/cache-specialist.md` — Redis caching configuration
- `application/java-reactive-specialist.md` — Reactive pipeline optimization
- `data-access/r2dbc-connection-specialist.md` — R2DBC connection pool tuning
- `testing/java-testing-specialist.md` — Performance testing with StepVerifier

# Resilience & Fault Tolerance Specialist
# レジリエンス＆フォールトトレランス スペシャリスト
# Chuyên Gia Khả Năng Phục Hồi

**Role**: Circuit Breaker & Fault Tolerance Expert
**Technology Stack**: Resilience4j, Spring Cloud CircuitBreaker, Spring Cloud Consul
**Integration**: Inter-service communication (resilience patterns)
**Version**: Spring Boot 3.4.4, Resilience4j 2.x, Spring Cloud 2024.0.0

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.config` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 40.1–40.3 |
| **Source Paths** | `{sourceRoot}/infrastructure/config/` |
| **File Count** | ~3 resilience files |
| **Naming Convention** | `*Resilience*Configuration.java` |
| **Base Class** | N/A (Resilience4j annotations) |
| **Imports From** | Application (Services) |
| **Cannot Import** | `rest.*`, Domain directly |
| **Dependencies** | io.github.resilience4j:resilience4j-spring-boot3:2.x, org.springframework.cloud:spring-cloud-circuitbreaker-resilience4j |
| **When To Use** | Circuit breaker, retry, rate limiting for inter-service calls |
| **Source Skeleton** | `{sourceRoot}/infrastructure/resilience/{Service}CircuitBreakerConfig.java`, `application.yml` (resilience4j section) |
| **Specialist Type** | code |
| **Purpose** | Configure circuit breaker, retry, rate limiter, and bulkhead patterns with Resilience4j |
| **Activation Trigger** | files: **/resilience/**/*.java, **/config/**/*.java; keywords: circuitBreaker, retry, rateLimiter, resilience4j |

---

## Expertise Areas

1. **Circuit Breaker**: Resilience4j ReactiveCircuitBreaker with reactive Feign
2. **Retry**: Exponential backoff retry for transient failures
3. **Rate Limiter**: Per-service rate limiting
4. **Service Discovery**: Consul integration with load-balanced WebClient
5. **Graceful Shutdown**: Connection draining, in-flight request completion

---

## Pattern Index

- [Pattern 40.1: Reactive Circuit Breaker with Feign](#pattern-401-reactive-circuit-breaker-with-feign)
- [Pattern 40.2: Resilience4j Configuration](#pattern-402-resilience4j-configuration)
- [Pattern 40.3: Consul Service Discovery & Graceful Shutdown](#pattern-403-consul-service-discovery--graceful-shutdown)

---

## Pattern 40.1: Circuit Breaker with Service Calls

**Use Case**: Protect inter-service calls with circuit breaker and fallback.

#### Reactive
```java
// Wrap WebClient call with ReactiveCircuitBreaker
@Service
@RequiredArgsConstructor
public class CoreManagerClient {

    private final WebClient webClient;
    private final ReactiveCircuitBreakerFactory circuitBreakerFactory;

    public Mono<CustomerDto> getCustomer(String customerId, String tenantId) {
        ReactiveCircuitBreaker cb = circuitBreakerFactory.create("core-manager-customer");
        return cb.run(
            webClient.get()
                .uri("lb://core-manager/cmn/api/customers/" + customerId)
                .header("X-Tenant-Id", tenantId)
                .retrieve()
                .bodyToMono(CustomerDto.class),
            throwable -> {
                log.warn("Circuit open for getCustomer: customerId={}", customerId, throwable);
                return Mono.error(new ServiceUnavailableException("core-manager"));
            }
        );
    }
}
```

#### Clean-Modulith / Standard
```java
// Resilience4j annotation-based circuit breaker with RestClient
@Service
@RequiredArgsConstructor
public class CoreManagerClient {

    private final RestClient restClient;

    @CircuitBreaker(name = "core-manager-customer", fallbackMethod = "getCustomerFallback")
    @Retry(name = "core-manager")
    public CustomerDto getCustomer(String customerId, String tenantId) {
        return restClient.get()
            .uri("/cmn/api/customers/{id}", customerId)
            .header("X-Tenant-Id", tenantId)
            .retrieve()
            .body(CustomerDto.class);
    }

    private CustomerDto getCustomerFallback(String customerId, String tenantId, Throwable t) {
        log.warn("Circuit open for getCustomer: customerId={}", customerId, t);
        throw new ServiceUnavailableException("core-manager", t);
    }
}
```

---

## Pattern 40.2: Resilience4j Configuration

**Use Case**: Configure circuit breaker thresholds and retry behavior per service.

```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      core-manager:
        sliding-window-size: 10
        failure-rate-threshold: 50         # open circuit if >50% fail in window
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 5
        slow-call-duration-threshold: 3s
        slow-call-rate-threshold: 80
        register-health-indicator: true

      tenant-manager:
        sliding-window-size: 5
        failure-rate-threshold: 60
        wait-duration-in-open-state: 20s

  retry:
    instances:
      core-manager:
        max-attempts: 3
        wait-duration: 500ms
        retry-exceptions:
          - java.net.ConnectException
          - java.util.concurrent.TimeoutException
        ignore-exceptions:
          - com.starx4.common.exception.EntityNotFoundException
          - com.starx4.common.exception.ValidationException

  ratelimiter:
    instances:
      external-api:
        limit-for-period: 100
        limit-refresh-period: 1s
        timeout-duration: 500ms
```

#### Reactive
```java
// config/Resilience4jConfig.java
@Configuration
public class Resilience4jConfig {

    @Bean
    public ReactiveCircuitBreakerFactory reactiveCircuitBreakerFactory(
            CircuitBreakerRegistry registry) {
        return new ReactiveResilience4JCircuitBreakerFactory(registry);
    }
}
```

#### Clean-Modulith / Standard
```java
// No bean needed — Resilience4j auto-configuration with annotations:
// @CircuitBreaker, @Retry, @RateLimiter, @Bulkhead
// Just add spring-cloud-starter-circuitbreaker-resilience4j dependency
```

---

## Pattern 40.3: Consul Service Discovery & Graceful Shutdown

**Use Case**: Service registration with Consul; drain in-flight requests on shutdown.

```yaml
# application.yml
spring:
  cloud:
    consul:
      host: localhost
      port: 8500
      discovery:
        service-name: ${spring.application.name}
        instance-id: ${spring.application.name}:${server.port}:${random.uuid}
        health-check-interval: 10s
        health-check-timeout: 5s
        health-check-critical-timeout: 60s   # deregister if critical for >60s
        prefer-ip-address: true
        tags:
          - version=${app.version}
          - env=${spring.profiles.active}

server:
  shutdown: graceful   # Spring Boot graceful shutdown

spring.lifecycle.timeout-per-shutdown-phase: 30s  # wait up to 30s for in-flight requests
```

```java
// config/GracefulShutdownConfig.java
@Configuration
public class GracefulShutdownConfig {

    /**
     * Deregister from Consul before accepting shutdown signal,
     * giving load balancer time to route away.
     */
    @Bean
    public ApplicationListener<ContextClosedEvent> gracefulShutdownListener(
            ConsulServiceRegistry consulServiceRegistry,
            Registration registration) {
        return event -> {
            log.info("Deregistering from Consul: {}", registration.getInstanceId());
            consulServiceRegistry.deregister(registration);
            // Sleep briefly to allow load balancer to update
            try { Thread.sleep(5000); } catch (InterruptedException ignored) {}
        };
    }
}
```

**Load-Balanced WebClient**:
```java
// config/WebClientConfig.java
@Configuration
public class WebClientConfig {

    @Bean
    @LoadBalanced  // Consul-aware load balancing via lb:// scheme
    public WebClient.Builder loadBalancedWebClientBuilder() {
        return WebClient.builder()
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(5 * 1024 * 1024));
    }
}
```

---

## Pattern 40.4: Rate Limiter (Variant: ALL)

**Use Case**: Protect endpoints from excessive requests — API gateway, external integrations, or per-user throttling.

```java
// Annotation-based
@RateLimiter(name = "api-default", fallbackMethod = "rateLimitFallback")
@GetMapping("/api/products")
public List<ProductDTO> listProducts() {
    return productService.findAll();
}

public List<ProductDTO> rateLimitFallback(RequestNotPermitted ex) {
    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
        "Rate limit exceeded. Try again later.");
}
```

```yaml
# application.yml
resilience4j:
  ratelimiter:
    instances:
      api-default:
        limit-for-period: 50          # 50 requests per period
        limit-refresh-period: 1s      # period resets every 1s
        timeout-duration: 0s          # fail immediately (don't queue)
      file-upload:
        limit-for-period: 5           # 5 uploads per minute
        limit-refresh-period: 60s
        timeout-duration: 0s
```

---

## Pattern 40.5: Bulkhead — Isolation (Variant: ALL)

**Use Case**: Isolate slow/unreliable downstream calls so they don't exhaust the thread pool for other operations.

```java
// Semaphore bulkhead (default) — limits concurrent calls
@Bulkhead(name = "report-generation", fallbackMethod = "bulkheadFallback")
public ReportDTO generateReport(Long reportId) {
    return reportService.generate(reportId); // slow operation
}

public ReportDTO bulkheadFallback(Long reportId, BulkheadFullException ex) {
    throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
        "Report generation is at capacity. Please retry.");
}
```

```yaml
resilience4j:
  bulkhead:
    instances:
      report-generation:
        max-concurrent-calls: 5        # max 5 concurrent report jobs
        max-wait-duration: 500ms       # wait 500ms for a slot, then reject

  # Thread pool bulkhead — isolates on dedicated thread pool
  thread-pool-bulkhead:
    instances:
      external-api:
        max-thread-pool-size: 10
        core-thread-pool-size: 5
        queue-capacity: 20
        keep-alive-duration: 100ms
```

---

## Pattern 40.6: Timeout (Variant: ALL)

**Use Case**: Prevent slow downstream calls from blocking the caller indefinitely.

```java
@TimeLimiter(name = "payment-gateway", fallbackMethod = "timeoutFallback")
public CompletableFuture<PaymentResult> processPayment(PaymentRequest request) {
    return CompletableFuture.supplyAsync(() -> paymentGateway.charge(request));
}

public CompletableFuture<PaymentResult> timeoutFallback(PaymentRequest request, TimeoutException ex) {
    log.warn("Payment gateway timeout for amount={}", request.amount());
    return CompletableFuture.failedFuture(
        new ServiceUnavailableException("Payment gateway timed out"));
}
```

```yaml
resilience4j:
  timelimiter:
    instances:
      payment-gateway:
        timeout-duration: 3s           # fail after 3s
        cancel-running-future: true    # cancel the future on timeout
      report-service:
        timeout-duration: 30s          # longer timeout for batch operations
```

### Decoration Order (when combining)
```
Retry → CircuitBreaker → RateLimiter → TimeLimiter → Bulkhead → Function
```
- **Outer** decorators execute first
- Retry wraps circuit breaker: retries only if circuit is closed
- Rate limiter before bulkhead: reject fast before consuming a bulkhead slot

---

## Anti-Patterns

- NO configuring circuit breaker with identical thresholds for all services — tune per service criticality
- NO missing fallback implementation — open circuit without fallback returns 500 to clients
- NO deregistering from Consul before in-flight requests complete — causes 502 at load balancer
- NO using blocking WebClient in reactive pipeline — always use reactive `WebClient`, not `RestTemplate`

---

## Related Specialists

- `gateway/gateway-specialist.md` - Circuit breaker applied at gateway route level
- `messaging/kafka-specialist.md` - Kafka consumers have own retry strategy (error handler)
- `application/java-reactive-specialist.md` - Reactor operators used with circuit breaker
- `multitenancy/multitenancy-specialist.md` - Tenant headers forwarded in load-balanced WebClient calls

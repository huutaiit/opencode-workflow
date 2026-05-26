# Test Plan Specialist — Java Reactive-Specific Testing
# テストプランスペシャリスト — Java リアクティブ固有テスト
# Chuyen Gia Test — Reactive-Specific Test Java

**Version**: 1.0.0
**Technology**: StepVerifier + WebTestClient + VirtualTimeScheduler
**Aspect**: Reactive-Specific Testing
**Category**: backend
**Purpose**: Reactive-variant specific testing — StepVerifier advanced, virtual time, backpressure, error retry, Flux window/buffer, Netty context propagation

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | RX |
| **Specialist Type** | code |
| **Purpose** | Reactive-variant specific testing — StepVerifier advanced, virtual time, backpressure, error retry, Flux window/buffer, Netty context propagation |

---

## Patterns

### Pattern RX.1: StepVerifier Advanced

expectNextMatches(predicate), consumeNextWith(consumer), thenAwait(Duration), expectComplete vs expectError. Test cold vs hot Mono/Flux behavior.

---

### Pattern RX.2: Virtual Time Testing

StepVerifier.withVirtualTime(() -> service.delayedOp()).thenAwait(Duration.ofHours(1)).expectNext(result).verifyComplete(). Test timeout, retry delay, scheduled tasks without real waiting.

---

### Pattern RX.3: Backpressure Testing

StepVerifier.create(flux, 0).thenRequest(5).expectNextCount(5).thenRequest(5).expectNextCount(5). Verify producer respects subscriber demand. Test Flux.onBackpressureBuffer/Drop/Error.

---

### Pattern RX.4: Error Retry Testing

Service returns Mono.error on first 2 calls, succeeds on 3rd. StepVerifier verifies retryWhen(Retry.backoff(3, Duration.ofMillis(100))) eventually succeeds. Test retry exhaustion → propagate final error.

---

### Pattern RX.5: Context Propagation

Reactor Context for tenant/user/correlation ID propagation. StepVerifier.create(mono.contextWrite(ctx -> ctx.put("tenantId", "t1"))).assertNext(r -> verify tenantId was used).

---

### Pattern RX.6: Blocking Call Detection

BlockHound.install() in test setup. Any blocking call (Thread.sleep, InputStream.read, JDBC) on Netty event loop → throws BlockingOperationError. Must fail test.

---

## ❌ Negative Example

❌ .block() in test: hides subscription errors, loses backpressure context. ❌ Thread.sleep for timing: flaky, slow. ✅ StepVerifier + VirtualTime: deterministic, fast, catches real reactive bugs.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Reactive-Specific Testing | EPS v10.0*

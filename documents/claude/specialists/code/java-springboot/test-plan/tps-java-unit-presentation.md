# Test Plan Specialist — Java Unit Testing: Presentation Layer
# テストプランスペシャリスト — Java プレゼンテーション層ユニットテスト
# Chuyen Gia Test — Unit Test Presentation Layer Java

**Version**: 1.0.0
**Technology**: JUnit 5 + WebTestClient (Reactive) / MockMvc (Standard)
**Aspect**: Unit Testing — Presentation Layer
**Category**: backend
**Purpose**: Presentation layer testing — REST controller routing, request/response format, security config, exception handler mapping, content negotiation. Both reactive (WebTestClient) and standard (MockMvc) variants.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (test) |
| **Variant** | ALL (reactive: WebTestClient, standard: MockMvc) |
| **Pattern Numbers** | TPS-JAVA-UNIT-PRES |
| **Directory Pattern** | `src/test/java/**/rest/**/*ResourceTest.java` |
| **Naming Convention** | `{Entity}ResourceTest.java` |
| **Imports From** | Application (mocked services), Presentation (SUT) |
| **Cannot Import** | `domain.*` directly, `infrastructure.*` (controllers inject services, not repos) |
| **Dependencies** | junit-jupiter, spring-webflux-test / spring-test, mockito |
| **When To Use** | DD/Plan generates REST controllers/resources |
| **Specialist Type** | code |
| **Purpose** | Presentation layer testing — routing, status codes, request validation, error response format |
| **Activation Trigger** | files: **/rest/**/*ResourceTest.java; keywords: controllerTest, webTestClient, mockMvc, resourceTest |

---

## Patterns

### Pattern UT-P.1: Controller Testing — Reactive (WebTestClient)

```java
@WebFluxTest(CmnMCustomerResource.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class CmnMCustomerResourceTest {

    @Autowired private WebTestClient client;
    @MockBean private CmnMCustomerServiceImpl customerService;

    @Test
    void shouldReturn201OnValidCreate() {
        when(customerService.create(any())).thenReturn(Mono.just(expectedDto));

        client.post().uri("/api/customers")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue("""
                {"fullName": "John Doe", "email": "john@test.com"}
            """)
            .exchange()
            .expectStatus().isCreated()
            .expectBody()
            .jsonPath("$.id").isNotEmpty()
            .jsonPath("$.fullName").isEqualTo("John Doe");
    }

    @Test
    void shouldReturn400OnInvalidBody() {
        client.post().uri("/api/customers")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue("{\"fullName\": \"\"}") // blank name
            .exchange()
            .expectStatus().isBadRequest()
            .expectBody()
            .jsonPath("$.errors").isArray()
            .jsonPath("$.errors[0].field").isEqualTo("fullName");
    }

    @Test
    void shouldReturn404WhenNotFound() {
        when(customerService.findById(999L)).thenReturn(Mono.error(new CustomerNotFoundException(999L)));

        client.get().uri("/api/customers/999")
            .exchange()
            .expectStatus().isNotFound()
            .expectBody()
            .jsonPath("$.message").value(containsString("999"));
    }

    @Test
    void shouldReturn401WithoutAuthToken() {
        client.get().uri("/api/customers")
            .exchange()
            .expectStatus().isUnauthorized();
    }
}
```

### Pattern UT-P.2: Controller Testing — Standard (MockMvc)

```java
@WebMvcTest(CmnMCustomerResource.class)
@Import({SecurityConfig.class})
class CmnMCustomerResourceTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private CmnMCustomerServiceImpl customerService;

    @Test
    void shouldReturn200WithCustomerList() throws Exception {
        when(customerService.findAll(any())).thenReturn(List.of(customerDto));

        mockMvc.perform(get("/api/customers")
                .header("Authorization", "Bearer " + validJwt))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].fullName").value("John"));
    }
}
```

### Pattern UT-P.3: Exception Handler Testing

```java
@WebFluxTest
@Import(GlobalExceptionHandler.class)
class GlobalExceptionHandlerTest {

    @Autowired private WebTestClient client;

    @Test
    void shouldMapDomainExceptionTo422() {
        // Controller that throws InsufficientFundsException
        when(service.withdraw(any())).thenReturn(Mono.error(new InsufficientFundsException("acc-1")));

        client.post().uri("/api/accounts/acc-1/withdraw")
            .bodyValue("{\"amount\": 99999}")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.errorCode").isEqualTo("INSUFFICIENT_FUNDS")
            .jsonPath("$.timestamp").isNotEmpty();
    }

    @Test
    void shouldMapUnexpectedExceptionTo500WithoutStackTrace() {
        when(service.findById(any())).thenReturn(Mono.error(new NullPointerException("oops")));

        client.get().uri("/api/customers/1")
            .exchange()
            .expectStatus().is5xxServerError()
            .expectBody()
            .jsonPath("$.message").isEqualTo("Internal server error") // no stack trace
            .jsonPath("$.stackTrace").doesNotExist(); // NEVER expose
    }
}
```

### Pattern UT-P.4: Security Configuration Testing

```java
@WebFluxTest
@Import(SecurityConfig.class)
class SecurityConfigTest {

    @Autowired private WebTestClient client;

    @ParameterizedTest
    @CsvSource({
        "GET, /api/customers, 401",     // protected
        "GET, /actuator/health, 200",   // public
        "GET, /swagger-ui.html, 200",   // public
        "POST, /api/customers, 401",    // protected
    })
    void shouldEnforceSecurityRules(String method, String path, int expectedStatus) {
        client.method(HttpMethod.valueOf(method)).uri(path)
            .exchange()
            .expectStatus().isEqualTo(expectedStatus);
    }
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | `@SpringBootTest` for controller | Loads all beans — 20s+ startup | `@WebFluxTest` / `@WebMvcTest` — 2-3s |
| 2 | Test business logic in controller test | Controller is thin — delegate to service | Mock service, verify delegation |
| 3 | Skip error response format testing | Clients get unexpected error structure | Test every exception → HTTP status + body |
| 4 | No security endpoint testing | Auth bypass undetected | Test public vs protected endpoints |

---

## ❌ Negative Example: Why Test Error Format

```java
// ❌ Without GlobalExceptionHandler test:
// Developer adds new exception type → returns raw 500 + stack trace in production
// Client receives: {"timestamp":...,"status":500,"error":"Internal Server Error","trace":"java.lang.NullPointerException\n\tat com.myapp..."}
// Stack trace = security vulnerability (exposes internal code paths)

// ✅ With exception handler test:
// Every new domain exception MUST have a mapping test
// Test verifies: correct HTTP status + errorCode + NO stack trace
```

---

## Coverage Target

| Component | Target |
|-----------|--------|
| REST endpoints (all HTTP methods) | 100% of routes |
| Validation (400 responses) | Every DTO field |
| Error responses | Every exception type → HTTP status |
| Security (401/403) | Every protected + public endpoint |

---

*Test Plan Specialist — Java Unit Testing: Presentation Layer | EPS v10.0*

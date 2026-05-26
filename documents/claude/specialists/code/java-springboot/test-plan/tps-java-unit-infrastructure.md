# Test Plan Specialist — Java Unit Testing: Infrastructure Layer
# テストプランスペシャリスト — Java インフラ層ユニットテスト
# Chuyen Gia Test — Unit Test Infrastructure Layer Java

**Version**: 1.0.0
**Technology**: JUnit 5 + @DataR2dbcTest/@DataJpaTest + Testcontainers + WireMock
**Aspect**: Unit Testing — Infrastructure Layer
**Category**: backend
**Purpose**: Infrastructure layer testing — R2DBC/JPA repository with real DB, VM mapper, config, external API client mock, Kafka producer testing. Both reactive and standard variants.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (test) |
| **Variant** | ALL (reactive: @DataR2dbcTest + StepVerifier, standard: @DataJpaTest) |
| **Pattern Numbers** | TPS-JAVA-UNIT-INFRA |
| **Directory Pattern** | `src/test/java/**/infrastructure/**/*Test.java`, `src/test/java/**/application/repository/**/*Test.java` |
| **Naming Convention** | `{Entity}RepositoryTest.java`, `{Provider}ClientTest.java`, `{Entity}VMMapperTest.java` |
| **Imports From** | Domain (entities), Infrastructure (SUT) |
| **Cannot Import** | `rest.*` (infrastructure tests don't know controllers) |
| **Dependencies** | junit-jupiter, @testcontainers/postgresql, r2dbc-postgresql, wiremock |
| **When To Use** | DD/Plan generates repositories, external clients, VM mappers, config |
| **Specialist Type** | code |
| **Purpose** | Infrastructure layer testing with real DB via test containers |
| **Activation Trigger** | files: **/infrastructure/**/*Test.java, **/repository/**/*Test.java; keywords: repositoryTest, dataR2dbcTest, testcontainers, wireMock |

---

## Patterns

### Pattern UT-I.1: Repository Testing — Reactive (R2DBC + Testcontainers)

```java
@DataR2dbcTest
@Testcontainers
@Import(TestR2dbcConfig.class)
class CmnMCustomerRepositoryTest {

    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:17")
        .withDatabaseName("test_db");

    @Autowired private CmnMCustomerRepository repo;

    @Test
    void shouldSaveAndFindById() {
        var customer = CmnMCustomer.builder().fullName("John").email("john@test.com").build();

        StepVerifier.create(repo.save(customer).flatMap(saved -> repo.findById(saved.getId())))
            .assertNext(found -> {
                assertThat(found.getFullName()).isEqualTo("John");
                assertThat(found.getEmail()).isEqualTo("john@test.com");
            })
            .verifyComplete();
    }

    @Test
    void shouldReturnEmptyForNonExistentId() {
        StepVerifier.create(repo.findById(999999L))
            .verifyComplete(); // empty Mono, no error
    }

    @Test
    void shouldFindByCustomQuery() {
        // Seed test data
        var c1 = repo.save(CmnMCustomer.builder().fullName("Active User").status("A").build()).block();
        var c2 = repo.save(CmnMCustomer.builder().fullName("Inactive User").status("I").build()).block();

        StepVerifier.create(repo.findByStatus("A"))
            .assertNext(c -> assertThat(c.getStatus()).isEqualTo("A"))
            .verifyComplete();
    }

    // ❌ NEGATIVE EXAMPLE: Mock repository
    // when(repo.findById(1L)).thenReturn(Mono.just(mockEntity));
    // Passes but misses: SQL syntax errors, column mapping, constraint violations
    // Test container catches these — mock doesn't
}
```

### Pattern UT-I.2: Repository Testing — Standard (JPA + Testcontainers)

```java
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = Replace.NONE) // use real DB, not H2
class CmnMCustomerRepositoryTest {

    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:17");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", pg::getJdbcUrl);
        registry.add("spring.datasource.username", pg::getUsername);
        registry.add("spring.datasource.password", pg::getPassword);
    }

    @Autowired private CmnMCustomerRepository repo;
    @Autowired private TestEntityManager em;

    @Test
    void shouldPersistWithJpaCallbacks() {
        var customer = CmnMCustomer.builder().fullName("John").email("john@test.com").build();
        em.persistAndFlush(customer);
        em.clear();

        var found = repo.findById(customer.getId()).orElseThrow();
        assertThat(found.getCreatedDate()).isNotNull(); // @PrePersist callback
    }
}
```

### Pattern UT-I.3: External API Client Testing (WireMock)

```java
@WireMockTest(httpPort = 8089)
class PaymentGatewayClientTest {

    private final PaymentGatewayClient client = new PaymentGatewayClient(
        WebClient.builder().baseUrl("http://localhost:8089").build()
    );

    @Test
    void shouldReturnTransactionIdOnSuccess() {
        stubFor(post("/payments/charge")
            .willReturn(okJson("{\"transactionId\":\"tx-123\",\"status\":\"COMPLETED\"}")));

        StepVerifier.create(client.charge(new ChargeRequest(10000, "USD")))
            .assertNext(r -> assertThat(r.getTransactionId()).isEqualTo("tx-123"))
            .verifyComplete();
    }

    @Test
    void shouldThrowOnGateway5xx() {
        stubFor(post("/payments/charge").willReturn(serverError()));

        StepVerifier.create(client.charge(new ChargeRequest(10000, "USD")))
            .expectError(PaymentGatewayException.class)
            .verify();
    }

    @Test
    void shouldThrowOnTimeout() {
        stubFor(post("/payments/charge").willReturn(ok().withFixedDelay(6000))); // 6s delay

        StepVerifier.create(client.charge(new ChargeRequest(10000, "USD")))
            .expectError(TimeoutException.class)
            .verify(Duration.ofSeconds(10));
    }
}
```

### Pattern UT-I.4: VM Mapper Testing

```java
class CmnMCustomerVMMapperTest {

    private final CmnMCustomerVMMapper mapper = new CmnMCustomerVMMapperImpl();

    @Test
    void shouldMapEntityToVM() {
        var entity = CmnMCustomer.builder().id(1L).fullName("John").status("A").build();
        var vm = mapper.toVM(entity);
        assertThat(vm.getFullName()).isEqualTo("John");
        assertThat(vm.getStatusLabel()).isEqualTo("Active"); // display mapping
    }

    @Test
    void shouldMapCreateVMToEntity() {
        var vm = new CreateCmnMCustomerVM("Jane", "jane@test.com");
        var entity = mapper.toEntity(vm);
        assertThat(entity.getFullName()).isEqualTo("Jane");
        assertThat(entity.getId()).isNull(); // not set on create
    }
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | H2 in-memory DB for integration tests | SQL dialect differences → passes on H2, fails on Postgres | Testcontainers (real Postgres) |
| 2 | Mock repository in infrastructure test | Tests nothing about data access | @DataR2dbcTest / @DataJpaTest |
| 3 | No cleanup between tests | Data leaks → flaky tests | `@Sql(scripts = "cleanup.sql")` or `@Transactional` |
| 4 | Full `@SpringBootTest` for repository | Loads all beans — slow (20s+) | `@DataR2dbcTest` — slice test (~3s) |

---

## Coverage Target

| Component | Target |
|-----------|--------|
| Repository CRUD | 100% of interface methods |
| Custom queries | 80% |
| External API clients | 90% (success + 4xx + 5xx + timeout) |
| VM Mappers | 100% (both directions) |

---

*Test Plan Specialist — Java Unit Testing: Infrastructure Layer | EPS v10.0*

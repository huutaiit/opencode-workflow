# Test Plan Specialist — Java Unit Testing: Application Layer
# テストプランスペシャリスト — Java アプリケーション層ユニットテスト
# Chuyen Gia Test — Unit Test Application Layer Java

**Version**: 1.0.0
**Technology**: JUnit 5 + Mockito + StepVerifier (Reactive) / AssertJ (Standard)
**Aspect**: Unit Testing — Application Layer
**Category**: backend
**Purpose**: Application layer unit testing — Service/UseCase with mocked repositories, DTO mapping, event emission, transaction boundary testing. Supports both Reactive (StepVerifier) and Standard (blocking) variants.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application (test) |
| **Variant** | ALL (reactive patterns use StepVerifier, standard use plain assertions) |
| **Pattern Numbers** | TPS-JAVA-UNIT-APP |
| **Directory Pattern** | `src/test/java/**/application/**/*Test.java` |
| **Naming Convention** | `{Entity}ServiceImplTest.java`, `{Entity}MapperTest.java` |
| **Imports From** | Domain (entities — mocked repos), Application (SUT) |
| **Cannot Import** | `infrastructure.*`, `rest.*` (use mocked repositories) |
| **Dependencies** | junit-jupiter, mockito-core, reactor-test (reactive), assertj-core |
| **When To Use** | DD/Plan generates services, use cases, mappers, DTOs |
| **Specialist Type** | code |
| **Purpose** | Application layer testing — mock dependencies via Mockito, verify orchestration logic |
| **Activation Trigger** | files: **/application/**/*Test.java; keywords: serviceTest, mapperTest, mockBean, stepVerifier |

---

## Patterns

### Pattern UT-A.1: Service Testing — Reactive Variant (StepVerifier)

```java
@ExtendWith(MockitoExtension.class)
class CmnMCustomerServiceImplTest {

    @Mock private CmnMCustomerRepository customerRepo;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private CmnMCustomerServiceImpl service;

    @Test
    void shouldCreateCustomerAndPublishEvent() {
        var dto = new CreateCustomerDTO("John", "john@test.com");
        var entity = CmnMCustomer.builder().id(1L).fullName("John").email("john@test.com").build();

        when(customerRepo.save(any())).thenReturn(Mono.just(entity));

        StepVerifier.create(service.create(dto))
            .assertNext(result -> {
                assertThat(result.getId()).isEqualTo(1L);
                assertThat(result.getFullName()).isEqualTo("John");
            })
            .verifyComplete();

        verify(eventPublisher).publishEvent(any(CustomerCreatedEvent.class));
        verify(customerRepo).save(argThat(c -> c.getFullName().equals("John")));
    }

    @Test
    void shouldReturnErrorWhenCustomerNotFound() {
        when(customerRepo.findById(999L)).thenReturn(Mono.empty());

        StepVerifier.create(service.findById(999L))
            .expectError(CustomerNotFoundException.class)
            .verify();
    }

    @Test
    void shouldPropagateRepositoryError() {
        when(customerRepo.save(any())).thenReturn(Mono.error(new DataAccessException("DB down") {}));

        StepVerifier.create(service.create(validDto))
            .expectError(DataAccessException.class)
            .verify();

        verify(eventPublisher, never()).publishEvent(any()); // no event on failure
    }
}
```

### Pattern UT-A.2: Service Testing — Standard/Modulith Variant (Blocking)

```java
@ExtendWith(MockitoExtension.class)
class CmnMCustomerServiceImplTest {

    @Mock private CmnMCustomerRepository customerRepo;
    @InjectMocks private CmnMCustomerServiceImpl service;

    @Test
    void shouldCreateCustomer() {
        when(customerRepo.save(any())).thenReturn(expectedEntity);

        var result = service.create(validDto);

        assertThat(result.getId()).isNotNull();
        verify(customerRepo).save(argThat(c -> c.getEmail().equals("john@test.com")));
    }

    @Test
    void shouldThrowOnDuplicateEmail() {
        when(customerRepo.existsByEmail("dup@test.com")).thenReturn(true);

        assertThatThrownBy(() -> service.create(dtoWithDupEmail))
            .isInstanceOf(DuplicateEmailException.class);

        verify(customerRepo, never()).save(any());
    }
}
```

### Pattern UT-A.3: Mapper Testing (MapStruct)

```java
class CmnMCustomerMapperTest {

    private final CmnMCustomerMapper mapper = Mappers.getMapper(CmnMCustomerMapper.class);

    @Test
    void shouldMapEntityToDTO() {
        var entity = CmnMCustomer.builder().id(1L).fullName("John").email("john@test.com").status(CustomerStatus.ACTIVE).build();

        var dto = mapper.toDTO(entity);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getFullName()).isEqualTo("John");
        assertThat(dto.getStatusDisplay()).isEqualTo("Active"); // mapped enum display name
    }

    @Test
    void shouldMapDTOToEntity() {
        var dto = new CreateCustomerDTO("Jane", "jane@test.com");
        var entity = mapper.toEntity(dto);

        assertThat(entity.getFullName()).isEqualTo("Jane");
        assertThat(entity.getId()).isNull(); // not set on create
        assertThat(entity.getStatus()).isEqualTo(CustomerStatus.ACTIVE); // default
    }

    @Test
    void shouldHandleNullFieldsGracefully() {
        var entity = CmnMCustomer.builder().id(1L).fullName("John").build(); // email null

        var dto = mapper.toDTO(entity);
        assertThat(dto.getEmail()).isNull(); // not throw NPE
    }

    // ❌ NEGATIVE EXAMPLE: Mock mapper
    // when(mapper.toDTO(any())).thenReturn(mockDto);
    // This tests NOTHING — mapper accuracy is the whole point
    // ✅ Use real mapper: Mappers.getMapper(MyMapper.class)
}
```

### Pattern UT-A.4: DTO Validation Testing

```java
class CreateCustomerDTOTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void shouldPassWithValidData() {
        var dto = new CreateCustomerDTO("John Doe", "john@test.com");
        var violations = validator.validate(dto);
        assertThat(violations).isEmpty();
    }

    @Test
    void shouldFailOnBlankName() {
        var dto = new CreateCustomerDTO("", "john@test.com");
        var violations = validator.validate(dto);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("fullName"));
    }

    @Test
    void shouldFailOnInvalidEmail() {
        var dto = new CreateCustomerDTO("John", "not-an-email");
        var violations = validator.validate(dto);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t"})
    void shouldRejectBlankNames(String name) {
        var dto = new CreateCustomerDTO(name, "valid@test.com");
        assertThat(validator.validate(dto)).isNotEmpty();
    }
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | `@SpringBootTest` for service unit test | 5-10s startup per test class | `@ExtendWith(MockitoExtension.class)` — instant |
| 2 | `.block()` in reactive test assertions | Hides subscription errors, loses backpressure | StepVerifier (UT-A.1) |
| 3 | Mock the mapper in mapper test | Tests nothing — mapper accuracy IS the test | Use real mapper instance (UT-A.3) |
| 4 | Verify mock call count without behavior check | Fragile, tests implementation | Verify behavior: "event published", "entity saved with correct status" |
| 5 | No error path testing | Misses 50% of production failures | Every service method needs ≥1 error test |

---

## Coverage Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| Service methods | 90% | Every success + error + edge path |
| Mappers (all directions) | 100% | Data accuracy — one wrong field = production bug |
| DTOs (validation) | 90% | Valid + each invalid field + boundary |
| Event emission | 80% | Verify correct event + timing (before/after save) |

---

*Test Plan Specialist — Java Unit Testing: Application Layer | EPS v10.0*

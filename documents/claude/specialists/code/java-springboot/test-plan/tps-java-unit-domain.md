# Test Plan Specialist — Java Unit Testing: Domain Layer
# テストプランスペシャリスト — Java ドメイン層ユニットテスト
# Chuyen Gia Test — Unit Test Domain Layer Java

**Version**: 1.0.0
**Technology**: JUnit 5 + AssertJ
**Aspect**: Unit Testing — Domain Layer
**Category**: backend
**Purpose**: Domain layer unit testing — entity invariants, value objects, domain callbacks, enums, pure POJO testing (NO Spring context, NO Mockito)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain (test) |
| **Variant** | ALL (domain is same across reactive/standard/modulith) |
| **Pattern Numbers** | TPS-JAVA-UNIT-DOMAIN |
| **Directory Pattern** | `src/test/java/**/domain/**/*Test.java` |
| **Naming Convention** | `{Entity}Test.java`, `{ValueObject}Test.java` |
| **Imports From** | Domain only (entities, callbacks, enums — NO application/infrastructure) |
| **Cannot Import** | `application.*`, `infrastructure.*`, `rest.*`, Spring framework classes |
| **Dependencies** | junit-jupiter, assertj-core |
| **When To Use** | DD/Plan generates domain entities with `@Table`, callbacks, enums, value objects |
| **Specialist Type** | code |
| **Purpose** | Domain layer unit testing — pure POJO, no Spring context |
| **Activation Trigger** | files: **/domain/**/*Test.java; keywords: entityTest, domainTest, callbackTest, enumTest |

---

## Key Principle

Domain tests are **pure Java** — NO `@SpringBootTest`, NO `@ExtendWith(SpringExtension)`, NO `@MockBean`. Just `new Entity()` and AssertJ assertions. If your domain test needs Spring context, the entity is coupled to infrastructure.

---

## Patterns

### Pattern UT-D.1: Entity Invariant Testing

```java
// domain/cmn001000/CmnMCustomerTest.java
class CmnMCustomerTest {

    @Test
    void shouldCreateCustomerWithValidData() {
        var customer = CmnMCustomer.builder()
            .customerCode("CMN-001")
            .fullName("John Doe")
            .email("john@example.com")
            .status(CustomerStatus.ACTIVE)
            .build();

        assertThat(customer.getCustomerCode()).isEqualTo("CMN-001");
        assertThat(customer.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void shouldRejectBlankCustomerCode() {
        assertThatThrownBy(() -> CmnMCustomer.builder()
            .customerCode("")
            .fullName("John")
            .build())
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("customerCode");
    }

    // State transition testing
    @Test
    void shouldTransitionFromActiveToSuspended() {
        var customer = createActiveCustomer();
        customer.suspend("compliance review");
        assertThat(customer.getStatus()).isEqualTo(CustomerStatus.SUSPENDED);
        assertThat(customer.getSuspensionReason()).isEqualTo("compliance review");
    }

    @Test
    void shouldRejectSuspendOnAlreadySuspendedCustomer() {
        var customer = createSuspendedCustomer();
        assertThatThrownBy(() -> customer.suspend("duplicate"))
            .isInstanceOf(InvalidStateTransitionException.class);
    }
}
```

---

### Pattern UT-D.2: Entity Callback Testing

```java
// Reactive variant: @Table callbacks (R2DBC)
class CmnMCustomerCallbackTest {

    @Test
    void prePersistShouldSetCreatedDateAndAuditFields() {
        var customer = new CmnMCustomer();
        customer.setCreatedBy("system");
        customer.prePersist(); // manual call — no Spring context

        assertThat(customer.getCreatedDate()).isNotNull();
        assertThat(customer.getCreatedDate()).isCloseTo(LocalDateTime.now(), within(1, ChronoUnit.SECONDS));
        assertThat(customer.getUpdatedDate()).isNull(); // only set on update
    }

    @Test
    void preUpdateShouldSetUpdatedDateWithoutChangingCreatedDate() {
        var customer = createPersistedCustomer(); // has createdDate
        var originalCreated = customer.getCreatedDate();

        customer.preUpdate();

        assertThat(customer.getUpdatedDate()).isNotNull();
        assertThat(customer.getCreatedDate()).isEqualTo(originalCreated); // unchanged
    }
}
```

---

### Pattern UT-D.3: Enum Behavior Testing

```java
class CustomerStatusTest {

    @ParameterizedTest
    @EnumSource(CustomerStatus.class)
    void allStatusesShouldHaveDisplayName(CustomerStatus status) {
        assertThat(status.getDisplayName()).isNotBlank();
    }

    @Test
    void shouldMapFromDatabaseValue() {
        assertThat(CustomerStatus.fromCode("A")).isEqualTo(CustomerStatus.ACTIVE);
        assertThat(CustomerStatus.fromCode("S")).isEqualTo(CustomerStatus.SUSPENDED);
    }

    @Test
    void shouldThrowOnUnknownCode() {
        assertThatThrownBy(() -> CustomerStatus.fromCode("Z"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldDefineAllowedTransitions() {
        assertThat(CustomerStatus.ACTIVE.canTransitionTo(CustomerStatus.SUSPENDED)).isTrue();
        assertThat(CustomerStatus.SUSPENDED.canTransitionTo(CustomerStatus.ACTIVE)).isTrue();
        assertThat(CustomerStatus.CLOSED.canTransitionTo(CustomerStatus.ACTIVE)).isFalse();
    }
}
```

---

### Pattern UT-D.4: Value Object Testing (if applicable)

```java
// For projects using DDD value objects
class MoneyTest {

    @Test
    void shouldAddSameCurrency() {
        var a = Money.of(100.50, "USD");
        var b = Money.of(49.50, "USD");
        assertThat(a.add(b)).isEqualTo(Money.of(150.00, "USD"));
    }

    @Test
    void shouldRejectDifferentCurrencyAddition() {
        assertThatThrownBy(() -> Money.of(100, "USD").add(Money.of(50, "EUR")))
            .isInstanceOf(CurrencyMismatchException.class);
    }

    @Test
    void shouldHandleFloatingPointPrecision() {
        var a = Money.of(0.1, "USD");
        var b = Money.of(0.2, "USD");
        assertThat(a.add(b).getAmount()).isEqualByComparingTo(new BigDecimal("0.3"));
    }
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | `@SpringBootTest` for domain entity | Loads entire Spring context for POJO test | Plain JUnit — `new Entity()` |
| 2 | `@MockBean` on domain entity | Entity is SUT, not dependency | Only mock external collaborators |
| 3 | Test private methods via reflection | Tests implementation, not behavior | Test via public API |
| 4 | Import `infrastructure.*` in domain test | Proves domain couples to infra | Domain tests import `domain.*` ONLY |

---

## ❌ Negative Example: Why No Spring Context

```java
// ❌ BAD: Full Spring context for entity test — takes 5-10 seconds
@SpringBootTest
class CmnMCustomerTest {
    @Test void test() { /* same test, 100x slower */ }
}

// ✅ GOOD: Plain JUnit — runs in <100ms
class CmnMCustomerTest {
    @Test void test() { var c = new CmnMCustomer(); /* instant */ }
}

// Impact: 200 domain tests × 5s overhead = 16 minutes wasted per CI run
// Plain JUnit: 200 tests × 10ms = 2 seconds total
```

---

## Coverage Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| Entity state transitions | 100% | Every valid + invalid transition |
| Callbacks (prePersist/preUpdate) | 100% | Audit field accuracy |
| Enum mappings | 100% | fromCode() + all values |
| Value Objects | 100% | Equality, arithmetic, validation |
| **Overall domain** | **≥95%** | Core business rules |

---

*Test Plan Specialist — Java Unit Testing: Domain Layer | EPS v10.0*

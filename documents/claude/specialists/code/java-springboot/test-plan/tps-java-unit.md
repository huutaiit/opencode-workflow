# Unit Testing Specialist — Java Spring Boot (Strategy + Routing)
# ユニットテストスペシャリスト — Java Spring Boot（戦略＋ルーティング）
# Chuyen Gia Unit Testing — Java Spring Boot (Chien Luoc + Routing)

**Version**: 2.0.0
**Technology**: JUnit 5 + Mockito + StepVerifier (Reactive) / AssertJ (Standard)
**Aspect**: Unit Testing — Strategy Hub
**Category**: backend
**Purpose**: Unit test strategy for Java Clean Architecture — layer routing table, coverage targets, mock strategy per layer, reactive vs standard patterns. Routes to layer-specific test plan specialists.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | TPS-JAVA-UNIT |
| **Specialist Type** | code |
| **Purpose** | Unit test strategy hub — routes DD/Plan/Execute to correct layer-specific test plan |
| **Activation Trigger** | files: **/*Test.java; keywords: unitTest, junit, mockito, stepVerifier |

---

## Layer Routing Table

| Layer | Test Plan | File | Load When |
|-------|-----------|------|-----------|
| Domain | TPS-JAVA-UNIT-DOMAIN | `tps-java-unit-domain.md` | Testing entities, callbacks, enums, value objects |
| Application | TPS-JAVA-UNIT-APP | `tps-java-unit-application.md` | Testing services, mappers, DTOs, event emission |
| Infrastructure | TPS-JAVA-UNIT-INFRA | `tps-java-unit-infrastructure.md` | Testing repositories, external clients, VM mappers |
| Presentation | TPS-JAVA-UNIT-PRES | `tps-java-unit-presentation.md` | Testing REST resources, security config, exception handlers |
| Reactive-specific | TPS-JAVA-REACTIVE | `tps-java-reactive.md` | StepVerifier advanced, virtual time, backpressure, BlockHound |

---

## Strategy Overview

| Layer | DI Strategy | Test Framework | Variant Difference |
|-------|-------------|----------------|-------------------|
| **Domain** | NO DI — pure POJO | JUnit 5 + AssertJ only | Same across all variants |
| **Application** | @Mock + @InjectMocks | JUnit 5 + Mockito | Reactive: StepVerifier. Standard: plain assertions |
| **Infrastructure** | @DataR2dbcTest / @DataJpaTest | JUnit 5 + Testcontainers | Reactive: R2DBC. Standard: JPA/Hibernate |
| **Presentation** | @WebFluxTest / @WebMvcTest | WebTestClient / MockMvc | Reactive: WebTestClient. Standard: MockMvc |

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Domain (entities, callbacks, enums) | ≥95% | Core business rules |
| Application (services, mappers) | ≥90% | Business orchestration |
| Infrastructure (repos, clients) | ≥80% | Deeper coverage via integration tests |
| Presentation (resources) | ≥80% | Thin layer — verify routing + error format |
| **Overall** | ≥85% | Weighted across layers |

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | @SpringBootTest for unit test | 10-20s startup per class | @ExtendWith(MockitoExtension.class) |
| 2 | H2 for repository test | SQL dialect differences | Testcontainers (real Postgres) |
| 3 | .block() in reactive test | Hides subscription errors | StepVerifier |
| 4 | Mock the SUT | Tests nothing | Mock dependencies, not SUT |

---

*Test Plan Specialist — Java Unit Testing (Strategy + Routing) v2.0 | EPS v10.0*

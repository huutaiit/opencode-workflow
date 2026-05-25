# Integration Testing Specialist — Java Spring Boot (Strategy + Routing)
# 統合テストスペシャリスト — Java Spring Boot（戦略＋ルーティング）
# Chuyen Gia Integration Testing — Java Spring Boot (Chien Luoc + Routing)

**Version**: 2.0.0
**Technology**: WebTestClient/RestAssured + Testcontainers + Spring Cloud Contract
**Aspect**: Integration Testing — Strategy Hub
**Category**: backend
**Purpose**: Integration test strategy for Java — concern routing (database, messaging, API contract, E2E), test container orchestration, CI pipeline

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | TPS-JAVA-INTEGRATION |
| **Specialist Type** | code |
| **Purpose** | Integration test strategy hub — routes to concern-specific test plans |
| **Activation Trigger** | files: **/*IntegrationTest.java, **/contract/**; keywords: integrationTest, testcontainers, springBootTest |

---

## Concern Routing Table

| Concern | Test Plan | File | Load When |
|---------|-----------|------|-----------|
| Database | TPS-JAVA-INT-DB | `tps-java-integration-database.md` | Repository queries, migrations, transaction isolation |
| Messaging | TPS-JAVA-INT-MSG | `tps-java-integration-messaging.md` | Kafka round-trip, DLQ, ordering |
| API Contract | TPS-JAVA-INT-CONTRACT | `tps-java-integration-api-contract.md` | Spring Cloud Contract, Pact JVM |
| E2E | TPS-JAVA-E2E | `tps-java-e2e.md` | Full app lifecycle via WebTestClient/RestAssured |

## Maven Configuration

```xml
<!-- Surefire: unit tests (*Test.java) -->
<plugin>
  <artifactId>maven-surefire-plugin</artifactId>
  <configuration>
    <excludes><exclude>**/*IntegrationTest.java</exclude></excludes>
  </configuration>
</plugin>

<!-- Failsafe: integration tests (*IntegrationTest.java) -->
<plugin>
  <artifactId>maven-failsafe-plugin</artifactId>
  <configuration>
    <includes><include>**/*IntegrationTest.java</include></includes>
  </configuration>
</plugin>
```

## Anti-Patterns

| # | Anti-Pattern | Correct |
|---|-------------|---------|
| 1 | H2 for integration tests | Testcontainers (real Postgres) |
| 2 | Unit + integration in same Maven phase | Surefire (unit) + Failsafe (integration) |
| 3 | No cleanup between tests | @Sql(cleanup) or @Transactional |

---

*Test Plan Specialist — Java Integration Testing (Strategy + Routing) v2.0 | EPS v10.0*

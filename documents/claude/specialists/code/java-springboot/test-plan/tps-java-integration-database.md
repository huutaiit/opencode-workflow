# Test Plan Specialist — Java Integration Testing: Database
# テストプランスペシャリスト — Java データベース統合テスト
# Chuyen Gia Test — Integration Test Database Java

**Version**: 1.0.0
**Technology**: R2DBC/JPA + Testcontainers PostgreSQL 17
**Aspect**: Integration Testing: Database
**Category**: backend
**Purpose**: Database integration testing — @DataR2dbcTest/@DataJpaTest with real PostgreSQL, migration testing, transaction isolation, SqlHelper/custom query verification

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-DB |
| **Specialist Type** | code |
| **Purpose** | Database integration testing — @DataR2dbcTest/@DataJpaTest with real PostgreSQL, migration testing, transaction isolation, SqlHelper/custom query verification |

---

## Patterns

### Pattern INT-DB.1: Repository with Testcontainers (Reactive)

@DataR2dbcTest + @Testcontainers + @Container PostgreSQLContainer. StepVerifier for reactive queries. Real SQL execution against Postgres 17.

---

### Pattern INT-DB.2: Repository with Testcontainers (Standard)

@DataJpaTest + @Testcontainers + @DynamicPropertySource. TestEntityManager for flush/clear. Real JPA queries against Postgres.

---

### Pattern INT-DB.3: Migration Testing

Flyway/Liquibase migrations on clean test DB. Verify up() creates tables/columns. Verify rollback works. Test data migration scripts.

---

### Pattern INT-DB.4: Transaction Isolation

Two QueryRunners: qr1 updates without commit, qr2 reads → should NOT see uncommitted (READ COMMITTED). Test serializable isolation for financial operations.

---

### Pattern INT-DB.5: SqlHelper/Custom Query Testing

R2DBC SqlHelper with DatabaseClient.sql(). Verify JOIN, GROUP BY, subquery results match expected data. Test with seeded dataset.

---

## ❌ Negative Example

❌ H2 in-memory: passes with H2 MERGE syntax, fails on Postgres UPSERT. ❌ Mock repo: passes always, misses column type mismatch. ✅ Testcontainers: catches real SQL/schema bugs.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Integration Testing: Database | EPS v10.0*

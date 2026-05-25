# Test Plan Specialist — Java Integration Testing: API Contract
# テストプランスペシャリスト — Java API契約テスト
# Chuyen Gia Test — Integration Test API Contract Java

**Version**: 1.0.0
**Technology**: Spring Cloud Contract + Pact JVM
**Aspect**: Integration Testing: API Contract
**Category**: backend
**Purpose**: API contract testing — Spring Cloud Contract stubs, Pact JVM consumer/provider, OpenAPI compliance, backward compatibility

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-C |
| **Specialist Type** | code |
| **Purpose** | API contract testing — Spring Cloud Contract stubs, Pact JVM consumer/provider, OpenAPI compliance, backward compatibility |

---

## Patterns

### Pattern INT-C.1: Spring Cloud Contract (Producer)

@AutoConfigureStubRunner generates stubs from contract DSL. Verify controller response matches contract. Auto-publish stubs to Nexus/Artifactory.

---

### Pattern INT-C.2: Spring Cloud Contract (Consumer)

StubRunner downloads producer stubs. Consumer test verifies client library works against stub. Catches breaking changes before deployment.

---

### Pattern INT-C.3: Pact JVM Consumer

@PactTestFor(providerName) + @Pact method defines expected interactions. MockServer validates consumer expectations. Pact file published to broker.

---

### Pattern INT-C.4: Pact JVM Provider

@Provider("payment-service") + @State("a valid loan exists") state handler. Pact verifier runs against real running service.

---

### Pattern INT-C.5: OpenAPI Schema Validation

springdoc-openapi generates spec. Test validates all endpoints return responses matching declared schema. Detects undocumented fields/status codes.

---

## ❌ Negative Example

❌ No contract tests: service A changes response format → service B discovers in production. ✅ Contract tests: CI catches breaking change before merge.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Integration Testing: API Contract | EPS v10.0*

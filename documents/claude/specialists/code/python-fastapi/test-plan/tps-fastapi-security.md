# Test Plan Specialist — FastAPI Security Testing (Strategy + Routing)
# テストプランスペシャリスト — FastAPI Security Testing (Strategy + Routing)
# Chuyen Gia Test — FastAPI Security Testing (Strategy + Routing)

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Security test strategy - OWASP coverage, auth/RBAC routing, dependency scanning (safety/pip-audit)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | ROUTING |
| **Specialist Type** | code |
| **Purpose** | Security test strategy - OWASP coverage, auth/RBAC routing, dependency scanning (safety/pip-audit) |

---

## Patterns

### Pattern ROUTING: Concern Table

Auth: tps-fastapi-security-auth.md | OWASP: tps-fastapi-security-owasp.md

---

### Pattern DEP-SCAN: pip-audit + safety

pip-audit --strict (block on any known CVE). safety check --full-report. CI: fail pipeline on critical vulnerability.

---

### Pattern BANDIT: Static Security Analysis

bandit -r src/ -ll. Detect: hardcoded passwords, SQL injection, unsafe deserialization, assert in production code.

---

## ❌ Negative Example

BAD: No dependency scanning. pip packages have CVEs too. GOOD: pip-audit in CI pipeline.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Security Testing (Strategy + Routing) | EPS v10.0*

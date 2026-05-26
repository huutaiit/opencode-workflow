# Security Testing Specialist — Java Spring Boot (Strategy + Routing)
# セキュリティテストスペシャリスト — Java Spring Boot（戦略＋ルーティング）
# Chuyen Gia Security Testing — Java Spring Boot (Chien Luoc + Routing)

**Version**: 2.0.0
**Technology**: Spring Security Test + JWT + OWASP ZAP
**Aspect**: Security Testing — Strategy Hub
**Category**: backend
**Purpose**: Security test strategy for Java — OWASP coverage map, auth/RBAC routing, dependency scanning (OWASP Dependency-Check Maven plugin)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | TPS-JAVA-SECURITY |
| **Specialist Type** | code |
| **Purpose** | Security test strategy hub — routes to auth or OWASP test plans |
| **Activation Trigger** | files: **/security/**/*Test.java; keywords: securityTest, owasp, authTest |

---

## Concern Routing Table

| Concern | Test Plan | File |
|---------|-----------|------|
| Auth & RBAC | TPS-JAVA-SEC-AUTH | `tps-java-security-auth.md` |
| OWASP Top 10 | TPS-JAVA-SEC-OWASP | `tps-java-security-owasp.md` |

## OWASP Coverage Map

| OWASP | Test Plan | Spring Security Feature |
|-------|-----------|----------------------|
| A01 Broken Access Control | SEC-AUTH | @PreAuthorize, SecurityWebFilterChain |
| A03 Injection | SEC-OWASP | Spring Data parameterized queries |
| A05 Security Misconfiguration | SEC-OWASP | Security headers, CORS |
| A07 Auth Failures | SEC-OWASP + SEC-AUTH | Rate limiting, JWT |
| A10 SSRF | SEC-OWASP | URL whitelist validation |

## Dependency Scanning (Maven)

```xml
<!-- OWASP Dependency-Check -->
<plugin>
  <groupId>org.owasp</groupId>
  <artifactId>dependency-check-maven</artifactId>
  <configuration>
    <failBuildOnCVSS>7</failBuildOnCVSS>
  </configuration>
</plugin>
```

---

*Test Plan Specialist — Java Security Testing (Strategy + Routing) v2.0 | EPS v10.0*

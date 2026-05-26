# Test Plan Specialist — React FSD Security Testing
# テストプランスペシャリスト — React FSD Security Testing
# Chuyen Gia Test — React FSD Security Testing

**Version**: 1.0.0
**Technology**: Vitest + @testing-library/react + Playwright
**Purpose**: Frontend security - XSS prevention, CSP compliance, auth token handling, sensitive data exposure, dependency scanning

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | SEC |
| **Specialist Type** | code |
| **Purpose** | Frontend security - XSS prevention, CSP compliance, auth token handling, sensitive data exposure, dependency scanning |

---

## Patterns

### Pattern SEC.1: XSS Prevention

Test: render(<Component data={xssPayload} />). xssPayload = "<script>alert(1)</script>". Verify: rendered as text, NOT executed. Check: dangerouslySetInnerHTML usage audit.

---

### Pattern SEC.2: Auth Token Handling

Verify: tokens stored in httpOnly cookies (not localStorage). Verify: token not exposed in URL or console.log. Verify: token cleared on logout.

---

### Pattern SEC.3: Sensitive Data Exposure

Verify: no API keys in client bundle (grep source maps). Verify: user PII not in Redux DevTools. Verify: error messages dont expose stack traces.

---

### Pattern SEC.4: Dependency Scanning

npm audit --production. Verify: 0 critical vulnerabilities. CI: fail on high/critical. Schedule: weekly Dependabot/Snyk alerts.

---

### Pattern SEC.5: CSP Compliance

Verify: meta tag or server header sets CSP. Test: no inline event handlers (onclick), no eval().

---

## ❌ Negative Example

BAD: Trust React auto-escaping for all cases. React prevents most XSS but dangerouslySetInnerHTML, href="javascript:", and SSR bypass auto-escaping. GOOD: Test explicitly.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — React FSD Security Testing | EPS v10.0*

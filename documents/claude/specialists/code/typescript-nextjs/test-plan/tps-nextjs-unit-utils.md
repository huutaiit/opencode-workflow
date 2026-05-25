# Test Plan Specialist — NextJS Unit Testing: Utils & Helpers
# テストプランスペシャリスト — NextJS Unit Testing: Utils & Helpers
# Chuyen Gia Test — NextJS Unit Testing: Utils & Helpers

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Utils testing - pure function testing, formatters, validators, date/currency helpers, i18n, type guards

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | UT-U |
| **Specialist Type** | code |
| **Purpose** | Utils testing - pure function testing, formatters, validators, date/currency helpers, i18n, type guards |

---

## Patterns

### Pattern UT-U.1: Formatter Testing

expect(formatCurrency(1000, "USD")).toBe("$1,000.00"). expect(formatCurrency(0, "VND")).toBe("0 VND"). expect(formatDate(new Date("2026-01-15"), "vi")).toBe("15/01/2026"). Parametrize with multiple locales.

---

### Pattern UT-U.2: Validator Testing

expect(isValidEmail("test@test.com")).toBe(true). expect(isValidEmail("not-email")).toBe(false). expect(isValidPhone("+84912345678")).toBe(true). Test boundary: empty string, null, undefined.

---

### Pattern UT-U.3: Type Guard Testing

expect(isApiError(new ApiError(404))).toBe(true). expect(isApiError(new Error("generic"))).toBe(false). Verify TypeScript type narrowing works at runtime.

---

### Pattern UT-U.4: Calculation Helpers

expect(calculateMonthlyPayment(10000, 0.08, 12)).toBeCloseTo(869.88, 2). Test edge cases: 0 amount, 0 rate, 1 month term, very large numbers.

---

## ❌ Negative Example

BAD: Import React in utils test (utils should be framework-agnostic). GOOD: Pure function in, assert out. No DOM, no React, no async.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Unit Testing: Utils & Helpers | EPS v10.0*

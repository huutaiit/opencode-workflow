# Test Plan Specialist — NextJS Accessibility Testing
# テストプランスペシャリスト — NextJS Accessibility Testing
# Chuyen Gia Test — NextJS Accessibility Testing

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Accessibility testing - axe-core automated checks, keyboard navigation, screen reader, WCAG 2.1 AA compliance

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | A11Y |
| **Specialist Type** | code |
| **Purpose** | Accessibility testing - axe-core automated checks, keyboard navigation, screen reader, WCAG 2.1 AA compliance |

---

## Patterns

### Pattern A11Y.1: axe-core Automated Check

import { axe, toHaveNoViolations } from "jest-axe". const { container } = render(<Component />). expect(await axe(container)).toHaveNoViolations(). Run on EVERY component test.

---

### Pattern A11Y.2: Keyboard Navigation

userEvent.tab() -> verify focus moves to first interactive element. userEvent.keyboard("{Enter}") -> verify action triggered. userEvent.keyboard("{Escape}") -> verify modal closes. Test full tab order.

---

### Pattern A11Y.3: ARIA Attributes

expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby"). expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite"). Verify all dynamic content has correct ARIA.

---

### Pattern A11Y.4: Color Contrast

Storybook a11y addon: verify contrast ratio >= 4.5:1 (AA) for normal text, >= 3:1 for large text. Test in light + dark mode.

---

### Pattern A11Y.5: Form Accessibility

Every input has associated label (htmlFor/aria-labelledby). Error messages linked via aria-describedby. Required fields marked with aria-required. Focus moves to first error on submit.

---

## ❌ Negative Example

BAD: Only test with mouse clicks - 15% of users use keyboard. BAD: No axe-core - manual a11y audit finds 20% of issues. GOOD: axe-core on every component + keyboard nav tests.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Accessibility Testing | EPS v10.0*

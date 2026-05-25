# Test Plan Specialist — NextJS Manual Testing Checklist
# テストプランスペシャリスト — NextJS Manual Testing Checklist
# Chuyen Gia Test — NextJS Manual Testing Checklist

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Manual QA checklist - cross-browser, responsive, i18n, SSR hydration, edge cases that automated tests miss

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | MAN |
| **Specialist Type** | code |
| **Purpose** | Manual QA checklist - cross-browser, responsive, i18n, SSR hydration, edge cases that automated tests miss |

---

## Patterns

### Pattern MAN.1: Cross-Browser Checklist

Chrome (latest), Firefox (latest), Safari (latest), Edge (latest). Mobile: Chrome Android, Safari iOS. Check: layout, fonts, animations, form behavior.

---

### Pattern MAN.2: Responsive Breakpoints

375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop). Check: navigation collapse, grid layout, image scaling, touch targets >= 44px.

---

### Pattern MAN.3: SSR Hydration Check

View source: verify server-rendered HTML contains content (not empty div). Disable JS: verify page still shows content. Check: no hydration mismatch warnings in console.

---

### Pattern MAN.4: i18n Verification

Switch locale: verify all text translated, dates formatted per locale, RTL layout for Arabic. Check: no hardcoded strings visible.

---

### Pattern MAN.5: Error State Walkthrough

Disconnect network -> verify offline UI. Slow 3G (DevTools throttle) -> verify loading states. Clear cookies -> verify redirect to login.

---

## ❌ Negative Example

BAD: Only test on Chrome desktop. Safari has unique CSS bugs (flexbox gap, date input). Mobile Safari has viewport issues. GOOD: Test on real devices or BrowserStack.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Manual Testing Checklist | EPS v10.0*

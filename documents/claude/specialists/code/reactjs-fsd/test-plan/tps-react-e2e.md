# Test Plan Specialist — React FSD E2E Testing
# テストプランスペシャリスト — React FSD E2E Testing
# Chuyen Gia Test — React FSD E2E Testing

**Version**: 1.0.0
**Technology**: Vitest + @testing-library/react + Playwright
**Purpose**: E2E testing - Playwright browser automation, SPA navigation, visual regression, CI integration

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | E2E |
| **Specialist Type** | code |
| **Purpose** | E2E testing - Playwright browser automation, SPA navigation, visual regression, CI integration |

---

## Patterns

### Pattern E2E.1: Playwright Page Test

await page.goto("/login"). await page.fill("[name=email]", "admin@test.com"). await page.fill("[name=password]", "password"). await page.click("button[type=submit]"). await expect(page).toHaveURL("/dashboard").

---

### Pattern E2E.2: Multi-Step User Flow

Login -> Navigate to orders -> Create order -> Fill form -> Submit -> Verify success message -> Verify order in list. Test complete user journey.

---

### Pattern E2E.3: Visual Regression

await expect(page).toHaveScreenshot("dashboard.png", { maxDiffPixelRatio: 0.01 }). Compare against baseline. Detect: broken layout, missing elements, style regression.

---

### Pattern E2E.4: Responsive Testing

await page.setViewportSize({ width: 375, height: 667 }). // mobile. Verify: hamburger menu, collapsed sidebar, stacked layout. Test: 375px, 768px, 1024px, 1440px.

---

### Pattern E2E.5: CI Configuration

Playwright in Docker: mcr.microsoft.com/playwright:v1.40.0. npx playwright test --project=chromium. Artifacts: screenshots, videos, traces on failure.

---

## ❌ Negative Example

BAD: Cypress with cy.get(".className") - brittle selectors. GOOD: Playwright with getByRole(), getByText() - same Testing Library queries.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — React FSD E2E Testing | EPS v10.0*

# Test Plan Specialist — NextJS Integration Testing: Page Rendering
# テストプランスペシャリスト — NextJS Integration Testing: Page Rendering
# Chuyen Gia Test — NextJS Integration Testing: Page Rendering

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Page-level integration - App Router page rendering, Server Components, layout nesting, parallel routes

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-P |
| **Specialist Type** | code |
| **Purpose** | Page-level integration - App Router page rendering, Server Components, layout nesting, parallel routes |

---

## Patterns

### Pattern INT-P.1: Page Render with Data

Server Component: render(await Page({ params: { id: "1" } })). Verify: data fetched + rendered. Mock fetch via MSW or next/headers mock.

---

### Pattern INT-P.2: Loading/Error States

Simulate slow API (MSW delay 2000ms). Verify: Suspense fallback shown. Simulate error. Verify: error boundary catches + displays error UI.

---

### Pattern INT-P.3: Layout Integration

Test nested layouts: RootLayout > DashboardLayout > Page. Verify: navigation, sidebar, breadcrumbs render correctly together.

---

### Pattern INT-P.4: Navigation Testing

Mock next/navigation: useRouter, usePathname, useSearchParams. userEvent.click(link). Verify: router.push called with correct path.

---

## ❌ Negative Example

BAD: Mock everything (data, layout, children) - tests nothing. GOOD: Render real page with MSW for API, verify full user experience.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Integration Testing: Page Rendering | EPS v10.0*

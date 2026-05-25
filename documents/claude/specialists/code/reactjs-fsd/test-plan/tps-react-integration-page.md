# Test Plan Specialist — React FSD Integration Testing: Page Rendering
# テストプランスペシャリスト — React FSD Integration Testing: Page Rendering
# Chuyen Gia Test — React FSD Integration Testing: Page Rendering

**Version**: 1.0.0
**Technology**: Vitest + @testing-library/react + Playwright
**Purpose**: Page-level integration - Route rendering, lazy loading, layout composition

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-P |
| **Specialist Type** | code |
| **Purpose** | Page-level integration - Route rendering, lazy loading, layout composition |

---

## Patterns

### Pattern INT-P.1: Page Render with Data

renderWithRouter(<Route path="/users/:id" element={<UserPage />} />). Verify: route params extracted, data loaded, rendered.

---

### Pattern INT-P.2: Loading/Error States

Simulate slow API (MSW delay 2000ms). Verify: Suspense fallback shown. Simulate error. Verify: error boundary catches + displays error UI.

---

### Pattern INT-P.3: Layout Integration

Test layout composition: MainLayout wraps PageContent. Verify: header, sidebar, footer present.

---

### Pattern INT-P.4: Navigation Testing

MemoryRouter with initialEntries. Click link. Verify: correct route rendered.

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

*Test Plan Specialist — React FSD Integration Testing: Page Rendering | EPS v10.0*

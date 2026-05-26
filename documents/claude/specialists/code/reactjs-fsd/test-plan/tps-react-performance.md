# Test Plan Specialist — React FSD Performance Testing
# テストプランスペシャリスト — React FSD Performance Testing
# Chuyen Gia Test — React FSD Performance Testing

**Version**: 1.0.0
**Technology**: Vitest + @testing-library/react + Playwright
**Purpose**: Frontend performance - Lighthouse CI, Core Web Vitals (LCP, FID, CLS), bundle size monitoring, lazy loading, code splitting

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | PERF |
| **Specialist Type** | code |
| **Purpose** | Frontend performance - Lighthouse CI, Core Web Vitals (LCP, FID, CLS), bundle size monitoring, lazy loading, code splitting |

---

## Patterns

### Pattern PERF.1: Lighthouse CI

lhci autorun --config=lighthouserc.json. Assertions: performance >= 90, accessibility >= 90, best-practices >= 90. Run against production build, not dev server.

---

### Pattern PERF.2: Core Web Vitals

LCP (Largest Contentful Paint) < 2.5s. FID (First Input Delay) < 100ms. CLS (Cumulative Layout Shift) < 0.1. Monitor via web-vitals library + analytics.

---

### Pattern PERF.3: Bundle Size Monitoring

webpack-bundle-analyzer. source-map-explorer. Alert: main chunk > 250KB.

---

### Pattern PERF.4: Rendering Performance

React DevTools Profiler: measure component render time. React.memo() for expensive components. Verify: no unnecessary re-renders on parent state change.

---

### Pattern PERF.5: Image Optimization

Verify: lazy loading for below-fold images, srcSet for responsive, WebP format.

---

## ❌ Negative Example

BAD: Only test performance in development mode (no minification, no tree-shaking). GOOD: Lighthouse CI against production build in CI pipeline.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — React FSD Performance Testing | EPS v10.0*

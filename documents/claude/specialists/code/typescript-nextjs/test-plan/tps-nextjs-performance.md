# Test Plan Specialist — NextJS Performance Testing
# テストプランスペシャリスト — NextJS Performance Testing
# Chuyen Gia Test — NextJS Performance Testing

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Frontend performance - Lighthouse CI, Core Web Vitals (LCP, FID, CLS), bundle size monitoring, SSR/ISR performance, next/bundle-analyzer

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | PERF |
| **Specialist Type** | code |
| **Purpose** | Frontend performance - Lighthouse CI, Core Web Vitals (LCP, FID, CLS), bundle size monitoring, SSR/ISR performance, next/bundle-analyzer |

---

## Patterns

### Pattern PERF.1: Lighthouse CI

lhci autorun --config=lighthouserc.json. Assertions: performance >= 90, accessibility >= 90, best-practices >= 90. Run against production build, not dev server.

---

### Pattern PERF.2: Core Web Vitals

LCP (Largest Contentful Paint) < 2.5s. FID (First Input Delay) < 100ms. CLS (Cumulative Layout Shift) < 0.1. Monitor via web-vitals library + analytics.

---

### Pattern PERF.3: Bundle Size Monitoring

NEXT_ANALYZE=true next build. @next/bundle-analyzer. Alert: page bundle > 200KB, total JS > 500KB.

---

### Pattern PERF.4: Rendering Performance

React DevTools Profiler: measure component render time. React.memo() for expensive components. Verify: no unnecessary re-renders on parent state change.

---

### Pattern PERF.5: Image Optimization

next/image: verify all images use Image component (not <img>). Check: width/height set, format=webp, lazy loading default.

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

*Test Plan Specialist — NextJS Performance Testing | EPS v10.0*

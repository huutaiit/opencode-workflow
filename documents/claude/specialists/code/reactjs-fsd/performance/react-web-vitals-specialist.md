# React Web Vitals Specialist
# React Web Vitalsスペシャリスト
# Chuyen Gia Web Vitals React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/shared/lib/performance/`, `src/**/*.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 54.1–54.8 |
| **Source Paths** | `src/**/*.tsx`, `src/shared/lib/performance/**` |
| **File Count** | Cross-cutting |
| **Naming Convention** | N/A (rule-set or utility files) |
| **Imports From** | Shared |
| **Cannot Import** | N/A (cross-cutting rule-set — not a code module) |
| **Imported By** | ALL (cross-cutting — applies to all FSD layers) |
| **Dependencies** | See patterns |
| **When To Use** | CLS, LCP, INP, performance budgets, Core Web Vitals monitoring, Lighthouse CI |
| **Source Skeleton** | N/A (cross-cutting rule-set — not a code module) |
| **Specialist Type** | code |
| **Purpose** | Generate Web Vitals patterns — CLS, LCP, INP, performance budgets, Core Web Vitals monitoring, Lighthouse CI |
| **Activation Trigger** | keywords: CLS,LCP,INP |

---

## Evidence Sources

- E1: React documentation — performance/error handling
- E2: Enterprise best practices
- E3: Tooling documentation (Sentry, Lighthouse, TanStack Virtual)

---

## Patterns

CLS, LCP, INP, performance budgets, Core Web Vitals monitoring, Lighthouse CI

*(Detailed patterns with code examples for each pattern number in 54.1–54.8)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (54.1–54.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Web Vitals Specialist | EPS v3.2 | Metadata v2.1*

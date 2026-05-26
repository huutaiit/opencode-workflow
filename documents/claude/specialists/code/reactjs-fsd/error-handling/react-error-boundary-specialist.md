# React Error Boundary Specialist
# React Error Boundaryスペシャリスト
# Chuyen Gia Error Boundary React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/shared/lib/error-handling/`, `src/**/*.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 55.1–55.10 |
| **Source Paths** | `src/**/*.tsx`, `src/shared/lib/error-handling/**` |
| **File Count** | Cross-cutting |
| **Naming Convention** | N/A (rule-set or utility files) |
| **Imports From** | Shared |
| **Cannot Import** | N/A (cross-cutting rule-set — not a code module) |
| **Imported By** | ALL (cross-cutting — applies to all FSD layers) |
| **Dependencies** | See patterns |
| **When To Use** | ErrorBoundary, fallback UI, retry, recovery, feature-scoped boundaries, Suspense+ErrorBoundary |
| **Source Skeleton** | N/A (cross-cutting rule-set — not a code module) |
| **Specialist Type** | code |
| **Purpose** | Generate Error Boundary patterns — ErrorBoundary, fallback UI, retry, recovery, feature-scoped boundaries, Suspense+ErrorBoundary |
| **Activation Trigger** | keywords: ErrorBoundary,fallbackUI,retry |

---

## Evidence Sources

- E1: React documentation — performance/error handling
- E2: Enterprise best practices
- E3: Tooling documentation (Sentry, Lighthouse, TanStack Virtual)

---

## Patterns

ErrorBoundary, fallback UI, retry, recovery, feature-scoped boundaries, Suspense+ErrorBoundary

*(Detailed patterns with code examples for each pattern number in 55.1–55.10)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (55.1–55.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Error Boundary Specialist | EPS v3.2 | Metadata v2.1*

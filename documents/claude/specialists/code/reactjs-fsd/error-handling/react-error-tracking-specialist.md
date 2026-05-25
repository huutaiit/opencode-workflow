# React Error Tracking Specialist
# React Error Trackingスペシャリスト
# Chuyen Gia Error Tracking React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/shared/lib/error-handling/`, `src/**/*.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 56.1–56.8 |
| **Source Paths** | `src/**/*.tsx`, `src/shared/lib/error-handling/**` |
| **File Count** | Cross-cutting |
| **Naming Convention** | N/A (rule-set or utility files) |
| **Imports From** | Shared |
| **Cannot Import** | N/A (cross-cutting rule-set — not a code module) |
| **Imported By** | ALL (cross-cutting — applies to all FSD layers) |
| **Dependencies** | See patterns |
| **When To Use** | Sentry integration, breadcrumbs, session replay, source maps, alerting, error grouping |
| **Source Skeleton** | N/A (cross-cutting rule-set — not a code module) |
| **Specialist Type** | code |
| **Purpose** | Generate Error Tracking patterns — Sentry integration, breadcrumbs, session replay, source maps, alerting, error grouping |
| **Activation Trigger** | keywords: Sentryintegration,breadcrumbs,sessionreplay |

---

## Evidence Sources

- E1: React documentation — performance/error handling
- E2: Enterprise best practices
- E3: Tooling documentation (Sentry, Lighthouse, TanStack Virtual)

---

## Patterns

Sentry integration, breadcrumbs, session replay, source maps, alerting, error grouping

*(Detailed patterns with code examples for each pattern number in 56.1–56.8)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (56.1–56.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Error Tracking Specialist | EPS v3.2 | Metadata v2.1*

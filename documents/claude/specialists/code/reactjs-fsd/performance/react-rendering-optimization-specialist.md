# React Rendering Optimization Specialist
# React Rendering Optimizationスペシャリスト
# Chuyen Gia Rendering Optimization React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/shared/lib/performance/`, `src/**/*.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 51.1–51.10 |
| **Source Paths** | `src/**/*.tsx`, `src/shared/lib/performance/**` |
| **File Count** | Cross-cutting |
| **Naming Convention** | N/A (rule-set or utility files) |
| **Imports From** | Shared |
| **Cannot Import** | N/A (cross-cutting rule-set — not a code module) |
| **Imported By** | ALL (cross-cutting — applies to all FSD layers) |
| **Dependencies** | See patterns |
| **When To Use** | React.memo, useMemo, useCallback, React Compiler, re-render prevention, profiling |
| **Source Skeleton** | N/A (cross-cutting rule-set — not a code module) |
| **Specialist Type** | code |
| **Purpose** | Generate Rendering Optimization patterns — React.memo, useMemo, useCallback, React Compiler, re-render prevention, profiling |
| **Activation Trigger** | keywords: React.memo,useMemo,useCallback |

---

## Evidence Sources

- E1: React documentation — performance/error handling
- E2: Enterprise best practices
- E3: Tooling documentation (Sentry, Lighthouse, TanStack Virtual)

---

## Patterns

React.memo, useMemo, useCallback, React Compiler, re-render prevention, profiling

*(Detailed patterns with code examples for each pattern number in 51.1–51.10)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (51.1–51.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Rendering Optimization Specialist | EPS v3.2 | Metadata v2.1*

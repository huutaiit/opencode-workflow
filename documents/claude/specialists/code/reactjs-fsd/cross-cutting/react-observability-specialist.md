# React Observability Specialist
# React Observabilityスペシャリスト
# Chuyen Gia Observability React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/shared/lib/cross-cutting/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 58.1–58.8 |
| **Source Paths** | `src/shared/lib/cross-cutting/**` |
| **File Count** | 2–5 files |
| **Naming Convention** | `{concern}.ts`, `use{Concern}.ts` |
| **Imports From** | Shared (config) |
| **Cannot Import** | Features, Pages |
| **Imported By** | ALL (cross-cutting — applies to all FSD layers) |
| **Dependencies** | See patterns |
| **When To Use** | OpenTelemetry, RUM, Web Vitals tracking, distributed tracing, Datadog/Grafana integration |
| **Source Skeleton** | `src/shared/lib/cross-cutting/` |
| **Specialist Type** | code |
| **Purpose** | Generate Observability patterns — OpenTelemetry, RUM, Web Vitals tracking, distributed tracing, Datadog/Grafana integration |
| **Activation Trigger** | keywords: observability |

---

## Evidence Sources

- E1: Enterprise Observability best practices
- E2: Tooling documentation

---

## Patterns

OpenTelemetry, RUM, Web Vitals tracking, distributed tracing, Datadog/Grafana integration

*(Detailed patterns with code examples for each pattern number in 58.1–58.8)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (58.1–58.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Observability Specialist | EPS v3.2 | Metadata v2.1*

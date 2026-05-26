# React Logging Specialist
# React Loggingスペシャリスト
# Chuyen Gia Logging React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/shared/lib/cross-cutting/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 57.1–57.8 |
| **Source Paths** | `src/shared/lib/cross-cutting/**` |
| **File Count** | 2–5 files |
| **Naming Convention** | `{concern}.ts`, `use{Concern}.ts` |
| **Imports From** | Shared (config) |
| **Cannot Import** | Features, Pages |
| **Imported By** | ALL (cross-cutting — applies to all FSD layers) |
| **Dependencies** | See patterns |
| **When To Use** | Structured logging, log levels, transport, correlation ID, LogRocket, frontend logging pipeline |
| **Source Skeleton** | `src/shared/lib/cross-cutting/` |
| **Specialist Type** | code |
| **Purpose** | Generate Logging patterns — Structured logging, log levels, transport, correlation ID, LogRocket, frontend logging pipeline |
| **Activation Trigger** | keywords: logging |

---

## Evidence Sources

- E1: Enterprise Logging best practices
- E2: Tooling documentation

---

## Patterns

Structured logging, log levels, transport, correlation ID, LogRocket, frontend logging pipeline

*(Detailed patterns with code examples for each pattern number in 57.1–57.8)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (57.1–57.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Logging Specialist | EPS v3.2 | Metadata v2.1*

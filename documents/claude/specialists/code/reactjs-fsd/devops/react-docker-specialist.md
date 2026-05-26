# React Docker Specialist
# React Dockerスペシャリスト
# Chuyen Gia Docker React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — applies to all FSD layers) |
| **Directory Pattern** | Project root config, `src/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 66.1–66.8 |
| **Source Paths** | Config files, `src/**` |
| **File Count** | 2–8 config files |
| **Naming Convention** | Config files (`vite.config.ts`, `Dockerfile`, `.github/workflows/`) |
| **Imports From** | N/A (infrastructure config) |
| **Cannot Import** | N/A (cross-cutting rule-set — not a code module) |
| **Imported By** | N/A (cross-cutting rule-set — not a code module) |
| **Dependencies** | See patterns |
| **When To Use** | Multi-stage Dockerfile, nginx config, SPA routing, health check, Docker Compose |
| **Source Skeleton** | Project root config files |
| **Specialist Type** | code |
| **Purpose** | Generate Docker patterns — Multi-stage Dockerfile, nginx config, SPA routing, health check, Docker Compose |
| **Activation Trigger** | keywords: docker |

---

## Evidence Sources

- E1: Official documentation
- E2: Enterprise best practices

---

## Patterns

Multi-stage Dockerfile, nginx config, SPA routing, health check, Docker Compose

*(Detailed patterns with code examples for each pattern number in 66.1–66.8)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (66.1–66.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Docker Specialist | EPS v3.2 | Metadata v2.1*

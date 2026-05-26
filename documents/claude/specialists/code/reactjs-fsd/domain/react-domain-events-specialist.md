# React Domain Events Specialist
# React Domain Eventsスペシャリスト
# Chuyen Gia Domain Events React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Entities |
| **Directory Pattern** | `src/shared/lib/domain/`, `src/entities/{name}/model/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 70.1–70.8 |
| **Source Paths** | `src/shared/lib/domain/**`, `src/entities/**/model/**` |
| **File Count** | 3–10 files |
| **Naming Convention** | `{concern}.ts`, `{entity}.types.ts` |
| **Imports From** | Shared (types, config) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features, Entities |
| **Dependencies** | See patterns |
| **When To Use** | Event bus, pub/sub, domain event patterns on frontend, cross-feature communication |
| **Source Skeleton** | `src/shared/lib/domain/` |
| **Specialist Type** | code |
| **Purpose** | Generate Domain Events patterns — Event bus, pub/sub, domain event patterns on frontend, cross-feature communication |
| **Activation Trigger** | keywords: domain,events |

---

## Evidence Sources

- E1: Official documentation
- E2: Enterprise best practices

---

## Patterns

Event bus, pub/sub, domain event patterns on frontend, cross-feature communication

*(Detailed patterns with code examples for each pattern number in 70.1–70.8)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (70.1–70.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Domain Events Specialist | EPS v3.2 | Metadata v2.1*

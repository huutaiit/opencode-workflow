# React Domain Models Specialist
# React Domain Modelsスペシャリスト
# Chuyen Gia Domain Models React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Entities |
| **Directory Pattern** | `src/shared/lib/domain/`, `src/entities/{name}/model/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 68.1–68.8 |
| **Source Paths** | `src/shared/lib/domain/**`, `src/entities/**/model/**` |
| **File Count** | 3–10 files |
| **Naming Convention** | `{concern}.ts`, `{entity}.types.ts` |
| **Imports From** | Shared (types, config) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features, Entities |
| **Dependencies** | See patterns |
| **When To Use** | Frontend entities, value objects, DTOs, mappers, domain validation |
| **Source Skeleton** | `src/shared/lib/domain/` |
| **Specialist Type** | code |
| **Purpose** | Generate Domain Models patterns — Frontend entities, value objects, DTOs, mappers, domain validation |
| **Activation Trigger** | keywords: domain,models |

---

## Evidence Sources

- E1: Official documentation
- E2: Enterprise best practices

---

## Patterns

Frontend entities, value objects, DTOs, mappers, domain validation

*(Detailed patterns with code examples for each pattern number in 68.1–68.8)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (68.1–68.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Domain Models Specialist | EPS v3.2 | Metadata v2.1*

# React i18n Specialist
# React i18nスペシャリスト
# Chuyen Gia i18n React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Entities |
| **Directory Pattern** | `src/shared/lib/localization/`, `src/entities/{name}/model/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 71.1–71.10 |
| **Source Paths** | `src/shared/lib/localization/**`, `src/entities/**/model/**` |
| **File Count** | 3–10 files |
| **Naming Convention** | `{concern}.ts`, `{entity}.types.ts` |
| **Imports From** | Shared (types, config) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features, Entities |
| **Dependencies** | See patterns |
| **When To Use** | react-i18next, namespaces, lazy loading, pluralization, date/number formatting, ICU messages |
| **Source Skeleton** | `src/shared/lib/localization/` |
| **Specialist Type** | code |
| **Purpose** | Generate i18n patterns — react-i18next, namespaces, lazy loading, pluralization, date/number formatting, ICU messages |
| **Activation Trigger** | keywords: i18n |

---

## Evidence Sources

- E1: Official documentation
- E2: Enterprise best practices

---

## Patterns

react-i18next, namespaces, lazy loading, pluralization, date/number formatting, ICU messages

*(Detailed patterns with code examples for each pattern number in 71.1–71.10)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (71.1–71.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React i18n Specialist | EPS v3.2 | Metadata v2.1*

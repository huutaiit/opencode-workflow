# React Feature Flags Specialist
# React Feature Flagsスペシャリスト
# Chuyen Gia Feature Flags React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/shared/lib/cross-cutting/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 60.1–60.8 |
| **Source Paths** | `src/shared/lib/cross-cutting/**` |
| **File Count** | 2–5 files |
| **Naming Convention** | `{concern}.ts`, `use{Concern}.ts` |
| **Imports From** | Shared (config) |
| **Cannot Import** | Features, Pages |
| **Imported By** | ALL (cross-cutting — applies to all FSD layers) |
| **Dependencies** | See patterns |
| **When To Use** | LaunchDarkly, Unleash, feature toggle hooks, build-time vs runtime flags, A/B testing, gradual rollout |
| **Source Skeleton** | `src/shared/lib/cross-cutting/` |
| **Specialist Type** | code |
| **Purpose** | Generate Feature Flags patterns — LaunchDarkly, Unleash, feature toggle hooks, build-time vs runtime flags, A/B testing, gradual rollout |
| **Activation Trigger** | keywords: feature flags |

---

## Evidence Sources

- E1: Enterprise Feature Flags best practices
- E2: Tooling documentation

---

## Patterns

LaunchDarkly, Unleash, feature toggle hooks, build-time vs runtime flags, A/B testing, gradual rollout

*(Detailed patterns with code examples for each pattern number in 60.1–60.8)*

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based?
- [ ] **Q2**: Pattern IDs unique (60.1–60.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Feature Flags Specialist | EPS v3.2 | Metadata v2.1*

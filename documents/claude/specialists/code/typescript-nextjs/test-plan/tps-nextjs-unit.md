# Test Plan Specialist — NextJS Unit Testing (Strategy + Routing)
# テストプランスペシャリスト — NextJS ユニットテスト（戦略＋ルーティング）
# Chuyen Gia Test — Unit Test NextJS (Chien Luoc + Routing)

**Version**: 2.0.0
**Technology**: Vitest/Jest + @testing-library/react + MSW
**Aspect**: Unit Testing — Strategy Hub
**Category**: frontend
**Purpose**: Unit test strategy for NextJS — layer routing (components, hooks, utils, store), Testing Library principles, mock strategy (MSW for API, next/navigation mock), coverage targets

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | TPS-NEXTJS-UNIT |
| **Specialist Type** | code |
| **Purpose** | Unit test strategy hub — routes to layer-specific frontend test plans |
| **Activation Trigger** | files: **/*.test.ts, **/*.test.tsx; keywords: unitTest, vitest, testingLibrary, react |

---

## Layer Routing Table

| Layer | Test Plan | File | Load When |
|-------|-----------|------|-----------|
| Components | TPS-NEXTJS-UNIT-COMP | `tps-nextjs-unit-components.md` | Testing React components (render, interaction, a11y) |
| Hooks | TPS-NEXTJS-UNIT-HOOKS | `tps-nextjs-unit-hooks.md` | Testing custom hooks (state, effects, async) |
| Utils/Helpers | TPS-NEXTJS-UNIT-UTILS | `tps-nextjs-unit-utils.md` | Testing pure functions, formatters, validators |
| Store/State | TPS-NEXTJS-UNIT-STORE | `tps-nextjs-unit-store.md` | Testing Redux/Zustand state management |

---

## Testing Library Principles

```
The more your tests resemble the way your software is used,
the more confidence they can give you.
```

**DO**: Query by role, label, text (what user sees)
**DON'T**: Query by test-id, class name, implementation detail

```typescript
// ✅ GOOD: test user behavior
screen.getByRole('button', { name: /submit/i })
await userEvent.click(submitButton)
expect(screen.getByText('Order created')).toBeInTheDocument()

// ❌ BAD: test implementation
container.querySelector('.btn-primary')
expect(component.state.loading).toBe(false)
```

## Coverage Targets

| Layer | Target |
|-------|--------|
| Components (UI) | ≥80% |
| Hooks (custom) | ≥90% |
| Utils/Helpers | ≥95% |
| Store/State | ≥85% |
| **Overall** | ≥85% |

## Anti-Patterns

| # | Anti-Pattern | Correct |
|---|-------------|---------|
| 1 | `enzyme.shallow()` | `@testing-library/react render()` |
| 2 | Snapshot tests for everything | Behavior tests > snapshots |
| 3 | `getByTestId` as primary query | `getByRole`, `getByText`, `getByLabelText` |
| 4 | Mock React internals (useState) | Mock external boundaries (API, router) only |

---

*Test Plan Specialist — NextJS Unit Testing (Strategy + Routing) v2.0 | EPS v10.0*

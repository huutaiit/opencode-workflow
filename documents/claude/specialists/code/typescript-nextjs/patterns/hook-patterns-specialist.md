# Hook Patterns Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 86.1–86.5 |
| **Source Paths** | `src/presentation/hooks/` (15 global), `src/presentation/hooks/tenant/` (1), feature modules (local) |
| **File Count** | 15 global + 1 tenant + ~10 feature-local = ~26 total |
| **Naming Convention** | `use{Feature}.ts` or `use{Feature}.tsx` |
| **Barrel Export** | N/A (direct imports) |
| **Imports From** | Infrastructure: store hooks; Domain: entities |
| **Imported By** | Presentation: components import hooks |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |
| **Dependencies** | N/A (React built-in) |
| **When To Use** | Custom hooks for auth, data, pagination, UI state |
| **Source Skeleton** | `presentation/hooks/use{Feature}.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate 15 global hook patterns for data fetching, auth, pagination, and UI state management |
| **Activation Trigger** | files: `**/hooks/**/*.ts`; keywords: globalHook, customHook, hookPattern |

---

## Description

Hooks are organized in 3 tiers: global (shared across app), tenant-scoped, and feature-local (inside module folders). Global hooks live in `presentation/hooks/`. Feature-local hooks live inside their module's folder.

---

## Key Concepts

### 86.1 — Hook Organization Strategy

| Tier | Location | When to Use |
|------|----------|-------------|
| **Global** | `src/presentation/hooks/` | Used by 2+ modules or cross-cutting |
| **Tenant** | `src/presentation/hooks/tenant/` | Tenant-specific logic |
| **Feature-local** | `src/presentation/ui/modules/{code}/hooks/` | Used only within one module |

### 86.2 — Global Hooks Inventory by Category (15 hooks)

> 📌 File paths: See Pattern 0.1 §1 (Folder Tree) for hook directory location

#### Auth & Permission (3 hooks)

| Hook | File | Signature | Return Type | Purpose | Import Count |
|------|------|-----------|-------------|---------|-------------|
| `useAppAccess` | `useAppAccess.ts` | `useAppAccess()` | `{ hasAccess: boolean, isLoading: boolean }` | App-level JWT access check | 2 |
| `usePermission` | `usePermission.ts` | `usePermission(functionCd: string)` | `{ canCreate, canRead, canUpdate, canDelete: boolean }` | Function-level CRUD permissions via Redux | 49 |
| `useFilteredMenu` | `useFilteredMenu.ts` | `useFilteredMenu()` | `MenuItem[]` | Menu items filtered by user permissions | — |

#### Data & State (2 hooks)

| Hook | File | Signature | Return Type | Purpose | Import Count |
|------|------|-----------|-------------|---------|-------------|
| `useDashboard` | `useDashboard.ts` | `useDashboard()` | `{ data, isLoading, error }` | Dashboard data fetching | — |
| `useCodeGenerator` | `useCodeGenerator.ts` | `useCodeGenerator(prefix: string)` | `string` | Generate unique code with prefix | — |

#### UI & Interaction (4 hooks)

| Hook | File | Signature | Return Type | Purpose | Import Count |
|------|------|-----------|-------------|---------|-------------|
| `useNotification` | `useNotification.ts` | `useNotification()` | `{ success, error, warning, info: (msg) => void }` | Ant Design notification wrapper | — |
| `useConfirmAction` | `useConfirmAction.tsx` | `useConfirmAction(options)` | `{ confirm: (callback) => void, contextHolder: JSX }` | Confirmation dialog helper (returns JSX) | — |
| `useTableScroll` | `useTableScroll.tsx` | `useTableScroll(ref)` | `{ y: number }` | Auto-calculate table scroll height | — |
| `useUnsavedChangesConfirm` | `useUnsavedChangesConfirm.tsx` | `useUnsavedChangesConfirm(isDirty)` | `void` | Browser unsaved changes warning | — |

#### Workflow (3 hooks)

| Hook | File | Signature | Return Type | Purpose | Import Count |
|------|------|-----------|-------------|---------|-------------|
| `useWorkflowDispatch` | `useWorkflowDispatch.ts` | `useWorkflowDispatch()` | `dispatch function` | Dispatch workflow actions | — |
| `useWorkflowRegistration` | `useWorkflowRegistration.ts` | `useWorkflowRegistration(nodes)` | `void` | Register workflow node types | — |
| `useWorkflowScreen` | `useWorkflowScreen.ts` | `useWorkflowScreen(screenCode)` | `{ screen, blocks, isLoading }` | Workflow screen data context | — |

#### Utility (3 hooks)

| Hook | File | Signature | Return Type | Purpose | Import Count |
|------|------|-----------|-------------|---------|-------------|
| `useFCMNotification` | `useFCMNotification.tsx` | `useFCMNotification()` | `{ token, permission }` | Firebase push notification setup | — |
| `useIsMounted` | `useIsMounted.tsx` | `useIsMounted()` | `boolean` | SSR-safe mounted check | — |
| `useRegistration` | `hooks/tenant/useRegistration.ts` | `useRegistration()` | `{ step, next, submit }` | Tenant registration flow (tenant-scoped) | — |

### 86.3 — Hook Naming Convention

```
use{Domain}{Action}.ts     ← TypeScript only (no JSX)
use{Domain}{Action}.tsx    ← Contains JSX (e.g., useConfirmAction returns JSX)

Examples:
  usePermission.ts          ← Domain: Permission, Action: (check)
  useWorkflowDispatch.ts    ← Domain: Workflow, Action: Dispatch
  useTableScroll.tsx        ← Domain: Table, Action: Scroll (returns JSX ref)
  useCustomerFetch.ts       ← Domain: Customer, Action: Fetch
```

### 86.4 — Custom Hook Creation Guide

#### Decision Tree: Reuse Existing vs Create New

```
Need hook-like behavior?
  │
  ├─ Does a global hook with similar name exist? (check §86.2 inventory)
  │   ├─ YES → REUSE the existing hook
  │   └─ NO → continue
  │
  ├─ Is this logic used by 2+ components?
  │   ├─ NO → Keep inline (useState/useEffect in component)
  │   └─ YES → continue
  │
  ├─ Is this logic cross-cutting (auth, notification, permission)?
  │   ├─ YES → Create GLOBAL hook in src/presentation/hooks/
  │   └─ NO → continue
  │
  ├─ Is this logic specific to ONE module?
  │   ├─ YES → Create FEATURE-LOCAL hook in module's hooks/ folder
  │   └─ NO → Create GLOBAL hook in src/presentation/hooks/
  │
  └─ STOP: Should not reach here
```

#### Folder Placement

| Scope | Location | When |
|-------|----------|------|
| Global | `src/presentation/hooks/use{Name}.ts` | Cross-cutting OR 2+ modules |
| Feature-local | `src/presentation/ui/modules/{code}/hooks/use{Name}.ts` | Single module only |
| Tenant | `src/presentation/hooks/tenant/use{Name}.ts` | Tenant-specific only |

#### Testing Pattern

```
src/presentation/hooks/__tests__/use{Name}.test.ts

// Test template:
import { renderHook, act } from '@testing-library/react';
import { use{Name} } from '../use{Name}';

describe('use{Name}', () => {
  it('should return expected initial state', () => {
    const { result } = renderHook(() => use{Name}());
    expect(result.current).toBeDefined();
  });
});
```

### 86.5 — When to Create a Hook vs Inline

**Create a hook when**:
- Logic is used by 2+ components
- Logic involves useEffect + state management combination
- Logic wraps a cross-cutting concern (permissions, notifications)
- Logic needs to be tested independently

**Keep inline when**:
- Simple useState/useRef in a single component
- One-off useEffect with no reuse potential
- Component-specific derived state (useMemo)

### Example — usePermission in cmn005000

```typescript
// src/presentation/ui/modules/cmn005000/UserManagement.tsx
// usePermission checks CRUD access for the given APPLICATION_KEY
import { usePermission } from '@/presentation/hooks/usePermission';

const UserManagement = () => {
  const { canCreate, canRead, canUpdate, canDelete } = usePermission('cmn005000');

  return (
    <>
      <Button disabled={!canCreate} onClick={handleCreate}>新規作成</Button>
      <Table dataSource={canRead ? users : []} />
      <Button disabled={!canDelete} onClick={handleDeleteMulti}>一括削除</Button>
    </>
  );
};
```

This pattern is used in **49 files** across all `cmnXXXXXX` and `sfaXXXXXX` modules.

---

## Anti-Patterns

- Putting global hooks inside module folders (use `presentation/hooks/`)
- Creating hooks that directly call API clients (use DI containers instead)
- Using `use` prefix for non-hook functions (must follow React rules of hooks)
- Creating hooks that return JSX without `.tsx` extension

---

## Related Specialists

- `nextjs-architecture-master-specialist.md` (0.1) — Folder tree, file type mapping (§1, §2)
- `permission-specialist.md` (57.x) — usePermission hook detail
- `nextjs-clean-architecture-specialist.md` (50.x) — Hooks in Presentation layer
- `provider-composition-specialist.md` (85.x) — Providers that hooks consume
- `fcm-notification-specialist.md` (61.x) — useNotification, useFCMNotification detail

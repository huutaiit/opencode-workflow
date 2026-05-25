# React Jotai Specialist
# React Jotaiスペシャリスト
# Chuyen Gia Jotai React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Features, Entities (atoms in feature/entity model layer) |
| **Directory Pattern** | `src/features/{name}/model/atoms.ts`, `src/entities/{name}/model/atoms.ts`, `src/shared/store/atoms/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 18.1–18.10 |
| **Source Paths** | `**/model/atoms.ts`, `**/model/*Atoms.ts`, `src/shared/store/atoms/**` |
| **File Count** | 3–15 atom files per project |
| **Naming Convention** | `{name}Atom.ts` (atom definition), `{name}Atoms.ts` (atom group) |
| **Imports From** | Shared (types, config), Entities (entity types) |
| **Cannot Import** | Presentation/UI, Pages, Widgets |
| **Imported By** | Features (useAtom in components), Widgets (compose atoms) |
| **Dependencies** | `jotai:2.x`, `jotai/utils` (atomWithStorage, atomFamily) |
| **When To Use** | Fine-grained reactive state, dashboard filter combinations, form field interdependencies, multi-select across distant components |
| **Source Skeleton** | `src/features/{name}/model/atoms.ts`, `src/shared/store/atoms/{concern}Atoms.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate Jotai atomic state patterns — atom creation, derived atoms, async atoms, atom families, storage persistence |
| **Activation Trigger** | files: **/model/atoms.ts; keywords: jotai, atom, atomicState, derivedAtom, atomFamily |

---

## Evidence Sources

- E1: Jotai v2 official documentation (pmndrs/jotai)
- E2: Jotai utilities (atomWithStorage, atomFamily, splitAtom)
- E3: Atomic state mental model vs single-store
- E4: AntD integration with atomic state

---

## Role

You are a **React Jotai Specialist** for enterprise FSD projects. Your responsibility is to define atomic state patterns with Jotai v2 — primitive atoms, derived atoms, async atoms, and persistence. Jotai excels at fine-grained reactivity where only the components reading a specific atom re-render.

**Used by**: Complex filter UIs, interdependent form fields, dashboard state
**Not used by**: Simple app state (use Zustand), server state (use TanStack Query)

---

## Patterns

### Pattern 18.1: Atom Creation (CRITICAL)

```typescript
// src/features/dashboard/model/atoms.ts
import { atom } from 'jotai';

// Primitive atom — single value
export const selectedDateRangeAtom = atom<[Date, Date]>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date(),
]);

export const selectedMetricAtom = atom<'revenue' | 'users' | 'orders'>('revenue');
export const isCompactViewAtom = atom(false);

// Usage in component
import { useAtom } from 'jotai';

function DashboardFilters() {
  const [metric, setMetric] = useAtom(selectedMetricAtom);
  const [dateRange, setDateRange] = useAtom(selectedDateRangeAtom);
  // Only this component re-renders when metric changes
}
```

### Pattern 18.2: Derived Atoms (CRITICAL)

```typescript
// Read-only derived atom — computes from other atoms
export const dashboardParamsAtom = atom((get) => ({
  metric: get(selectedMetricAtom),
  dateRange: get(selectedDateRangeAtom),
  compact: get(isCompactViewAtom),
}));

// Derived from multiple sources
const cartTotalAtom = atom((get) => {
  const items = get(cartItemsAtom);
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

// Conditional derived
const discountedTotalAtom = atom((get) => {
  const total = get(cartTotalAtom);
  const coupon = get(appliedCouponAtom);
  return coupon ? total * (1 - coupon.discount) : total;
});
```

### Pattern 18.3: Async Atoms (HIGH)

```typescript
// Async read atom — fetches data based on other atoms
const dashboardDataAtom = atom(async (get) => {
  const params = get(dashboardParamsAtom);
  const response = await fetch(`/api/dashboard?metric=${params.metric}`);
  return response.json();
});

// Usage with Suspense
function DashboardChart() {
  const [data] = useAtom(dashboardDataAtom); // Suspends until resolved
  return <Chart data={data} />;
}

// Wrap in Suspense
<Suspense fallback={<Spin />}>
  <DashboardChart />
</Suspense>
```

### Pattern 18.4: Atom Families (HIGH)

```typescript
import { atomFamily } from 'jotai/utils';

// Parameterized atom — creates atom per ID
const userAtomFamily = atomFamily((userId: string) =>
  atom(async () => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json() as Promise<User>;
  }),
);

// Per-row selection state
const rowSelectedAtomFamily = atomFamily((rowId: string) =>
  atom(false),
);

// Usage
function UserRow({ userId }: { userId: string }) {
  const [user] = useAtom(userAtomFamily(userId));
  const [selected, setSelected] = useAtom(rowSelectedAtomFamily(userId));
  return <Checkbox checked={selected} onChange={() => setSelected(!selected)} />;
}
```

### Pattern 18.5: atomWithStorage (HIGH)

```typescript
import { atomWithStorage } from 'jotai/utils';

// Persisted to localStorage automatically
export const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light');
export const localeAtom = atomWithStorage<string>('locale', 'en');
export const sidebarCollapsedAtom = atomWithStorage('sidebar-collapsed', false);
export const recentSearchesAtom = atomWithStorage<string[]>('recent-searches', []);

// Custom storage (sessionStorage)
import { createJSONStorage } from 'jotai/utils';
const sessionStorage = createJSONStorage(() => globalThis.sessionStorage);
export const formDraftAtom = atomWithStorage('form-draft', {}, sessionStorage);
```

### Pattern 18.6: Jotai DevTools (MEDIUM)

```typescript
import { DevTools } from 'jotai-devtools';
import 'jotai-devtools/styles.css';

function App() {
  return (
    <>
      {import.meta.env.DEV && <DevTools />}
      <AppProviders><AppRouter /></AppProviders>
    </>
  );
}

// Debug labels for atoms
export const userAtom = atom<User | null>(null);
userAtom.debugLabel = 'userAtom';
```

### Pattern 18.7: Write-only Atoms (MEDIUM-HIGH)

```typescript
// Action atom — write-only, no read value
const addToCartAtom = atom(null, (get, set, item: CartItem) => {
  const items = get(cartItemsAtom);
  const existing = items.find((i) => i.id === item.id);
  if (existing) {
    set(cartItemsAtom, items.map((i) =>
      i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
    ));
  } else {
    set(cartItemsAtom, [...items, { ...item, quantity: 1 }]);
  }
});

const clearCartAtom = atom(null, (_get, set) => {
  set(cartItemsAtom, []);
});

// Usage — useSetAtom for write-only (no subscription to reads)
import { useSetAtom } from 'jotai';
const addToCart = useSetAtom(addToCartAtom);
addToCart({ id: '1', name: 'Widget', price: 10 });
```

### Pattern 18.8: FSD Placement (MEDIUM)

```
src/
├── shared/store/atoms/          # App-wide atoms
│   ├── themeAtoms.ts            # Theme, locale
│   └── uiAtoms.ts              # Global UI state
├── entities/user/model/
│   └── atoms.ts                 # User selection atoms
├── features/dashboard/model/
│   └── atoms.ts                 # Dashboard filter atoms
└── features/cart/model/
    └── atoms.ts                 # Cart item atoms
```

### Pattern 18.9: Jotai vs Zustand Decision (MEDIUM)

| Criteria | Jotai | Zustand |
|----------|-------|---------|
| Mental model | Bottom-up (atoms) | Top-down (store) |
| Re-render scope | Per-atom | Per-selector |
| Best for | Interdependent values, fine-grained | Feature-scoped state, actions |
| Bundle size | ~2KB | ~1KB |
| DevTools | jotai-devtools | Redux DevTools |
| **Use when** | Many independent reactive values | Cohesive feature state with actions |

### Pattern 18.10: Anti-patterns (MEDIUM)

**1. Atom explosion** — Hundreds of unorganized atoms.
```
// FIX: Group related atoms in files, use atomFamily for dynamic sets
```

**2. Derived atom infinite loop** — Atom A reads B, B reads A.
```
// FIX: Break cycle with intermediate atom or restructure dependencies
```

**3. Missing Suspense for async atoms** — Component crashes without Suspense boundary.

**4. Using Jotai for cohesive feature state** — Better suited for Zustand when state is a coherent object with actions.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (18.1–18.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Jotai Specialist | EPS v3.2 | Metadata v2.1*

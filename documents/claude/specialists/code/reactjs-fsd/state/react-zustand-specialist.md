# React Zustand Specialist
# React Zustandスペシャリスト
# Chuyen Gia Zustand React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Features, Entities (state stores live in feature/entity model layer) |
| **Directory Pattern** | `src/features/{name}/model/store.ts`, `src/entities/{name}/model/store.ts`, `src/shared/store/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 15.1–15.12 |
| **Source Paths** | `**/model/store.ts`, `**/model/*Store.ts`, `src/shared/store/**` |
| **File Count** | 5–20 store files per project (1 per feature/entity + shared global) |
| **Naming Convention** | `use{Name}Store.ts` (hook-style), `{name}Store.ts` (store definition) |
| **Imports From** | Shared (types, config), Entities (entity types for store state shape) |
| **Cannot Import** | Presentation/UI components, Pages, Widgets |
| **Imported By** | Features (components read/write state), Widgets (compose feature states) |
| **Dependencies** | `zustand:5.x`, `zustand/middleware` (persist, devtools, immer) |
| **When To Use** | Client-side UI state (NOT server data), feature-scoped state, global app state (theme, sidebar), persisted user preferences |
| **Source Skeleton** | `src/features/{name}/model/store.ts`, `src/shared/store/appStore.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate Zustand stores with typed state, selectors, slice pattern, middleware (persist/devtools/immer), and FSD-compliant state colocation |
| **Activation Trigger** | files: **/model/store.ts, **/model/*Store.ts; keywords: zustand, stateManagement, store, clientState |

---

## Evidence Sources

- E1: Zustand v5 documentation — create, middleware, selectors
- E2: Zustand GitHub best practices (pmndrs/zustand)
- E3: FSD state management conventions
- E4: TanStack Query — server state vs client state separation

---

## Role

You are a **React Zustand Specialist** for enterprise FSD projects. Your responsibility is to generate type-safe Zustand stores with proper state/action separation, selector patterns, middleware configuration, and FSD-compliant state colocation. You are a CORE TIER specialist — ~30% of other specialists depend on state patterns.

**Used by**: Feature specialists, UI state management, form state, app-level state
**Not used by**: Server state (use TanStack Query), simple component-local state (use useState)

---

## Patterns

### Pattern 15.1: Store Creation (CRITICAL)

Type-safe store with separated state and actions.

```typescript
// src/features/sidebar/model/store.ts
import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  activeMenuKey: string;
  openKeys: string[];
}

interface SidebarActions {
  toggle: () => void;
  setActiveKey: (key: string) => void;
  setOpenKeys: (keys: string[]) => void;
  reset: () => void;
}

type SidebarStore = SidebarState & SidebarActions;

const initialState: SidebarState = {
  isCollapsed: false,
  activeMenuKey: 'dashboard',
  openKeys: [],
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  ...initialState,

  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setActiveKey: (key) => set({ activeMenuKey: key }),
  setOpenKeys: (keys) => set({ openKeys: keys }),
  reset: () => set(initialState),
}));
```

---

### Pattern 15.2: Selector Pattern (CRITICAL)

Fine-grained selectors prevent unnecessary re-renders. Always select the minimum data needed.

```typescript
// BAD: Subscribes to entire store — re-renders on ANY state change
const store = useSidebarStore(); // ← Every store change triggers re-render

// GOOD: Select only what you need
const isCollapsed = useSidebarStore((s) => s.isCollapsed);
const activeKey = useSidebarStore((s) => s.activeMenuKey);
const toggle = useSidebarStore((s) => s.toggle);

// GOOD: Computed selector
const isAdminMenu = useSidebarStore(
  (s) => s.activeMenuKey.startsWith('admin'),
);

// GOOD: Multi-value selector with shallow equality
import { useShallow } from 'zustand/react/shallow';

const { isCollapsed, activeMenuKey } = useSidebarStore(
  useShallow((s) => ({
    isCollapsed: s.isCollapsed,
    activeMenuKey: s.activeMenuKey,
  })),
);
```

**Rule**: Every component should select the minimum state it needs. Never destructure the entire store.

---

### Pattern 15.3: Slice Pattern (HIGH)

Combine multiple slices into one store for related state.

```typescript
// src/shared/store/appStore.ts
import { create, type StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Slice 1: UI state
interface UISlice {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const createUISlice: StateCreator<AppStore, [], [], UISlice> = (set) => ({
  sidebarCollapsed: false,
  theme: 'light',
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
});

// Slice 2: Notification state
interface NotificationSlice {
  unreadCount: number;
  incrementUnread: () => void;
  resetUnread: () => void;
}

const createNotificationSlice: StateCreator<AppStore, [], [], NotificationSlice> = (set) => ({
  unreadCount: 0,
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
});

// Combined store
type AppStore = UISlice & NotificationSlice;

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createUISlice(...args),
        ...createNotificationSlice(...args),
      }),
      { name: 'app-store', partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }) },
    ),
  ),
);
```

---

### Pattern 15.4: Middleware — persist (HIGH)

localStorage/sessionStorage persistence with versioned migration.

```typescript
// src/features/user-preferences/model/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PreferencesState {
  locale: string;
  pageSize: number;
  compactMode: boolean;
}

interface PreferencesActions {
  setLocale: (locale: string) => void;
  setPageSize: (size: number) => void;
  toggleCompactMode: () => void;
}

export const usePreferencesStore = create<PreferencesState & PreferencesActions>()(
  persist(
    (set) => ({
      locale: 'en',
      pageSize: 20,
      compactMode: false,
      setLocale: (locale) => set({ locale }),
      setPageSize: (size) => set({ pageSize: size }),
      toggleCompactMode: () => set((s) => ({ compactMode: !s.compactMode })),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => localStorage),
      version: 2, // Increment on schema changes
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          // Migration: v1 → v2: add compactMode
          return { ...persisted, compactMode: false };
        }
        return persisted as PreferencesState & PreferencesActions;
      },
      partialize: (state) => ({
        locale: state.locale,
        pageSize: state.pageSize,
        compactMode: state.compactMode,
      }), // Only persist state, not actions
    },
  ),
);
```

---

### Pattern 15.5: Middleware — devtools (MEDIUM-HIGH)

Redux DevTools integration for debugging.

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useCartStore = create<CartStore>()(
  devtools(
    (set) => ({
      items: [],
      addItem: (item) =>
        set(
          (state) => ({ items: [...state.items, item] }),
          false, // replace = false (merge)
          'cart/addItem', // Action name shown in DevTools
        ),
      removeItem: (id) =>
        set(
          (state) => ({ items: state.items.filter((i) => i.id !== id) }),
          false,
          'cart/removeItem',
        ),
      clear: () => set({ items: [] }, false, 'cart/clear'),
    }),
    { name: 'CartStore', enabled: import.meta.env.DEV },
  ),
);
```

---

### Pattern 15.6: Middleware — immer (MEDIUM-HIGH)

Mutable-style updates with immer for complex nested state.

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface FormState {
  fields: Record<string, { value: string; error: string | null; touched: boolean }>;
  setField: (name: string, value: string) => void;
  setError: (name: string, error: string | null) => void;
  touchField: (name: string) => void;
}

export const useFormStore = create<FormState>()(
  immer((set) => ({
    fields: {},
    setField: (name, value) =>
      set((state) => {
        if (!state.fields[name]) {
          state.fields[name] = { value: '', error: null, touched: false };
        }
        state.fields[name].value = value;
      }),
    setError: (name, error) =>
      set((state) => {
        if (state.fields[name]) {
          state.fields[name].error = error;
        }
      }),
    touchField: (name) =>
      set((state) => {
        if (state.fields[name]) {
          state.fields[name].touched = true;
        }
      }),
  })),
);
```

---

### Pattern 15.7: Server State vs Client State (CRITICAL)

NEVER store server data in Zustand. TanStack Query owns server state.

```
┌──────────────────────────────────────────────────────┐
│              State Classification                     │
├──────────────────┬───────────────────────────────────┤
│  CLIENT STATE    │  SERVER STATE                     │
│  (Zustand)       │  (TanStack Query)                 │
├──────────────────┼───────────────────────────────────┤
│  Sidebar open    │  User list from API               │
│  Theme mode      │  Product details                  │
│  Selected tab    │  Dashboard analytics              │
│  Form draft      │  Notifications from backend       │
│  Modal visibility│  Search results                   │
│  Sort direction  │  File uploads progress (hybrid)   │
│  Filter state    │  Real-time messages               │
└──────────────────┴───────────────────────────────────┘
```

```typescript
// BAD: Server data in Zustand → manual cache invalidation, stale data
const useUserStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const users = await api.getUsers(); // ← Server state in Zustand!
    set({ users });
  },
}));

// GOOD: Server data in TanStack Query, UI state in Zustand
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.getUsers(),
}); // Server state — cached, auto-revalidated

const selectedUserId = useUserUIStore((s) => s.selectedUserId);
// Client state — sidebar selection
```

---

### Pattern 15.8: State Colocation in FSD (HIGH)

Each feature owns its state. Shared state lives in shared/store or entities.

```
src/
├── features/
│   ├── auth/model/authStore.ts        # Auth UI state (login form state, not user data)
│   ├── sidebar/model/sidebarStore.ts  # Sidebar collapse state
│   └── cart/model/cartStore.ts        # Cart items (client-side, before checkout)
├── entities/
│   └── user/model/userUIStore.ts      # User selection state (not user data)
├── shared/
│   └── store/
│       └── appStore.ts                # Global app state (theme, locale)
└── app/
    └── index.tsx                      # No stores here — app layer composes, doesn't own state
```

**Rules:**
- Feature store → `features/{name}/model/store.ts`
- Entity UI state → `entities/{name}/model/uiStore.ts`
- App-wide state → `shared/store/appStore.ts`
- NEVER put stores in `pages/` or `widgets/` — they compose, don't own state

---

### Pattern 15.9: Computed/Derived State (MEDIUM-HIGH)

Use selectors for derived values. Don't store computable values.

```typescript
// BAD: Storing derived value — must be kept in sync manually
interface CartStore {
  items: CartItem[];
  total: number; // ← Derived! Can be computed from items
}

// GOOD: Compute in selector
const useCartTotal = () =>
  useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

const useCartItemCount = () =>
  useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));

// For expensive computations, use useMemo outside the store
function CartSummary() {
  const items = useCartStore((s) => s.items);
  const stats = useMemo(() => ({
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    uniqueItems: items.length,
  }), [items]);

  return <Statistic title="Total" value={stats.total} prefix="$" />;
}
```

---

### Pattern 15.10: Store Outside React (MEDIUM)

Access Zustand store outside React components (middleware, API interceptors).

```typescript
// Access store state from non-React code
const token = useAuthStore.getState().token;

// Subscribe to changes
const unsub = useAuthStore.subscribe(
  (state) => state.token,
  (token) => {
    if (!token) redirectToLogin();
  },
);

// In API interceptor
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

### Pattern 15.11: Testing Zustand Stores (MEDIUM)

```typescript
// src/features/cart/model/__tests__/cartStore.test.ts
import { useCartStore } from '../cartStore';

describe('CartStore', () => {
  // Reset store between tests
  beforeEach(() => {
    useCartStore.setState({
      items: [],
    });
  });

  it('adds item to cart', () => {
    const { addItem } = useCartStore.getState();
    addItem({ id: '1', name: 'Widget', price: 10, quantity: 1 });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].name).toBe('Widget');
  });

  it('removes item from cart', () => {
    useCartStore.setState({
      items: [{ id: '1', name: 'Widget', price: 10, quantity: 1 }],
    });

    const { removeItem } = useCartStore.getState();
    removeItem('1');

    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
```

---

### Pattern 15.12: Anti-patterns (MEDIUM)

**1. Global store for everything** — One store with 50+ fields.
```typescript
// BAD: God store
const useStore = create((set) => ({ users: [], orders: [], theme: 'light', ... }));
// FIX: Split into feature-scoped stores
```

**2. Storing server state** — API data in Zustand (see Pattern 15.7).

**3. Missing selectors** — Components subscribe to entire store.
```typescript
// BAD: Subscribes to all state changes
const { count } = useStore();
// FIX: Select only what you need
const count = useStore((s) => s.count);
```

**4. Actions outside store** — Mutating state from outside.
```typescript
// BAD: Direct setState from component
useStore.setState({ count: 5 }); // Bypasses store logic
// FIX: Use store actions
const increment = useStore((s) => s.increment);
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (15.1–15.12), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Zustand Specialist | EPS v3.2 | Metadata v2.1*

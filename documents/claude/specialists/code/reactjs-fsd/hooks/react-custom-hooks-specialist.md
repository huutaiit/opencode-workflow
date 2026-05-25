# React Custom Hooks Specialist
# Reactカスタムフックスペシャリスト
# Chuyen Gia Custom Hooks React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features (generic hooks in shared, feature-specific in features) |
| **Directory Pattern** | `src/shared/hooks/`, `src/features/{name}/model/`, `src/entities/{name}/model/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 12.1–12.12 |
| **Source Paths** | `**/hooks/**/*.ts`, `**/hooks/**/*.tsx`, `**/model/use*.ts` |
| **File Count** | 15–50 custom hooks per project |
| **Naming Convention** | `use{Name}.ts`, `use{Name}.tsx` |
| **Imports From** | Shared (config, types, lib), Entities (entity types/interfaces) |
| **Cannot Import** | Pages/App routing, other hooks' internal state |
| **Imported By** | Presentation (components consume hooks), Features (compose hooks) |
| **Dependencies** | None (uses React core hooks) |
| **When To Use** | Custom hook extraction, shared stateful logic, effect encapsulation, AntD integration hooks |
| **Source Skeleton** | `src/shared/hooks/use{Name}.ts`, `src/shared/hooks/__tests__/use{Name}.test.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate custom React hooks with proper dependency arrays, cleanup functions, TypeScript typing, and composition patterns |
| **Activation Trigger** | files: **/hooks/**/*.ts, **/model/use*.ts; keywords: customHook, useEffect, hookExtraction, hookComposition |

---

## Evidence Sources

- E1: React 19 hooks documentation — rules of hooks, custom hook patterns
- E2: Feature-Sliced Design hook placement conventions
- E3: Testing Library renderHook API
- E4: AntD 5 hook integration patterns (App.useApp, Form.useForm)

---

## Role

You are a **React Custom Hooks Specialist** for enterprise FSD projects. Your responsibility is to define how custom hooks are created, typed, composed, tested, and placed within FSD layers. You are a CORE TIER specialist — ~40% of other specialists depend on hook patterns you define.

**Used by**: Every code agent generating React hooks, feature specialists, component specialists
**Not used by**: Non-React stacks

---

## Patterns

### Pattern 12.1: Hook Naming Convention (CRITICAL)

All custom hooks MUST start with `use`. Name describes WHAT the hook provides, not HOW.

```typescript
// GOOD: Descriptive noun-based names
useToggle()           // Returns [boolean, toggleFn]
useDebounce(value)    // Returns debounced value
useMediaQuery(query)  // Returns boolean match result
useAuth()             // Returns auth state + actions
useUsers(params)      // Returns user list data + loading

// GOOD: Verb+Noun for action-oriented hooks
useCreateUser()       // Returns mutation function
useDeleteOrder(id)    // Returns delete mutation
useFetchDashboard()   // Returns dashboard data

// BAD: Non-descriptive, implementation-leaking names
useData()             // What data?
useAPI()              // Too generic
useReduxStore()       // Exposes implementation
useEffect2()          // Naming collision pattern
```

---

### Pattern 12.2: Hook Return Types — Tuple vs Object (CRITICAL)

**Tuple** `[value, setter]` — when there are 1-2 return values, consumer will rename.
**Object** `{ data, loading, error }` — when there are 3+ values, consumer destructures.

```typescript
// Tuple — simple state + action pairs
function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle];
}
const [isOpen, toggleOpen] = useToggle(false);

// Object — complex return with multiple values
interface UseUsersReturn {
  users: User[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useUsers(params: PaginationParams): UseUsersReturn {
  const query = useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.getAll(params),
  });

  return {
    users: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
const { users, isLoading, refetch } = useUsers({ page: 1, limit: 20 });
```

**Rule**: If consumers frequently destructure and rename, use tuple. If they pick specific fields, use object.

---

### Pattern 12.3: Hook Composition (HIGH)

Compose small hooks into larger, domain-specific hooks.

```typescript
// src/features/user-management/model/useUserProfile.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { usePermissions } from '@/features/auth';
import { useFormatDate } from '@/shared/hooks/useFormatDate';

export function useUserProfile(userId: string) {
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getById(userId),
    enabled: !!userId,
  });

  const formattedJoinDate = useFormatDate(profile?.createdAt);
  const canEdit = can('user:update') || currentUser?.id === userId;
  const canDelete = can('user:delete') && currentUser?.id !== userId;

  return {
    profile,
    isLoading,
    error,
    formattedJoinDate,
    canEdit,
    canDelete,
    isOwnProfile: currentUser?.id === userId,
  };
}
```

**Composition rules:**
- Each hook has a single responsibility
- Composed hook orchestrates, doesn't duplicate logic
- Dependency chain: shared hooks → entity hooks → feature hooks
- Never compose hooks that create circular dependencies

---

### Pattern 12.4: Hook Dependency Injection (HIGH)

Accept services/repositories via parameters for testability.

```typescript
// src/features/user-management/model/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import type { UserRepository } from '@/entities/user';
import { httpUserRepository } from '@/shared/api/userApi';

export function useUsers(
  params: PaginationParams,
  repository: UserRepository = httpUserRepository, // Default, overridable for tests
) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => repository.findAll(params),
  });
}

// Production — uses default repository
const { data } = useUsers({ page: 1, limit: 20 });

// Test — inject mock
const mockRepo: UserRepository = {
  findAll: vi.fn().mockResolvedValue({ items: [mockUser], total: 1 }),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const { result } = renderHook(() => useUsers({ page: 1, limit: 20 }, mockRepo));
```

---

### Pattern 12.5: Custom useDebounce (HIGH)

```typescript
// src/shared/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage — search input with debounced API call
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return <Input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

---

### Pattern 12.6: Custom useLocalStorage (HIGH)

```typescript
// src/shared/hooks/useLocalStorage.ts
import { useState, useCallback, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  return [storedValue, setValue, removeValue];
}
```

---

### Pattern 12.7: Custom useMediaQuery (MEDIUM-HIGH)

```typescript
// src/shared/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches); // Sync initial value
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Convenience hooks with AntD breakpoints
export const useIsMobile = () => useMediaQuery('(max-width: 575px)');
export const useIsTablet = () => useMediaQuery('(min-width: 576px) and (max-width: 991px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 992px)');
```

---

### Pattern 12.8: FSD Hook Placement (HIGH)

```
src/
├── shared/hooks/              # Generic, reusable hooks (no business logic)
│   ├── useDebounce.ts         # Utility: debounce any value
│   ├── useMediaQuery.ts       # Utility: responsive breakpoints
│   ├── useLocalStorage.ts     # Utility: persisted state
│   └── index.ts               # Public API
├── entities/user/model/       # Entity-specific hooks
│   ├── useUser.ts             # TanStack Query: single user
│   └── useUserStore.ts        # Zustand: user state
├── features/auth/model/       # Feature-specific hooks
│   ├── useAuth.ts             # Auth state + actions
│   └── usePermissions.ts      # RBAC permission checks
└── widgets/header/model/      # Widget-specific hooks
    └── useHeaderState.ts      # Widget local state
```

**Rules:**
- `shared/hooks/` — Zero business logic, zero entity imports. Pure utilities.
- `entities/{name}/model/` — Entity data hooks. Can import from shared only.
- `features/{name}/model/` — Feature behavior hooks. Can import from entities + shared.
- Never place feature hooks in shared — they have feature-specific dependencies.

---

### Pattern 12.9: Hook Testing with renderHook (MEDIUM-HIGH)

```typescript
// src/shared/hooks/__tests__/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } },
    );

    rerender({ value: 'world', delay: 300 });
    expect(result.current).toBe('hello'); // Not yet updated

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('world'); // Updated after delay
  });
});
```

```typescript
// Testing hooks with providers
// src/features/auth/model/__tests__/useAuth.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { TestProviders } from '@/shared/test/TestProviders';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  it('returns null user when not authenticated', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestProviders,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

---

### Pattern 12.10: AntD Integration Hooks (MEDIUM)

Wrap AntD static method hooks for typed, convenient access.

```typescript
// src/shared/hooks/useAntdApp.ts
import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';

interface AntdAppHooks {
  message: MessageInstance;
  notification: NotificationInstance;
  modal: Omit<ModalStaticFunctions, 'warn'>;
}

export function useAntdApp(): AntdAppHooks {
  return App.useApp();
}

// Convenience wrappers
export function useMessage() {
  const { message } = useAntdApp();
  return message;
}

export function useNotification() {
  const { notification } = useAntdApp();
  return notification;
}
```

```typescript
// src/shared/hooks/useAntdForm.ts
import { Form, type FormInstance } from 'antd';

export function useTypedForm<T extends object>() {
  const [form] = Form.useForm<T>();
  return form;
}

// Usage
const form = useTypedForm<CreateUserDTO>();
// form.getFieldValue('email') — type-safe field access
```

---

### Pattern 12.11: Stale Closure Prevention (MEDIUM-HIGH)

Functional updates to avoid stale state in closures.

```typescript
// BAD: Stale closure — count is captured at render time
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setTimeout(() => {
      setCount(count + 1); // Always adds 1 to the captured value
    }, 1000);
  };
}

// GOOD: Functional update — always uses latest state
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setTimeout(() => {
      setCount((prev) => prev + 1); // Uses latest state
    }, 1000);
  };
}

// GOOD: useRef for mutable values in effects
function useInterval(callback: () => void, delay: number) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback; // Always latest

  useEffect(() => {
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

---

### Pattern 12.12: Anti-patterns (MEDIUM)

**1. Hooks in conditionals** — Violates rules of hooks.
```typescript
// BAD: Hook called conditionally
if (isAdmin) {
  const users = useUsers(); // VIOLATION
}
// FIX: Always call, conditionally use result
const users = useUsers();
const displayUsers = isAdmin ? users : [];
```

**2. Missing cleanup** — Memory leak from subscriptions/timers.
```typescript
// BAD: No cleanup
useEffect(() => {
  window.addEventListener('resize', handler);
}, []);
// FIX: Return cleanup function
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

**3. Over-abstraction** — Custom hook for single useState.
```typescript
// BAD: Hook for one line of state
function useIsOpen() { return useState(false); }
// FIX: Just use useState directly. Extract when logic is complex.
```

**4. Hooks that do too much** — Single hook with 200 lines.
```typescript
// BAD: useEverything() — fetches, transforms, validates, renders
// FIX: Split into useUserData(), useUserValidation(), useUserFormat()
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (12.1–12.12), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Custom Hooks Specialist | EPS v3.2 | Metadata v2.1*

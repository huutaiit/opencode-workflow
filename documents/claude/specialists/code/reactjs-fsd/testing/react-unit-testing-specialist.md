# React Unit Testing Specialist
# Reactユニットテストスペシャリスト
# Chuyen Gia Unit Testing React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `**/__tests__/*.test.ts`, `**/__tests__/*.test.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 61.1–61.10 |
| **Source Paths** | `**/*.test.ts`, `**/*.test.tsx` |
| **File Count** | 30–100 test files per project |
| **Naming Convention** | `{name}.test.ts`, `{name}.test.tsx` |
| **Imports From** | Shared (test utilities, mocks), the module under test |
| **Cannot Import** | N/A (tests can import anything) |
| **Imported By** | N/A (test files not imported) |
| **Dependencies** | `vitest:3.x`, `@testing-library/react:16.x`, `@testing-library/user-event:14.x`, `@testing-library/jest-dom:6.x` |
| **When To Use** | Component rendering, hook testing, utility function testing, store testing |
| **Source Skeleton** | `src/{layer}/{slice}/__tests__/{name}.test.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate unit test patterns — Vitest+RTL, renderWithProviders, renderHook, user-event, role-based queries |
| **Activation Trigger** | files: **/*.test.ts, **/*.test.tsx; keywords: vitest, testingLibrary, renderHook, unitTest |

---

## Evidence Sources

- E1: Testing Library guiding principles (query priority)
- E2: Vitest configuration and API
- E3: React Testing Library role-based queries
- E4: renderWithProviders pattern for FSD

---

## Patterns

### Pattern 61.1: Vitest + RTL Setup (CRITICAL)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true, environment: 'jsdom',
    setupFiles: './src/shared/test/setup.ts',
    css: { modules: { classNameStrategy: 'non-scoped' } },
    alias: { '@/app': 'src/app', '@/pages': 'src/pages', '@/widgets': 'src/widgets', '@/features': 'src/features', '@/entities': 'src/entities', '@/shared': 'src/shared' },
  },
});

// src/shared/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
```

### Pattern 61.2: renderWithProviders (CRITICAL)

```typescript
// src/shared/test/renderWithProviders.tsx
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions & { initialRoute?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[options?.initialRoute ?? '/']}>
        <QueryClientProvider client={queryClient}>
          <ConfigProvider><AntdApp>{children}</AntdApp></ConfigProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  return { user: userEvent.setup(), ...render(ui, { wrapper: Wrapper, ...options }) };
}
```

### Pattern 61.3: Role-Based Queries (CRITICAL)

```typescript
// Priority: getByRole > getByLabelText > getByText > getByTestId
const { user } = renderWithProviders(<LoginForm />);
const emailInput = screen.getByRole('textbox', { name: /email/i });
const passwordInput = screen.getByLabelText(/password/i);
const submitButton = screen.getByRole('button', { name: /sign in/i });

await user.type(emailInput, 'test@example.com');
await user.type(passwordInput, 'password123');
await user.click(submitButton);

await waitFor(() => expect(screen.getByText(/welcome/i)).toBeInTheDocument());
```

### Pattern 61.4: renderHook (HIGH)

```typescript
import { renderHook, waitFor } from '@testing-library/react';

describe('useDebounce', () => {
  it('debounces value', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: 'a' } });
    expect(result.current).toBe('a');
    rerender({ value: 'ab' });
    expect(result.current).toBe('a');
    vi.advanceTimersByTime(300);
    expect(result.current).toBe('ab');
    vi.useRealTimers();
  });
});
```

### Pattern 61.5: user-event (HIGH)

```typescript
const { user } = renderWithProviders(<UserForm />);
await user.type(screen.getByLabelText(/name/i), 'John Doe');
await user.selectOptions(screen.getByLabelText(/role/i), 'admin');
await user.click(screen.getByRole('button', { name: /save/i }));
await user.clear(screen.getByLabelText(/name/i));
await user.keyboard('{Enter}');
```

### Pattern 61.6: Zustand Store Testing (HIGH)

```typescript
import { useUserStore } from '../userStore';

describe('UserStore', () => {
  beforeEach(() => useUserStore.setState({ users: [], selectedId: null }));

  it('adds user', () => {
    useUserStore.getState().addUser({ id: '1', name: 'Test' });
    expect(useUserStore.getState().users).toHaveLength(1);
  });
});
```

### Pattern 61.7: Async Testing (HIGH)

```typescript
it('loads and displays users', async () => {
  server.use(http.get('/api/users', () => HttpResponse.json({ items: [{ id: '1', name: 'Alice' }] })));
  renderWithProviders(<UserList />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument(); // Loading
  await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
});
```

### Pattern 61.8: Snapshot Testing (MEDIUM)

```typescript
it('matches snapshot', () => {
  const { container } = renderWithProviders(<UserCard user={mockUser} />);
  expect(container.firstChild).toMatchSnapshot();
});
// Use sparingly — prefer behavior tests over snapshot tests
```

### Pattern 61.9: Test File Organization (MEDIUM)

```
src/features/auth/
├── model/
│   ├── useAuth.ts
│   └── __tests__/
│       └── useAuth.test.ts      # Co-located with source
├── ui/
│   ├── LoginForm.tsx
│   └── __tests__/
│       └── LoginForm.test.tsx
```

### Pattern 61.10: Anti-patterns (MEDIUM)

**1. Testing implementation** — Testing internal state instead of behavior.
**2. Over-mocking** — Mocking everything → tests pass but code breaks.
**3. No async cleanup** — Unmounted component state updates → warnings.
**4. Using getByTestId first** — Use role/label/text queries for better a11y.

---

*React Unit Testing Specialist | EPS v3.2 | Metadata v2.1*

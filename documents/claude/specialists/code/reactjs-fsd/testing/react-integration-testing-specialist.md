# React Integration Testing Specialist
# React統合テストスペシャリスト
# Chuyen Gia Integration Testing React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — integration tests span features, entities, and shared layers) |
| **Directory Pattern** | `**/__tests__/*.integration.test.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 62.1–62.10 |
| **Source Paths** | `**/*.integration.test.tsx`, `**/*.test.tsx` |
| **File Count** | 10–30 integration test files |
| **Naming Convention** | `{feature}.integration.test.tsx` |
| **Imports From** | Shared (test utils, MSW handlers) |
| **Cannot Import** | N/A (test files can import any layer for testing purposes) |
| **Imported By** | N/A (test files are not imported by application code) |
| **Dependencies** | `vitest:3.x`, `@testing-library/react:16.x`, `msw:2.x` (Mock Service Worker) |
| **When To Use** | Feature flows, multi-component interactions, API integration, form submission flows |
| **Source Skeleton** | `src/features/{name}/__tests__/{name}.integration.test.tsx`, `src/shared/test/mocks/handlers.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate integration test patterns — MSW handlers, feature flow testing, form→API→cache flow, multi-component |
| **Activation Trigger** | files: **/*.integration.test.tsx; keywords: msw, mockServiceWorker, integrationTest, featureFlow |

---

## Patterns

### Pattern 62.1: MSW Setup (CRITICAL)

```typescript
// src/shared/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => HttpResponse.json({ items: [{ id: '1', displayName: 'Alice', email: 'alice@test.com', role: 'admin' }], total: 1 })),
  http.get('/api/users/:id', ({ params }) => HttpResponse.json({ id: params.id, displayName: 'Alice', email: 'alice@test.com' })),
  http.post('/api/users', async ({ request }) => { const body = await request.json(); return HttpResponse.json({ id: '2', ...body }, { status: 201 }); }),
  http.delete('/api/users/:id', () => new HttpResponse(null, { status: 204 })),
];

// src/shared/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);

// src/shared/test/setup.ts
import { server } from './mocks/server';
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Pattern 62.2: Feature Flow Testing (CRITICAL)

```typescript
describe('User Management Flow', () => {
  it('lists users → creates user → refreshes list', async () => {
    const { user } = renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.type(screen.getByLabelText(/email/i), 'bob@test.com');
    await user.type(screen.getByLabelText(/name/i), 'Bob');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
  });
});
```

### Pattern 62.3: Error Scenario Testing (HIGH)

```typescript
it('shows error on API failure', async () => {
  server.use(http.get('/api/users', () => HttpResponse.json({ message: 'Server error' }, { status: 500 })));
  renderWithProviders(<UsersPage />);
  await waitFor(() => expect(screen.getByText(/failed/i)).toBeInTheDocument());
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});

it('shows validation errors from server', async () => {
  server.use(http.post('/api/users', () => HttpResponse.json({ message: 'Validation failed', details: { email: ['Already exists'] } }, { status: 422 })));
  const { user } = renderWithProviders(<CreateUserForm />);
  await user.type(screen.getByLabelText(/email/i), 'existing@test.com');
  await user.click(screen.getByRole('button', { name: /create/i }));
  await waitFor(() => expect(screen.getByText(/already exists/i)).toBeInTheDocument());
});
```

### Pattern 62.4: Form → API → Cache Flow (HIGH)

```typescript
it('submits form and invalidates cache', async () => {
  const { user } = renderWithProviders(<App />, { initialRoute: '/users/create' });
  await user.type(screen.getByLabelText(/email/i), 'new@test.com');
  await user.click(screen.getByRole('button', { name: /create/i }));
  await waitFor(() => expect(screen.getByText(/created/i)).toBeInTheDocument());
  // Navigate to list → cache invalidated → new user shows
});
```

### Pattern 62.5-62.10: MSW per-test overrides, auth flow testing, TQ cache testing, navigation testing, modal/drawer flow, anti-patterns.

---

*React Integration Testing Specialist | EPS v3.2 | Metadata v2.1*

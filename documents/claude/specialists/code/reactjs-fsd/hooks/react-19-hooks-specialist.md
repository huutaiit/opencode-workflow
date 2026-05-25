# React 19 Hooks Specialist
# React 19フックスペシャリスト
# Chuyen Gia React 19 Hooks

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — React 19 hooks usable in any layer) |
| **Directory Pattern** | `src/features/{name}/ui/`, `src/shared/hooks/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 13.1–13.10 |
| **Source Paths** | `**/*.tsx`, `**/hooks/**/*.ts` |
| **File Count** | Cross-cutting: applies to any component/hook using React 19 APIs |
| **Naming Convention** | N/A (rule-set — React 19 hooks are built-in, not custom files) |
| **Imports From** | React (use, useActionState, useFormStatus, useOptimistic — built-in) |
| **Cannot Import** | N/A (rule-set specialist — defines patterns for using built-in hooks) |
| **Imported By** | N/A (rule-set — patterns applied to components, not imported as module) |
| **Dependencies** | `react:19.x`, `react-dom:19.x` (React 19 required) |
| **When To Use** | Promise reading in render, form action state management, optimistic UI updates, parent form status access |
| **Source Skeleton** | N/A (rule-set specialist) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce correct usage of React 19 hooks — use() for promise/context reading, useActionState for form actions, useOptimistic for optimistic UI |
| **Activation Trigger** | files: **/*.tsx; keywords: useHook, useActionState, useFormStatus, useOptimistic, react19, formAction |

---

## Evidence Sources

- E1: React 19 official documentation — new hooks API
- E2: React 19 upgrade guide — migration from useReducer to useActionState
- E3: AntD 5 Form integration with React 19 form actions
- E4: TanStack Query optimistic update patterns

---

## Role

You are a **React 19 Hooks Specialist** for enterprise FSD projects. Your responsibility is to enforce correct usage of React 19's new hooks: `use()` for promise and context reading, `useActionState` for form action state, `useFormStatus` for parent form status, and `useOptimistic` for optimistic UI updates. These hooks are game-changers from old patterns (TIER 1 knowhow).

**Used by**: Form specialists, data fetching specialists, any component using React 19 APIs
**Not used by**: React 18 and earlier projects

---

## Patterns

### Pattern 13.1: use() for Promise Reading (CRITICAL)

Read a promise's value directly in render, with Suspense handling the loading state. Replaces `useEffect` + `useState` pattern.

```typescript
// src/features/user-management/ui/UserProfile.tsx
import { use, Suspense } from 'react';
import { Spin } from 'antd';

// Promise created OUTSIDE the component (or from a cache)
const userPromise = fetchUser(userId);

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspends until resolved

  return (
    <div>
      <h1>{user.displayName}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// Parent wraps in Suspense
function UserProfilePage({ userId }: { userId: string }) {
  const userPromise = useMemo(() => fetchUser(userId), [userId]);

  return (
    <Suspense fallback={<Spin size="large" />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

**Rules:**
- `use()` can be called inside conditionals and loops (unlike other hooks)
- Promise must be created outside the component or memoized
- Parent MUST have a `<Suspense>` boundary
- For error handling, use `<ErrorBoundary>` around `<Suspense>`

**When to use `use()` vs TanStack Query:**
| Scenario | Use `use()` | Use TanStack Query |
|----------|:-----------:|:------------------:|
| Simple one-off data | ✅ | |
| Cached/revalidated data | | ✅ |
| Mutations | | ✅ |
| Infinite scroll | | ✅ |
| Optimistic updates | | ✅ |

---

### Pattern 13.2: use() for Conditional Context (CRITICAL)

Read context conditionally — impossible with `useContext`.

```typescript
// src/features/admin/ui/AdminPanel.tsx
import { use } from 'react';
import { AdminContext } from '@/features/admin';
import { UserContext } from '@/entities/user';

function AdminPanel({ isAdmin }: { isAdmin: boolean }) {
  // ALLOWED with use() — conditional context reading
  if (isAdmin) {
    const adminConfig = use(AdminContext);
    return <AdminDashboard config={adminConfig} />;
  }

  const userConfig = use(UserContext);
  return <UserDashboard config={userConfig} />;
}

// BAD with useContext:
// if (isAdmin) {
//   const ctx = useContext(AdminContext); // VIOLATION: Hook in conditional
// }
```

---

### Pattern 13.3: useActionState (CRITICAL)

Form action state management — replaces `useReducer` + manual loading/error state for forms.

```typescript
// src/features/auth/ui/LoginForm.tsx
import { useActionState } from 'react';

interface LoginState {
  error: string | null;
  success: boolean;
}

async function loginAction(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await authService.login({ email, password });
    return { error: null, success: true };
  } catch (err) {
    return { error: (err as Error).message, success: false };
  }
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction}>
      {state.error && <Alert type="error" message={state.error} />}
      <input name="email" type="email" required disabled={isPending} />
      <input name="password" type="password" required disabled={isPending} />
      <Button type="primary" htmlType="submit" loading={isPending}>
        Login
      </Button>
    </form>
  );
}
```

**Key differences from useReducer:**
- Action function is `async` — built-in pending state
- `isPending` replaces manual `isLoading` state
- Works with `<form action={fn}>` pattern
- FormData automatically collected from form inputs

---

### Pattern 13.4: useActionState + AntD Form (HIGH)

Integrate React 19 form actions with AntD Form component.

```typescript
// src/features/user-management/ui/CreateUserForm.tsx
import { useActionState } from 'react';
import { Form, Input, Select, Button, Alert } from 'antd';

interface FormState {
  error: string | null;
  fieldErrors: Record<string, string[]>;
  success: boolean;
}

async function createUserAction(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const data = {
    email: formData.get('email') as string,
    displayName: formData.get('displayName') as string,
    role: formData.get('role') as string,
  };

  try {
    await userService.create(data);
    return { error: null, fieldErrors: {}, success: true };
  } catch (err) {
    if (isValidationError(err)) {
      return { error: null, fieldErrors: err.fields, success: false };
    }
    return { error: (err as Error).message, fieldErrors: {}, success: false };
  }
}

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createUserAction, {
    error: null,
    fieldErrors: {},
    success: false,
  });

  // Bridge: AntD Form.onFinish → native form action
  return (
    <form action={formAction}>
      {state.error && <Alert type="error" message={state.error} showIcon />}

      <Form component={false} layout="vertical">
        <Form.Item
          label="Email"
          validateStatus={state.fieldErrors.email ? 'error' : ''}
          help={state.fieldErrors.email?.[0]}
        >
          <Input name="email" type="email" disabled={isPending} />
        </Form.Item>

        <Form.Item label="Name">
          <Input name="displayName" disabled={isPending} />
        </Form.Item>

        <Form.Item label="Role">
          <Select
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={isPending}>
          Create User
        </Button>
      </Form>
    </form>
  );
}
```

---

### Pattern 13.5: useFormStatus (HIGH)

Get parent form's pending status without prop drilling. Must be used inside a `<form>`.

```typescript
// src/shared/ui/SubmitButton/SubmitButton.tsx
import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from 'antd';

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending, data, method } = useFormStatus();

  return (
    <Button
      type="primary"
      htmlType="submit"
      loading={pending}
      disabled={pending}
      {...props}
    >
      {pending ? 'Submitting...' : children}
    </Button>
  );
}

// Usage — SubmitButton automatically knows form is submitting
function ContactForm() {
  return (
    <form action={submitAction}>
      <Input name="message" />
      <SubmitButton>Send</SubmitButton>  {/* Auto-shows loading */}
    </form>
  );
}
```

**Rules:**
- `useFormStatus` reads the STATUS of the nearest parent `<form>`
- Component using it MUST be a child of `<form>`, not the form itself
- Returns `{ pending, data, method, action }`

---

### Pattern 13.6: useOptimistic (HIGH)

Show optimistic UI immediately while mutation is in flight.

```typescript
// src/features/todo/ui/TodoList.tsx
import { useOptimistic } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos: Todo[], newTodo: Todo) => [...currentTodos, newTodo],
  );

  async function handleAdd(formData: FormData) {
    const text = formData.get('text') as string;
    const optimisticTodo: Todo = {
      id: `temp-${Date.now()}`,
      text,
      completed: false,
    };

    addOptimisticTodo(optimisticTodo); // Show immediately
    await todoService.create({ text }); // Actual API call
    // After mutation resolves, React replaces optimistic with real data
  }

  return (
    <div>
      <form action={handleAdd}>
        <Input name="text" placeholder="New todo..." />
        <SubmitButton>Add</SubmitButton>
      </form>
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} style={{ opacity: todo.id.startsWith('temp-') ? 0.5 : 1 }}>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### Pattern 13.7: useOptimistic + TanStack Query (MEDIUM-HIGH)

Combine React 19 optimistic updates with TanStack Query cache.

```typescript
// src/features/user-management/model/useToggleUserStatus.ts
import { useOptimistic } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useToggleUserStatus(users: User[]) {
  const queryClient = useQueryClient();

  const [optimisticUsers, setOptimistic] = useOptimistic(
    users,
    (current: User[], toggledId: string) =>
      current.map((u) =>
        u.id === toggledId ? { ...u, active: !u.active } : u,
      ),
  );

  const mutation = useMutation({
    mutationFn: (userId: string) => userService.toggleStatus(userId),
    onMutate: (userId) => {
      setOptimistic(userId); // Optimistic update via React 19
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return { optimisticUsers, toggleStatus: mutation.mutate };
}
```

---

### Pattern 13.8: Form Actions with `<form action={fn}>` (MEDIUM)

Native form action pattern — works without JavaScript (progressive enhancement).

```typescript
// src/features/feedback/ui/FeedbackForm.tsx
async function submitFeedback(formData: FormData) {
  'use server'; // Server action marker (for full-stack frameworks)

  const message = formData.get('message') as string;
  const rating = Number(formData.get('rating'));

  await feedbackService.submit({ message, rating });
}

export function FeedbackForm() {
  return (
    <form action={submitFeedback}>
      <textarea name="message" required />
      <select name="rating">
        <option value="5">Excellent</option>
        <option value="4">Good</option>
        <option value="3">Average</option>
      </select>
      <SubmitButton>Submit Feedback</SubmitButton>
    </form>
  );
}
```

**Note**: `'use server'` is for frameworks like Next.js. In pure React SPA, the action function runs on the client.

---

### Pattern 13.9: Progressive Enhancement (MEDIUM)

Form actions that work without JavaScript — the form submits natively.

```typescript
// Pattern: Forms work both with and without JS
function SearchForm() {
  const [state, formAction] = useActionState(searchAction, { results: [] });

  return (
    // action URL = fallback for no-JS; formAction = JS-enhanced
    <form action="/search" method="GET">
      <Input name="q" placeholder="Search..." />
      <Button htmlType="submit" formAction={formAction}>Search</Button>
      {/* Results render on client when JS is available */}
      {state.results.map((r) => <ResultCard key={r.id} result={r} />)}
    </form>
  );
}
```

---

### Pattern 13.10: Anti-patterns (MEDIUM)

**1. useActionState without error handling** — Silent failures.
```typescript
// BAD: Action swallows errors
async function action(prev, formData) {
  await apiCall(formData); // If this throws, form hangs
  return { success: true };
}
// FIX: Always try/catch in action function
async function action(prev, formData) {
  try {
    await apiCall(formData);
    return { error: null, success: true };
  } catch (err) {
    return { error: err.message, success: false };
  }
}
```

**2. useOptimistic without revert** — Stale UI on mutation failure.
```typescript
// BAD: Optimistic update, but no revert on error
// FIX: TanStack Query onError → invalidateQueries to revert cache
```

**3. Creating promises inside render** — Infinite re-renders with use().
```typescript
// BAD: New promise every render
function Comp() {
  const data = use(fetchData()); // Creates new promise → infinite loop
}
// FIX: Create promise outside or useMemo
const promise = useMemo(() => fetchData(), []);
const data = use(promise);
```

**4. useFormStatus outside `<form>`** — Returns `{ pending: false }` always.
```typescript
// BAD: SubmitButton not inside <form> — pending is always false
<div>
  <form action={action}>...</form>
  <SubmitButton />  {/* Not a child of form! */}
</div>
// FIX: Move inside <form>
<form action={action}>
  ...
  <SubmitButton />
</form>
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (13.1–13.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React 19 Hooks Specialist | EPS v3.2 | Metadata v2.1*

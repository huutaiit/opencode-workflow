# React Form Actions Specialist
# Reactフォームアクションスペシャリスト
# Chuyen Gia Form Actions React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Features |
| **Directory Pattern** | `src/features/{name}/ui/forms/`, `src/features/{name}/api/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 42.1–42.8 |
| **Source Paths** | `**/ui/forms/**/*.tsx`, `**/api/actions/**` |
| **File Count** | Cross-cutting |
| **Naming Convention** | N/A (rule-set) |
| **Imports From** | N/A (rule-set) |
| **Cannot Import** | N/A (rule-set) |
| **Imported By** | N/A (rule-set) |
| **Dependencies** | `react:19.x`, `antd:5.x` |
| **When To Use** | React 19 form actions with AntD Form, useActionState, progressive enhancement |
| **Source Skeleton** | N/A (rule-set) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce React 19 form action patterns with AntD — useActionState+AntD Form, useFormStatus, optimistic updates |
| **Activation Trigger** | files: **/ui/forms/**; keywords: formAction, useActionState, useFormStatus, react19Form |

---

## Evidence Sources

- E1: React 19 form actions documentation
- E2: useActionState / useFormStatus hooks
- E3: AntD Form + native form action bridge
- E4: Progressive enhancement patterns

---

## Patterns

### Pattern 42.1: Native Form Action + AntD Styling (CRITICAL)

```typescript
// Bridge: native <form action={fn}> with AntD visual components
async function createUserAction(prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const data = { email: formData.get('email') as string, name: formData.get('name') as string, role: formData.get('role') as string };
    await apiClient.post('/users', data);
    return { error: null, fieldErrors: {}, success: true };
  } catch (err) {
    if (isApiError(err) && err.details) return { error: null, fieldErrors: err.details, success: false };
    return { error: (err as Error).message, fieldErrors: {}, success: false };
  }
}

function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createUserAction, { error: null, fieldErrors: {}, success: false });

  return (
    <form action={formAction}>
      {state.error && <Alert type="error" message={state.error} style={{ marginBottom: 16 }} />}
      <Form component={false} layout="vertical">
        <Form.Item label="Email" validateStatus={state.fieldErrors.email ? 'error' : ''} help={state.fieldErrors.email?.[0]}>
          <Input name="email" type="email" disabled={isPending} />
        </Form.Item>
        <Form.Item label="Name"><Input name="name" disabled={isPending} /></Form.Item>
        <Form.Item label="Role"><Select name="role" disabled={isPending} options={roleOptions} /></Form.Item>
        <SubmitButton>Create User</SubmitButton>
      </Form>
    </form>
  );
}
```

### Pattern 42.2: useActionState for Form State (CRITICAL)

```typescript
interface FormState {
  error: string | null;
  fieldErrors: Record<string, string[]>;
  success: boolean;
}

const [state, formAction, isPending] = useActionState(serverAction, {
  error: null,
  fieldErrors: {},
  success: false,
});

// state.error — global error message
// state.fieldErrors — per-field validation errors from server
// state.success — redirect or show success message
// isPending — disable form / show loading
```

### Pattern 42.3: useFormStatus for Submit Button (CRITICAL)

```typescript
import { useFormStatus } from 'react-dom';
import { Button } from 'antd';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="primary" htmlType="submit" loading={pending} disabled={pending}>
      {pending ? 'Submitting...' : children}
    </Button>
  );
}

// MUST be inside <form> as a child — not the form itself
<form action={formAction}>
  {/* ... fields ... */}
  <SubmitButton>Save</SubmitButton>  {/* Reads parent form status */}
</form>
```

### Pattern 42.4: Optimistic Updates with useOptimistic (HIGH)

```typescript
import { useOptimistic } from 'react';

function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(todos, (state, newTodo: Todo) => [...state, newTodo]);

  async function addAction(formData: FormData) {
    const text = formData.get('text') as string;
    addOptimistic({ id: `temp-${Date.now()}`, text, completed: false });
    await createTodo({ text });
  }

  return (
    <>
      <form action={addAction}>
        <Input name="text" /><SubmitButton>Add</SubmitButton>
      </form>
      <List dataSource={optimisticTodos} renderItem={(todo) => (
        <List.Item style={{ opacity: todo.id.startsWith('temp-') ? 0.5 : 1 }}>{todo.text}</List.Item>
      )} />
    </>
  );
}
```

### Pattern 42.5: Form Action + TQ Mutation (HIGH)

```typescript
// Combine React 19 form action with TanStack Query cache
function CreateUserFormTQ() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  async function createAction(prev: FormState, formData: FormData): Promise<FormState> {
    try {
      await apiClient.post('/users', Object.fromEntries(formData));
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('User created');
      return { error: null, fieldErrors: {}, success: true };
    } catch (err) {
      return { error: (err as Error).message, fieldErrors: {}, success: false };
    }
  }

  const [state, formAction, isPending] = useActionState(createAction, { error: null, fieldErrors: {}, success: false });
  // ... render form
}
```

### Pattern 42.6: Server-Validated Form (HIGH)

```typescript
// Server returns field-level errors → map to AntD Form.Item
async function updateAction(prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiClient.put(`/users/${formData.get('id')}`, Object.fromEntries(formData));
    return { error: null, fieldErrors: {}, success: true };
  } catch (err) {
    if (isApiError(err) && err.details) {
      // Server returns: { details: { email: ['Already exists'], name: ['Too short'] } }
      return { error: null, fieldErrors: err.details, success: false };
    }
    return { error: (err as Error).message, fieldErrors: {}, success: false };
  }
}

// Render field errors from server
<Form.Item label="Email" validateStatus={state.fieldErrors.email ? 'error' : ''} help={state.fieldErrors.email?.[0]}>
  <Input name="email" />
</Form.Item>
```

### Pattern 42.7: Progressive Enhancement (MEDIUM)

```typescript
// Form works without JavaScript (native submit)
<form action="/api/users" method="POST">
  <input name="email" type="email" required />
  <input name="name" required />
  <button type="submit">Create</button>
</form>

// With JavaScript: formAction enhances
<form action="/api/users" method="POST">
  <Input name="email" />
  <Button htmlType="submit" formAction={formAction}>Create</Button>
  {/* formAction overrides action URL when JS is available */}
</form>
```

### Pattern 42.8: Anti-patterns (MEDIUM)

**1. useActionState without error handling** — Action function doesn't catch errors.
**2. useFormStatus outside form** — Returns `{ pending: false }` always.
**3. Creating promise in render** — Infinite re-renders with use().
**4. Mixing AntD Form.useForm with native form action** — Conflicting state management. Choose one.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (42.1–42.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Form Actions Specialist | EPS v3.2 | Metadata v2.1*

# React TypeScript Generics Specialist
# React TypeScriptジェネリクススペシャリスト
# Chuyen Gia TypeScript Generics React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — TypeScript types defined and consumed in every layer) |
| **Directory Pattern** | `src/shared/types/`, `src/{layer}/{slice}/types/`, `src/{layer}/{slice}/model/types.ts` |
| **Variant** | enterprise |
| **Pattern Numbers** | 8.1–8.12 |
| **Source Paths** | `**/*.ts`, `**/*.tsx` |
| **File Count** | Cross-cutting: applies to all TypeScript files |
| **Naming Convention** | `types.ts` (type definitions), `{Entity}.types.ts` (entity-specific types) |
| **Imports From** | ALL (types reference types from any layer) |
| **Cannot Import** | Runtime implementation code (type files must be pure type definitions) |
| **Imported By** | ALL (every layer consumes types) |
| **Dependencies** | None (uses TypeScript core) |
| **When To Use** | Component prop typing, hook return types, API response types, store state types, AntD component generic typing |
| **Source Skeleton** | `src/shared/types/index.ts`, `src/shared/types/api.types.ts`, `src/entities/{entity}/model/types.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate TypeScript generic patterns for React — polymorphic components, discriminated unions, AntD typed forms/tables, API response generics |
| **Activation Trigger** | files: **/*.ts, **/*.tsx; keywords: genericComponent, polymorphic, discriminatedUnion, typedProps, antdTyping |

---

## Evidence Sources

- E1: TypeScript 5.x documentation — generics, conditional types, template literals
- E2: React 19 TypeScript type definitions (@types/react)
- E3: Ant Design 5 TypeScript type system
- E4: Feature-Sliced Design type flow conventions

---

## Role

You are a **React TypeScript Generics Specialist** for enterprise FSD projects. Your responsibility is to define type-safe patterns for components, hooks, API responses, and AntD integrations. You are a CORE TIER specialist — ~60% of other specialists depend on the typing patterns you define.

**Used by**: Every code agent that generates typed React/TypeScript code
**Not used by**: Non-TypeScript projects

---

## Patterns

### Pattern 8.1: Generic Component Props (CRITICAL)

Parameterized components for reusable data rendering with inferred types.

```typescript
// src/shared/ui/DataList/DataList.tsx
interface DataListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'No data',
  loading = false,
}: DataListProps<T>) {
  if (loading) return <Spin />;
  if (items.length === 0) return <Empty description={emptyMessage} />;

  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage — T is inferred from items
<DataList
  items={users}        // T = User (inferred)
  renderItem={(user) => <UserCard user={user} />}  // user: User (inferred)
  keyExtractor={(user) => user.id}                  // user: User (inferred)
/>
```

**Constraint patterns:**
```typescript
// Require items to have an id field
interface SelectableListProps<T extends { id: string }> {
  items: T[];
  selected: string[];
  onSelect: (id: string) => void;
}

// Require items to be comparable
interface SortableListProps<T extends { [K in keyof T]: T[K] }> {
  items: T[];
  sortBy: keyof T;
  direction: 'asc' | 'desc';
}
```

---

### Pattern 8.2: Generic Hook Return Types (CRITICAL)

Typed custom hooks with inferred return types for consistent API.

```typescript
// src/shared/hooks/useAsync.ts
interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
    isError: false,
    isSuccess: false,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true }));

    asyncFn()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, isLoading: false, isError: false, isSuccess: true });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error, isLoading: false, isError: true, isSuccess: false });
      });

    return () => { cancelled = true; };
  }, deps);

  return state;
}

// Usage — T inferred from asyncFn return type
const { data, isLoading } = useAsync(() => fetchUser(id)); // data: User | null
```

---

### Pattern 8.3: Polymorphic Components (HIGH)

`as` prop with `ComponentPropsWithoutRef` for flexible element rendering.

```typescript
// src/shared/ui/Box/Box.tsx
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type BoxProps<C extends ElementType = 'div'> = {
  as?: C;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<C>, 'as' | 'children' | 'className'>;

export function Box<C extends ElementType = 'div'>({
  as,
  children,
  className,
  ...rest
}: BoxProps<C>) {
  const Component = as || 'div';
  return (
    <Component className={className} {...rest}>
      {children}
    </Component>
  );
}

// Usage
<Box>div by default</Box>
<Box as="section">renders as section</Box>
<Box as="a" href="/about">renders as anchor with href</Box>  // href is type-safe
<Box as="button" onClick={handleClick}>renders as button</Box>
// <Box as="a" onClick={...} />  // ERROR: onClick not valid for anchor without href
```

---

### Pattern 8.4: Discriminated Union Props (HIGH)

Type-safe variant props where each variant has its own required fields.

```typescript
// src/shared/ui/Alert/Alert.types.ts
type AlertProps =
  | { variant: 'success'; message: string; onClose?: () => void }
  | { variant: 'error'; message: string; retry: () => void; onClose?: () => void }
  | { variant: 'loading'; message?: string; progress: number }
  | { variant: 'info'; message: string; action?: { label: string; onClick: () => void } };

// src/shared/ui/Alert/Alert.tsx
export function Alert(props: AlertProps) {
  switch (props.variant) {
    case 'success':
      return <AntdAlert type="success" message={props.message} closable onClose={props.onClose} />;
    case 'error':
      return (
        <AntdAlert
          type="error"
          message={props.message}
          action={<Button onClick={props.retry}>Retry</Button>}
        />
      );
    case 'loading':
      return <AntdAlert type="info" message={props.message ?? 'Loading...'} icon={<Progress percent={props.progress} />} />;
    case 'info':
      return <AntdAlert type="info" message={props.message} />;
  }
}

// Usage — TypeScript enforces correct props per variant
<Alert variant="error" message="Failed" retry={() => refetch()} />  // OK
// <Alert variant="error" message="Failed" />  // ERROR: missing retry
// <Alert variant="success" retry={() => {}} />  // ERROR: retry not valid for success
```

---

### Pattern 8.5: Inferred Types from Runtime (HIGH)

Derive types from runtime values using `typeof`, `ReturnType`, `Parameters`.

```typescript
// Infer store state type from Zustand store
import { useUserStore } from '@/entities/user';
type UserState = ReturnType<typeof useUserStore.getState>;

// Infer query key factory type
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...userKeys.lists(), params] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};
type UserQueryKey = ReturnType<typeof userKeys.list>;
// Result: readonly ["users", "list", PaginationParams]

// Infer component props
type ButtonProps = React.ComponentProps<typeof Button>;
type FormProps = React.ComponentProps<typeof Form>;

// Infer async function return type
type LoginResult = Awaited<ReturnType<typeof authService.login>>;
```

---

### Pattern 8.6: AntD Typed Form Fields (HIGH)

`Form.Item<FormValues>` with field path inference for type-safe forms.

```typescript
// src/features/user-management/ui/UserForm.tsx
import { Form, Input, Select } from 'antd';
import type { FormProps } from 'antd';

interface UserFormValues {
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'viewer';
  address: {
    street: string;
    city: string;
    zipCode: string;
  };
}

export function UserForm() {
  const [form] = Form.useForm<UserFormValues>();

  const onFinish: FormProps<UserFormValues>['onFinish'] = (values) => {
    // values is fully typed: UserFormValues
    console.log(values.email, values.address.city);
  };

  return (
    <Form<UserFormValues> form={form} onFinish={onFinish} layout="vertical">
      {/* name is type-safe — only keys of UserFormValues */}
      <Form.Item<UserFormValues> name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
        <Input />
      </Form.Item>

      <Form.Item<UserFormValues> name="displayName" label="Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item<UserFormValues> name="role" label="Role">
        <Select options={[
          { value: 'admin', label: 'Admin' },
          { value: 'manager', label: 'Manager' },
          { value: 'viewer', label: 'Viewer' },
        ]} />
      </Form.Item>

      {/* Nested field path */}
      <Form.Item<UserFormValues> name={['address', 'city']} label="City">
        <Input />
      </Form.Item>
    </Form>
  );
}
```

---

### Pattern 8.7: AntD Typed Table Columns (HIGH)

`ColumnsType<RecordType>` with type-safe `dataIndex` and `render`.

```typescript
// src/widgets/user-table/ui/UserTable.tsx
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { User } from '@/entities/user';

const columns: ColumnsType<User> = [
  {
    title: 'Name',
    dataIndex: 'displayName',  // Type-safe: must be keyof User
    key: 'name',
    sorter: (a, b) => a.displayName.localeCompare(b.displayName),
  },
  {
    title: 'Email',
    dataIndex: 'email',        // Type-safe: must be keyof User
    key: 'email',
  },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
    render: (role: User['role']) => (
      <Tag color={role === 'admin' ? 'red' : 'blue'}>{role}</Tag>
    ),
    filters: [
      { text: 'Admin', value: 'admin' },
      { text: 'Manager', value: 'manager' },
      { text: 'Viewer', value: 'viewer' },
    ],
    onFilter: (value, record) => record.role === value,
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_, record) => (  // record: User (inferred)
      <Space>
        <Button onClick={() => navigate(`/users/${record.id}`)}>Edit</Button>
        <Button danger onClick={() => deleteUser(record.id)}>Delete</Button>
      </Space>
    ),
  },
];

<Table<User> columns={columns} dataSource={users} rowKey="id" />
```

---

### Pattern 8.8: Generic API Response Types (MEDIUM-HIGH)

Typed API wrapper types for consistent response handling.

```typescript
// src/shared/types/api.types.ts
export interface ApiResponse<T> {
  data: T;
  message: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ErrorResponse {
  message: string;
  code: string;
  details?: Record<string, string[]>;
  timestamp: string;
}

// Typed API function
async function apiGet<T>(url: string, params?: object): Promise<ApiResponse<T>> {
  const { data } = await apiClient.get<ApiResponse<T>>(url, { params });
  return data;
}

// Usage — T inferred from API function
const response = await apiGet<User[]>('/users');     // response.data: User[]
const paginated = await apiGet<PaginatedResponse<User>>('/users?page=1');
```

---

### Pattern 8.9: Zustand Store Typing (MEDIUM-HIGH)

Typed store with selectors and actions.

```typescript
// src/entities/user/model/userStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
  users: User[];
  selectedUserId: string | null;
  isLoading: boolean;
}

interface UserActions {
  setUsers: (users: User[]) => void;
  selectUser: (id: string | null) => void;
  addUser: (user: User) => void;
  removeUser: (id: string) => void;
}

type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        // State
        users: [],
        selectedUserId: null,
        isLoading: false,

        // Actions
        setUsers: (users) => set({ users }),
        selectUser: (id) => set({ selectedUserId: id }),
        addUser: (user) => set((state) => ({ users: [...state.users, user] })),
        removeUser: (id) => set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        })),
      }),
      { name: 'user-store' },
    ),
  ),
);

// Typed selectors — prevent unnecessary re-renders
export const useSelectedUser = () =>
  useUserStore((state) => state.users.find((u) => u.id === state.selectedUserId));

export const useUserCount = () =>
  useUserStore((state) => state.users.length);
```

---

### Pattern 8.10: Event Handler Typing (MEDIUM)

Correctly typed React and AntD event handlers.

```typescript
// React native events
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') submit();
};

// AntD callback types
import type { FormProps, TableProps, SelectProps } from 'antd';

const onFormFinish: FormProps<UserFormValues>['onFinish'] = (values) => {
  // values: UserFormValues
};

const onFormFinishFailed: FormProps<UserFormValues>['onFinishFailed'] = (errorInfo) => {
  // errorInfo.values, errorInfo.errorFields
};

const onTableChange: TableProps<User>['onChange'] = (pagination, filters, sorter) => {
  // pagination: TablePaginationConfig
  // filters: Record<string, FilterValue | null>
  // sorter: SorterResult<User> | SorterResult<User>[]
};

const onSelectChange: SelectProps['onChange'] = (value, option) => {
  // value: string | string[]
};
```

---

### Pattern 8.11: Template Literal Types (MEDIUM)

Type-safe route params, API paths, and CSS class names.

```typescript
// Route parameter extraction
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractRouteParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : object;

type UserRouteParams = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// Result: { userId: string; postId: string }

// API endpoint builder
type ApiEndpoint = `/api/${string}`;
function apiUrl(path: ApiEndpoint): string {
  return `${env.apiBaseUrl}${path}`;
}
apiUrl('/api/users');     // OK
// apiUrl('/users');       // ERROR: must start with /api/

// Event name builder
type DomainEvent = `${string}:${string}`;
type UserEvent = `user:${'created' | 'updated' | 'deleted'}`;
```

---

### Pattern 8.12: Anti-patterns (MEDIUM)

**1. `any` usage** — Disables type checking entirely.
```typescript
// BAD
const data: any = response.data;
// FIX: Use unknown + type guard
const data: unknown = response.data;
if (isUser(data)) { /* data is User */ }
```

**2. Missing generic constraints** — Generic accepts incompatible types.
```typescript
// BAD: T can be anything
function getId<T>(item: T) { return item.id; } // ERROR: id doesn't exist on T
// FIX: Add constraint
function getId<T extends { id: string }>(item: T) { return item.id; }
```

**3. Overly complex conditional types** — Types that are unreadable.
```typescript
// BAD: 5-level nested conditional type
type X<T> = T extends A ? T extends B ? T extends C ? ... : ... : ... : ...;
// FIX: Break into named types, use helper types, or simplify the design
```

**4. Type assertions masking bugs** — Using `as` instead of proper typing.
```typescript
// BAD
const user = data as User; // Skips validation
// FIX: Use type guard or Zod schema validation
const user = userSchema.parse(data); // Runtime validation + type inference
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (8.1–8.12), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React TypeScript Generics Specialist | EPS v3.2 | Metadata v2.1*

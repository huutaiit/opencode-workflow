# React TanStack Query Specialist
# React TanStack Queryスペシャリスト
# Chuyen Gia TanStack Query React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Entities (query config in shared, entity queries in entities) |
| **Directory Pattern** | `src/shared/api/queryKeys.ts`, `src/shared/api/queryClient.ts`, `src/entities/{name}/api/queries.ts` |
| **Variant** | enterprise |
| **Pattern Numbers** | 20.1–20.12 |
| **Source Paths** | `src/shared/api/**`, `**/api/queries.ts`, `**/api/*Queries.ts` |
| **File Count** | 5–20 query files (1 queryKeys + 1 queryClient + N entity queries) |
| **Naming Convention** | `{entity}Queries.ts`, `{entity}Mutations.ts`, `queryKeys.ts` |
| **Imports From** | Shared (API client, types, config) |
| **Cannot Import** | Presentation/UI, Features directly |
| **Imported By** | Features (useQuery/useMutation in components), Widgets |
| **Dependencies** | `@tanstack/react-query:5.x`, `@tanstack/react-query-devtools:5.x` |
| **When To Use** | Server data fetching, caching, background refetching, optimistic mutations, infinite scroll, prefetching |
| **Source Skeleton** | `src/shared/api/queryClient.ts`, `src/shared/api/queryKeys.ts`, `src/entities/{name}/api/{name}Queries.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate TanStack Query v5 patterns — queryOptions, useSuspenseQuery, query key factories, mutations with cache invalidation, infinite queries |
| **Activation Trigger** | files: **/api/queries.ts, src/shared/api/**; keywords: tanstackQuery, useQuery, useMutation, queryKey, cacheInvalidation |

---

## Evidence Sources

- E1: TanStack Query v5 documentation — queryOptions, useSuspenseQuery
- E2: TkDodo's blog — practical React Query patterns
- E3: Query key factory pattern (community best practice)
- E4: AntD Table/List integration with TanStack Query

---

## Role

You are a **React TanStack Query Specialist** for enterprise FSD projects. Your responsibility is to define server state management patterns: query key factories, queryOptions, mutations with cache invalidation, infinite queries, and prefetching. You are a CORE TIER specialist — ~35% of other specialists depend on TQ patterns.

**Used by**: Every feature that fetches data, API integration, data tables, forms
**Not used by**: Client-only state (use Zustand), GraphQL (see GraphQL specialist)

---

## Patterns

### Pattern 20.1: QueryClient Setup (CRITICAL)

```typescript
// src/shared/api/queryClient.ts
import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000,       // 5 min — data is fresh
    gcTime: 30 * 60 * 1000,         // 30 min — garbage collect
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    throwOnError: false,
  },
  mutations: {
    retry: 0,
    throwOnError: false,
  },
};

export const queryClient = new QueryClient({ defaultOptions: queryConfig });
```

---

### Pattern 20.2: queryOptions Helper (CRITICAL)

v5 type-safe query sharing — reuse key+fn across useQuery, prefetch, invalidation.

```typescript
// src/entities/user/api/userQueries.ts
import { queryOptions } from '@tanstack/react-query';
import { userKeys } from '@/shared/api/queryKeys';
import { apiClient } from '@/shared/api/client';

export const userQueries = {
  list: (params: PaginationParams) =>
    queryOptions({
      queryKey: userKeys.list(params),
      queryFn: () => apiClient.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: userKeys.detail(id),
      queryFn: () => apiClient.get<User>(`/users/${id}`).then((r) => r.data),
      enabled: !!id,
    }),

  profile: () =>
    queryOptions({
      queryKey: userKeys.profile(),
      queryFn: () => apiClient.get<User>('/users/me').then((r) => r.data),
      staleTime: 10 * 60 * 1000,
    }),
};

// Usage — consistent everywhere
const { data } = useQuery(userQueries.detail(userId));
await queryClient.prefetchQuery(userQueries.detail(userId));
queryClient.invalidateQueries(userQueries.list(params));
```

---

### Pattern 20.3: Query Key Factory (CRITICAL)

Hierarchical keys for granular cache invalidation.

```typescript
// src/shared/api/queryKeys.ts
export const userKeys = {
  all:     ['users'] as const,
  lists:   () => [...userKeys.all, 'list'] as const,
  list:    (params: PaginationParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail:  (id: string) => [...userKeys.details(), id] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
};

export const orderKeys = {
  all:     ['orders'] as const,
  lists:   () => [...orderKeys.all, 'list'] as const,
  list:    (params: OrderFilters) => [...orderKeys.lists(), params] as const,
  detail:  (id: string) => [...orderKeys.all, 'detail', id] as const,
};

// Invalidation granularity:
queryClient.invalidateQueries({ queryKey: userKeys.all });       // All user queries
queryClient.invalidateQueries({ queryKey: userKeys.lists() });   // All user lists
queryClient.invalidateQueries({ queryKey: userKeys.detail('1') }); // Specific user
```

---

### Pattern 20.4: useQuery Pattern (HIGH)

Typed query + AntD loading/error integration.

```typescript
// src/features/user-management/ui/UserList.tsx
import { useQuery } from '@tanstack/react-query';
import { userQueries } from '@/entities/user/api/userQueries';
import { Table, Alert, Spin } from 'antd';

function UserList() {
  const [params, setParams] = useState<PaginationParams>({ page: 1, limit: 20 });
  const { data, isLoading, error, refetch } = useQuery(userQueries.list(params));

  if (error) {
    return <Alert type="error" message={error.message} action={<Button onClick={() => refetch()}>Retry</Button>} />;
  }

  return (
    <Table<User>
      loading={isLoading}
      dataSource={data?.items}
      rowKey="id"
      pagination={{
        current: params.page,
        pageSize: params.limit,
        total: data?.total,
        onChange: (page, pageSize) => setParams({ page, limit: pageSize }),
      }}
      columns={columns}
    />
  );
}
```

---

### Pattern 20.5: useSuspenseQuery (HIGH)

Data is `T` (never `undefined`), requires Suspense boundary.

```typescript
import { useSuspenseQuery } from '@tanstack/react-query';

function UserDetail({ userId }: { userId: string }) {
  const { data: user } = useSuspenseQuery(userQueries.detail(userId));
  // user is User — NOT User | undefined

  return <Descriptions title={user.displayName}>
    <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
    <Descriptions.Item label="Role">{user.role}</Descriptions.Item>
  </Descriptions>;
}

// Parent must provide Suspense + ErrorBoundary
function UserDetailPage({ userId }: { userId: string }) {
  return (
    <ErrorBoundary fallback={<Alert type="error" message="Failed to load user" />}>
      <Suspense fallback={<Spin size="large" />}>
        <UserDetail userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

### Pattern 20.6: useMutation (HIGH)

Create/update/delete with cache invalidation.

```typescript
// src/entities/user/api/userMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userKeys } from '@/shared/api/queryKeys';
import { App } from 'antd';

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: CreateUserDTO) =>
      apiClient.post<User>('/users', data).then((r) => r.data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      message.success(`User ${user.displayName} created`);
    },
    onError: (error) => {
      message.error(`Failed: ${error.message}`);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      message.success('User deleted');
    },
  });
}
```

---

### Pattern 20.7: Optimistic Mutations (HIGH)

```typescript
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDTO }) =>
      apiClient.patch<User>(`/users/${id}`, data).then((r) => r.data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) });
      const previous = queryClient.getQueryData<User>(userKeys.detail(id));

      queryClient.setQueryData<User>(userKeys.detail(id), (old) =>
        old ? { ...old, ...data } : old,
      );

      return { previous };
    },

    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userKeys.detail(id), context.previous);
      }
    },

    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}
```

---

### Pattern 20.8: Infinite Queries (MEDIUM-HIGH)

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteUsers(filters: UserFilters) {
  return useInfiniteQuery({
    queryKey: ['users', 'infinite', filters],
    queryFn: ({ pageParam }) =>
      apiClient.get<PaginatedResponse<User>>('/users', {
        params: { ...filters, page: pageParam, limit: 20 },
      }).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

// Usage with AntD List
function UserInfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteUsers({});
  const users = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <List
      dataSource={users}
      renderItem={(user) => <UserCard user={user} />}
      loadMore={hasNextPage && (
        <Button onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
          Load More
        </Button>
      )}
    />
  );
}
```

---

### Pattern 20.9: Prefetching (MEDIUM-HIGH)

```typescript
// Prefetch on hover
function UserListItem({ user }: { user: User }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery(userQueries.detail(user.id));
  };

  return (
    <List.Item onMouseEnter={handleMouseEnter}>
      <Link to={`/users/${user.id}`}>{user.displayName}</Link>
    </List.Item>
  );
}

// Prefetch on route transition (React Router loader)
export const userDetailLoader = (queryClient: QueryClient) =>
  async ({ params }: { params: { userId: string } }) => {
    await queryClient.ensureQueryData(userQueries.detail(params.userId));
    return null;
  };
```

---

### Pattern 20.10: Invalidation Strategy (MEDIUM)

| Strategy | When | Method |
|----------|------|--------|
| Invalidate list | After create/delete | `invalidateQueries({ queryKey: keys.lists() })` |
| Invalidate detail | After update | `invalidateQueries({ queryKey: keys.detail(id) })` |
| Update cache directly | Optimistic UI | `setQueryData(key, updater)` |
| Remove from cache | After delete | `removeQueries({ queryKey: keys.detail(id) })` |
| Invalidate all | After auth change | `invalidateQueries({ queryKey: keys.all })` |
| Reset all | On logout | `queryClient.clear()` |

---

### Pattern 20.11: FSD Query Organization (MEDIUM)

```
src/
├── shared/api/
│   ├── queryClient.ts         # QueryClient config
│   ├── queryKeys.ts           # All key factories
│   └── client.ts              # Axios instance
├── entities/
│   ├── user/api/
│   │   ├── userQueries.ts     # queryOptions for users
│   │   └── userMutations.ts   # useMutation hooks for users
│   └── order/api/
│       ├── orderQueries.ts
│       └── orderMutations.ts
└── features/
    └── user-management/ui/
        └── UserList.tsx        # Consumes useQuery(userQueries.list(...))
```

---

### Pattern 20.12: Anti-patterns (MEDIUM)

**1. Missing error boundaries** — useSuspenseQuery without ErrorBoundary crashes app.

**2. Stale cache** — Setting staleTime too high for frequently-changing data.

**3. Query key collisions** — `['users']` used for both list and detail.
```
// FIX: Use key factory: userKeys.list(params) vs userKeys.detail(id)
```

**4. Mutations without invalidation** — Cache shows stale data after mutation.

**5. Over-fetching** — Refetching on window focus for rarely-changing data.
```
// FIX: Set staleTime appropriately, refetchOnWindowFocus: false for stable data
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (20.1–20.12)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React TanStack Query Specialist | EPS v3.2 | Metadata v2.1*

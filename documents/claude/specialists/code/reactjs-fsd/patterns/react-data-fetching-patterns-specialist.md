# React Data Fetching Patterns Specialist
# Reactデータフェッチパターンスペシャリスト
# Chuyen Gia Data Fetching Patterns React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — data fetching patterns applied across layers) |
| **Directory Pattern** | `src/shared/api/patterns/`, `src/features/{name}/api/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 30.1–30.10 |
| **Source Paths** | `**/api/**/*.ts`, `**/hooks/useQuery*.ts` |
| **File Count** | Cross-cutting: applies to all data-fetching code |
| **Naming Convention** | N/A (rule-set — higher-level patterns applied to TanStack Query usage) |
| **Imports From** | N/A (rule-set) |
| **Cannot Import** | N/A (rule-set) |
| **Imported By** | N/A (rule-set) |
| **Dependencies** | `@tanstack/react-query:5.x` |
| **When To Use** | Pagination strategy, cache invalidation decisions, prefetching optimization, dependent query chains |
| **Source Skeleton** | N/A (rule-set specialist) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce data fetching best practices — SWR patterns, cache strategies, pagination approaches, prefetching, dependent queries |
| **Activation Trigger** | files: **/api/**; keywords: pagination, cacheInvalidation, prefetch, dependentQuery, swr, infiniteScroll |

---

## Evidence Sources

- E1: TanStack Query v5 — fetch strategies documentation
- E2: SWR (Stale-While-Revalidate) HTTP cache pattern
- E3: Cursor vs offset pagination comparison
- E4: Enterprise data loading patterns (waterfall prevention)

---

## Patterns

### Pattern 30.1: SWR Pattern (CRITICAL)

Stale-While-Revalidate: show cached data immediately, revalidate in background.

```typescript
// TanStack Query implements SWR via staleTime + gcTime
const { data } = useQuery({
  queryKey: ['users', params],
  queryFn: () => fetchUsers(params),
  staleTime: 5 * 60 * 1000,  // Data is fresh for 5 min → no refetch
  gcTime: 30 * 60 * 1000,    // Keep in cache 30 min after unmount
  // Behavior: Mount → show cache (stale) → refetch in background → update UI
});

// Aggressive SWR — show stale, always refetch
staleTime: 0,                  // Always stale → always refetch on mount
gcTime: 30 * 60 * 1000,       // But show cached while refetching

// Conservative — minimize requests
staleTime: 10 * 60 * 1000,    // Fresh for 10 min
refetchOnWindowFocus: false,   // Don't refetch on tab focus
```

### Pattern 30.2: Cache-First vs Network-First (CRITICAL)

| Strategy | staleTime | Use Case |
|----------|-----------|----------|
| **Cache-first** | 10+ min | Reference data (countries, roles), config |
| **SWR** | 1–5 min | Lists, dashboards — balance freshness/requests |
| **Network-first** | 0 | Real-time data, financial — always want latest |
| **Network-only** | 0 + gcTime: 0 | Sensitive data (payments) — never cache |

```typescript
// Cache-first: countries list (rarely changes)
const countriesQuery = queryOptions({
  queryKey: ['countries'],
  queryFn: fetchCountries,
  staleTime: Infinity,  // Never stale → fetch once per session
  gcTime: Infinity,
});

// Network-first: order status (must be current)
const orderStatusQuery = (id: string) => queryOptions({
  queryKey: ['order', id, 'status'],
  queryFn: () => fetchOrderStatus(id),
  staleTime: 0,
  refetchInterval: 10_000, // Poll every 10s
});
```

### Pattern 30.3: Pagination — Offset vs Cursor (HIGH)

```typescript
// Offset pagination — AntD Table default
function useUsersPaginated(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['users', 'list', { page, pageSize }],
    queryFn: () => apiClient.get('/users', { params: { page, pageSize } }),
    placeholderData: keepPreviousData, // Keep old page while loading new
  });
}

// AntD Table integration
<Table
  dataSource={data?.items}
  pagination={{
    current: page,
    pageSize,
    total: data?.total,
    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
    showSizeChanger: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
  }}
/>

// Cursor pagination — for infinite scroll, real-time feeds
function useUsersCursor() {
  return useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: ({ pageParam }) =>
      apiClient.get('/users', { params: { cursor: pageParam, limit: 20 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
```

**Decision guide:**
| Criteria | Offset | Cursor |
|----------|--------|--------|
| AntD Table | ✅ | ❌ |
| Jump to page | ✅ | ❌ |
| Infinite scroll | ❌ | ✅ |
| Real-time inserts | ❌ (shifts) | ✅ |
| Total count | ✅ (from API) | ⚠️ (expensive) |

### Pattern 30.4: Prefetch on Hover (HIGH)

```typescript
// Prefetch user detail when hovering over list item
function UserRow({ user }: { user: User }) {
  const queryClient = useQueryClient();

  return (
    <List.Item
      onMouseEnter={() => {
        queryClient.prefetchQuery(userQueries.detail(user.id));
      }}
    >
      <Link to={`/users/${user.id}`}>{user.displayName}</Link>
    </List.Item>
  );
}

// Prefetch next page
function PaginatedList({ page, totalPages }: { page: number; totalPages: number }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (page < totalPages) {
      queryClient.prefetchQuery(userQueries.list({ page: page + 1, limit: 20 }));
    }
  }, [page, totalPages, queryClient]);
}

// Prefetch on route transition (React Router loader)
const routes = [
  {
    path: '/users/:id',
    loader: ({ params }) => {
      queryClient.prefetchQuery(userQueries.detail(params.id!));
      return null;
    },
    lazy: () => import('@/pages/users/detail'),
  },
];
```

### Pattern 30.5: Dependent Queries (HIGH)

Queries that depend on the result of another query.

```typescript
// Query B depends on Query A result
function UserOrders({ userId }: { userId: string }) {
  // Query A: get user
  const { data: user } = useQuery(userQueries.detail(userId));

  // Query B: get orders (depends on user.organizationId)
  const { data: orders } = useQuery({
    queryKey: ['orders', { orgId: user?.organizationId }],
    queryFn: () => fetchOrdersByOrg(user!.organizationId),
    enabled: !!user?.organizationId, // Only run when A completes
  });

  // Query C: parallel queries that both depend on A
  const queries = useQueries({
    queries: user ? [
      { queryKey: ['user-stats', userId], queryFn: () => fetchStats(userId) },
      { queryKey: ['user-activity', userId], queryFn: () => fetchActivity(userId) },
    ] : [],
  });
}
```

### Pattern 30.6: Parallel Queries (MEDIUM-HIGH)

```typescript
// Multiple independent queries — run in parallel
function Dashboard() {
  const results = useQueries({
    queries: [
      { queryKey: ['dashboard', 'revenue'], queryFn: fetchRevenue },
      { queryKey: ['dashboard', 'users'], queryFn: fetchActiveUsers },
      { queryKey: ['dashboard', 'orders'], queryFn: fetchRecentOrders },
    ],
  });

  const [revenue, users, orders] = results;
  const isLoading = results.some((r) => r.isLoading);

  if (isLoading) return <Spin />;

  return (
    <Row gutter={16}>
      <Col span={8}><Statistic title="Revenue" value={revenue.data} prefix="$" /></Col>
      <Col span={8}><Statistic title="Active Users" value={users.data} /></Col>
      <Col span={8}><Statistic title="Orders" value={orders.data} /></Col>
    </Row>
  );
}
```

### Pattern 30.7: Background Refetching (MEDIUM-HIGH)

```typescript
// Polling — auto-refresh every N seconds
const { data } = useQuery({
  queryKey: ['notifications', 'unread'],
  queryFn: fetchUnreadCount,
  refetchInterval: 30_000,                     // Every 30s
  refetchIntervalInBackground: false,          // Pause when tab not visible
});

// Refetch on specific events
const queryClient = useQueryClient();

// After mutation
onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),

// On WebSocket event
useSignalREvent('data:changed', () => {
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
});

// On window focus (careful — can be expensive)
refetchOnWindowFocus: true,  // Default: true for stale queries
```

### Pattern 30.8: Cache Warming (MEDIUM)

Pre-populate cache from known data to avoid redundant fetches.

```typescript
// After fetching list, warm detail cache for each item
const { data } = useQuery({
  queryKey: ['users', 'list', params],
  queryFn: async () => {
    const result = await fetchUsers(params);
    // Warm detail cache from list data
    result.items.forEach((user) => {
      queryClient.setQueryData(userKeys.detail(user.id), user);
    });
    return result;
  },
});

// Pre-warm from SSR data
// In app initialization
if (window.__SSR_DATA__?.users) {
  queryClient.setQueryData(['users', 'list'], window.__SSR_DATA__.users);
}
```

### Pattern 30.9: Request Deduplication (MEDIUM)

TanStack Query auto-deduplicates identical concurrent requests.

```typescript
// These 3 components mount simultaneously — only 1 network request
function Header() { const { data } = useQuery(userQueries.profile()); }
function Sidebar() { const { data } = useQuery(userQueries.profile()); }
function Avatar() { const { data } = useQuery(userQueries.profile()); }

// All share the same cache entry: ['users', 'profile']
// TQ sends 1 request, updates all 3 subscribers
```

### Pattern 30.10: Anti-patterns (MEDIUM)

**1. Waterfall requests** — Sequential fetches that could be parallel.
```typescript
// BAD: Sequential (2s total)
const users = await fetchUsers();      // 1s
const orders = await fetchOrders();    // 1s

// FIX: Parallel (1s total)
const [users, orders] = await Promise.all([fetchUsers(), fetchOrders()]);
// Or use useQueries for parallel React queries
```

**2. Over-fetching** — Fetching full entity when only summary needed.
```
// FIX: Create separate list vs detail endpoints/queries
```

**3. Missing placeholderData** — Table flickers to empty on page change.
```typescript
// FIX: placeholderData: keepPreviousData
```

**4. Stale cache masking bugs** — staleTime too high, showing outdated data after mutations.
```
// FIX: Invalidate after mutations, use appropriate staleTime
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (30.1–30.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Data Fetching Patterns Specialist | EPS v3.2 | Metadata v2.1*

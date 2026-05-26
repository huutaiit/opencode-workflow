# React Loading States Specialist
# Reactローディング状態スペシャリスト
# Chuyen Gia Loading States React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared (loading state components in shared/ui) |
| **Directory Pattern** | `src/shared/ui/loading/`, `src/shared/ui/error/`, `src/shared/ui/empty/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 37.1–37.10 |
| **Source Paths** | `src/shared/ui/loading/**`, `src/shared/ui/error/**`, `src/shared/ui/empty/**` |
| **File Count** | 5–10 loading/error/empty state components |
| **Naming Convention** | `AsyncContent.tsx`, `PageSkeleton.tsx`, `ErrorFallback.tsx`, `EmptyState.tsx` |
| **Imports From** | Shared (types, TanStack Query status) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features, Pages, Widgets |
| **Dependencies** | `antd:5.x` (Spin, Skeleton, Result, Empty) |
| **When To Use** | Async data display (loading/error/empty), Suspense fallbacks, skeleton screens |
| **Source Skeleton** | `src/shared/ui/loading/AsyncContent.tsx`, `src/shared/ui/loading/PageSkeleton.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate async state UI — AsyncContent wrapper, AntD Spin/Skeleton/Result/Empty, Suspense fallbacks, TQ loading integration |
| **Activation Trigger** | files: src/shared/ui/loading/**; keywords: loadingState, skeleton, errorFallback, emptyState, asyncContent |

---

## Evidence Sources

- E1: AntD Spin, Skeleton, Result, Empty components
- E2: TanStack Query loading/error state patterns
- E3: React Suspense fallback patterns
- E4: Progressive loading UX (skeleton → content)

---

## Patterns

### Pattern 37.1: AsyncContent Wrapper (CRITICAL)

```typescript
// src/shared/ui/loading/AsyncContent.tsx
import { Spin, Result, Empty, Button, type SpinProps } from 'antd';

interface AsyncContentProps<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch?: () => void;
  children: (data: T) => React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
  spinProps?: SpinProps;
}

export function AsyncContent<T>({
  data, isLoading, error, refetch, children,
  loadingFallback, errorFallback, emptyFallback,
  isEmpty = (d) => Array.isArray(d) ? d.length === 0 : !d,
  spinProps,
}: AsyncContentProps<T>) {
  if (isLoading) return loadingFallback ?? <Spin size="large" style={{ display: 'block', margin: '40px auto' }} {...spinProps} />;

  if (error) return errorFallback ?? (
    <Result status="error" title="Failed to load" subTitle={error.message}
      extra={refetch && <Button onClick={refetch}>Retry</Button>} />
  );

  if (!data || isEmpty(data)) return emptyFallback ?? <Empty description="No data available" />;

  return <>{children(data)}</>;
}

// Usage
const { data, isLoading, error, refetch } = useQuery(userQueries.list(params));

<AsyncContent data={data?.items} isLoading={isLoading} error={error} refetch={refetch}
  isEmpty={(items) => items.length === 0}
  emptyFallback={<Empty description="No users found" image={Empty.PRESENTED_IMAGE_SIMPLE} />}>
  {(users) => <UserTable users={users} />}
</AsyncContent>
```

### Pattern 37.2: AntD Spin (HIGH)

```typescript
// Inline spinner
<Spin spinning={isLoading}><UserTable users={users} /></Spin>

// Full-page centered
<Spin size="large" tip="Loading..." style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }} />

// Custom indicator
<Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />

// Button loading (built-in)
<Button type="primary" loading={isSubmitting}>Submit</Button>
```

### Pattern 37.3: AntD Skeleton (HIGH)

```typescript
// Card skeleton
<Card><Skeleton loading={isLoading} active avatar paragraph={{ rows: 3 }}><UserCard user={user} /></Skeleton></Card>

// Table skeleton
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      <Skeleton.Input active style={{ width: '100%', marginBottom: 16 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} active paragraph={{ rows: 1 }} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}

// Image skeleton
<Skeleton.Image active style={{ width: 200, height: 200 }} />

// Custom skeleton matching layout
function DashboardSkeleton() {
  return (
    <Row gutter={16}>
      {[1, 2, 3, 4].map((i) => (
        <Col span={6} key={i}><Card><Skeleton active paragraph={{ rows: 2 }} /></Card></Col>
      ))}
    </Row>
  );
}
```

### Pattern 37.4: AntD Result (HIGH)

```typescript
// Error states
<Result status="error" title="Failed to load data" subTitle={error.message}
  extra={<Button type="primary" onClick={refetch}>Retry</Button>} />

// Success state
<Result status="success" title="User created successfully"
  extra={[<Button type="primary" onClick={() => navigate('/users')}>View Users</Button>,
    <Button onClick={() => form.resetFields()}>Create Another</Button>]} />

// HTTP error pages
<Result status="403" title="Access Denied" subTitle="You don't have permission."
  extra={<Button onClick={() => navigate(-1)}>Go Back</Button>} />

<Result status="404" title="Page Not Found"
  extra={<Button type="primary" onClick={() => navigate('/')}>Home</Button>} />

<Result status="500" title="Server Error" subTitle="Please try again later." />
```

### Pattern 37.5: AntD Empty (HIGH)

```typescript
// Default empty state
<Empty description="No users found" />

// Simple image (for inline usage)
<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No results" />

// Custom empty with action
<Empty description={<span>No orders yet. <Link to="/orders/create">Create one?</Link></span>} />

// Table empty (via AntD Table locale)
<Table locale={{ emptyText: <Empty description="No data" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} />
```

### Pattern 37.6: Suspense + Fallback (HIGH)

```typescript
import { Suspense } from 'react';

// Page-level Suspense
function UserDetailPage({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserDetail userId={userId} />
    </Suspense>
  );
}

// Component-level Suspense
function Dashboard() {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Suspense fallback={<Card><Skeleton active /></Card>}>
          <RevenueChart />
        </Suspense>
      </Col>
      <Col span={12}>
        <Suspense fallback={<Card><Skeleton active /></Card>}>
          <UserStats />
        </Suspense>
      </Col>
    </Row>
  );
}
```

### Pattern 37.7: Error Boundary + Fallback (HIGH)

```typescript
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Result status="error" title="Something went wrong" subTitle={error.message}
      extra={<Button type="primary" onClick={resetErrorBoundary}>Try Again</Button>} />
  );
}

// Usage
<ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => queryClient.invalidateQueries()}>
  <Suspense fallback={<Spin />}>
    <UserDetail />
  </Suspense>
</ErrorBoundary>
```

### Pattern 37.8: TQ Loading States (MEDIUM-HIGH)

```typescript
// isLoading vs isFetching
// isLoading: true on FIRST load (no cache) → show skeleton
// isFetching: true on ANY fetch (including background refetch) → show subtle indicator

const { data, isLoading, isFetching } = useQuery(userQueries.list(params));

// First load → full skeleton
if (isLoading) return <TableSkeleton />;

// Background refetch → subtle indicator
<Table loading={isFetching && !isLoading} dataSource={data?.items} />
// Shows spinner overlay on table during refetch, but data stays visible
```

### Pattern 37.9: Page-Level Skeleton (MEDIUM-HIGH)

```typescript
// src/shared/ui/loading/PageSkeleton.tsx
function PageSkeleton({ hasTable = false, hasStats = false }: { hasTable?: boolean; hasStats?: boolean }) {
  return (
    <div>
      <Skeleton.Input active style={{ width: 200, marginBottom: 24 }} size="large" />
      {hasStats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => (<Col span={6} key={i}><Card><Skeleton active paragraph={{ rows: 1 }} /></Card></Col>))}
        </Row>
      )}
      {hasTable && <TableSkeleton rows={8} />}
      {!hasTable && <Skeleton active paragraph={{ rows: 6 }} />}
    </div>
  );
}

// Usage — matches page layout structure
<Suspense fallback={<PageSkeleton hasStats hasTable />}>
  <DashboardPage />
</Suspense>
```

### Pattern 37.10: Anti-patterns (MEDIUM)

**1. Loading spinner for everything** — Use skeleton for layout-matching, spinner for inline actions.
**2. No empty state** — Table renders with 0 rows and no message.
**3. Error without retry** — Error displayed but no way to recover.
**4. isLoading flash** — Brief spinner between cached → refetched data. Use `placeholderData: keepPreviousData`.
**5. Missing error boundary** — useSuspenseQuery without ErrorBoundary crashes app.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (37.1–37.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Loading States Specialist | EPS v3.2 | Metadata v2.1*

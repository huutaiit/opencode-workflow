# Empty, Error & Loading States Specialist
# 空状態・エラー・ローディングスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 225.1–225.7 |
| **Specialist Type** | rule-set |
| **Purpose** | Empty state, error boundary UI, skeleton loading, progress, optimistic UI, offline |
| **Activation Trigger** | empty state, error boundary, loading, skeleton, spinner, progress, offline |
| **Complements** | 206.x component-states, 220.x status-color |

---

## Rules

### 225.1 — Empty State

Every data container MUST have an empty state with: illustration + message + CTA.

```tsx
// ✅ AntD Empty with action
<Empty
  image={Empty.PRESENTED_IMAGE_SIMPLE}
  description="No projects yet"
>
  <Button type="primary">Create Project</Button>
</Empty>

// ✅ Custom empty state
<div className="flex flex-col items-center justify-center py-16 text-center">
  <EmptyIllustration className="mb-4 h-32 w-32 text-gray-300" />
  <p className="mb-2 text-lg font-medium text-gray-900">No results found</p>
  <p className="mb-6 text-sm text-gray-500">Try adjusting your filters</p>
  <Button type="primary">Clear Filters</Button>
</div>

// ❌ WRONG: Blank white space when data is empty
// ❌ WRONG: Empty state without actionable CTA
```

### 225.2 — Error Boundary UI

```tsx
// ✅ AntD Result for error pages
<Result
  status="500"
  title="Something went wrong"
  subTitle="Please try again or contact support."
  extra={<Button type="primary" onClick={retry}>Try Again</Button>}
/>

// ✅ Inline error with retry
<Alert
  type="error"
  message="Failed to load data"
  description="Check your connection and try again."
  action={<Button size="small" onClick={retry}>Retry</Button>}
/>

// ❌ WRONG: Raw error message shown to user
// ❌ WRONG: Error without retry action
```

### 225.3 — Skeleton Loading

Content-sized placeholders with shimmer animation. Match real content layout.

```tsx
// ✅ AntD Skeleton matching content shape
<Skeleton active avatar paragraph={{ rows: 3 }} />
<Skeleton.Image active />
<Skeleton.Button active size="large" />

// ✅ Tailwind skeleton for custom layouts
<div className="animate-pulse space-y-3">
  <div className="h-4 w-3/4 rounded bg-gray-200" />
  <div className="h-4 w-1/2 rounded bg-gray-200" />
</div>

// ❌ WRONG: Spinner for content areas (skeleton preserves layout)
// ❌ WRONG: Skeleton that doesn't match actual content dimensions
```

### 225.4 — Spinner Placement

| Context | Pattern | Component |
|---------|---------|-----------|
| Full page | Centered, above fold | `<Spin size="large" />` |
| Button | Inside button, replace text | `<Button loading>` |
| Inline | After trigger element | `<Spin size="small" />` |
| Table | Overlay on content | `<Table loading={loading}>` |

```tsx
// ✅ AntD Spin with tip
<Spin tip="Loading..." size="large">
  <div className="min-h-[200px]" />
</Spin>

// ✅ Button loading state
<Button type="primary" loading={submitting}>Submit</Button>
```

### 225.5 — Progress Indicators

| Type | Use Case | Component |
|------|----------|-----------|
| Determinate | File upload, multi-step | `<Progress percent={60} />` |
| Indeterminate | Unknown duration | `<Spin />` or `<Progress status="active" />` |
| Steps | Multi-step wizard | `<Steps current={step} />` |

### 225.6 — Optimistic UI

Update UI immediately, rollback on server error.

```tsx
// ✅ Optimistic pattern
const handleLike = async () => {
  setLiked(true);              // Optimistic update
  try { await api.like(id); }
  catch { setLiked(false); }   // Rollback on failure
};

// ❌ WRONG: Wait for server response before updating UI (feels slow)
```

### 225.7 — Offline Indicator

```tsx
// ✅ Persistent banner when offline
<div className="fixed bottom-0 inset-x-0 z-50 bg-warning/90 px-4 py-2 text-center text-sm">
  You are offline. Changes will sync when reconnected.
</div>

// ❌ WRONG: Silent failure when network is unavailable
```

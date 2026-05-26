# React Skeleton Loading Specialist
# Reactスケルトンローディングスペシャリスト
# Chuyen Gia Skeleton Loading React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared |
| **Directory Pattern** | `src/shared/ui/skeleton/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 76.1–76.8 |
| **Source Paths** | `src/shared/ui/skeleton/**` |
| **File Count** | 3–8 skeleton component files |
| **Naming Convention** | `{Page}Skeleton.tsx`, `{Component}Skeleton.tsx` |
| **Imports From** | Shared (AntD Skeleton) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Pages (Suspense fallback), Features |
| **Dependencies** | `antd:5.x` (Skeleton) |
| **When To Use** | First-load experience, Suspense fallbacks, content placeholder matching page layout |
| **Source Skeleton** | `src/shared/ui/skeleton/{Page}Skeleton.tsx`, `src/shared/ui/skeleton/TableSkeleton.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate skeleton screen patterns — AntD Skeleton, page-matching skeletons, Suspense integration, progressive loading |
| **Activation Trigger** | files: src/shared/ui/skeleton/**; keywords: skeleton, contentPlaceholder, suspenseFallback, progressiveLoading |

---

## Evidence Sources

- E1: AntD Skeleton component API
- E2: Skeleton screen UX best practices (perceived performance)
- E3: React Suspense fallback patterns
- E4: Progressive loading with content-aware skeletons

---

## Patterns

### Pattern 76.1: AntD Skeleton Variants (CRITICAL)

```typescript
// Text skeleton (paragraph)
<Skeleton active paragraph={{ rows: 4 }} />

// Avatar + text
<Skeleton active avatar paragraph={{ rows: 2 }} />

// Input skeleton
<Skeleton.Input active style={{ width: 200 }} />

// Button skeleton
<Skeleton.Button active shape="default" />

// Image skeleton
<Skeleton.Image active style={{ width: 200, height: 200 }} />

// Node skeleton (custom shape)
<Skeleton.Node active style={{ width: 80, height: 80 }}>
  <DotChartOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
</Skeleton.Node>

// Wrapping real content — auto-switch
<Skeleton loading={isLoading} active avatar paragraph={{ rows: 3 }}>
  <Card>
    <Card.Meta avatar={<Avatar src={user.avatar} />} title={user.name} description={user.email} />
  </Card>
</Skeleton>
```

### Pattern 76.2: Page-Matching Skeleton (CRITICAL)

Skeleton that matches the actual page layout structure for seamless transition.

```typescript
// src/shared/ui/skeleton/DashboardSkeleton.tsx
function DashboardSkeleton() {
  return (
    <div>
      {/* Page title */}
      <Skeleton.Input active size="large" style={{ width: 200, marginBottom: 24 }} />

      {/* Stat cards row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col span={6} key={i}>
            <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
          </Col>
        ))}
      </Row>

      {/* Chart area */}
      <Card style={{ marginBottom: 24 }}>
        <Skeleton.Node active style={{ width: '100%', height: 300 }}>
          <BarChartOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
        </Skeleton.Node>
      </Card>

      {/* Table */}
      <TableSkeleton rows={5} />
    </div>
  );
}
```

### Pattern 76.3: Table Skeleton (HIGH)

```typescript
// src/shared/ui/skeleton/TableSkeleton.tsx
function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton.Input key={i} active size="small" style={{ width: `${100 / columns}%` }} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #f5f5f5' }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton.Input key={j} active size="small" style={{ width: `${100 / columns}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 76.4: Suspense + Skeleton (HIGH)

```typescript
// Page-level Suspense with matching skeleton
function UserDetailPage({ userId }: { userId: string }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<UserDetailSkeleton />}>
        <UserDetail userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Component-level Suspense
function Dashboard() {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Suspense fallback={<Card><Skeleton active paragraph={{ rows: 6 }} /></Card>}>
          <RevenueChart />
        </Suspense>
      </Col>
      <Col span={12}>
        <Suspense fallback={<Card><Skeleton active paragraph={{ rows: 6 }} /></Card>}>
          <UserGrowthChart />
        </Suspense>
      </Col>
    </Row>
  );
}
```

### Pattern 76.5: Card List Skeleton (HIGH)

```typescript
function CardListSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: count }).map((_, i) => (
        <Col span={24 / columns} key={i}>
          <Card>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
```

### Pattern 76.6: Form Skeleton (MEDIUM-HIGH)

```typescript
function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
          <Skeleton.Input active style={{ width: '100%' }} />
        </div>
      ))}
      <Skeleton.Button active style={{ width: 120 }} />
    </div>
  );
}
```

### Pattern 76.7: Progressive Loading (MEDIUM-HIGH)

```typescript
// Show skeleton → partial content → full content
function UserProfile({ userId }: { userId: string }) {
  const { data: basicInfo } = useQuery({ ...userQueries.basicInfo(userId), staleTime: Infinity });
  const { data: fullProfile, isLoading } = useQuery(userQueries.detail(userId));

  return (
    <Card>
      {/* Basic info loads instantly (cached/fast) */}
      {basicInfo ? (
        <Card.Meta avatar={<Avatar src={basicInfo.avatar} />} title={basicInfo.name} />
      ) : (
        <Skeleton active avatar paragraph={false} />
      )}

      {/* Full profile loads progressively */}
      <Skeleton loading={isLoading} active paragraph={{ rows: 4 }}>
        {fullProfile && <UserProfileDetails profile={fullProfile} />}
      </Skeleton>
    </Card>
  );
}
```

### Pattern 76.8: Anti-patterns (MEDIUM)

**1. Skeleton not matching layout** — Skeleton shows 3 columns, actual page has 4. Causes layout shift.
```
// FIX: Design skeleton to match exact layout structure
```

**2. Spinner instead of skeleton** — Full-screen spinner for page load. Skeleton provides better UX.
```
// FIX: Use skeleton for page-level loading, spinner for inline/button loading
```

**3. No animation** — Static skeleton feels broken. Always use `active` prop.
```
// FIX: <Skeleton active />
```

**4. Skeleton for instant data** — Showing skeleton for cached data that loads in <100ms. Causes flicker.
```
// FIX: Use skeleton only for actual async loads. Cached data renders immediately.
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (76.1–76.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Skeleton Loading Specialist | EPS v3.2 | Metadata v2.1*

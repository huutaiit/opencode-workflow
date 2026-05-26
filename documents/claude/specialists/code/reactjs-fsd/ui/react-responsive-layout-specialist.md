# React Responsive Layout Specialist
# Reactレスポンシブレイアウトスペシャリスト
# Chuyen Gia Responsive Layout React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared |
| **Directory Pattern** | `src/shared/ui/layout/`, `src/shared/hooks/useMediaQuery.ts` |
| **Variant** | enterprise |
| **Pattern Numbers** | 39.1–39.8 |
| **Source Paths** | `src/shared/ui/layout/**`, `src/shared/hooks/useMedia*` |
| **File Count** | 3–8 responsive utility files |
| **Naming Convention** | `ResponsiveGrid.tsx`, `useMediaQuery.ts`, `useBreakpoint.ts` |
| **Imports From** | Shared (config for breakpoint values) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features, Widgets, Pages |
| **Dependencies** | `antd:5.x` (Grid Row/Col) |
| **When To Use** | Responsive breakpoints, AntD Grid, conditional rendering by screen size |
| **Source Skeleton** | `src/shared/hooks/useMediaQuery.ts`, `src/shared/hooks/useBreakpoint.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate responsive layout patterns — AntD Grid, useMediaQuery, responsive Table/Form, container queries |
| **Activation Trigger** | files: src/shared/ui/layout/**; keywords: responsive, breakpoint, mediaQuery, mobileFirst |

---

## Evidence Sources

- E1: AntD Grid system (24-column, responsive)
- E2: AntD breakpoint values (xs/sm/md/lg/xl/xxl)
- E3: CSS container queries specification
- E4: Mobile-first responsive design principles

---

## Patterns

### Pattern 39.1: AntD Grid Responsive Spans (CRITICAL)

```typescript
import { Row, Col } from 'antd';

// Responsive card grid
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={8} lg={6}><StatCard title="Revenue" /></Col>
  <Col xs={24} sm={12} md={8} lg={6}><StatCard title="Users" /></Col>
  <Col xs={24} sm={12} md={8} lg={6}><StatCard title="Orders" /></Col>
  <Col xs={24} sm={12} md={8} lg={6}><StatCard title="Growth" /></Col>
</Row>

// Form — 2 columns on desktop, 1 on mobile
<Row gutter={16}>
  <Col xs={24} md={12}><Form.Item name="firstName"><Input /></Form.Item></Col>
  <Col xs={24} md={12}><Form.Item name="lastName"><Input /></Form.Item></Col>
</Row>
```

### Pattern 39.2: AntD Breakpoints (CRITICAL)

```typescript
// AntD breakpoint values (matches Bootstrap)
// xs: <576px   (mobile portrait)
// sm: ≥576px   (mobile landscape)
// md: ≥768px   (tablet)
// lg: ≥992px   (desktop)
// xl: ≥1200px  (large desktop)
// xxl: ≥1600px (ultra-wide)

// Grid.useBreakpoint() — reactive breakpoint detection
import { Grid } from 'antd';
const { useBreakpoint } = Grid;

function ResponsiveComponent() {
  const screens = useBreakpoint();
  // screens = { xs: true, sm: true, md: true, lg: false, xl: false, xxl: false }

  return (
    <div>
      {screens.md ? <DesktopView /> : <MobileView />}
      <Table size={screens.lg ? 'middle' : 'small'} />
    </div>
  );
}
```

### Pattern 39.3: useMediaQuery Hook (HIGH)

```typescript
// Custom hook (see Pattern 29.7 in hook-patterns)
const isMobile = useMediaQuery('(max-width: 575px)');
const isTablet = useMediaQuery('(min-width: 576px) and (max-width: 991px)');
const isDesktop = useMediaQuery('(min-width: 992px)');
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

// Responsive rendering
function Navigation() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return isMobile ? <MobileDrawerNav /> : <DesktopSidebarNav />;
}
```

### Pattern 39.4: CSS Container Queries (HIGH)

```css
/* src/shared/ui/Card/Card.module.css */
.cardContainer {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .cardContent { display: flex; flex-direction: row; }
}

@container card (max-width: 399px) {
  .cardContent { display: flex; flex-direction: column; }
}
```

```typescript
// Container queries — component responds to ITS container size, not viewport
function ResponsiveCard({ children }: PropsWithChildren) {
  return <div className={styles.cardContainer}><div className={styles.cardContent}>{children}</div></div>;
}
```

### Pattern 39.5: Responsive Table (HIGH)

```typescript
// Horizontal scroll on small screens
<Table scroll={{ x: 1200 }} columns={[
  { title: 'Name', dataIndex: 'name', fixed: 'left', width: 150 },
  { title: 'Email', dataIndex: 'email', width: 250 },
  { title: 'Role', dataIndex: 'role', width: 100 },
  { title: 'Department', dataIndex: 'department', width: 150, responsive: ['lg'] }, // Hide on < lg
  { title: 'Created', dataIndex: 'createdAt', width: 120, responsive: ['md'] },
  { title: 'Actions', fixed: 'right', width: 100 },
]} />

// Or switch to card list on mobile
function UserListResponsive() {
  const screens = Grid.useBreakpoint();
  return screens.md ? <UserTable /> : <UserCardList />;
}
```

### Pattern 39.6: Responsive Form Layout (MEDIUM-HIGH)

```typescript
function ResponsiveForm() {
  const screens = Grid.useBreakpoint();
  return (
    <Form layout={screens.md ? 'horizontal' : 'vertical'}
      labelCol={screens.md ? { span: 6 } : undefined}
      wrapperCol={screens.md ? { span: 18 } : undefined}>
      <Form.Item label="Name"><Input /></Form.Item>
      <Form.Item label="Email"><Input /></Form.Item>
    </Form>
  );
}
```

### Pattern 39.7: Mobile-First CSS Modules (MEDIUM)

```css
/* Mobile first — default styles for mobile */
.container { padding: 12px; flex-direction: column; }

/* Tablet and up */
@media (min-width: 768px) { .container { padding: 24px; flex-direction: row; } }

/* Desktop and up */
@media (min-width: 992px) { .container { padding: 32px; max-width: 1200px; margin: 0 auto; } }
```

### Pattern 39.8: Anti-patterns (MEDIUM)

**1. Desktop-first** — Writing desktop styles then overriding for mobile. Use mobile-first.
**2. Hiding content** — `display: none` on mobile. Remove from DOM or use Drawer instead.
**3. Fixed widths** — `width: 500px` breaks on mobile. Use responsive units or AntD Grid.
**4. No touch targets** — Buttons/links smaller than 44px on mobile.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (39.1–39.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Responsive Layout Specialist | EPS v3.2 | Metadata v2.1*

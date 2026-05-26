# React Layout Patterns Specialist
# Reactレイアウトパターンスペシャリスト
# Chuyen Gia Layout Patterns React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App, Widgets |
| **Directory Pattern** | `src/app/layouts/`, `src/widgets/layout/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 75.1–75.8 |
| **Source Paths** | `src/app/layouts/**`, `src/widgets/layout/**` |
| **File Count** | 3–8 layout files |
| **Naming Convention** | `{Name}Layout.tsx`, `{Component}Panel.tsx` |
| **Imports From** | Shared (hooks, config), Features (navigation) |
| **Cannot Import** | Pages directly |
| **Imported By** | App routes |
| **Dependencies** | `antd:5.x` (Layout, Tabs), `react-router:7.x` (Outlet) |
| **When To Use** | App shell patterns, multi-column, tab navigation, split-pane, nested layouts |
| **Source Skeleton** | `src/app/layouts/{Name}Layout.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate higher-level layout patterns — app shell, multi-column, sticky header/footer, tab navigation, split-pane |
| **Activation Trigger** | files: src/app/layouts/**; keywords: appShell, layoutPattern, splitPane, tabNavigation, nestedLayout |

---

## Evidence Sources

- E1: AntD Layout component patterns
- E2: React Router Outlet nested layout
- E3: Enterprise admin dashboard layouts
- E4: Split-pane and multi-panel patterns

---

## Patterns

### Pattern 75.1: App Shell (CRITICAL)

Fixed sidebar + fixed header + scrollable content area.

```typescript
export function AppShellLayout() {
  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={240} style={{ position: 'fixed', left: 0, top: 0, bottom: 0, overflow: 'auto' }}>
        <SidebarMenu />
      </Sider>
      <Layout style={{ marginLeft: 240 }}>
        <Header style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff' }}>
          <AppHeader />
        </Header>
        <Content style={{ overflow: 'auto', padding: 24, minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

### Pattern 75.2: Multi-Column Layout (HIGH)

```typescript
// Master-detail: list on left, detail on right
function MasterDetailLayout() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <Row gutter={16} style={{ height: 'calc(100vh - 128px)' }}>
      <Col span={8} style={{ overflow: 'auto', height: '100%' }}>
        <UserList onSelect={setSelectedId} selectedId={selectedId} />
      </Col>
      <Col span={16} style={{ overflow: 'auto', height: '100%' }}>
        {selectedId ? <UserDetail userId={selectedId} /> : <Empty description="Select a user" />}
      </Col>
    </Row>
  );
}
```

### Pattern 75.3: Sticky Header/Footer (HIGH)

```typescript
function StickyLayout() {
  return (
    <Layout>
      <Header style={{ position: 'sticky', top: 0, zIndex: 10 }}><AppHeader /></Header>
      <Content style={{ minHeight: 'calc(100vh - 128px)', padding: 24 }}><Outlet /></Content>
      <Footer style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
        <ActionBar />
      </Footer>
    </Layout>
  );
}
```

### Pattern 75.4: Nested Layout (Outlet) (HIGH)

```typescript
// Parent layout with Outlet
function SettingsLayout() {
  return (
    <Row gutter={24}>
      <Col span={6}><SettingsMenu /></Col>
      <Col span={18}><Outlet /></Col>  {/* Child routes render here */}
    </Row>
  );
}

// Route config
{ path: 'settings', element: <SettingsLayout />, children: [
  { path: 'profile', lazy: () => import('@/pages/settings/profile') },
  { path: 'security', lazy: () => import('@/pages/settings/security') },
  { path: 'notifications', lazy: () => import('@/pages/settings/notifications') },
]}
```

### Pattern 75.5: Tab-Based Navigation (HIGH)

```typescript
function TabNavigationLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabItems = [
    { key: '/dashboard/overview', label: 'Overview' },
    { key: '/dashboard/analytics', label: 'Analytics' },
    { key: '/dashboard/reports', label: 'Reports' },
  ];

  return (
    <div>
      <Tabs activeKey={location.pathname} onChange={(key) => navigate(key)} items={tabItems} />
      <div style={{ marginTop: 16 }}><Outlet /></div>
    </div>
  );
}
```

### Pattern 75.6: Split-Pane (MEDIUM-HIGH)

```typescript
// Resizable split-pane (using CSS resize or library)
function SplitPaneLayout() {
  const [leftWidth, setLeftWidth] = useState(300);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <div style={{ width: leftWidth, minWidth: 200, maxWidth: 500, overflow: 'auto', borderRight: '1px solid #f0f0f0', resize: 'horizontal' }}>
        <NavigationTree />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <Outlet />
      </div>
    </div>
  );
}
```

### Pattern 75.7: Full-Screen Modal Layout (MEDIUM)

```typescript
// Overlay layout for complex editors, multi-step wizards
function FullScreenModalLayout({ open, onClose, title, children }: FullScreenLayoutProps) {
  return (
    <Modal open={open} onCancel={onClose} title={title} width="100%" style={{ top: 0, maxWidth: '100vw', paddingBottom: 0 }}
      styles={{ body: { height: 'calc(100vh - 110px)', overflow: 'auto' } }}
      footer={null} closable>
      {children}
    </Modal>
  );
}
```

### Pattern 75.8: Anti-patterns (MEDIUM)

**1. Layout without Outlet** — Hardcoding page components. Use React Router Outlet.
**2. Scroll-within-scroll** — Nested overflow:auto without fixed height. Set explicit heights.
**3. Fixed layout for all pages** — Some pages need full-width. Support layout variants.
**4. No empty state in master-detail** — Right panel blank on load. Show placeholder.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (75.1–75.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Layout Patterns Specialist | EPS v3.2 | Metadata v2.1*

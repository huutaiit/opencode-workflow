# React AntD Layout Specialist
# React AntDレイアウトスペシャリスト
# Chuyen Gia AntD Layout React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App, Widgets |
| **Directory Pattern** | `src/app/layouts/`, `src/widgets/layout/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 35.1–35.10 |
| **Source Paths** | `src/app/layouts/**`, `src/widgets/layout/**` |
| **File Count** | 3–8 layout files |
| **Naming Convention** | `MainLayout.tsx`, `AuthLayout.tsx`, `Sidebar.tsx`, `Header.tsx` |
| **Imports From** | Shared (hooks, config, auth), Features (navigation items) |
| **Cannot Import** | Pages directly (layout wraps via Outlet) |
| **Imported By** | App routes (layout wraps page outlets) |
| **Dependencies** | `antd:5.x` (Layout, Menu, Breadcrumb, Avatar, Dropdown) |
| **When To Use** | App shell setup, sidebar+content layout, collapsible sidebar, fixed header |
| **Source Skeleton** | `src/app/layouts/MainLayout.tsx`, `src/widgets/layout/Sidebar.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate AntD Layout patterns — Sider+Content, collapsible sidebar, fixed header, breadcrumbs, responsive |
| **Activation Trigger** | files: src/app/layouts/**, src/widgets/layout/**; keywords: antdLayout, sidebar, collapsibleMenu, mainLayout |

---

## Evidence Sources

- E1: Ant Design 5 Layout component documentation
- E2: AntD Pro Layout patterns
- E3: Responsive layout breakpoints
- E4: React Router Outlet + AntD Layout integration

---

## Patterns

### Pattern 35.1: AntD Layout + Sider + Content (CRITICAL)

```typescript
import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content, Header, Footer } = Layout;

export function MainLayout() {
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg" collapsedWidth={80} width={240} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div className="logo" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {collapsed ? <AppIcon /> : <AppLogo />}
        </div>
        <Menu mode="inline" selectedKeys={[location.pathname]} onClick={({ key }) => navigate(key)} items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <AppBreadcrumbs />
          <UserMenu />
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 360 }}>
          <Outlet />
        </Content>
        <Footer style={{ textAlign: 'center' }}>Enterprise App {new Date().getFullYear()}</Footer>
      </Layout>
    </Layout>
  );
}
```

### Pattern 35.2: Collapsible Sidebar + localStorage (CRITICAL)

```typescript
const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);

<Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null}>
  <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ width: '100%', height: 48 }} />
</Sider>
```

### Pattern 35.3: Fixed Header + Avatar Dropdown (HIGH)

```typescript
function AppHeader() {
  const { user, logout } = useAuth();

  const menuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true },
  ];

  return (
    <Header style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff' }}>
      <Dropdown menu={{ items: menuItems, onClick: ({ key }) => key === 'logout' ? logout() : navigate(`/${key}`) }}>
        <Space style={{ cursor: 'pointer' }}>
          <Avatar size="small" icon={<UserOutlined />} src={user?.avatar} />
          <span>{user?.displayName}</span>
          <DownOutlined style={{ fontSize: 12 }} />
        </Space>
      </Dropdown>
    </Header>
  );
}
```

### Pattern 35.4: Multi-Level Menu from Config (HIGH)

```typescript
import type { MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'users-submenu', icon: <TeamOutlined />, label: 'Users', children: [
    { key: '/users', label: 'User List' },
    { key: '/users/create', label: 'Create User' },
  ]},
  { key: 'orders-submenu', icon: <ShoppingOutlined />, label: 'Orders', children: [
    { key: '/orders', label: 'All Orders' },
    { key: '/orders/pending', label: 'Pending' },
  ]},
  { type: 'divider' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

// Filter by permissions
function useFilteredMenu(items: MenuItem[]): MenuItem[] {
  const { can } = usePermission();
  return useMemo(() => items.filter(item => {
    if (!item) return false;
    if ('permission' in item && !can(item.permission as Permission)) return false;
    return true;
  }), [items, can]);
}
```

### Pattern 35.5: Responsive Layout (HIGH)

```typescript
<Sider breakpoint="lg" collapsedWidth={0} onBreakpoint={(broken) => { if (broken) setCollapsed(true); }}>

// Mobile: Drawer instead of Sider
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <Drawer open={!collapsed} onClose={() => setCollapsed(true)} placement="left" width={240} closable={false}>
    <Menu items={menuItems} mode="inline" />
  </Drawer>
) : (
  <Sider collapsible collapsed={collapsed}><Menu items={menuItems} /></Sider>
)}
```

### Pattern 35.6: Breadcrumb from Routes (HIGH)

```typescript
import { useMatches, Link } from 'react-router-dom';
import { Breadcrumb } from 'antd';

function AppBreadcrumbs() {
  const matches = useMatches();
  const items = matches
    .filter(m => (m.handle as any)?.breadcrumb)
    .map(m => ({ title: <Link to={m.pathname}>{(m.handle as any).breadcrumb}</Link> }));
  return <Breadcrumb items={items} />;
}
```

### Pattern 35.7: Auth Layout (MEDIUM-HIGH)

```typescript
// Separate layout for login/register (no sidebar/header)
export function AuthLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ width: 400 }}><Outlet /></Card>
      </Content>
    </Layout>
  );
}

// Routes
{ path: '/login', element: <AuthLayout />, children: [{ index: true, lazy: () => import('@/pages/login') }] }
{ path: '/', element: <MainLayout />, children: [/* protected routes */] }
```

### Pattern 35.8: Tab-Based Navigation (MEDIUM)

```typescript
// Multi-tab layout (like browser tabs for open pages)
function TabLayout() {
  const [tabs, setTabs] = useState<{ key: string; label: string }[]>([{ key: '/dashboard', label: 'Dashboard' }]);
  const location = useLocation();

  // Add tab on navigation
  useEffect(() => {
    if (!tabs.find(t => t.key === location.pathname)) {
      setTabs(prev => [...prev, { key: location.pathname, label: getPageTitle(location.pathname) }]);
    }
  }, [location.pathname]);

  return (
    <Tabs activeKey={location.pathname} type="editable-card" hideAdd
      onChange={(key) => navigate(key)}
      onEdit={(key, action) => { if (action === 'remove') removeTab(key as string); }}
      items={tabs.map(t => ({ key: t.key, label: t.label }))} />
  );
}
```

### Pattern 35.9: Layout Skeleton (MEDIUM)

```typescript
function LayoutSkeleton() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240}><Skeleton active paragraph={{ rows: 8 }} /></Sider>
      <Layout>
        <Header style={{ background: '#fff' }}><Skeleton.Input active style={{ width: 200 }} /></Header>
        <Content style={{ margin: 24 }}><Skeleton active paragraph={{ rows: 10 }} /></Content>
      </Layout>
    </Layout>
  );
}
```

### Pattern 35.10: Anti-patterns (MEDIUM)

**1. Layout without Outlet** — Hardcoding page components instead of using React Router Outlet.
**2. Inline menu items** — Defining menu in JSX instead of config array.
**3. Not persisting sidebar state** — Sidebar resets on page reload.
**4. Missing responsive breakpoint** — Desktop-only layout breaks on tablet/mobile.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (35.1–35.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React AntD Layout Specialist | EPS v3.2 | Metadata v2.1*

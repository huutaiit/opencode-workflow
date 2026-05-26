# React Router Specialist
# React Routerスペシャリスト
# Chuyen Gia React Router

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App (router config in app layer) |
| **Directory Pattern** | `src/app/routes/`, `src/pages/{name}/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 43.1–43.12 |
| **Source Paths** | `src/app/routes/**`, `src/pages/**/*.tsx` |
| **File Count** | 3–5 route config files + 10–30 page components |
| **Naming Convention** | `routes.tsx` (config), `{Page}Page.tsx` (page component), `{Page}Layout.tsx` (layout) |
| **Imports From** | Pages (lazy-loaded), Shared (auth guards, types) |
| **Cannot Import** | Features directly (routes import pages, pages compose features) |
| **Imported By** | App entry point (BrowserRouter wraps routes) |
| **Dependencies** | `react-router:7.x`, `react-router-dom:7.x` |
| **When To Use** | Route configuration, lazy loading pages, nested layouts, route params, search params, breadcrumbs |
| **Source Skeleton** | `src/app/routes/routes.tsx`, `src/pages/{name}/{Name}Page.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate React Router v7 configuration — createBrowserRouter, lazy routes, nested Outlet layouts, AntD breadcrumbs |
| **Activation Trigger** | files: src/app/routes/**, src/pages/**; keywords: reactRouter, createBrowserRouter, lazyRoute, routeParams, breadcrumbs |

---

## Evidence Sources

- E1: React Router v7 documentation
- E2: React Router lazy route patterns
- E3: AntD Layout + Outlet nested routing
- E4: FSD page organization conventions

---

## Patterns

### Pattern 43.1: createBrowserRouter (CRITICAL)

```typescript
// src/app/routes/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/widgets/layout';
import { ProtectedRoute } from './guards/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: () => import('@/pages/login'),
  },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', lazy: () => import('@/pages/dashboard') },
      {
        path: 'users',
        children: [
          { index: true, lazy: () => import('@/pages/users/list') },
          { path: ':userId', lazy: () => import('@/pages/users/detail') },
          { path: 'create', lazy: () => import('@/pages/users/create') },
        ],
      },
      { path: 'settings', lazy: () => import('@/pages/settings') },
    ],
  },
  { path: '*', lazy: () => import('@/pages/not-found') },
]);

// src/app/index.tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/routes';

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
```

### Pattern 43.2: Lazy Routes (CRITICAL)

```typescript
// Each page exports Component (and optionally loader, action, ErrorBoundary)
// src/pages/users/list/index.ts
export { default as Component } from './ui/UsersListPage';
export { loader } from './loader';
export { ErrorBoundary } from './ErrorBoundary';

// src/pages/users/list/ui/UsersListPage.tsx
export default function UsersListPage() {
  return (
    <div>
      <PageHeader title="Users" />
      <UserList />
    </div>
  );
}

// Route config — lazy() imports the page module
{ path: 'users', lazy: () => import('@/pages/users/list') }
// React Router automatically maps Component, loader, ErrorBoundary
```

### Pattern 43.3: Nested Outlet + AntD Layout (HIGH)

```typescript
// src/widgets/layout/ui/AppLayout.tsx
import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content, Header } = Layout;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={[
            { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
            { key: '/users', icon: <UserOutlined />, label: 'Users' },
            { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
          ]}
        />
      </Sider>
      <Layout>
        <Header><AppHeader /></Header>
        <Content style={{ padding: 24 }}>
          <Outlet />  {/* Child routes render here */}
        </Content>
      </Layout>
    </Layout>
  );
}
```

### Pattern 43.4: Route Loaders (HIGH)

```typescript
// src/pages/users/detail/loader.ts
import { type LoaderFunctionArgs } from 'react-router-dom';
import { queryClient } from '@/shared/api/queryClient';
import { userQueries } from '@/entities/user/api/userQueries';

export async function loader({ params }: LoaderFunctionArgs) {
  const userId = params.userId!;
  // Prefetch — data available immediately when page renders
  await queryClient.ensureQueryData(userQueries.detail(userId));
  return null; // Data accessed via useQuery in component, not useLoaderData
}
```

### Pattern 43.5: Typed Route Params (HIGH)

```typescript
// src/shared/types/routes.ts
export interface UserDetailParams {
  userId: string;
}

// In page component
import { useParams } from 'react-router-dom';

function UserDetailPage() {
  const { userId } = useParams<keyof UserDetailParams>() as UserDetailParams;
  const { data: user } = useQuery(userQueries.detail(userId));
  // ...
}
```

### Pattern 43.6: Search Params + AntD Table Sync (HIGH)

```typescript
import { useSearchParams } from 'react-router-dom';

function UsersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tableParams = {
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || 20,
    sortField: searchParams.get('sortField') || 'name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
    role: searchParams.get('role') || undefined,
  };

  const handleTableChange: TableProps<User>['onChange'] = (pagination, filters, sorter) => {
    const newParams = new URLSearchParams();
    newParams.set('page', String(pagination.current));
    newParams.set('pageSize', String(pagination.pageSize));
    if (!Array.isArray(sorter) && sorter.field) {
      newParams.set('sortField', String(sorter.field));
      newParams.set('sortOrder', sorter.order === 'descend' ? 'desc' : 'asc');
    }
    if (filters.role?.[0]) newParams.set('role', String(filters.role[0]));
    setSearchParams(newParams);
  };

  const { data, isLoading } = useQuery(userQueries.list(tableParams));

  return (
    <Table<User>
      loading={isLoading}
      dataSource={data?.items}
      onChange={handleTableChange}
      pagination={{ current: tableParams.page, pageSize: tableParams.pageSize, total: data?.total }}
    />
  );
}
```

### Pattern 43.7: Breadcrumbs (MEDIUM-HIGH)

```typescript
import { useMatches, Link } from 'react-router-dom';
import { Breadcrumb } from 'antd';

function AppBreadcrumbs() {
  const matches = useMatches();

  const breadcrumbItems = matches
    .filter((match) => (match.handle as any)?.breadcrumb)
    .map((match) => ({
      title: (
        <Link to={match.pathname}>
          {typeof (match.handle as any).breadcrumb === 'function'
            ? (match.handle as any).breadcrumb(match.data)
            : (match.handle as any).breadcrumb}
        </Link>
      ),
    }));

  return <Breadcrumb items={breadcrumbItems} />;
}

// Route config with breadcrumb handle
{
  path: 'users',
  handle: { breadcrumb: 'Users' },
  children: [
    { index: true, handle: { breadcrumb: 'List' } },
    { path: ':userId', handle: { breadcrumb: (data: any) => data?.user?.name ?? 'Detail' } },
  ],
}
```

### Pattern 43.8: Navigation Guards (useBlocker) (MEDIUM-HIGH)

```typescript
import { useBlocker } from 'react-router-dom';
import { Modal } from 'antd';

function EditFormPage() {
  const [isDirty, setIsDirty] = useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      Modal.confirm({
        title: 'Unsaved Changes',
        content: 'You have unsaved changes. Are you sure you want to leave?',
        onOk: () => blocker.proceed(),
        onCancel: () => blocker.reset(),
      });
    }
  }, [blocker]);

  return <Form onChange={() => setIsDirty(true)} />;
}
```

### Pattern 43.9: Route Error Element (MEDIUM)

```typescript
// src/pages/error/ErrorPage.tsx
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { Result, Button } from 'antd';

export function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <Result status="404" title="Page Not Found" extra={<Link to="/"><Button type="primary">Home</Button></Link>} />;
    }
    return <Result status="500" title={`Error ${error.status}`} subTitle={error.statusText} />;
  }

  return <Result status="error" title="Something went wrong" subTitle={(error as Error)?.message} />;
}
```

### Pattern 43.10: FSD Route Organization (MEDIUM)

```
src/
├── app/routes/
│   ├── routes.tsx          # createBrowserRouter config
│   ├── guards/             # ProtectedRoute, RoleGuard
│   └── index.ts
├── pages/
│   ├── dashboard/
│   │   ├── ui/DashboardPage.tsx
│   │   ├── loader.ts
│   │   └── index.ts        # export { Component, loader }
│   ├── users/
│   │   ├── list/
│   │   │   ├── ui/UsersListPage.tsx
│   │   │   └── index.ts
│   │   ├── detail/
│   │   │   ├── ui/UserDetailPage.tsx
│   │   │   ├── loader.ts
│   │   │   └── index.ts
│   │   └── create/
│   │       └── ...
│   ├── login/
│   └── not-found/
└── widgets/layout/
    └── ui/AppLayout.tsx     # Outlet-based layout
```

### Pattern 43.11: Route Actions (MEDIUM)

```typescript
// src/pages/users/create/action.ts
import { type ActionFunctionArgs, redirect } from 'react-router-dom';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  try {
    await apiClient.post('/users', data);
    return redirect('/users');
  } catch (error) {
    return { error: (error as Error).message };
  }
}
```

### Pattern 43.12: Anti-patterns (MEDIUM)

**1. Features in route config** — Importing feature components directly in routes.
```
// FIX: Routes import pages. Pages compose features.
```

**2. Missing error boundaries** — Route crash takes down entire app.
```
// FIX: errorElement on parent routes
```

**3. Non-lazy routes** — All pages bundled together (large initial bundle).
```
// FIX: lazy(() => import('@/pages/...')) for every route
```

**4. Hardcoded paths** — `/users/${id}` scattered across components.
```
// FIX: Create route path constants or helper functions
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (43.1–43.12)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Router Specialist | EPS v3.2 | Metadata v2.1*

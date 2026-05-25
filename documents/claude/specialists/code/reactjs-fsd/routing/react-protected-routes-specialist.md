# React Protected Routes Specialist
# React保護ルートスペシャリスト
# Chuyen Gia Protected Routes React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App (route guards in app layer) |
| **Directory Pattern** | `src/app/routes/guards/`, `src/shared/lib/auth/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 44.1–44.8 |
| **Source Paths** | `src/app/routes/guards/**`, `src/shared/lib/auth/**` |
| **File Count** | 2–5 guard files |
| **Naming Convention** | `ProtectedRoute.tsx`, `RoleGuard.tsx`, `PermissionGuard.tsx` |
| **Imports From** | Shared (auth hooks, permission hooks) |
| **Cannot Import** | Features, Pages |
| **Imported By** | App routes (wrap protected route definitions) |
| **Dependencies** | `react-router:7.x` (Navigate, useLocation) |
| **When To Use** | Auth-gated pages, role-based route access, redirect after login, permission-based rendering |
| **Source Skeleton** | `src/app/routes/guards/ProtectedRoute.tsx`, `src/app/routes/guards/RoleGuard.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate protected route patterns — auth guards, role-based access (RBAC), redirect after login, AntD Result.403 |
| **Activation Trigger** | files: src/app/routes/guards/**; keywords: protectedRoute, authGuard, roleGuard, redirectAfterLogin |

---

## Evidence Sources

- E1: React Router v7 protected route patterns
- E2: RBAC (Role-Based Access Control) in SPA
- E3: OAuth2 redirect-after-login pattern
- E4: AntD Result component for 403/unauthorized pages

---

## Patterns

### Pattern 44.1: ProtectedRoute Component (CRITICAL)

```typescript
// src/app/routes/guards/ProtectedRoute.tsx
import { Navigate, useLocation, type PropsWithChildren } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Spin } from 'antd';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save intended destination for redirect after login
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
}

// Usage in routes
{
  path: '/',
  element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
  children: [
    { path: 'dashboard', lazy: () => import('@/pages/dashboard') },
    // All children are protected
  ],
}
```

### Pattern 44.2: Role-Based Access (CRITICAL)

```typescript
// src/app/routes/guards/RoleGuard.tsx
import { type PropsWithChildren } from 'react';
import { useAuth } from '@/features/auth';
import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';

interface RoleGuardProps extends PropsWithChildren {
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, fallback, children }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback ?? (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You don't have permission to access this page."
        extra={<Link to="/dashboard"><Button type="primary">Back to Dashboard</Button></Link>}
      />
    );
  }

  return <>{children}</>;
}

// Usage — admin-only routes
{
  path: 'admin',
  element: <RoleGuard allowedRoles={['admin', 'superadmin']}><Outlet /></RoleGuard>,
  children: [
    { path: 'users', lazy: () => import('@/pages/admin/users') },
    { path: 'settings', lazy: () => import('@/pages/admin/settings') },
  ],
}
```

### Pattern 44.3: Redirect After Login (CRITICAL)

```typescript
// src/pages/login/ui/LoginPage.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Get intended destination from state (set by ProtectedRoute)
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const handleLogin = async (values: LoginFormValues) => {
    await login(values.email, values.password);
    navigate(from, { replace: true }); // Redirect to original destination
  };

  return (
    <LoginForm onSubmit={handleLogin} />
  );
}
```

### Pattern 44.4: Permission-Based Rendering (HIGH)

Fine-grained permission checks within pages (not just route-level).

```typescript
// src/shared/hooks/usePermission.ts
type Permission = 'user:read' | 'user:create' | 'user:update' | 'user:delete' | 'order:read' | 'order:manage';

export function usePermission() {
  const { user } = useAuth();

  const can = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const canAny = useCallback((...permissions: Permission[]): boolean => {
    return permissions.some(can);
  }, [can]);

  const canAll = useCallback((...permissions: Permission[]): boolean => {
    return permissions.every(can);
  }, [can]);

  return { can, canAny, canAll };
}

// src/app/routes/guards/PermissionGuard.tsx
interface PermissionGuardProps extends PropsWithChildren {
  permission: Permission;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ permission, fallback, children }: PermissionGuardProps) {
  const { can } = usePermission();
  if (!can(permission)) return fallback ?? <Result status="403" title="Insufficient Permissions" />;
  return <>{children}</>;
}

// Usage in routes
{ path: 'users/create', element: <PermissionGuard permission="user:create"><CreateUserPage /></PermissionGuard> }

// Usage inline (conditional rendering)
function UserActions({ user }: { user: User }) {
  const { can } = usePermission();
  return (
    <Space>
      {can('user:update') && <Button onClick={() => edit(user)}>Edit</Button>}
      {can('user:delete') && <Popconfirm onConfirm={() => del(user.id)}><Button danger>Delete</Button></Popconfirm>}
    </Space>
  );
}
```

### Pattern 44.5: AntD Result.403 (HIGH)

```typescript
// src/shared/ui/AccessDenied/AccessDenied.tsx
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  message?: string;
  showBackButton?: boolean;
}

export function AccessDenied({ message = "You don't have permission to access this page.", showBackButton = true }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403"
      subTitle={message}
      extra={showBackButton && (
        <Button type="primary" onClick={() => navigate(-1)}>Go Back</Button>
      )}
    />
  );
}
```

### Pattern 44.6: Route-Level Permission Config (MEDIUM-HIGH)

```typescript
// Declarative permission in route config via handle
const routes = [
  {
    path: 'users',
    handle: { permission: 'user:read', breadcrumb: 'Users' },
    lazy: () => import('@/pages/users/list'),
  },
  {
    path: 'users/create',
    handle: { permission: 'user:create', breadcrumb: 'Create' },
    lazy: () => import('@/pages/users/create'),
  },
];

// Generic guard reads from handle
function RoutePermissionGuard({ children }: PropsWithChildren) {
  const matches = useMatches();
  const currentMatch = matches[matches.length - 1];
  const requiredPermission = (currentMatch?.handle as any)?.permission;
  const { can } = usePermission();

  if (requiredPermission && !can(requiredPermission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
```

### Pattern 44.7: Nested Protected Routes (MEDIUM)

```typescript
// Layered protection: auth → role → permission
const routes = [
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>, // Auth required
    children: [
      { path: 'dashboard', lazy: () => import('@/pages/dashboard') }, // Any authenticated user
      {
        path: 'admin',
        element: <RoleGuard allowedRoles={['admin']}><Outlet /></RoleGuard>, // Admin only
        children: [
          { path: 'users', lazy: () => import('@/pages/admin/users') },
          {
            path: 'settings',
            element: <PermissionGuard permission="admin:settings"><Outlet /></PermissionGuard>, // + specific permission
            lazy: () => import('@/pages/admin/settings'),
          },
        ],
      },
    ],
  },
];
```

### Pattern 44.8: Anti-patterns (MEDIUM)

**1. Flash of unauthorized content** — Page renders before auth check completes.
```typescript
// BAD: No loading state
if (!isAuthenticated) return <Navigate to="/login" />;
// Content briefly visible before redirect

// FIX: Show loading spinner while checking auth
if (isLoading) return <Spin />;
if (!isAuthenticated) return <Navigate to="/login" />;
```

**2. Client-only security** — Relying only on route guards without server-side checks.
```
// FIX: Route guards are UX. API must enforce auth/permissions on every request.
```

**3. Redirect loop** — ProtectedRoute redirects to /login, /login redirects to /.
```
// FIX: Login page should NOT be wrapped in ProtectedRoute
```

**4. Checking permissions in every component** — Scattered `if (!can('x'))` checks.
```
// FIX: Use route-level guards. Components assume they're authorized if rendered.
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (44.1–44.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Protected Routes Specialist | EPS v3.2 | Metadata v2.1*

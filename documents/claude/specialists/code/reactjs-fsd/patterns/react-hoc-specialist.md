# React HOC Specialist
# React HOCスペシャリスト
# Chuyen Gia HOC React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared (HOCs in shared/lib/hoc/) |
| **Directory Pattern** | `src/shared/lib/hoc/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 27.1–27.8 |
| **Source Paths** | `src/shared/lib/hoc/**/*.tsx` |
| **File Count** | 3–8 HOC files per project |
| **Naming Convention** | `with{Behavior}.tsx` (e.g., `withAuth.tsx`, `withPermission.tsx`) |
| **Imports From** | Shared (auth context, permission hooks, error boundary) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features (wrap components), Pages (wrap page components) |
| **Dependencies** | None (uses React core) |
| **When To Use** | Cross-cutting concerns on class components, wrapping third-party components, declarative auth/permission guards |
| **Source Skeleton** | `src/shared/lib/hoc/withAuth.tsx`, `src/shared/lib/hoc/withPermission.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate Higher-Order Component patterns — withAuth, withPermission, withErrorBoundary, TypeScript prop preservation, compose utility |
| **Activation Trigger** | files: src/shared/lib/hoc/**; keywords: hoc, higherOrderComponent, withAuth, withPermission, compose |

---

## Evidence Sources

- E1: React documentation — Higher-Order Components
- E2: TypeScript HOC typing patterns (ComponentPropsWithoutRef)
- E3: Enterprise auth/permission guard patterns
- E4: HOC vs Hook decision matrix

---

## Patterns

### Pattern 27.1: HOC with TypeScript (CRITICAL)

Preserving wrapped component props via generics.

```typescript
// src/shared/lib/hoc/withLoading.tsx
import { type ComponentType, type ComponentPropsWithoutRef } from 'react';
import { Spin } from 'antd';

interface WithLoadingProps {
  isLoading: boolean;
}

export function withLoading<P extends object>(
  WrappedComponent: ComponentType<P>,
): ComponentType<P & WithLoadingProps> {
  function WithLoadingComponent({ isLoading, ...props }: P & WithLoadingProps) {
    if (isLoading) return <Spin size="large" />;
    return <WrappedComponent {...(props as P)} />;
  }

  WithLoadingComponent.displayName = `withLoading(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithLoadingComponent;
}

// Usage
const UserListWithLoading = withLoading(UserList);
<UserListWithLoading users={users} isLoading={loading} />
// TypeScript knows: users (from UserList) + isLoading (from HOC)
```

### Pattern 27.2: withAuth HOC (CRITICAL)

Redirect unauthenticated users.

```typescript
// src/shared/lib/hoc/withAuth.tsx
import { type ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Spin } from 'antd';

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
): ComponentType<P> {
  function WithAuthComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return <Spin size="large" className="page-center" />;

    if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    return <WrappedComponent {...props} />;
  }

  WithAuthComponent.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithAuthComponent;
}

// Usage — protect entire page
const ProtectedDashboard = withAuth(DashboardPage);
// In routes: <Route path="/dashboard" element={<ProtectedDashboard />} />
```

### Pattern 27.3: withPermission(roles) HOC (HIGH)

Role-based component access.

```typescript
// src/shared/lib/hoc/withPermission.tsx
import { type ComponentType } from 'react';
import { Result } from 'antd';
import { useAuth } from '@/features/auth';

export function withPermission<P extends object>(
  ...allowedRoles: string[]
) {
  return function (WrappedComponent: ComponentType<P>): ComponentType<P> {
    function WithPermissionComponent(props: P) {
      const { user } = useAuth();

      if (!user || !allowedRoles.includes(user.role)) {
        return (
          <Result
            status="403"
            title="Access Denied"
            subTitle="You don't have permission to access this page."
          />
        );
      }

      return <WrappedComponent {...props} />;
    }

    WithPermissionComponent.displayName = `withPermission(${allowedRoles.join(',')})(${
      WrappedComponent.displayName || WrappedComponent.name
    })`;

    return WithPermissionComponent;
  };
}

// Usage
const AdminSettings = withPermission('admin', 'superadmin')(SettingsPage);
```

### Pattern 27.4: withErrorBoundary HOC (HIGH)

```typescript
// src/shared/lib/hoc/withErrorBoundary.tsx
import { type ComponentType } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Alert, Button } from 'antd';

function DefaultFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Alert
      type="error"
      message="Something went wrong"
      description={error.message}
      action={<Button onClick={resetErrorBoundary}>Retry</Button>}
    />
  );
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  FallbackComponent: ComponentType<FallbackProps> = DefaultFallback,
): ComponentType<P> {
  function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary FallbackComponent={FallbackComponent}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithErrorBoundaryComponent;
}
```

### Pattern 27.5: compose() Utility (HIGH)

Apply multiple HOCs in readable order.

```typescript
// src/shared/lib/hoc/compose.ts
type HOC<P> = (component: ComponentType<P>) => ComponentType<P>;

export function compose<P extends object>(...hocs: HOC<any>[]): HOC<P> {
  return (component: ComponentType<P>) =>
    hocs.reduceRight((acc, hoc) => hoc(acc), component);
}

// Usage
const ProtectedAdminPage = compose(
  withErrorBoundary,
  withAuth,
  withPermission('admin'),
)(AdminPage);

// Equivalent to:
// withErrorBoundary(withAuth(withPermission('admin')(AdminPage)))
// But reads top-to-bottom instead of inside-out
```

### Pattern 27.6: HOC displayName (MEDIUM)

```typescript
// Always set displayName for React DevTools
function withHOC(WrappedComponent: ComponentType<any>) {
  function Enhanced(props: any) { return <WrappedComponent {...props} />; }

  Enhanced.displayName = `withHOC(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return Enhanced;
}
// DevTools shows: withAuth(withPermission(admin)(SettingsPage))
```

### Pattern 27.7: When HOC > Hooks (MEDIUM)

| Scenario | HOC | Hook |
|----------|:---:|:----:|
| Class components (legacy) | ✅ | ❌ |
| Route-level guards | ✅ | ⚠️ |
| Third-party component wrapping | ✅ | ❌ |
| Component-level state | ❌ | ✅ |
| Multiple concerns on same component | ❌ | ✅ |
| Conditional logic | ❌ | ✅ |

**Rule**: Prefer hooks for new code. Use HOCs for route guards, legacy wrapping, and when you need to intercept rendering completely (redirect, show 403).

### Pattern 27.8: Anti-patterns (MEDIUM)

**1. Prop name collision** — HOC adds prop that conflicts with wrapped component.
```typescript
// BAD: Both HOC and component expect 'data' prop
// FIX: Use unique HOC prop names or namespace them
```

**2. Missing ref forwarding** — HOC breaks ref access.
```typescript
// FIX: Use React.forwardRef in HOC
const Enhanced = forwardRef<HTMLDivElement, P>((props, ref) => (
  <WrappedComponent {...props} ref={ref} />
));
```

**3. HOC in render** — Creating HOC inside render → new component every render → state reset.
```typescript
// BAD: HOC created during render
function Parent() {
  const Enhanced = withAuth(Child); // New component every render!
  return <Enhanced />;
}
// FIX: Create HOC outside component
const Enhanced = withAuth(Child);
function Parent() { return <Enhanced />; }
```

**4. HOC with side effects** — HOC that fetches data → hard to test, breaks SSR.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (27.1–27.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React HOC Specialist | EPS v3.2 | Metadata v2.1*

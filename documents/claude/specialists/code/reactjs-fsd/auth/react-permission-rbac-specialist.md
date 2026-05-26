# React Permission & RBAC Specialist
# React権限・RBACスペシャリスト
# Chuyen Gia Permission & RBAC React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features (permission hooks in shared, consumed by features) |
| **Directory Pattern** | `src/shared/lib/auth/permissions/`, `src/shared/hooks/usePermission.ts` |
| **Variant** | enterprise |
| **Pattern Numbers** | 48.1–48.10 |
| **Source Paths** | `src/shared/lib/auth/permissions/**`, `src/shared/hooks/usePermission*` |
| **File Count** | 3–6 permission files |
| **Naming Convention** | `usePermission.ts`, `Can.tsx`, `permissionMatrix.ts`, `permission.types.ts` |
| **Imports From** | Shared (auth context for current user roles) |
| **Cannot Import** | Features |
| **Imported By** | Features (usePermission), routing (ProtectedRoute), UI (AntD Menu/Button filtering) |
| **Dependencies** | None (uses React core + auth context) |
| **When To Use** | Role-based UI rendering, permission-gated actions, AntD component permission integration |
| **Source Skeleton** | `src/shared/lib/auth/permissions/permissionMatrix.ts`, `src/shared/hooks/usePermission.ts`, `src/shared/ui/Can.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate RBAC/ABAC patterns — usePermission hook, Can component, role hierarchy, AntD integration |
| **Activation Trigger** | files: src/shared/lib/auth/permissions/**; keywords: rbac, abac, permission, roleBasedAccess, canComponent |

---

## Evidence Sources

- E1: RBAC (Role-Based Access Control) NIST model
- E2: ABAC (Attribute-Based Access Control) patterns
- E3: AntD Menu/Button conditional rendering
- E4: Keycloak/Auth0 role claim mapping

---

## Patterns

### Pattern 48.1: usePermission Hook (CRITICAL)

```typescript
// src/shared/hooks/usePermission.ts
type Permission = 'user:read' | 'user:create' | 'user:update' | 'user:delete' |
  'order:read' | 'order:create' | 'order:manage' |
  'report:view' | 'report:export' |
  'admin:settings' | 'admin:users';

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

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);

  return { can, canAny, canAll, hasRole };
}
```

### Pattern 48.2: Can Component (CRITICAL)

Declarative permission-gated rendering.

```typescript
// src/shared/ui/Can.tsx
interface CanProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  role?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, permissions, requireAll = false, role, fallback = null, children }: CanProps) {
  const { can, canAny, canAll, hasRole } = usePermission();

  let allowed = false;
  if (permission) allowed = can(permission);
  else if (permissions) allowed = requireAll ? canAll(...permissions) : canAny(...permissions);
  else if (role) allowed = hasRole(role);
  else allowed = true;

  return allowed ? <>{children}</> : <>{fallback}</>;
}

// Usage
<Can permission="user:create">
  <Button type="primary" onClick={openCreateForm}>Create User</Button>
</Can>

<Can permission="order:manage" fallback={<Tag>View Only</Tag>}>
  <Button onClick={editOrder}>Edit Order</Button>
</Can>

<Can permissions={['report:view', 'report:export']} requireAll>
  <Button onClick={exportReport}>Export Report</Button>
</Can>
```

### Pattern 48.3: Role Hierarchy (HIGH)

```typescript
// src/shared/lib/auth/permissions/roleHierarchy.ts
const ROLE_HIERARCHY: Record<string, string[]> = {
  superadmin: ['admin', 'manager', 'viewer'],
  admin: ['manager', 'viewer'],
  manager: ['viewer'],
  viewer: [],
};

export function getEffectiveRoles(role: string): string[] {
  return [role, ...(ROLE_HIERARCHY[role] ?? [])];
}

// superadmin → ['superadmin', 'admin', 'manager', 'viewer']
// manager → ['manager', 'viewer']
```

### Pattern 48.4: Permission Matrix (HIGH)

```typescript
// src/shared/lib/auth/permissions/permissionMatrix.ts
const PERMISSION_MATRIX: Record<string, Permission[]> = {
  admin: ['user:read', 'user:create', 'user:update', 'user:delete', 'order:read', 'order:create', 'order:manage', 'report:view', 'report:export', 'admin:settings', 'admin:users'],
  manager: ['user:read', 'user:create', 'user:update', 'order:read', 'order:create', 'order:manage', 'report:view', 'report:export'],
  viewer: ['user:read', 'order:read', 'report:view'],
};

export function getPermissionsForRole(role: string): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}
```

### Pattern 48.5: AntD Menu Filtered by Permission (HIGH)

```typescript
function SidebarMenu() {
  const { can } = usePermission();

  const allItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/users', icon: <UserOutlined />, label: 'Users', permission: 'user:read' as Permission },
    { key: '/orders', icon: <ShoppingOutlined />, label: 'Orders', permission: 'order:read' as Permission },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Reports', permission: 'report:view' as Permission },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings', permission: 'admin:settings' as Permission },
  ];

  const visibleItems = allItems.filter((item) =>
    !item.permission || can(item.permission),
  );

  return <Menu items={visibleItems} />;
}
```

### Pattern 48.6: AntD Table Actions by Permission (HIGH)

```typescript
function UserTable({ users }: { users: User[] }) {
  const { can } = usePermission();

  const columns: ColumnsType<User> = [
    { title: 'Name', dataIndex: 'displayName' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Can permission="user:update">
            <Button size="small" onClick={() => edit(record)}>Edit</Button>
          </Can>
          <Can permission="user:delete">
            <Popconfirm title="Delete?" onConfirm={() => del(record.id)}>
              <Button size="small" danger>Delete</Button>
            </Popconfirm>
          </Can>
        </Space>
      ),
    },
  ];

  // Hide actions column entirely if no write permissions
  const visibleColumns = canAny('user:update', 'user:delete')
    ? columns
    : columns.filter((c) => c.title !== 'Actions');

  return <Table columns={visibleColumns} dataSource={users} />;
}
```

### Pattern 48.7: Route-Level Permission (MEDIUM-HIGH)

```typescript
// Already covered in protected-routes specialist (44.4-44.6)
// Bridge: usePermission feeds into PermissionGuard
<Route path="/admin/settings" element={
  <PermissionGuard permission="admin:settings">
    <AdminSettingsPage />
  </PermissionGuard>
} />
```

### Pattern 48.8: API-Level Permission (MEDIUM)

```typescript
// Send user role in API headers for server-side authorization
apiClient.interceptors.request.use((config) => {
  const { user } = useAuthStore.getState();
  if (user?.roles) {
    config.headers['X-User-Roles'] = user.roles.join(',');
  }
  return config;
});

// Note: This is UX convenience. Server MUST validate JWT independently.
```

### Pattern 48.9: Permission Caching (MEDIUM)

```typescript
// Cache permissions in Zustand for fast access
interface PermissionState {
  permissions: Permission[];
  setPermissions: (perms: Permission[]) => void;
  has: (perm: Permission) => boolean;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  setPermissions: (perms) => set({ permissions: perms }),
  has: (perm) => get().permissions.includes(perm),
}));

// Populate on auth success
useEffect(() => {
  if (user) {
    const perms = getPermissionsForRole(user.role);
    usePermissionStore.getState().setPermissions(perms);
  }
}, [user]);
```

### Pattern 48.10: Anti-patterns (MEDIUM)

**1. Hardcoded role checks** — `if (user.role === 'admin')` scattered everywhere.
```
// FIX: Use permission-based checks via usePermission hook
```

**2. UI-only security** — Hiding buttons without API enforcement.
```
// FIX: UI permission = UX. API must enforce on every request.
```

**3. Role explosion** — Creating new role for every permission combination.
```
// FIX: Use ABAC or permission matrix instead of roles.
```

**4. Checking permissions in every component** — Duplicate logic.
```
// FIX: Use Can component or route-level guards
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (48.1–48.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Permission & RBAC Specialist | EPS v3.2 | Metadata v2.1*

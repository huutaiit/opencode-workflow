# React Auth Flow Specialist
# React認証フロースペシャリスト
# Chuyen Gia Auth Flow React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App, Shared (auth provider in app, auth utils in shared) |
| **Directory Pattern** | `src/app/providers/AuthProvider.tsx`, `src/shared/lib/auth/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 46.1–46.10 |
| **Source Paths** | `src/app/providers/Auth*`, `src/shared/lib/auth/**` |
| **File Count** | 4–8 auth files (provider, hooks, utils, types) |
| **Naming Convention** | `AuthProvider.tsx`, `useAuth.ts`, `authUtils.ts`, `auth.types.ts` |
| **Imports From** | Shared (API client, config, types) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features (useAuth), App (AuthProvider), routing (protected routes) |
| **Dependencies** | `axios:1.x` (token management via API client) |
| **When To Use** | Login/logout flow, auth context setup, token storage strategy, session management |
| **Source Skeleton** | `src/app/providers/AuthProvider.tsx`, `src/shared/lib/auth/useAuth.ts`, `src/shared/lib/auth/tokenStorage.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate auth flow patterns — AuthProvider, login/logout, token storage, session timeout, AntD login form |
| **Activation Trigger** | files: src/app/providers/Auth*, src/shared/lib/auth/**; keywords: authFlow, login, logout, tokenStorage, sessionTimeout |

---

## Evidence Sources

- E1: OAuth2 token management best practices
- E2: httpOnly cookie storage for JWT security
- E3: React Context auth provider patterns
- E4: AntD Form + React 19 useActionState for login

---

## Patterns

### Pattern 46.1: AuthProvider with Lazy Initialization (CRITICAL)

```typescript
// src/app/providers/AuthProvider.tsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type PropsWithChildren } from 'react';
import type { User, LoginDTO, AuthState } from '@/shared/lib/auth/auth.types';
import { tokenStorage } from '@/shared/lib/auth/tokenStorage';
import { apiClient } from '@/shared/api/client';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginDTO) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lazy init — check stored token on mount
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) { setIsLoading(false); return; }

    apiClient.get<User>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => { tokenStorage.clear(); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (credentials: LoginDTO) => {
    const { data } = await apiClient.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', credentials);
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await apiClient.post('/auth/logout'); } catch {}
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

### Pattern 46.2: Login Flow (CRITICAL)

```typescript
// src/shared/lib/auth/auth.types.ts
export interface LoginDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

```typescript
// src/pages/login/ui/LoginPage.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Alert, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/app/providers/AuthProvider';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginDTO) => {
    setError(null);
    setLoading(true);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as ApiError).message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Sign In" style={{ maxWidth: 400, margin: '100px auto' }}>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Form onFinish={onFinish} autoComplete="on">
        <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
          <Input prefix={<UserOutlined />} placeholder="Email" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>
        <Form.Item name="rememberMe" valuePropName="checked">
          <Checkbox>Remember me</Checkbox>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>Sign In</Button>
      </Form>
    </Card>
  );
}
```

### Pattern 46.3: Logout Flow (HIGH)

```typescript
// Logout clears: tokens, query cache, user state, then redirects
const logout = useCallback(async () => {
  try {
    await apiClient.post('/auth/logout'); // Invalidate server session
  } catch {
    // Network error — clear local state anyway
  }
  tokenStorage.clear();
  queryClient.clear(); // Clear all cached data
  setUser(null);
  // ProtectedRoute will auto-redirect to /login
}, []);

// Logout button in header
function LogoutButton() {
  const { logout } = useAuth();
  const { modal } = App.useApp();

  const handleLogout = () => {
    modal.confirm({
      title: 'Sign Out',
      content: 'Are you sure you want to sign out?',
      onOk: logout,
    });
  };

  return <Button icon={<LogoutOutlined />} onClick={handleLogout}>Sign Out</Button>;
}
```

### Pattern 46.4: Token Storage Strategy (CRITICAL)

```typescript
// src/shared/lib/auth/tokenStorage.ts
// Option A: localStorage (convenient, less secure — XSS vulnerable)
// Option B: httpOnly cookie (secure, set by server — recommended)
// Option C: Memory-only (most secure, lost on refresh)

// Enterprise recommendation: httpOnly cookie for refresh token, memory for access token

class TokenStorage {
  private accessToken: string | null = null; // Memory only

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    // Refresh token set as httpOnly cookie by server (Set-Cookie header)
    // NOT stored in JavaScript-accessible storage
  }

  clear(): void {
    this.accessToken = null;
    // Server clears httpOnly cookie via /auth/logout response
  }
}

export const tokenStorage = new TokenStorage();

// Fallback: localStorage (when httpOnly cookies not available)
class LocalStorageTokenStorage {
  private readonly ACCESS_KEY = 'auth_access_token';
  private readonly REFRESH_KEY = 'auth_refresh_token';

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  clear(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }
}
```

### Pattern 46.5: Persistent Auth (Refresh on Reload) (HIGH)

```typescript
// On page reload: try to restore session from stored token
useEffect(() => {
  const restoreSession = async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // Validate token and get user profile
      const { data: user } = await apiClient.get<User>('/auth/me');
      setUser(user);
    } catch (error) {
      // Token expired — try refresh
      try {
        const { data } = await apiClient.post<AuthTokens>('/auth/refresh');
        tokenStorage.setTokens(data.accessToken, data.refreshToken);
        const { data: user } = await apiClient.get<User>('/auth/me');
        setUser(user);
      } catch {
        tokenStorage.clear(); // Both tokens invalid
      }
    } finally {
      setIsLoading(false);
    }
  };

  restoreSession();
}, []);
```

### Pattern 46.6: Session Timeout (MEDIUM-HIGH)

```typescript
// src/shared/lib/auth/useSessionTimeout.ts
export function useSessionTimeout(timeoutMinutes = 30) {
  const { logout } = useAuth();
  const { modal } = App.useApp();
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const resetTimer = () => { lastActivityRef.current = Date.now(); };

    const checkTimeout = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const warningThreshold = (timeoutMinutes - 2) * 60 * 1000;
      const expireThreshold = timeoutMinutes * 60 * 1000;

      if (elapsed >= expireThreshold) {
        logout();
      } else if (elapsed >= warningThreshold) {
        modal.warning({
          title: 'Session Expiring',
          content: 'Your session will expire in 2 minutes. Click OK to stay signed in.',
          onOk: resetTimer,
        });
      }
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));

    const interval = setInterval(checkTimeout, 60_000); // Check every minute

    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, [timeoutMinutes, logout, modal]);
}
```

### Pattern 46.7: AntD Login Form + useActionState (MEDIUM-HIGH)

```typescript
// React 19 form actions pattern
import { useActionState } from 'react';

interface LoginState { error: string | null; success: boolean; }

async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await authService.login({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });
    return { error: null, success: true };
  } catch (err) {
    return { error: (err as Error).message, success: false };
  }
}

function LoginFormR19() {
  const [state, formAction, isPending] = useActionState(loginAction, { error: null, success: false });
  const navigate = useNavigate();

  useEffect(() => {
    if (state.success) navigate('/dashboard', { replace: true });
  }, [state.success, navigate]);

  return (
    <form action={formAction}>
      {state.error && <Alert type="error" message={state.error} />}
      <input name="email" type="email" required disabled={isPending} />
      <input name="password" type="password" required disabled={isPending} />
      <Button htmlType="submit" loading={isPending}>Sign In</Button>
    </form>
  );
}
```

### Pattern 46.8: Auth Events (MEDIUM)

```typescript
// Cross-tab auth sync via BroadcastChannel
const authChannel = new BroadcastChannel('auth');

// On login
authChannel.postMessage({ type: 'login', user });

// On logout
authChannel.postMessage({ type: 'logout' });

// Listen in AuthProvider
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.data.type === 'logout') {
      setUser(null);
      tokenStorage.clear();
    }
    if (event.data.type === 'login') {
      setUser(event.data.user);
    }
  };
  authChannel.addEventListener('message', handler);
  return () => authChannel.removeEventListener('message', handler);
}, []);
```

### Pattern 46.9: Auth State Machine (MEDIUM)

```
IDLE → [check token] → AUTHENTICATED | UNAUTHENTICATED
UNAUTHENTICATED → [login] → AUTHENTICATING → AUTHENTICATED | ERROR
AUTHENTICATED → [logout] → UNAUTHENTICATED
AUTHENTICATED → [token expired] → REFRESHING → AUTHENTICATED | UNAUTHENTICATED
```

### Pattern 46.10: Anti-patterns (MEDIUM)

**1. Storing tokens in localStorage** — Vulnerable to XSS.
```
// FIX: httpOnly cookies for refresh token, memory for access token (Pattern 46.4)
```

**2. No loading state** — Flash of login page before auth check completes.
```
// FIX: Show Spin while isLoading is true
```

**3. Auth in every component** — Checking auth in each component instead of route guard.
```
// FIX: Use ProtectedRoute at route level. Components assume they're authenticated.
```

**4. Logout without cache clear** — Previous user's data visible to next user.
```
// FIX: queryClient.clear() on logout
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (46.1–46.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Auth Flow Specialist | EPS v3.2 | Metadata v2.1*

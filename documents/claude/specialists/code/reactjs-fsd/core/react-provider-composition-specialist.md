# React Provider Composition Specialist
# Reactプロバイダー構成スペシャリスト
# Chuyen Gia Composition Provider React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App (provider tree lives in app layer entry point) |
| **Directory Pattern** | `src/app/providers/`, `src/app/index.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 5.1–5.10 |
| **Source Paths** | `src/app/providers/**/*.tsx`, `src/app/index.tsx` |
| **File Count** | 5–10 provider files (1 per concern: auth, theme, query, i18n, etc.) |
| **Naming Convention** | `{Concern}Provider.tsx` (e.g., `AuthProvider.tsx`, `ThemeProvider.tsx`) |
| **Imports From** | Shared (config, lib), Entities (auth state types) |
| **Cannot Import** | Features, Pages, Widgets (providers are app-level, must not depend on feature-level code) |
| **Imported By** | App entry point (src/app/index.tsx composes all providers) |
| **Dependencies** | `antd:5.x` (ConfigProvider, App), `@tanstack/react-query:5.x` (QueryClientProvider), `react-router:7.x` (BrowserRouter) |
| **When To Use** | App initialization, adding new global providers, fixing provider ordering bugs, AntD ConfigProvider setup |
| **Source Skeleton** | `src/app/providers/index.tsx`, `src/app/providers/AuthProvider.tsx`, `src/app/providers/ThemeProvider.tsx`, `src/app/providers/QueryProvider.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate provider composition tree with correct nesting order, AntD ConfigProvider setup, and performance-optimized context splitting |
| **Activation Trigger** | files: src/app/providers/**; keywords: providerOrder, configProvider, queryClient, authProvider, themeProvider |

---

## Evidence Sources

- E1: React 19 context performance improvements
- E2: Ant Design 5 ConfigProvider API documentation
- E3: TanStack Query v5 QueryClient configuration
- E4: Feature-Sliced Design app layer conventions

---

## Role

You are a **React Provider Composition Specialist** for enterprise FSD projects. Your responsibility is to define the correct nesting order of providers, compose them efficiently, and configure enterprise-specific providers (AntD, Auth, i18n). Wrong provider ordering causes context access failures at runtime.

**Used by**: App layer code agents, configuration tasks, debug for context-related runtime errors
**Not used by**: Non-React stacks, simple apps with 1-2 providers

---

## Patterns

### Pattern 5.1: Provider Nesting Order (CRITICAL)

Enterprise apps require 8+ providers in exact dependency order. Outermost providers have no dependencies; innermost may depend on outer contexts.

```typescript
// src/app/providers/AppProviders.tsx
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { I18nProvider } from './I18nProvider';
import { queryClient } from '@/shared/api/queryClient';
import { themeConfig } from '@/shared/config/theme';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>                              {/* 1. No deps */}
      <ErrorBoundary fallback={<ErrorPage />}>   {/* 2. No deps */}
        <QueryClientProvider client={queryClient}> {/* 3. No deps */}
          <ConfigProvider theme={themeConfig}>    {/* 4. No deps */}
            <AntdApp>                            {/* 5. Needs ConfigProvider */}
              <AuthProvider>                     {/* 6. Needs QueryClient */}
                <I18nProvider>                   {/* 7. Needs Auth (for locale) */}
                  <ThemeProvider>                {/* 8. Needs ConfigProvider */}
                    {children}
                  </ThemeProvider>
                </I18nProvider>
              </AuthProvider>
            </AntdApp>
          </ConfigProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
```

**Enterprise provider dependency graph:**
```
BrowserRouter ────────────────────────── (no deps)
  └─ ErrorBoundary ──────────────────── (no deps)
      └─ QueryClientProvider ────────── (no deps)
          └─ ConfigProvider (AntD) ──── (no deps)
              └─ AntdApp ────────────── (needs ConfigProvider)
                  └─ AuthProvider ───── (needs QueryClient for token refresh)
                      └─ I18nProvider ─ (needs Auth for user locale preference)
                          └─ ThemeProvider (needs ConfigProvider for AntD tokens)
```

**Rule**: If Provider B uses a hook from Provider A's context, then A MUST wrap B.

---

### Pattern 5.2: Provider Factory — composeProviders() (HIGH)

Avoid deeply nested JSX with a utility that composes providers programmatically.

```typescript
// src/shared/lib/composeProviders.tsx
import { type ComponentType, type PropsWithChildren } from 'react';

type Provider = ComponentType<PropsWithChildren>;
type ProviderWithProps<P = object> = [ComponentType<P & PropsWithChildren>, P];

export function composeProviders(
  ...providers: (Provider | ProviderWithProps<any>)[]
): ComponentType<PropsWithChildren> {
  return function ComposedProviders({ children }: PropsWithChildren) {
    return providers.reduceRight<React.ReactNode>(
      (acc, current) => {
        if (Array.isArray(current)) {
          const [Provider, props] = current;
          return <Provider {...props}>{acc}</Provider>;
        }
        const Provider = current;
        return <Provider>{acc}</Provider>;
      },
      children,
    );
  };
}
```

```typescript
// src/app/providers/index.tsx — Clean composition
import { composeProviders } from '@/shared/lib/composeProviders';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { queryClient } from '@/shared/api/queryClient';
import { themeConfig } from '@/shared/config/theme';

export const AppProviders = composeProviders(
  BrowserRouter,
  ErrorBoundary,
  [QueryClientProvider, { client: queryClient }],
  [ConfigProvider, { theme: themeConfig }],
  AntdApp,
  AuthProvider,
  I18nProvider,
  ThemeProvider,
);
```

**Benefits**: Flat list instead of nested JSX (8-deep indentation). Easy to add/remove/reorder providers.

---

### Pattern 5.3: Lazy Provider Loading (HIGH)

Load heavy providers (i18n, analytics) after initial render to improve startup time.

```typescript
// src/app/providers/LazyI18nProvider.tsx
import { Suspense, lazy, type PropsWithChildren } from 'react';
import { Spin } from 'antd';

const I18nProvider = lazy(() =>
  import('./I18nProvider').then((m) => ({ default: m.I18nProvider }))
);

export function LazyI18nProvider({ children }: PropsWithChildren) {
  return (
    <Suspense fallback={<Spin size="large" />}>
      <I18nProvider>{children}</I18nProvider>
    </Suspense>
  );
}
```

**When to lazy-load:**
| Provider | Lazy? | Reason |
|----------|-------|--------|
| BrowserRouter | No | Required for initial render |
| ErrorBoundary | No | Must catch errors immediately |
| QueryClientProvider | No | Data fetching starts early |
| ConfigProvider (AntD) | No | UI renders incorrectly without theme |
| AuthProvider | No | Auth check needed before rendering protected routes |
| I18nProvider | Yes | Translations can load after shell renders |
| AnalyticsProvider | Yes | Non-blocking, can initialize lazily |

---

### Pattern 5.4: Provider Performance (HIGH)

Prevent unnecessary re-renders from provider value changes.

```typescript
// BAD: New object on every render → all consumers re-render
function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// GOOD: Memoize provider value
function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const login = useCallback(async (credentials: LoginDTO) => { /* ... */ }, []);
  const logout = useCallback(async () => { /* ... */ }, []);

  const value = useMemo(
    () => ({ user, login, logout }),
    [user, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Context splitting**: Separate frequently-changing values from stable ones.

```typescript
// Split into two contexts to avoid unnecessary re-renders
const AuthStateContext = createContext<{ user: User | null }>({ user: null });
const AuthActionsContext = createContext<{ login: LoginFn; logout: LogoutFn }>({
  login: async () => {},
  logout: async () => {},
});

function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const actions = useMemo(() => ({
    login: async (creds: LoginDTO) => { /* ... */ setUser(result); },
    logout: async () => { setUser(null); /* ... */ },
  }), []);

  return (
    <AuthActionsContext.Provider value={actions}>
      <AuthStateContext.Provider value={{ user }}>
        {children}
      </AuthStateContext.Provider>
    </AuthActionsContext.Provider>
  );
}

// Consumers that only need actions don't re-render when user changes
export const useAuthActions = () => useContext(AuthActionsContext);
export const useAuthState = () => useContext(AuthStateContext);
```

---

### Pattern 5.5: AntD ConfigProvider Setup (HIGH)

Configure Ant Design 5 with design tokens, locale, component defaults, and prefix customization.

```typescript
// src/app/providers/AntdProvider.tsx
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import viVN from 'antd/locale/vi_VN';
import { useI18n } from '@/shared/config/i18n';
import { themeConfig } from '@/shared/config/theme';

const localeMap = { en: enUS, ja: jaJP, vi: viVN } as const;

export function AntdProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const antdLocale = localeMap[locale as keyof typeof localeMap] ?? enUS;

  return (
    <ConfigProvider
      theme={themeConfig}
      locale={antdLocale}
      componentSize="middle"
      prefixCls="app"
      virtual={true}      // Enable virtual scroll for Select/Table
      wave={{ disabled: false }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
```

**ConfigProvider key props:**
| Prop | Purpose | Default |
|------|---------|---------|
| `theme` | Design tokens (colors, spacing, fonts) | AntD defaults |
| `locale` | i18n for AntD components (DatePicker, Table, etc.) | enUS |
| `componentSize` | Default size for all components | `middle` |
| `prefixCls` | CSS class prefix (avoid conflicts in micro-frontends) | `ant` |
| `virtual` | Virtual scroll for large datasets | `true` |
| `direction` | RTL support | `ltr` |

---

### Pattern 5.6: AntD App Component (HIGH)

Use `App.useApp()` for programmatic message, notification, and modal access instead of static methods.

```typescript
// src/app/providers/AntdProvider.tsx — Wrap with AntdApp
import { App as AntdApp } from 'antd';

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={themeConfig}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
```

```typescript
// src/features/user-management/model/useCreateUser.ts — Consumer
import { App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateUser() {
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      message.success(`User ${user.displayName} created`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      notification.error({
        message: 'Failed to create user',
        description: error.message,
        duration: 5,
      });
    },
  });
}
```

**Rule**: Never use `message.success()` or `notification.error()` as static imports. Always use `App.useApp()` — static methods don't respect ConfigProvider theme.

---

### Pattern 5.7: QueryClient Configuration (MEDIUM-HIGH)

Configure TanStack Query v5 defaults for enterprise apps.

```typescript
// src/shared/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,         // 5 minutes — reduce refetches
      gcTime: 30 * 60 * 1000,           // 30 minutes garbage collection
      retry: 2,                          // Retry failed requests twice
      retryDelay: (attemptIndex) =>      // Exponential backoff
        Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,       // Disable for enterprise (prefer explicit refresh)
      refetchOnReconnect: true,          // Refetch when network reconnects
      throwOnError: false,               // Handle errors in components
    },
    mutations: {
      retry: 0,                          // Don't retry mutations by default
      throwOnError: false,
    },
  },
});
```

```typescript
// src/app/providers/QueryProvider.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/shared/api/queryClient';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

---

### Pattern 5.8: Auth Provider Pattern (MEDIUM-HIGH)

Auth state with token management, user context, and lazy initialization.

```typescript
// src/app/providers/AuthProvider.tsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@/entities/user';
import { authApi } from '@/shared/api/authApi';
import { tokenStorage } from '@/shared/lib/tokenStorage';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Lazy initialization — check stored token on mount
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.getProfile()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: authUser, tokens } = await authApi.login({ email, password });
    tokenStorage.setTokens(tokens);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    tokenStorage.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo(() => ({
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

---

### Pattern 5.9: Theme Provider (MEDIUM)

Dark mode toggle with AntD design tokens and CSS variable injection.

```typescript
// src/app/providers/ThemeProvider.tsx
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { PropsWithChildren } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('theme') as ThemeMode) ?? 'system',
  );
  const resolved = resolveTheme(mode);

  useEffect(() => {
    localStorage.setItem('theme', mode);
    document.documentElement.setAttribute('data-theme', resolved);
  }, [mode, resolved]);

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setMode('system'); // Re-trigger resolve
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const current = resolveTheme(prev);
      return current === 'light' ? 'dark' : 'light';
    });
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode, toggle }), [mode, resolved, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

---

### Pattern 5.10: Anti-patterns (MEDIUM)

Common provider composition mistakes.

**1. Provider ordering bug** — AuthProvider uses `useQuery` but is placed above QueryClientProvider.
```typescript
// BAD: Auth uses QueryClient but wraps it
<AuthProvider>            {/* uses useQuery internally → CRASH */}
  <QueryClientProvider>   {/* provides QueryClient → too late */}
    {children}
  </QueryClientProvider>
</AuthProvider>

// FIX: QueryClientProvider wraps AuthProvider
<QueryClientProvider>
  <AuthProvider>
    {children}
  </AuthProvider>
</QueryClientProvider>
```

**2. Unnecessary re-renders from provider value** — Creating new object on every render.
```typescript
// BAD: New object reference every render
<MyContext.Provider value={{ user, setUser }}>  {/* ← new object each render */}

// FIX: useMemo
const value = useMemo(() => ({ user, setUser }), [user]);
<MyContext.Provider value={value}>
```

**3. Provider hell** — 15+ providers creating unreadable nesting.
```typescript
// BAD: Deep nesting
<A><B><C><D><E><F><G><H><I>{children}</I></H></G></F></E></D></C></B></A>

// FIX: Use composeProviders() utility (Pattern 5.2)
```

**4. Missing error boundary** — App crashes without graceful fallback.
```typescript
// BAD: No ErrorBoundary in provider tree
<QueryClientProvider><AuthProvider>{children}</AuthProvider></QueryClientProvider>

// FIX: ErrorBoundary wraps everything after Router
<BrowserRouter>
  <ErrorBoundary fallback={<ErrorPage />}>
    <QueryClientProvider>...
```

**5. AntD static methods ignoring theme** — Using `message.success()` instead of `App.useApp()`.
```typescript
// BAD: Static import — doesn't respect ConfigProvider
import { message } from 'antd';
message.success('Done'); // Uses default theme, not project theme

// FIX: Use App.useApp() hook
const { message } = App.useApp();
message.success('Done'); // Respects ConfigProvider theme
```

---

## Abnormal Case Patterns

1. **Server-side rendering** — SSR requires different provider setup (no BrowserRouter, hydration-safe state). Use StaticRouter for SSR, BrowserRouter for client.

2. **Micro-frontend providers** — Each micro-frontend has its own provider tree. Shared state via Module Federation runtime containers.

3. **Testing provider setup** — Use `renderWithProviders()` test utility (see testing specialist).

4. **Hot module replacement** — Providers with `useState` may lose state during HMR. Store critical state in Zustand (persisted) instead of Context.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (5.1–5.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Provider Composition Specialist | EPS v3.2 | Metadata v2.1*

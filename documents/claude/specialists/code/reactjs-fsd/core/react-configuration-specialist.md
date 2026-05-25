# React Configuration Specialist
# React設定スペシャリスト
# Chuyen Gia Cau Hinh React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App, Shared (config defined in shared/config, consumed from app and features) |
| **Directory Pattern** | `src/shared/config/`, `src/app/config/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 6.1–6.10 |
| **Source Paths** | `src/shared/config/**/*.ts`, `src/app/config/**/*.ts`, `.env*`, `vite.config.ts` |
| **File Count** | 5–8 config files (env schema, runtime config, feature flags, API config) |
| **Naming Convention** | `{concern}.config.ts` (e.g., `api.config.ts`, `theme.config.ts`), `env.ts` (schema) |
| **Imports From** | None (config is leaf — imported by others, imports nothing from project) |
| **Cannot Import** | Features, Entities, Widgets, Pages (config must be dependency-free) |
| **Imported By** | Shared (api client reads base URL), App (providers read config), Features (read feature flags) |
| **Dependencies** | `zod:3.x` (env schema validation), `vite:6.x` (import.meta.env) |
| **When To Use** | New project setup, adding environment variables, Docker runtime config injection, multi-tenant configuration |
| **Source Skeleton** | `src/shared/config/env.ts`, `src/shared/config/api.config.ts`, `src/shared/config/feature-flags.ts`, `.env.example` |
| **Specialist Type** | code |
| **Purpose** | Generate Vite environment config with Zod validation, runtime config injection for Docker, and typed feature flag management |
| **Activation Trigger** | files: src/shared/config/**; keywords: envVariable, runtimeConfig, featureFlag, apiBaseUrl, viteConfig |

---

## Evidence Sources

- E1: Vite 6 environment variables documentation (import.meta.env)
- E2: Zod schema validation library
- E3: Docker runtime config injection patterns (12-factor app)
- E4: Feature flag platform integration (LaunchDarkly, Unleash)

---

## Role

You are a **React Configuration Specialist** for enterprise FSD projects. Your responsibility is to define environment variable management, runtime configuration injection, feature flags, and API endpoint configuration. Enterprise apps need multi-environment support (dev/staging/prod) with type-safe, validated config.

**Used by**: API client setup, provider configuration, feature flag checks, DevOps pipeline config
**Not used by**: Non-Vite builds, backend configuration

---

## Patterns

### Pattern 6.1: Vite Environment Variables (CRITICAL)

Vite exposes env variables prefixed with `VITE_` via `import.meta.env`. Type them with declaration merging.

```typescript
// src/vite-env.d.ts — Type declarations for Vite env
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SIGNALR_URL: string;
  readonly VITE_ENABLE_MOCK: string;        // 'true' | 'false'
  readonly VITE_FEATURE_DARK_MODE: string;  // 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

```bash
# .env.example — Template for required variables
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=My Enterprise App
VITE_SENTRY_DSN=
VITE_SIGNALR_URL=http://localhost:5000/hubs
VITE_ENABLE_MOCK=false
VITE_FEATURE_DARK_MODE=true
```

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_MOCK=true

# .env.staging
VITE_API_BASE_URL=https://api.staging.example.com

# .env.production
VITE_API_BASE_URL=https://api.example.com
```

**Vite env file priority**: `.env.{mode}.local` > `.env.{mode}` > `.env.local` > `.env`

---

### Pattern 6.2: Runtime Config Injection (CRITICAL)

For Docker deployments: inject config at runtime without rebuilding the app.

```typescript
// public/config.js — Injected by Docker entrypoint script
window.__APP_CONFIG__ = {
  apiBaseUrl: '__API_BASE_URL__',
  signalrUrl: '__SIGNALR_URL__',
  sentryDsn: '__SENTRY_DSN__',
  appVersion: '__APP_VERSION__',
};
```

```html
<!-- index.html — Load config before app -->
<script src="/config.js"></script>
```

```bash
#!/bin/sh
# docker-entrypoint.sh — Replace placeholders with env vars
envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js
exec "$@"
```

```typescript
// src/shared/config/runtime.ts — Type-safe runtime config access
interface RuntimeConfig {
  apiBaseUrl: string;
  signalrUrl: string;
  sentryDsn: string;
  appVersion: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  const runtimeConfig = window.__APP_CONFIG__;

  // Fallback to Vite env in development
  return {
    apiBaseUrl: runtimeConfig?.apiBaseUrl || import.meta.env.VITE_API_BASE_URL,
    signalrUrl: runtimeConfig?.signalrUrl || import.meta.env.VITE_SIGNALR_URL,
    sentryDsn: runtimeConfig?.sentryDsn || import.meta.env.VITE_SENTRY_DSN,
    appVersion: runtimeConfig?.appVersion || import.meta.env.VITE_APP_VERSION || 'dev',
  };
}
```

---

### Pattern 6.3: Config Schema Validation with Zod (HIGH)

Validate env vars at app startup. Fail fast on missing or invalid config.

```typescript
// src/shared/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  apiBaseUrl: z.string().url('API_BASE_URL must be a valid URL'),
  appTitle: z.string().min(1, 'APP_TITLE is required'),
  sentryDsn: z.string().optional().default(''),
  signalrUrl: z.string().url().optional().default(''),
  enableMock: z.coerce.boolean().default(false),
  isDev: z.boolean(),
  isProd: z.boolean(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const raw = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    appTitle: import.meta.env.VITE_APP_TITLE,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    signalrUrl: import.meta.env.VITE_SIGNALR_URL,
    enableMock: import.meta.env.VITE_ENABLE_MOCK,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Environment validation failed. Check .env file.');
  }

  return result.data;
}

// Singleton — parsed once at app startup
export const env = parseEnv();
```

---

### Pattern 6.4: API Base URL Management (HIGH)

Per-environment API endpoint configuration with proxy for development.

```typescript
// src/shared/config/api.config.ts
import { getRuntimeConfig } from './runtime';

export const apiConfig = {
  baseURL: getRuntimeConfig().apiBaseUrl,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': getRuntimeConfig().appVersion,
  },
} as const;
```

```typescript
// vite.config.ts — Dev proxy to avoid CORS
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/hubs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true, // WebSocket proxy for SignalR
      },
    },
  },
});
```

---

### Pattern 6.5: Feature Flag Configuration (HIGH)

Build-time flags via env vars + runtime flags via feature flag platforms.

```typescript
// src/shared/config/feature-flags.ts
import { env } from './env';

// Build-time flags (baked into bundle, requires rebuild to change)
export const buildTimeFlags = {
  darkMode: import.meta.env.VITE_FEATURE_DARK_MODE === 'true',
  newDashboard: import.meta.env.VITE_FEATURE_NEW_DASHBOARD === 'true',
  mockApi: env.enableMock,
} as const;

// Runtime flags (loaded from API/LaunchDarkly, can change without rebuild)
interface RuntimeFlags {
  enableBetaFeatures: boolean;
  maxUploadSize: number;
  maintenanceMode: boolean;
}

let runtimeFlags: RuntimeFlags = {
  enableBetaFeatures: false,
  maxUploadSize: 10_485_760, // 10MB
  maintenanceMode: false,
};

export async function loadRuntimeFlags(): Promise<void> {
  try {
    const response = await fetch('/api/feature-flags');
    runtimeFlags = await response.json();
  } catch {
    console.warn('Failed to load runtime flags, using defaults');
  }
}

export function useFeatureFlag(flag: keyof RuntimeFlags): RuntimeFlags[keyof RuntimeFlags] {
  return runtimeFlags[flag];
}

// Combined check
export function isFeatureEnabled(flag: string): boolean {
  if (flag in buildTimeFlags) return buildTimeFlags[flag as keyof typeof buildTimeFlags] as boolean;
  if (flag in runtimeFlags) return runtimeFlags[flag as keyof RuntimeFlags] as boolean;
  return false;
}
```

---

### Pattern 6.6: AntD Theme Configuration (MEDIUM-HIGH)

Design token configuration file for Ant Design 5.

```typescript
// src/shared/config/theme.ts
import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';

const brandColors = {
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1677ff',
} as const;

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: brandColors.primary,
    colorSuccess: brandColors.success,
    colorWarning: brandColors.warning,
    colorError: brandColors.error,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Button: { controlHeight: 36, paddingContentHorizontal: 20 },
    Input: { controlHeight: 36 },
    Select: { controlHeight: 36 },
    Table: { headerBg: '#fafafa', rowHoverBg: '#f5f5f5' },
    Card: { paddingLG: 20 },
    Layout: { headerBg: '#fff', siderBg: '#fff' },
  },
};

export const darkTheme: ThemeConfig = {
  ...lightTheme,
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...lightTheme.token,
    colorBgContainer: '#141414',
    colorBgLayout: '#000000',
  },
};

export function getThemeConfig(mode: 'light' | 'dark'): ThemeConfig {
  return mode === 'light' ? lightTheme : darkTheme;
}
```

---

### Pattern 6.7: Vite Proxy Configuration (MEDIUM)

Dev server proxy to avoid CORS and simulate production API routing.

```typescript
// vite.config.ts
import { defineConfig, type ProxyOptions } from 'vite';

const apiProxy: Record<string, ProxyOptions> = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/api/, ''),
    configure: (proxy) => {
      proxy.on('error', (err) => console.error('Proxy error:', err.message));
    },
  },
  '/hubs': {
    target: 'http://localhost:5000',
    changeOrigin: true,
    ws: true,
  },
  '/uploads': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
};

export default defineConfig({
  server: {
    port: 5173,
    proxy: apiProxy,
    cors: true,
  },
});
```

---

### Pattern 6.8: Config Type Safety (MEDIUM)

Typed config object with Zod inference for compile-time and runtime safety.

```typescript
// src/shared/config/app.config.ts
import { z } from 'zod';

const appConfigSchema = z.object({
  api: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().positive().default(30000),
    retryCount: z.number().int().min(0).max(5).default(2),
  }),
  auth: z.object({
    tokenKey: z.string().default('auth_token'),
    refreshThreshold: z.number().default(300), // seconds before expiry
  }),
  ui: z.object({
    pageSize: z.number().int().positive().default(20),
    maxFileSize: z.number().positive().default(10_485_760), // 10MB
    dateFormat: z.string().default('YYYY-MM-DD'),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig: AppConfig = appConfigSchema.parse({
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || undefined,
  },
  auth: {},
  ui: {
    pageSize: Number(import.meta.env.VITE_PAGE_SIZE) || undefined,
  },
});
```

---

### Pattern 6.9: Multi-Tenant Configuration (MEDIUM)

Per-tenant configuration for theme, branding, and features.

```typescript
// src/shared/config/tenant.config.ts
interface TenantConfig {
  tenantId: string;
  name: string;
  logo: string;
  primaryColor: string;
  features: string[];
  apiBaseUrl: string;
}

const tenantConfigs: Record<string, TenantConfig> = {
  acme: {
    tenantId: 'acme',
    name: 'Acme Corp',
    logo: '/tenants/acme/logo.svg',
    primaryColor: '#1890ff',
    features: ['dashboard', 'reports', 'user-management'],
    apiBaseUrl: 'https://acme.api.example.com',
  },
  globex: {
    tenantId: 'globex',
    name: 'Globex Inc',
    logo: '/tenants/globex/logo.svg',
    primaryColor: '#722ed1',
    features: ['dashboard', 'reports'],
    apiBaseUrl: 'https://globex.api.example.com',
  },
};

export function getTenantConfig(tenantId: string): TenantConfig {
  const config = tenantConfigs[tenantId];
  if (!config) throw new Error(`Unknown tenant: ${tenantId}`);
  return config;
}

export function detectTenant(): string {
  // Detect from subdomain: acme.app.example.com → 'acme'
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  if (subdomain in tenantConfigs) return subdomain;
  return import.meta.env.VITE_DEFAULT_TENANT || 'acme';
}
```

---

### Pattern 6.10: Anti-patterns (MEDIUM)

**1. Hardcoded URLs** — API endpoints hardcoded in components.
```typescript
// BAD
fetch('http://localhost:3000/api/users')
// FIX
fetch(`${appConfig.api.baseUrl}/users`)
```

**2. Secrets in client code** — API keys exposed in VITE_ env vars.
```typescript
// BAD: Secret exposed in client bundle
VITE_STRIPE_SECRET_KEY=sk_live_xxx
// FIX: Use server-side proxy. Only public keys in client.
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx
```

**3. Runtime config without validation** — Trusting window.__APP_CONFIG__ without checks.
```typescript
// BAD
const url = window.__APP_CONFIG__.apiBaseUrl; // Could be undefined
// FIX: Validate with Zod schema (Pattern 6.3)
```

**4. Missing .env.example** — New developers don't know what env vars are required.

**5. Environment-specific logic in components** — Branching on `import.meta.env.MODE` inside components instead of config layer.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (6.1–6.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Configuration Specialist | EPS v3.2 | Metadata v2.1*

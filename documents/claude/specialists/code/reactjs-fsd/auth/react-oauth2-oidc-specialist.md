# React OAuth2 / OIDC Specialist
# React OAuth2/OIDCスペシャリスト
# Chuyen Gia OAuth2/OIDC React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | App, Shared (OIDC provider in app, OIDC utils in shared) |
| **Directory Pattern** | `src/app/providers/OIDCProvider.tsx`, `src/shared/lib/auth/oidc/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 47.1–47.10 |
| **Source Paths** | `src/app/providers/OIDC*`, `src/shared/lib/auth/oidc/**` |
| **File Count** | 3–6 OIDC files |
| **Naming Convention** | `OIDCProvider.tsx`, `keycloakConfig.ts`, `oidcUtils.ts` |
| **Imports From** | Shared (config, API client) |
| **Cannot Import** | Features, Pages |
| **Imported By** | App (OIDCProvider wraps app), Shared/auth (OIDC tokens feed auth flow) |
| **Dependencies** | `keycloak-js:25.x` or `@auth0/auth0-react:2.x` |
| **When To Use** | Enterprise SSO, Keycloak/Auth0/Azure AD, OAuth2 PKCE flow, multi-tenant OIDC |
| **Source Skeleton** | `src/app/providers/OIDCProvider.tsx`, `src/shared/lib/auth/oidc/keycloakConfig.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate OAuth2/OIDC patterns — Authorization Code + PKCE, Keycloak/Auth0 integration, silent refresh, token claims for RBAC |
| **Activation Trigger** | files: src/shared/lib/auth/oidc/**; keywords: oauth2, oidc, keycloak, auth0, pkce, silentRefresh, sso |

---

## Evidence Sources

- E1: OAuth2 Authorization Code + PKCE specification (RFC 7636)
- E2: Keycloak JavaScript adapter documentation
- E3: Auth0 React SDK documentation
- E4: OIDC ID token claims for frontend RBAC

---

## Patterns

### Pattern 47.1: OIDC Flow — Authorization Code + PKCE (CRITICAL)

```
Browser → Authorization Server (/authorize?response_type=code&code_challenge=...)
  ↓ User authenticates
Authorization Server → Browser (redirect_uri?code=xxx)
  ↓ Browser sends code
Browser → Token Endpoint (/token, code + code_verifier)
  ↓ Server validates PKCE
Token Endpoint → Browser (access_token, id_token, refresh_token)
```

**Why PKCE**: SPA cannot store client secrets. PKCE replaces secret with a dynamically generated code_verifier/code_challenge pair.

### Pattern 47.2: Keycloak Integration (CRITICAL)

```typescript
// src/shared/lib/auth/oidc/keycloakConfig.ts
import Keycloak from 'keycloak-js';
import { getRuntimeConfig } from '@/shared/config/runtime';

export const keycloak = new Keycloak({
  url: getRuntimeConfig().keycloakUrl,       // e.g., 'https://auth.example.com'
  realm: getRuntimeConfig().keycloakRealm,   // e.g., 'enterprise'
  clientId: getRuntimeConfig().keycloakClientId, // e.g., 'web-admin'
});

// src/app/providers/KeycloakProvider.tsx
import { type PropsWithChildren, useEffect, useState } from 'react';
import { keycloak } from '@/shared/lib/auth/oidc/keycloakConfig';
import { Spin } from 'antd';

export function KeycloakProvider({ children }: PropsWithChildren) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    keycloak.init({
      onLoad: 'check-sso',              // Check SSO silently on load
      pkceMethod: 'S256',               // PKCE required
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      checkLoginIframe: false,           // Disable iframe polling (CSP issues)
    }).then((authenticated) => {
      if (authenticated) {
        console.log('[Keycloak] Authenticated:', keycloak.tokenParsed?.preferred_username);
      }
      setInitialized(true);
    }).catch(console.error);
  }, []);

  if (!initialized) return <Spin size="large" tip="Initializing SSO..." />;
  return <>{children}</>;
}
```

### Pattern 47.3: Auth0 Integration (HIGH)

```typescript
// src/app/providers/Auth0Provider.tsx
import { Auth0Provider as Auth0, useAuth0 } from '@auth0/auth0-react';

export function Auth0AppProvider({ children }: PropsWithChildren) {
  return (
    <Auth0
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0>
  );
}

// Bridge: Auth0 → useAuth hook
export function useAuth() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0();
  return {
    user: user ? mapAuth0User(user) : null,
    isAuthenticated,
    isLoading,
    login: loginWithRedirect,
    logout: () => logout({ logoutParams: { returnTo: window.location.origin } }),
    getToken: getAccessTokenSilently,
  };
}
```

### Pattern 47.4: Silent Token Refresh (CRITICAL)

```typescript
// Keycloak: auto-refresh before expiry
keycloak.onTokenExpired = () => {
  keycloak.updateToken(30) // Refresh if expires in <30s
    .then((refreshed) => {
      if (refreshed) console.log('[Keycloak] Token refreshed');
    })
    .catch(() => {
      console.warn('[Keycloak] Refresh failed, redirecting to login');
      keycloak.login();
    });
};

// Periodic check (alternative to onTokenExpired)
useEffect(() => {
  const interval = setInterval(() => {
    keycloak.updateToken(60).catch(() => keycloak.login());
  }, 30_000); // Check every 30s
  return () => clearInterval(interval);
}, []);
```

### Pattern 47.5: Token Handling — ID / Access / Refresh (HIGH)

```typescript
// Token types and usage
// ID Token: user identity claims (name, email, roles) — for UI display
// Access Token: API authorization — sent in Authorization header
// Refresh Token: obtain new access token silently — stored securely

// Extract user info from ID token
function getUserFromToken(keycloak: Keycloak): User | null {
  if (!keycloak.tokenParsed) return null;
  const token = keycloak.tokenParsed;
  return {
    id: token.sub!,
    email: token.email,
    displayName: token.name ?? token.preferred_username,
    roles: token.realm_access?.roles ?? [],
    organizationId: token.organization_id,
  };
}

// Inject access token in API client
apiClient.interceptors.request.use(async (config) => {
  await keycloak.updateToken(10); // Ensure fresh token
  config.headers.Authorization = `Bearer ${keycloak.token}`;
  return config;
});
```

### Pattern 47.6: Multi-Tenant OIDC (HIGH)

```typescript
// Tenant detection → dynamic Keycloak realm
function getKeycloakConfig(tenantId: string): KeycloakConfig {
  return {
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: tenantId, // Each tenant = separate realm
    clientId: 'web-admin',
  };
}

const tenantId = detectTenant(); // From subdomain or URL
const keycloak = new Keycloak(getKeycloakConfig(tenantId));
```

### Pattern 47.7: Front-Channel + Back-Channel Logout (MEDIUM-HIGH)

```typescript
// Front-channel: redirect to OIDC logout endpoint
function oidcLogout() {
  const logoutUrl = `${keycloak.authServerUrl}/realms/${keycloak.realm}/protocol/openid-connect/logout`;
  const params = new URLSearchParams({
    post_logout_redirect_uri: window.location.origin,
    id_token_hint: keycloak.idToken!,
  });
  window.location.href = `${logoutUrl}?${params}`;
}

// Back-channel: listen for server-initiated logout
// Server sends logout notification → clear local session
```

### Pattern 47.8: Token Claims for RBAC (HIGH)

```typescript
// Keycloak realm_access.roles → frontend permission mapping
interface KeycloakToken {
  sub: string;
  realm_access: { roles: string[] };
  resource_access: Record<string, { roles: string[] }>;
  organization_id?: string;
}

function extractPermissions(token: KeycloakToken): string[] {
  const realmRoles = token.realm_access.roles;
  const clientRoles = token.resource_access['web-admin']?.roles ?? [];
  return [...realmRoles, ...clientRoles];
}

// Feed into permission system (Pattern 48)
const permissions = extractPermissions(keycloak.tokenParsed as KeycloakToken);
```

### Pattern 47.9: OIDC + AntD Integration (MEDIUM)

```typescript
// Login button — redirects to OIDC provider
function OIDCLoginButton() {
  return (
    <Button type="primary" size="large" icon={<LoginOutlined />} onClick={() => keycloak.login()}>
      Sign in with SSO
    </Button>
  );
}

// User info in header
function UserMenu() {
  const user = getUserFromToken(keycloak);
  return (
    <Dropdown menu={{ items: [{ key: 'logout', label: 'Sign Out', onClick: () => keycloak.logout() }] }}>
      <Space>
        <Avatar>{user?.displayName?.[0]}</Avatar>
        {user?.displayName}
      </Space>
    </Dropdown>
  );
}
```

### Pattern 47.10: Anti-patterns (MEDIUM)

**1. Implicit grant flow** — Deprecated, tokens in URL fragment.
```
// FIX: Always use Authorization Code + PKCE
```

**2. Storing tokens in localStorage** — XSS risk.
```
// FIX: Memory for access token, httpOnly cookie for refresh, or OIDC SDK session
```

**3. No silent refresh** — User gets logged out when access token expires.
```
// FIX: keycloak.updateToken() or Auth0 useRefreshTokens
```

**4. Client-side role checking only** — API doesn't verify JWT roles.
```
// FIX: Frontend role checks are UX. API must validate JWT on every request.
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (47.1–47.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React OAuth2/OIDC Specialist | EPS v3.2 | Metadata v2.1*

# React Security Hardening Specialist
# Reactセキュリティ強化スペシャリスト
# Chuyen Gia Security Hardening React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — security hardening rules apply project-wide) |
| **Directory Pattern** | `src/shared/lib/security/`, `src/shared/api/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 50.1–50.10 |
| **Source Paths** | `src/shared/lib/security/**`, `src/shared/api/**`, `.env*` |
| **File Count** | 3–6 security config files |
| **Naming Convention** | `csrf.ts`, `cookieAudit.ts`, `securityHeaders.ts` |
| **Imports From** | Shared (API client for CSRF interceptor, config) |
| **Cannot Import** | N/A (rule-set) |
| **Imported By** | N/A (rule-set — CSRF utility imported by API client interceptor) |
| **Dependencies** | None (uses browser APIs + server-side configuration) |
| **When To Use** | Production security hardening, CSRF protection, JWT storage audit, dependency scanning, CORS |
| **Source Skeleton** | `src/shared/lib/security/csrf.ts`, `src/shared/lib/security/cookieAudit.ts` |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce security hardening — CSRF tokens, JWT httpOnly cookies, CORS config, dependency auditing, cookie security |
| **Activation Trigger** | files: src/shared/lib/security/**, src/shared/api/**; keywords: csrf, jwt, cors, cookieSecurity, dependencyAudit |

---

## Evidence Sources

- E1: OWASP Top 10 Web Application Security Risks
- E2: CSRF prevention — double-submit cookie pattern
- E3: JWT storage best practices (OWASP)
- E4: npm audit / Snyk vulnerability scanning

---

## Patterns

### Pattern 50.1: CSRF Token Handling (CRITICAL)

```typescript
// src/shared/lib/security/csrf.ts
// Double-submit cookie pattern: server sets CSRF cookie, client reads and sends as header

export function getCSRFToken(): string | null {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Axios interceptor — attach CSRF token to mutating requests
apiClient.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }
  return config;
});

// Alternative: Server-rendered meta tag
// <meta name="csrf-token" content="abc123">
function getCSRFFromMeta(): string | null {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? null;
}
```

### Pattern 50.2: JWT httpOnly Cookie (CRITICAL)

```typescript
// Server MUST set tokens as httpOnly cookies — JavaScript cannot access them
// Set-Cookie: refresh_token=xxx; HttpOnly; Secure; SameSite=Strict; Path=/api/auth

// Client: withCredentials for cookie-based auth
const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,  // Include cookies in cross-origin requests
});

// Access token strategy:
// Option A: httpOnly cookie (server manages, most secure)
// Option B: Memory variable (lost on refresh, secure)
// Option C: localStorage (persistent, XSS vulnerable — NOT recommended)

// Cookie security flags checklist:
// ✅ HttpOnly — not accessible via JavaScript
// ✅ Secure — only sent over HTTPS
// ✅ SameSite=Strict — prevents CSRF
// ✅ Path=/api — limits cookie scope
// ✅ Max-Age or Expires — auto-expire
```

### Pattern 50.3: CORS Configuration (CRITICAL)

```typescript
// CORS is server-side — but client must know the rules

// Vite dev proxy — avoids CORS in development
// vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true },
  },
}

// Production: Server sets CORS headers
// Access-Control-Allow-Origin: https://app.example.com (NOT *)
// Access-Control-Allow-Credentials: true (for cookies)
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
// Access-Control-Allow-Headers: Authorization, Content-Type, X-XSRF-TOKEN

// Client-side CORS error handling
apiClient.interceptors.response.use(null, (error) => {
  if (error.message === 'Network Error' && !error.response) {
    console.error('[CORS] Request blocked. Check server CORS configuration.');
  }
  return Promise.reject(error);
});
```

### Pattern 50.4: Cookie Security Audit (HIGH)

```typescript
// src/shared/lib/security/cookieAudit.ts
interface CookieAuditResult {
  name: string;
  secure: boolean;
  httpOnly: boolean; // Can't check from JS, but flag expectation
  sameSite: string;
  issues: string[];
}

export function auditCookies(): CookieAuditResult[] {
  return document.cookie.split(';').map((cookie) => {
    const [name] = cookie.trim().split('=');
    const issues: string[] = [];

    // Check if non-session cookie is accessible (shouldn't be for auth)
    if (name.includes('token') || name.includes('session')) {
      issues.push('Auth cookie accessible via JavaScript — should be HttpOnly');
    }

    return { name: name.trim(), secure: location.protocol === 'https:', httpOnly: false, sameSite: 'unknown', issues };
  });
}

// Run in development — log security warnings
if (import.meta.env.DEV) {
  const results = auditCookies();
  results.filter((r) => r.issues.length > 0).forEach((r) => {
    console.warn(`[Security Audit] Cookie "${r.name}":`, r.issues);
  });
}
```

### Pattern 50.5: Dependency Auditing (HIGH)

```bash
# Regular dependency security scanning
npm audit                          # Built-in npm audit
npx audit-ci --config audit-ci.json # CI/CD integration

# Snyk integration
npx snyk test                      # Local scan
npx snyk monitor                   # Continuous monitoring

# GitHub Dependabot — auto-PRs for vulnerable dependencies
# .github/dependabot.yml
```

```json
// audit-ci.json — fail CI on high/critical vulnerabilities
{
  "high": true,
  "critical": true,
  "allowlist": [
    "GHSA-xxxx-xxxx"  // Known false positive
  ]
}
```

```yaml
# .github/workflows/security.yml
- name: Security audit
  run: npm audit --audit-level=high
- name: Snyk scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Pattern 50.6: Subresource Integrity (MEDIUM-HIGH)

```html
<!-- For CDN-loaded scripts — verify integrity -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-xxxx"
  crossorigin="anonymous"
></script>

<!-- Vite generates SRI hashes in production build -->
<!-- vite.config.ts -->
```

```typescript
// vite-plugin-sri for automatic SRI hash generation
import sri from 'vite-plugin-sri';

export default defineConfig({
  plugins: [react(), sri()],
});
```

### Pattern 50.7: Clickjacking Prevention (MEDIUM-HIGH)

```html
<!-- Server-side header (preferred) -->
<!-- X-Frame-Options: DENY -->
<!-- Content-Security-Policy: frame-ancestors 'none' -->

<!-- Client-side fallback (frame-busting) -->
<script>
  if (window.self !== window.top) {
    window.top.location = window.self.location;
  }
</script>
```

### Pattern 50.8: Rate Limiting (Client-Side) (MEDIUM)

```typescript
// Client-side throttle for sensitive operations
import { useDebouncedCallback } from '@/shared/hooks/useDebounce';

function LoginForm() {
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 30_000; // 30 seconds

  const handleLogin = useDebouncedCallback(async (values: LoginDTO) => {
    if (attempts >= MAX_ATTEMPTS) {
      message.error('Too many attempts. Please wait 30 seconds.');
      return;
    }
    try {
      await login(values);
    } catch {
      setAttempts((prev) => prev + 1);
      if (attempts + 1 >= MAX_ATTEMPTS) {
        setTimeout(() => setAttempts(0), LOCKOUT_DURATION);
      }
    }
  }, 1000); // Minimum 1s between attempts
}

// Note: Real rate limiting MUST be server-side. Client-side is UX only.
```

### Pattern 50.9: Secrets Management (MEDIUM)

```bash
# NEVER commit secrets
.env                 # ❌ May be committed accidentally
.env.local           # ✅ gitignored by default
.env.production      # ⚠️ Only non-secret config

# Only VITE_ prefixed vars are exposed to client
VITE_API_URL=https://api.example.com    # ✅ Public, OK
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx      # ✅ Public key, OK
STRIPE_SECRET_KEY=sk_live_xxx           # ❌ Not exposed (no VITE_ prefix)
DATABASE_URL=postgres://...             # ❌ Not exposed (server-only)

# .gitignore
.env.local
.env.*.local
```

```typescript
// Runtime check — ensure no secrets leaked to client
if (import.meta.env.DEV) {
  const envKeys = Object.keys(import.meta.env);
  const suspicious = envKeys.filter((key) =>
    /secret|private|password|key/i.test(key) && key.startsWith('VITE_'),
  );
  if (suspicious.length > 0) {
    console.error('[Security] Possible secrets in client bundle:', suspicious);
  }
}
```

### Pattern 50.10: Anti-patterns (MEDIUM)

**1. JWT in localStorage** — XSS can steal tokens.
```
// FIX: httpOnly cookies for refresh token, memory for access token
```

**2. Wildcard CORS** — `Access-Control-Allow-Origin: *` with credentials.
```
// FIX: Specific origin: Access-Control-Allow-Origin: https://app.example.com
```

**3. No dependency auditing** — Using packages with known CVEs.
```
// FIX: npm audit in CI, Dependabot/Snyk for monitoring
```

**4. Secrets in client bundle** — API keys, database URLs in VITE_ env vars.
```
// FIX: Only public keys use VITE_ prefix. Secrets stay server-side.
```

**5. Missing security headers** — No CSP, no X-Frame-Options, no HSTS.
```
// FIX: Configure via nginx/server. CSP meta tag as fallback.
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (50.1–50.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Security Hardening Specialist | EPS v3.2 | Metadata v2.1*

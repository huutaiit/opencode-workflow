# Next.js Proxy Specialist (formerly Middleware)
# Next.jsプロキシスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (runs before routes) |
| **Directory Pattern** | `proxy.ts` in project root (or `src/`) |
| **Variant** | ALL |
| **Pattern Numbers** | 106.1–106.9 |
| **Source Paths** | `proxy.ts`, `proxy.js` |
| **File Count** | 1 (single file per project) |
| **Naming Convention** | `proxy.ts` (was `middleware.ts` before Next.js 16) |
| **Imports From** | `next/server`: NextRequest, NextResponse |
| **Imported By** | N/A (entry point — invoked by framework) |
| **Cannot Import** | Shared modules/globals with render code |
| **Dependencies** | next (built-in) |
| **When To Use** | Auth guards, redirects, CORS, header manipulation, request logging |
| **Source Skeleton** | `proxy.ts` (project root) |
| **Specialist Type** | rule-set |
| **Purpose** | Next.js 16 proxy (formerly middleware): request interception, auth guards, CORS, redirect/rewrite, cookie/header manipulation |
| **Activation Trigger** | proxy, middleware, proxy.ts, middleware.ts, NextRequest, NextResponse, matcher |

---

## Description

Next.js 16 renamed `middleware.ts` → `proxy.ts`. Proxy runs before every route match. Use for auth guards, redirects, rewrites, CORS, and header manipulation. Codemod: `npx @next/codemod@canary middleware-to-proxy .`

**CRITICAL**: Proxy runs in a separate network boundary. CANNOT share modules/globals with render code. Pass data via headers, cookies, rewrites, redirects, or URL — NOT shared state.

---

## Rules

### 106.1 — File Convention (Next.js 16 Breaking Change)

```typescript
// proxy.ts — in project root (same level as app/ or pages/)
// If using src/: src/proxy.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
```

**Migration from middleware.ts**:
```bash
npx @next/codemod@canary middleware-to-proxy .
```
Renames file and function: `middleware()` → `proxy()`.

### 106.2 — Matcher Configuration

```typescript
// ✅ Single path
export const config = { matcher: '/about/:path*' }

// ✅ Multiple paths
export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] }

// ✅ Negative lookahead — exclude static assets
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}

// ✅ Conditional matcher with has/missing
export const config = {
  matcher: [{
    source: '/api/:path*',
    has: [{ type: 'header', key: 'Authorization', value: 'Bearer.*' }],
    missing: [{ type: 'cookie', key: 'session' }],
  }],
}
```

**Rules**:
- Matcher values MUST be constants (statically analyzed at build-time)
- Named params: `/about/:path` matches `/about/a` but not `/about/a/b`
- Modifiers: `:path*` (zero+), `:path+` (one+), `:path?` (zero or one)
- `_next/data` routes still invoke proxy even if excluded in matcher

### 106.3 — Authentication Guard

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')

  // Redirect unauthenticated users to login
  if (!token && !isAuthPage) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}
```

**CRITICAL**: Always verify auth inside Server Functions too. Proxy alone is NOT sufficient — Server Functions are reachable via direct POST.

### 106.4 — Cookie Manipulation

```typescript
export function proxy(request: NextRequest) {
  // Read cookies
  const token = request.cookies.get('token')?.value
  const allCookies = request.cookies.getAll()
  const hasSession = request.cookies.has('session')

  // Modify response cookies
  const response = NextResponse.next()
  response.cookies.set('visited', 'true', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  response.cookies.delete('old-cookie')

  return response
}
```

### 106.5 — Header Manipulation

```typescript
export function proxy(request: NextRequest) {
  // Clone and modify request headers (available to downstream)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', crypto.randomUUID())
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  // Pass modified headers upstream via NextResponse.next()
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Set response headers (available to client)
  response.headers.set('x-response-time', Date.now().toString())

  return response
}
```

**Warning**: Avoid large headers — causes HTTP 431 error.

### 106.6 — CORS Configuration

```typescript
const allowedOrigins = ['https://app.example.com', 'https://admin.example.com']

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? ''
  const isAllowed = allowedOrigins.includes(origin)

  // Preflight
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, {
      headers: {
        ...(isAllowed && { 'Access-Control-Allow-Origin': origin }),
        ...corsHeaders,
      },
    })
  }

  // Simple request
  const response = NextResponse.next()
  if (isAllowed) response.headers.set('Access-Control-Allow-Origin', origin)
  Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v))
  return response
}

export const config = { matcher: '/api/:path*' }
```

### 106.7 — Redirect & Rewrite

```typescript
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect (client sees URL change)
  if (pathname === '/old-page') {
    return NextResponse.redirect(new URL('/new-page', request.url))
  }

  // Rewrite (client URL stays same, server renders different content)
  if (pathname.startsWith('/blog')) {
    return NextResponse.rewrite(new URL(`/cms${pathname}`, request.url))
  }

  return NextResponse.next()
}
```

### 106.8 — Runtime Selection (Edge vs Node.js)

- **Default**: Node.js runtime (stable since v15.5)
- **Edge**: Only for specific latency requirements (CDN-level execution)
- Edge limitations: no `fs`, limited `crypto`, npm compatibility issues
- **Rule**: "If unsure, use Node.js"
- `runtime` config option is NOT available in proxy files

### 106.9 — Execution Order

```
1. headers (next.config.js)
2. redirects (next.config.js)
3. ▶ PROXY (rewrites, redirects, etc.)
4. beforeFiles rewrites (next.config.js)
5. Filesystem routes (public/, _next/static/, pages/, app/)
6. afterFiles rewrites (next.config.js)
7. Dynamic routes (/blog/[slug])
8. fallback rewrites (next.config.js)
```

### 106.10 — Unit Testing (Experimental, v15.1+)

```typescript
import { unstable_doesProxyMatch } from 'next/experimental/testing/server'
import { isRewrite, getRewrittenUrl } from 'next/experimental/testing/server'

// Test matcher
expect(unstable_doesProxyMatch({ config, nextConfig, url: '/dashboard' })).toBe(true)
expect(unstable_doesProxyMatch({ config, nextConfig, url: '/public' })).toBe(false)

// Test full proxy function
const request = new NextRequest('https://example.com/old-page')
const response = await proxy(request)
expect(isRewrite(response)).toBe(false)
// getRedirectUrl(response) for redirect testing
```

### 106.11 — Advanced Flags

```javascript
// next.config.js
module.exports = {
  // Custom trailing slash handling inside proxy
  skipTrailingSlashRedirect: true,

  // Disable URL normalization — receive raw URLs
  skipProxyUrlNormalize: true,
}
```

### 106.12 — waitUntil for Background Work

```typescript
import type { NextFetchEvent, NextRequest } from 'next/server'

export function proxy(req: NextRequest, event: NextFetchEvent) {
  // Fire-and-forget background work (analytics, logging)
  event.waitUntil(
    fetch('https://analytics.example.com', {
      method: 'POST',
      body: JSON.stringify({ pathname: req.nextUrl.pathname }),
    })
  )

  return NextResponse.next()
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | Shared state between proxy and app | Proxy runs in separate boundary | Use headers/cookies to pass data |
| 2 | Heavy computation in proxy | Blocks every request | Move to Server Component or API route |
| 3 | Auth only in proxy | Server Functions bypass proxy | Auth inside EACH Server Function |
| 4 | Dynamic matcher values | Ignored at build-time | Use constants only |
| 5 | Still using `middleware.ts` | Deprecated in Next.js 16 | Rename to `proxy.ts` |

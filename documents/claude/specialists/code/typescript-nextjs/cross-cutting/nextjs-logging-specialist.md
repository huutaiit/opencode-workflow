# Next.js Logging Specialist
# Next.jsロギングスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (cross-cutting) |
| **Directory Pattern** | `lib/logger.ts`, `next.config.ts` (logging option) |
| **Variant** | ALL |
| **Pattern Numbers** | 113.1–113.5 |
| **Source Paths** | `lib/logger.ts`, `next.config.ts` |
| **File Count** | 1-2 |
| **Naming Convention** | `logger.ts` |
| **Imports From** | `pino` or `winston` (optional) |
| **Imported By** | Server Components, Server Functions, API Routes |
| **Cannot Import** | N/A |
| **Dependencies** | pino, pino-pretty (devDep) |
| **When To Use** | Structured server logging, request correlation, error tracking |
| **Source Skeleton** | `lib/logger.ts` |
| **Specialist Type** | rule-set |
| **Purpose** | Logging patterns: next.config logging, structured logging, server vs client, pino/winston, request tracing |
| **Activation Trigger** | logging, log, logger, pino, winston, console.log, structured log |

---

## Rules

### 113.1 — next.config.ts Logging Options

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  logging: {
    // Fetch logging in dev
    fetches: {
      fullUrl: true,      // Show complete URLs
      hmrRefreshes: true, // Show fetches during HMR
    },

    // Incoming request logging (dev only)
    incomingRequests: {
      ignore: [
        /\/_next\/static/,  // Ignore static assets
        /\/favicon\.ico/,
      ],
    },
  },
}
```

### 113.2 — Structured Logger (Server-Side)

```typescript
// lib/logger.ts — pino for structured JSON logging
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' },
    },
  }),
})

// ✅ Structured logging with context
logger.info({ userId: '123', action: 'login' }, 'User authenticated')
logger.error({ error: err.message, stack: err.stack, requestId }, 'Request failed')
logger.warn({ duration: 5200, threshold: 5000 }, 'Slow query detected')

// ✅ Child logger with bound context
const requestLogger = logger.child({ requestId: crypto.randomUUID(), path: '/api/users' })
requestLogger.info('Processing request')
requestLogger.info({ count: 42 }, 'Found users')
```

### 113.3 — Server vs Client Logging

```typescript
// Server Components / Server Functions — full logger
import { logger } from '@/lib/logger'

export async function getUser(id: string) {
  logger.info({ userId: id }, 'Fetching user')
  const user = await db.user.findUnique({ where: { id } })
  if (!user) logger.warn({ userId: id }, 'User not found')
  return user
}

// Client Components — browser console only
// ❌ NEVER import server logger in client
// ✅ Use console.log/warn/error (forwarded to terminal via next.config logging)
'use client'
function handleError(error: Error) {
  console.error('[ClientError]', error.message)
  // In dev: forwarded to terminal by Next.js
  // In prod: send to error reporting service
}
```

### 113.4 — Request Tracing Pattern

```typescript
// ✅ Pass requestId via proxy headers → use in all server logs
// proxy.ts
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', crypto.randomUUID())
  return NextResponse.next({ request: { headers: requestHeaders } })
}

// Server Component
import { headers } from 'next/headers'
import { logger } from '@/lib/logger'

export default async function Page() {
  const headersList = await headers()
  const requestId = headersList.get('x-request-id')
  const log = logger.child({ requestId })

  log.info('Rendering dashboard page')
  const data = await fetchDashboardData(log)
  return <Dashboard data={data} />
}
```

### 113.5 — Log Levels & Best Practices

| Level | When |
|-------|------|
| `error` | Unexpected failures, unhandled errors, crashes |
| `warn` | Recoverable issues, deprecated usage, slow queries |
| `info` | Significant events: user actions, API calls, deployments |
| `debug` | Detailed flow for troubleshooting (dev/staging only) |

**Rules**:
- Production: `info` level minimum (no `debug`)
- NEVER log sensitive data (passwords, tokens, PII)
- ALWAYS log with context (userId, requestId, action)
- Use structured format (JSON) — not string concatenation
- Set `LOG_LEVEL` via environment variable

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | `console.log` in server code | No structure, no levels, no context | Use pino/winston |
| 2 | Import server logger in client | Bundle bloat, runtime error | console.log in client |
| 3 | Logging passwords/tokens | Security breach | Sanitize before logging |
| 4 | String concatenation in logs | Not searchable, no structure | Structured objects |
| 5 | No requestId correlation | Can't trace request flow | Proxy header + child logger |

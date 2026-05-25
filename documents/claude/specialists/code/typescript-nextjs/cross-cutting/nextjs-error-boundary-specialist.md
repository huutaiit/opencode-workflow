# Next.js Error Boundary Specialist
# Next.jsエラーバウンダリスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (cross-cutting) |
| **Directory Pattern** | `app/**/error.tsx`, `app/global-error.tsx` |
| **Variant** | ALL |
| **Pattern Numbers** | 111.1–111.6 |
| **Source Paths** | `app/**/error.tsx`, `app/global-error.tsx` |
| **File Count** | 1+ per route segment |
| **Naming Convention** | `error.tsx` (convention file), `global-error.tsx` |
| **Imports From** | React: useEffect |
| **Imported By** | N/A (auto-loaded by framework) |
| **Cannot Import** | N/A |
| **Dependencies** | next (built-in) |
| **When To Use** | Error recovery UI, graceful degradation, error reporting |
| **Source Skeleton** | `app/**/error.tsx`, `app/global-error.tsx` |
| **Specialist Type** | pattern |
| **Purpose** | Next.js error handling: error.tsx, global-error.tsx, recovery patterns, navigation error anti-patterns |
| **Activation Trigger** | error boundary, error.tsx, global-error, error handling, error recovery, reset |

---

## Rules

### 111.1 — error.tsx (Route Segment Error Boundary)

```typescript
// app/dashboard/error.tsx
// ⚠️ MUST be a Client Component
'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error reporting service (Sentry, etc.)
    reportError(error)
  }, [error])

  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

**Rules**:
- error.tsx MUST be a Client Component (`'use client'`)
- `error` prop: Error object + optional `digest` (server error hash)
- `reset()`: re-renders the error boundary's children (retry)
- Catches errors in the route segment and all children
- Does NOT catch errors in `layout.tsx` of the same segment

### 111.2 — global-error.tsx (Root Error Boundary)

```typescript
// app/global-error.tsx
// Catches errors in root layout
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    // ⚠️ MUST include <html> and <body> tags
    // because global-error REPLACES the root layout
    <html>
      <body>
        <h1>Critical Error</h1>
        <p>{error.message}</p>
        <button onClick={reset}>Reload</button>
      </body>
    </html>
  )
}
```

### 111.3 — Navigation Error Anti-Pattern (CRITICAL)

```typescript
// ❌ NEVER wrap redirect/notFound/unauthorized/forbidden in try-catch
import { redirect, notFound } from 'next/navigation'

async function Page() {
  try {
    const user = await getUser()
    if (!user) notFound()       // ❌ Throws internal error — caught by try!
    if (!user.isAdmin) redirect('/') // ❌ Same problem
  } catch (error) {
    // This catches notFound/redirect throws — breaks navigation!
  }
}

// ✅ Check BEFORE try-catch, or use unstable_rethrow
import { unstable_rethrow } from 'next/navigation'

async function Page() {
  const user = await getUser()
  if (!user) notFound()        // ✅ Outside try-catch
  if (!user.isAdmin) redirect('/')

  try {
    await riskyOperation()
  } catch (error) {
    unstable_rethrow(error)    // ✅ Re-throws navigation errors
    handleError(error)
  }
}
```

### 111.4 — Server Action Error Pattern

```typescript
// ✅ Return errors as values (don't throw for expected errors)
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createPost(formData: FormData): Promise<ActionResult<Post>> {
  try {
    const post = await db.post.create({ /* ... */ })
    return { success: true, data: post }
  } catch (error) {
    return { success: false, error: 'Failed to create post' }
  }
}

// ✅ Throw ONLY for auth errors (shows generic error page)
export async function deletePost(id: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized') // Shows error.tsx
}
```

### 111.5 — Error Recovery Strategies

```typescript
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      {/* Strategy 1: Retry */}
      <button onClick={reset}>Retry</button>

      {/* Strategy 2: Navigate away */}
      <button onClick={() => window.location.href = '/'}>Go Home</button>

      {/* Strategy 3: Fallback content */}
      <CachedContent />
    </div>
  )
}
```

### 111.6 — Error Reporting Integration

```typescript
'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { digest: error.digest },
    })
  }, [error])

  return (
    <div role="alert">
      <h2>An error occurred</h2>
      {error.digest && <p>Error ID: {error.digest}</p>}
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | try-catch around redirect()/notFound() | Catches internal navigation throws | Check conditions before try-catch |
| 2 | error.tsx without 'use client' | Compilation error — must be Client Component | Add 'use client' directive |
| 3 | global-error.tsx without html/body | Replaces root layout — blank page | Always include html+body |
| 4 | Throwing expected errors in Server Actions | Generic error page — bad UX | Return error as value |
| 5 | No error reporting | Blind to production errors | Sentry/monitoring integration |

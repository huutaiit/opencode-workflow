# Next.js Error Handling Specialist — Generic
# Next.jsエラーハンドリングスペシャリスト — 汎用
# Chuyên Gia Xử Lý Lỗi Next.js — Dùng Chung

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Package** | N/A (generic) |
| **Variant** | ALL |
| **Pattern Numbers** | 99.1–99.7 |
| **Source Paths** | `**/error.tsx`, `**/global-error.tsx`, `**/not-found.tsx` |
| **File Count** | 5-15 error boundary files per project |
| **Naming Convention** | `error.tsx`, `global-error.tsx`, `not-found.tsx` |
| **Imports From** | Core: `types/error.ts`; Presentation: `components/error/`; Framework: `next/navigation` |
| **Cannot Import** | `infrastructure/*` direct (error boundaries are Presentation layer) |
| **Dependencies** | next (built-in) |
| **When To Use** | Error boundary hierarchy, recovery, tracking |
| **Source Skeleton** | `app/**/error.tsx`, `app/global-error.tsx`, `components/error/ErrorFallback.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate error boundary hierarchy with error.tsx, global-error.tsx, and recovery patterns for Next.js |
| **Activation Trigger** | files: `**/error.tsx`, `**/global-error.tsx`; keywords: errorBoundary, errorRecovery, notFound |

---

## Purpose
Error handling architecture: error boundaries, navigation errors, recovery patterns, Server Action errors, API error chains, user-facing messages, and error tracking.

## Patterns

### Pattern 99.1: Error Boundary Architecture
```
app/
├── global-error.tsx  → Root errors (MUST include <html><body>). Client Component
├── error.tsx         → Per-segment error boundary. Client Component
│                       Receives: { error: Error & { digest?: string }, reset: () => void }
└── not-found.tsx     → 404 UI. Triggered by notFound()

Rules:
- error.tsx is ALWAYS a Client Component ('use client')
- Each route segment can have its own error.tsx
- Errors bubble UP to nearest error boundary
- Layout errors are caught by PARENT layout's error.tsx (not same-level)
```

### Pattern 99.2: Navigation Error Anti-pattern (CRITICAL)
```tsx
// ❌ NEVER wrap these in try-catch — they throw INTENTIONALLY
try {
  redirect('/login')      // throws NEXT_REDIRECT
} catch (e) {
  // This catches the redirect! Navigation fails silently
}

// ✅ Let navigation functions throw freely
redirect('/login')          // 307 temporary
permanentRedirect('/new')   // 308 permanent
notFound()                  // triggers not-found.tsx
// If you MUST try-catch around code that might redirect:
import { unstable_rethrow } from 'next/navigation'
try { ... } catch (e) { unstable_rethrow(e); handleOtherError(e) }
```

### Pattern 99.3: Error Recovery
```tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>  {/* Re-renders segment */}
    </div>
  )
}
// reset() re-renders the route segment WITHOUT full page reload
// Preserve form state: store in sessionStorage before error, restore after reset
```

### Pattern 99.4: Server Action Errors
```tsx
// ✅ Return typed results — don't throw to client
'use server'
type ActionResult = { success: true; data: User } | { success: false; error: string }

async function updateUser(formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { success: false, error: parsed.error.message }
  try {
    const user = await db.user.update(...)
    revalidatePath('/users')
    return { success: true, data: user }
  } catch { return { success: false, error: 'Update failed' } }
}

// Client: useActionState for form state management
const [state, action, pending] = useActionState(updateUser, null)
```

### Pattern 99.5: API Error Chain & User Messages
```
Chain: API Client (HTTP/timeout) → Repository (domain errors) → UseCase (business) → UI (display)
User-facing: NEVER expose stack traces. Error codes for i18n. Toast=transient, Inline=field, Page=fatal
Always include action: "Try again" / "Contact support" / "Go back"
Tracking: digest (server), source maps, environment context (user, flags, route)
```

## Common Mistakes
- Wrapping redirect()/notFound() in try-catch (silently breaks navigation)
- Throwing errors from Server Actions to client (expose internals)
- Missing global-error.tsx (no root-level error handling)
- Showing raw error.message to users (may contain sensitive info)
- Not including reset/retry action in error UI

---

## Additional Error Boundary Patterns (Upgrade 2026-03-29)

### 99.8 — error.tsx MUST Be Client Component

```typescript
// app/dashboard/error.tsx
'use client' // ⚠️ REQUIRED — error boundaries are Client Components

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      {error.digest && <p>Error ID: {error.digest}</p>}
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### 99.9 — global-error.tsx MUST Include html+body

```typescript
// app/global-error.tsx — replaces root layout on error
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h1>Critical Error</h1>
        <button onClick={reset}>Reload</button>
      </body>
    </html>
  )
}
```

**Why**: global-error REPLACES the root layout — without html+body the page is blank.

### 99.10 — Navigation Functions Throw Internal Errors (CRITICAL)

```typescript
import { redirect, notFound, unauthorized, forbidden } from 'next/navigation'
import { unstable_rethrow } from 'next/navigation'

// ❌ NEVER: These throw internal errors caught by try-catch
try {
  if (!user) notFound()        // Throws NextNotFoundError
  if (!admin) redirect('/')     // Throws NEXT_REDIRECT
} catch (error) {
  // ❌ Catches navigation throws — breaks Next.js routing!
}

// ✅ Option 1: Check before try-catch
if (!user) notFound()
if (!admin) redirect('/')
try {
  await riskyOperation()
} catch (error) {
  handleError(error)
}

// ✅ Option 2: unstable_rethrow inside catch
try {
  await riskyOperation()
  if (!result) notFound()
} catch (error) {
  unstable_rethrow(error) // Re-throws navigation errors safely
  handleError(error)
}
```

### 99.11 — Next.js 16: authInterrupts Config

```typescript
// next.config.ts — enable forbidden() and unauthorized()
const nextConfig: NextConfig = {
  authInterrupts: true,
}

// Usage in Server Components
import { unauthorized, forbidden } from 'next/navigation'

export default async function AdminPage() {
  const session = await auth()
  if (!session) unauthorized()           // Shows 401 page
  if (session.role !== 'admin') forbidden() // Shows 403 page
}
```

Requires `app/unauthorized.tsx` and `app/forbidden.tsx` convention files.

## Related Specialists
- 91.x nextjs-file-conventions — error.tsx, not-found.tsx file placement
- 90.x nextjs-rsc-patterns — Server Action patterns
- 100.x nextjs-security — Input validation, sanitization

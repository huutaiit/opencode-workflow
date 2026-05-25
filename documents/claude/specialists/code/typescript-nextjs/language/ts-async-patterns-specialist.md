# TypeScript Async Patterns Specialist
# TypeScript非同期パターンスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | All TypeScript files with async operations |
| **Variant** | ALL |
| **Pattern Numbers** | 103.1–103.8 |
| **Source Paths** | `**/*.ts`, `**/*.tsx` |
| **File Count** | N/A (applies to all) |
| **Naming Convention** | Async functions: verb-based (fetchUser, loadData, submitForm) |
| **Imports From** | N/A (language-level) |
| **Imported By** | ALL specialists |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (built-in) |
| **When To Use** | Async operations, fetch, Promise composition, data loading |
| **Source Skeleton** | N/A (patterns, not files) |
| **Specialist Type** | language |
| **Purpose** | Async/await patterns, Promise composition, AbortController, waterfall prevention, race condition avoidance for Next.js |
| **Activation Trigger** | async, await, Promise, fetch, AbortController, race condition, waterfall, parallel |

---

## Description

Async programming patterns critical for Next.js performance. Covers waterfall prevention (Vercel: #1 performance issue), parallel data loading, cancellation, and error handling in async contexts.

---

## Rules

### 103.1 — Waterfall Prevention (CRITICAL)

```typescript
// ❌ WATERFALL — sequential when not needed
async function Page() {
  const user = await getUser()        // 200ms
  const posts = await getPosts()      // 300ms
  const comments = await getComments() // 150ms
  // Total: 650ms (sequential)
}

// ✅ PARALLEL — Promise.all for independent requests
async function Page() {
  const [user, posts, comments] = await Promise.all([
    getUser(),       // 200ms
    getPosts(),      // 300ms ← starts immediately
    getComments(),   // 150ms ← starts immediately
  ])
  // Total: 300ms (parallel — max of all)
}

// ✅ Promise.allSettled when partial failure is acceptable
const results = await Promise.allSettled([
  getUser(),
  getPosts(),
  getComments(),
])

results.forEach((result) => {
  if (result.status === 'fulfilled') {
    // Use result.value
  } else {
    // Handle result.reason (error) — other requests still succeeded
  }
})
```

**Rule**: If requests are independent → always `Promise.all`. If one can fail independently → `Promise.allSettled`.

### 103.2 — Deferred Await Pattern (Next.js RSC)

```typescript
// ✅ Start fetch BEFORE await — enables streaming
async function Page() {
  // Initiate ALL fetches immediately (no await yet)
  const userPromise = getUser()
  const postsPromise = getPosts()

  // Await only when needed
  const user = await userPromise

  return (
    <>
      <UserHeader user={user} />
      <Suspense fallback={<PostsSkeleton />}>
        {/* Pass promise — component awaits inside Suspense */}
        <PostsList postsPromise={postsPromise} />
      </Suspense>
    </>
  )
}

// ✅ Client component resolves promise with use()
'use client'
import { use } from 'react'

function PostsList({ postsPromise }: { postsPromise: Promise<Post[]> }) {
  const posts = use(postsPromise)
  return posts.map(post => <PostCard key={post.id} post={post} />)
}
```

### 103.3 — AbortController for Cancellation

```typescript
// ✅ Cancel fetch on component unmount or re-fetch
'use client'
import { useEffect, useState } from 'react'

function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json = await response.json()
        setData(json)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return // Cancelled — do nothing
        }
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    fetchData()
    return () => controller.abort() // Cleanup on unmount/re-render
  }, [url])

  return { data, error }
}

// ✅ Timeout with AbortSignal.timeout()
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000), // 5 second timeout
})
```

### 103.4 — Error Handling in Async

```typescript
// ✅ Result pattern — return errors instead of throwing
type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E }

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const res = await fetch(`/api/users/${id}`)
    if (!res.ok) {
      return { ok: false, error: new Error(`HTTP ${res.status}`) }
    }
    const data = await res.json()
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

// Usage — caller handles error explicitly
const result = await fetchUser('123')
if (!result.ok) {
  // Handle error — TypeScript narrows to error branch
  showError(result.error.message)
  return
}
// TypeScript narrows to success branch — use the data
setUser(result.data)
```

### 103.5 — Race Condition Prevention

```typescript
// ❌ Race condition — stale response overwrites fresh
'use client'
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState([])

  useEffect(() => {
    // If query changes fast: "ab" → "abc" → "abcd"
    // Response for "ab" might arrive AFTER "abcd" response
    fetch(`/api/search?q=${query}`)
      .then(r => r.json())
      .then(setResults) // ❌ Stale!
  }, [query])
}

// ✅ Fix 1: AbortController (preferred)
useEffect(() => {
  const controller = new AbortController()
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setResults)
    .catch(() => {}) // Abort throws — ignore
  return () => controller.abort()
}, [query])

// ✅ Fix 2: Version counter (when fetch isn't cancellable)
useEffect(() => {
  let cancelled = false
  fetchResults(query).then(data => {
    if (!cancelled) setResults(data)
  })
  return () => { cancelled = true }
}, [query])
```

### 103.6 — Async in Next.js Runtime APIs (v15+/v16)

```typescript
// ✅ All runtime APIs are async in Next.js 15+
import { cookies, headers } from 'next/headers'
import { draftMode } from 'next/headers'

export default async function Page(props: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string }>
}) {
  // MUST await params and searchParams
  const { slug } = await props.params
  const { q } = await props.searchParams

  // MUST await cookies(), headers()
  const cookieStore = await cookies()
  const headersList = await headers()
  const { isEnabled } = await draftMode()
}
```

### 103.7 — Retry Pattern with Exponential Backoff

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error

      const delay = baseDelay * Math.pow(2, attempt)
      const jitter = delay * 0.1 * Math.random()
      await new Promise(resolve => setTimeout(resolve, delay + jitter))
    }
  }

  throw new Error('Unreachable')
}

// Usage
const data = await fetchWithRetry(() => fetch('/api/data').then(r => r.json()))
```

### 103.8 — Server Action Async Patterns

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  // 1. Always authenticate
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  // 2. Extract and validate
  const title = formData.get('title') as string

  // 3. Mutate
  await db.post.create({ data: { title, authorId: session.user.id } })

  // 4. Revalidate BEFORE redirect (redirect throws — code after won't run)
  revalidatePath('/posts')
  redirect('/posts')
  // ❌ Code here NEVER executes — redirect throws internally
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | Sequential awaits for independent data | Waterfall — N× slower | `Promise.all` |
| 2 | Missing AbortController in useEffect | Memory leaks, race conditions | Add cleanup |
| 3 | `try/catch` around `redirect()`/`notFound()` | These throw internal errors intentionally | Never wrap navigation in try/catch |
| 4 | Sync cookies()/headers() | Removed in Next.js 15+ | Always `await` |
| 5 | `.then().catch()` chains | Hard to read, error handling fragile | async/await + Result pattern |
| 6 | Ignoring Promise rejection | Unhandled rejection crashes | Always handle or use allSettled |

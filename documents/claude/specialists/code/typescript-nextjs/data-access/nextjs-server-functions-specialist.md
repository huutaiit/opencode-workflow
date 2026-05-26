# Next.js Server Functions Specialist
# Next.jsサーバーファンクションスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application / Data Access |
| **Directory Pattern** | `app/actions.ts`, `app/lib/actions.ts`, inline in Server Components |
| **Variant** | ALL |
| **Pattern Numbers** | 107.1–107.9 |
| **Source Paths** | `**/*.ts` with `'use server'` directive |
| **File Count** | Varies (typically 1 per domain) |
| **Naming Convention** | Verb-based: `createPost`, `updateUser`, `deleteItem` |
| **Imports From** | `next/cache`: revalidatePath, revalidateTag, refresh; `next/navigation`: redirect |
| **Imported By** | Server Components (inline), Client Components (import from 'use server' file) |
| **Cannot Import** | Client-only code (useState, useEffect, browser APIs) |
| **Dependencies** | next (built-in) |
| **When To Use** | Server-side mutations, form submissions, data revalidation |
| **Source Skeleton** | `app/actions.ts` or `app/lib/actions/{domain}.ts` |
| **Specialist Type** | pattern |
| **Purpose** | Server Functions (formerly Server Actions): 'use server' directive, form actions, revalidation, security, progressive enhancement |
| **Activation Trigger** | server action, server function, use server, form action, revalidatePath, revalidateTag, mutation |

---

## Description

Server Functions are async functions that run on the server, callable from client via POST request. "Server Action" = a Server Function used for form submissions/mutations. Next.js 16 uses the broader term "Server Functions".

**CRITICAL**: Server Functions are reachable via direct POST — ALWAYS authenticate inside every Server Function.

---

## Rules

### 107.1 — Creating Server Functions

```typescript
// ✅ Option 1: Separate file with 'use server' at top (for Client Components)
// app/actions.ts
'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.post.create({ data: { title, content, authorId: session.user.id } })
  revalidatePath('/posts')
}

// ✅ Option 2: Inline in Server Component
export default function Page() {
  async function deletePost(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    await db.post.delete({ where: { id } })
    revalidatePath('/posts')
  }

  return <form action={deletePost}>...</form>
}
```

### 107.2 — Invocation Patterns

```typescript
// ✅ Pattern 1: Form action (Server + Client Components)
// Progressive enhancement — works without JS
<form action={createPost}>
  <input name="title" />
  <button type="submit">Create</button>
</form>

// ✅ Pattern 2: Button formAction (per-button actions)
<form>
  <button formAction={saveDraft}>Save Draft</button>
  <button formAction={publish}>Publish</button>
</form>

// ✅ Pattern 3: Event handler (Client Components only)
'use client'
import { incrementLike } from './actions'

function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  return (
    <button onClick={async () => {
      const updated = await incrementLike()
      setLikes(updated)
    }}>
      Like ({likes})
    </button>
  )
}

// ✅ Pattern 4: useEffect (Client Components — mount triggers)
'use client'
useEffect(() => {
  startTransition(async () => {
    const views = await incrementViews()
    setViewCount(views)
  })
}, [])

// ✅ Pattern 5: Pass as prop to Client Component
<ClientComponent updateAction={updateItem} />
```

### 107.3 — Security (CRITICAL)

```typescript
'use server'

export async function updatePost(formData: FormData) {
  // 1. ALWAYS authenticate
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  // 2. ALWAYS verify ownership
  const postId = formData.get('id') as string
  const post = await db.post.findUnique({ where: { id: postId } })
  if (post?.authorId !== session.user.id) throw new Error('Forbidden')

  // 3. ALWAYS validate input
  const title = formData.get('title') as string
  if (!title || title.length > 200) throw new Error('Invalid title')

  // 4. Mutate
  await db.post.update({ where: { id: postId }, data: { title } })
  revalidatePath('/posts')
}
```

**Rules**:
- Server Functions are public POST endpoints — treat like API routes
- NEVER rely on proxy/middleware alone for auth
- Closures are encrypted before sending to client
- Multi-instance: set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (base64, 16/24/32 bytes)

### 107.4 — After Mutation Patterns

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  await db.post.create({ data: { /* ... */ } })

  // Option A: Revalidate specific path
  revalidatePath('/posts')

  // Option B: Revalidate by cache tag
  revalidateTag('posts')

  // Option C: Refresh current page (router refresh, no tag revalidation)
  refresh()

  // Option D: Redirect (MUST be last — throws internally)
  revalidatePath('/posts')  // ← Revalidate BEFORE redirect
  redirect('/posts')         // ← Code after this NEVER executes
}
```

**CRITICAL**: `redirect()` throws a control-flow exception. Call `revalidatePath`/`revalidateTag` BEFORE `redirect()`.

### 107.5 — Pending State with useActionState

```typescript
'use client'
import { useActionState, startTransition } from 'react'
import { createPost } from '@/app/actions'

function CreateButton() {
  const [state, action, pending] = useActionState(createPost, null)

  return (
    <button onClick={() => startTransition(action)} disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  )
}
```

**Note**: `useActionState` replaces deprecated `useFormState` (React 19).

### 107.6 — Cookie Management in Actions

```typescript
'use server'
import { cookies } from 'next/headers'

export async function setTheme(theme: 'light' | 'dark') {
  const cookieStore = await cookies()

  cookieStore.set('theme', theme, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  // Cookie set/delete triggers server re-render of current page + layouts
}

export async function getTheme() {
  const cookieStore = await cookies()
  return cookieStore.get('theme')?.value ?? 'light'
}
```

### 107.7 — Progressive Enhancement

- Server Components: forms work without JS loaded (native HTML form submission)
- Client Components: forms queue submissions before hydration, prioritized for hydration
- After hydration: browser does NOT refresh on submission (SPA behavior)

```typescript
// ✅ Works without JavaScript — progressive enhancement
<form action={createPost}>
  <input name="title" required />  {/* Native HTML validation */}
  <button type="submit">Create</button>
</form>
```

### 107.8 — Error Handling

```typescript
'use server'

type ActionState = { success: true; data: Post } | { success: false; error: string }

export async function createPost(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Unauthorized' }

  const title = formData.get('title') as string
  if (!title) return { success: false, error: 'Title is required' }

  try {
    const post = await db.post.create({ data: { title, authorId: session.user.id } })
    revalidatePath('/posts')
    return { success: true, data: post }
  } catch {
    return { success: false, error: 'Failed to create post' }
  }
}
```

**Rule**: Return errors as values (Result pattern) — don't throw for expected errors. Throw only for unexpected/auth errors.

### 107.9 — Actions Execution Model

- Actions use **POST** method only
- Dispatched **one at a time** (sequential, not parallel)
- If parallel work needed: do it inside a single Server Function or use Route Handler

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | No auth in Server Function | Direct POST bypasses proxy | Always auth() first |
| 2 | Code after redirect() | Never executes (throws internally) | revalidate BEFORE redirect |
| 3 | Throwing for expected errors | Bad UX, no graceful handling | Return error as value |
| 4 | useFormState | Deprecated in React 19 | useActionState |
| 5 | Parallel action invocations | Only one at a time | Single action with internal parallelism |

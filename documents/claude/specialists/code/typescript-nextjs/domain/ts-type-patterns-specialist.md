# TypeScript Type Patterns Specialist
# TypeScript型パターンスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (Domain modeling) |
| **Directory Pattern** | `types/`, `domain/entities/`, `**/*.ts` |
| **Variant** | ALL |
| **Pattern Numbers** | 109.1–109.7 |
| **Source Paths** | `**/*.ts`, `**/*.tsx` |
| **File Count** | N/A (applies to all) |
| **Naming Convention** | PascalCase for types, `T` prefix for generic params when ambiguous |
| **Imports From** | N/A (language-level) |
| **Imported By** | ALL specialists |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (built-in) |
| **When To Use** | Complex domain modeling, branded IDs, state machines, API contracts |
| **Source Skeleton** | `types/{domain}.ts`, `types/api.ts` |
| **Specialist Type** | language |
| **Purpose** | Advanced TypeScript type patterns: branded types, template literals, mapped types, conditional types, infer, type predicates |
| **Activation Trigger** | branded type, template literal, mapped type, conditional type, infer, type predicate, advanced type |

---

## Rules

### 109.1 — Branded Types (Nominal Typing)

```typescript
// ✅ Prevent mixing structurally identical types
type UserId = string & { readonly __brand: 'UserId' }
type PostId = string & { readonly __brand: 'PostId' }

function createUserId(id: string): UserId { return id as UserId }
function createPostId(id: string): PostId { return id as PostId }

function getUser(id: UserId) { /* ... */ }
function getPost(id: PostId) { /* ... */ }

const userId = createUserId('user-123')
const postId = createPostId('post-456')

getUser(userId)  // ✅
getUser(postId)  // ❌ Type error — PostId is not UserId
```

### 109.2 — Discriminated Unions (Tagged Unions)

```typescript
// ✅ State machine with exhaustive checking
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

function renderState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'idle':    return <Placeholder />
    case 'loading': return <Spinner />
    case 'success': return <DataView data={state.data} />
    case 'error':   return <ErrorView error={state.error} />
    default:        return assertNever(state) // Compile-time exhaustive check
  }
}

// ✅ API response types
type ApiResponse<T> =
  | { ok: true; data: T; meta: { total: number; page: number } }
  | { ok: false; error: { code: string; message: string } }
```

### 109.3 — Template Literal Types

```typescript
// ✅ Type-safe event names
type EventCategory = 'user' | 'post' | 'comment'
type EventAction = 'create' | 'update' | 'delete'
type EventName = `${EventCategory}:${EventAction}`
// = 'user:create' | 'user:update' | ... | 'comment:delete'

// ✅ Type-safe CSS units
type CSSUnit = 'px' | 'rem' | 'em' | '%' | 'vh' | 'vw'
type CSSValue = `${number}${CSSUnit}`

function setWidth(value: CSSValue) { /* ... */ }
setWidth('100px')   // ✅
setWidth('2.5rem')  // ✅
setWidth('100')     // ❌ Missing unit

// ✅ Type-safe route paths
type AppRoute = '/dashboard' | '/users' | `/users/${string}` | '/settings'
```

### 109.4 — Mapped Types

```typescript
// ✅ Make all properties optional (for update DTOs)
type UpdateDto<T> = { [K in keyof T]?: T[K] }

// ✅ Make specific properties required
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>
type UserWithEmail = RequireFields<Partial<User>, 'email'>

// ✅ Readonly deep
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

// ✅ Key remapping (TypeScript 4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
// { getName: () => string; getEmail: () => string; ... }
```

### 109.5 — Conditional Types with Infer

```typescript
// ✅ Extract return type of async functions
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T
type UserData = UnwrapPromise<ReturnType<typeof getUser>> // User

// ✅ Extract array element type
type ArrayElement<T> = T extends (infer U)[] ? U : never
type Post = ArrayElement<Post[]> // Post

// ✅ Extract component props
type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never

// ✅ Conditional based on type shape
type IsString<T> = T extends string ? true : false
type A = IsString<'hello'> // true
type B = IsString<42>      // false

// ✅ Distributive conditional types
type NonNullableDeep<T> = T extends null | undefined
  ? never
  : T extends object
    ? { [K in keyof T]: NonNullableDeep<T[K]> }
    : T
```

### 109.6 — Type Predicates (Custom Type Guards)

```typescript
// ✅ Type predicate narrows type in caller scope
function isNotNull<T>(value: T | null | undefined): value is T {
  return value != null
}

// Usage — filter with type narrowing
const items: (User | null)[] = [user1, null, user2, null]
const validUsers: User[] = items.filter(isNotNull) // ✅ Type-safe!

// ✅ Complex type guard
interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  )
}
```

### 109.7 — Const Type Parameters (TypeScript 5.0+)

```typescript
// ✅ const type parameter — infer literal types
function createConfig<const T extends Record<string, unknown>>(config: T): T {
  return config
}

const config = createConfig({
  theme: 'dark',
  maxRetries: 3,
  features: ['auth', 'analytics'],
})
// config.theme is 'dark' (not string)
// config.maxRetries is 3 (not number)
// config.features is readonly ['auth', 'analytics'] (not string[])
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | `as` for type coercion | Bypasses type checking | Type guards + narrowing |
| 2 | String enums for discriminants | Verbose, no autocomplete | Literal union types |
| 3 | Complex conditional types in app code | Hard to read/maintain | Extract to utility types |
| 4 | Overusing generics | Unnecessary complexity | Generic only when reused |
| 5 | `any` in type predicates | Defeats purpose | Use `unknown` + proper checks |

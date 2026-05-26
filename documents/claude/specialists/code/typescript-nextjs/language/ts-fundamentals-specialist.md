# TypeScript Fundamentals Specialist
# TypeScript基礎スペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | All TypeScript files |
| **Variant** | ALL |
| **Pattern Numbers** | 102.1–102.9 |
| **Source Paths** | `**/*.ts`, `**/*.tsx` |
| **File Count** | N/A (applies to all) |
| **Naming Convention** | camelCase (vars/funcs), PascalCase (types/interfaces/components), UPPER_CASE (constants) |
| **Imports From** | N/A (language-level) |
| **Imported By** | ALL specialists |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (built-in TypeScript) |
| **When To Use** | All TypeScript files — strict mode, type patterns, naming |
| **Source Skeleton** | `tsconfig.json` |
| **Specialist Type** | language |
| **Purpose** | TypeScript 5+ modern features, strict mode, utility types, type narrowing, discriminated unions, satisfies operator |
| **Activation Trigger** | typescript basics, type narrowing, generics, utility types, satisfies, discriminated union |

---

## Description

Core TypeScript language patterns for Next.js development. Enforces strict type safety, modern TS features, and idiomatic patterns. Applies to ALL Next.js projects regardless of architecture or variant.

---

## Rules

### 102.1 — Strict Mode Configuration

**ALWAYS** enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

- `strict: true` enables: strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitAny, noImplicitThis, alwaysStrict
- `noUncheckedIndexedAccess`: array/object index access returns `T | undefined`
- `exactOptionalPropertyTypes`: distinguishes `undefined` from missing property

### 102.2 — Prefer Interfaces Over Types (with Exceptions)

```typescript
// ✅ Use interface for object shapes (declaration merging, extends)
interface User {
  id: string
  name: string
  email: string
}

interface Admin extends User {
  role: 'admin'
  permissions: string[]
}

// ✅ Use type for unions, intersections, mapped types, utility compositions
type Status = 'active' | 'inactive' | 'pending'
type UserOrAdmin = User | Admin
type ReadonlyUser = Readonly<User>
type UserKeys = keyof User
```

**Rule**: interface for shapes, type for compositions. Never use `enum` — use const objects or union types.

### 102.3 — Avoid Enums — Use Const Objects or Union Types

```typescript
// ❌ NEVER
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
}

// ✅ Union type (simple cases)
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

// ✅ Const object (when runtime value needed)
const Direction = {
  Up: 'UP',
  Down: 'DOWN',
  Left: 'LEFT',
  Right: 'RIGHT',
} as const

type Direction = (typeof Direction)[keyof typeof Direction]
```

**Why**: Enums generate runtime code, have quirky behavior with reverse mappings, and don't tree-shake well.

### 102.4 — Type Narrowing & Type Guards

```typescript
// ✅ Discriminated unions with exhaustive checks
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string }

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    // TypeScript narrows to { success: true; data: T }
    return result.data    // ← Use the narrowed type
  } else {
    // TypeScript narrows to { success: false; error: string }
    throw new Error(result.error)
  }
}

// ✅ Custom type guard
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  )
}

// ✅ Exhaustive check with never
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`)
}
```

### 102.5 — Satisfies Operator (TypeScript 5+)

```typescript
// ✅ satisfies validates type WITHOUT widening
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
  blue: [0, 0, 255],
} satisfies Record<string, string | number[]>

// palette.red is still number[] (not string | number[])
// palette.green is still string (not string | number[])
const redChannel = palette.red[0] // ✅ number — type preserved!

// ❌ Without satisfies — type widens
const palette2: Record<string, string | number[]> = {
  red: [255, 0, 0],
  green: '#00ff00',
}
const redChannel2 = palette2.red[0] // string | number — type lost!
```

**When to use**: Config objects, theme definitions, route maps — anywhere you want type checking but need to preserve literal types.

### 102.6 — Const Assertions

```typescript
// ✅ as const for immutable literal types
const ROUTES = {
  home: '/',
  about: '/about',
  dashboard: '/dashboard',
} as const

type Route = (typeof ROUTES)[keyof typeof ROUTES]
// Route = '/' | '/about' | '/dashboard'

// ✅ Tuple types with as const
const pair = [1, 'hello'] as const
// pair: readonly [1, 'hello'] — not (string | number)[]
```

### 102.7 — Utility Types

```typescript
// Essential utility types
type PartialUser = Partial<User>           // All optional
type RequiredUser = Required<User>         // All required
type ReadonlyUser = Readonly<User>         // All readonly
type UserName = Pick<User, 'name'>         // Subset
type UserWithoutEmail = Omit<User, 'email'> // Exclude fields
type UserRecord = Record<string, User>     // Dictionary

// ✅ Advanced: Extract & Exclude for union types
type AdminStatus = Extract<Status, 'active' | 'inactive'> // 'active' | 'inactive'
type NonPending = Exclude<Status, 'pending'>               // 'active' | 'inactive'

// ✅ ReturnType & Parameters for function types
type FnReturn = ReturnType<typeof fetchUser>   // Promise<User>
type FnParams = Parameters<typeof fetchUser>   // [id: string]

// ✅ NonNullable
type MaybeUser = User | null | undefined
type DefiniteUser = NonNullable<MaybeUser>     // User
```

### 102.8 — Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables, functions | camelCase | `getUserById`, `isLoading` |
| Types, interfaces | PascalCase | `UserProfile`, `ApiResponse` |
| Components | PascalCase | `UserCard`, `DashboardLayout` |
| Constants | UPPER_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Files/directories | kebab-case | `user-profile.tsx`, `api-client/` |
| Boolean variables | Verb prefix | `isLoading`, `hasError`, `canDelete`, `shouldFetch` |
| Event handlers | handle prefix | `handleClick`, `handleSubmit`, `handleKeyDown` |
| Generics | Descriptive | `TData`, `TError`, `TProps` (not just `T` for complex cases) |

### 102.9 — Module Organization

```typescript
// ✅ Import order (enforce with ESLint)
// 1. React/Next.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. External libraries
import { z } from 'zod'
import dayjs from 'dayjs'

// 3. Internal aliases (@/)
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

// 4. Relative imports
import { formatDate } from './utils'
import type { UserProps } from './types'

// ✅ Use type-only imports
import type { User } from '@/types'

// ❌ NEVER use barrel files (index.ts re-exports) — hurts tree-shaking
// ❌ NEVER use namespace imports for large libraries
import * as _ from 'lodash' // ❌ Imports entire library
import { debounce } from 'lodash' // ✅ Tree-shakeable
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | `any` type | Defeats type safety | Use `unknown` + type guard |
| 2 | Type assertions (`as`) | Bypasses checking | Use type narrowing |
| 3 | Non-null assertion (`!`) | Runtime error risk | Handle null/undefined explicitly |
| 4 | `enum` | Runtime overhead, poor tree-shaking | Const object or union type |
| 5 | Barrel exports (`index.ts`) | Kills tree-shaking, circular deps | Direct imports |
| 6 | `namespace` imports (`* as`) | Imports everything | Named imports |

# Zod Validation Specialist
# Zodバリデーションスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain / Presentation |
| **Directory Pattern** | `lib/validations/`, `schemas/`, co-located with forms |
| **Variant** | ALL |
| **Pattern Numbers** | 110.1–110.7 |
| **Source Paths** | `**/*.ts` with zod imports |
| **File Count** | Varies |
| **Naming Convention** | camelCase schemas: `userSchema`, `createPostSchema` |
| **Imports From** | `zod`: z |
| **Imported By** | Server Functions, form components, API routes |
| **Cannot Import** | N/A |
| **Dependencies** | zod@3 |
| **When To Use** | Form validation, API request/response validation, schema-first typing |
| **Source Skeleton** | `lib/validations/{domain}.ts`, `schemas/{domain}-schema.ts` |
| **Specialist Type** | tool |
| **Purpose** | Zod schema validation: definition, transforms, refinements, form integration, Server Action validation, type inference |
| **Activation Trigger** | zod, z.object, z.string, z.infer, schema, validation, parse, safeParse |

---

## Rules

### 110.1 — Schema Definition

```typescript
import { z } from 'zod'

// ✅ Basic schemas
const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  age: z.number().int().positive().optional(),
  role: z.enum(['user', 'admin', 'editor']),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// ✅ Type inference — single source of truth
type User = z.infer<typeof userSchema>
// { name: string; email: string; age?: number; role: 'user' | 'admin' | 'editor'; tags: string[]; metadata?: Record<string, unknown> }
```

### 110.2 — Transform & Coerce

```typescript
// ✅ Transform — modify value after validation
const trimmedString = z.string().trim().toLowerCase()

const dateSchema = z.string().transform((val) => new Date(val))

// ✅ Coerce — convert input type before validation
const numberFromString = z.coerce.number() // "42" → 42
const booleanFromString = z.coerce.boolean() // "true" → true
const dateFromString = z.coerce.date() // "2024-01-01" → Date

// ✅ FormData values are always strings — coerce is essential
const formSchema = z.object({
  title: z.string().min(1),
  price: z.coerce.number().positive(),
  quantity: z.coerce.number().int().min(1),
  isPublished: z.coerce.boolean(),
})
```

### 110.3 — Refine & Superrefine

```typescript
// ✅ refine — custom validation
const passwordSchema = z.string()
  .min(8, 'At least 8 characters')
  .refine((val) => /[A-Z]/.test(val), 'Must contain uppercase')
  .refine((val) => /[0-9]/.test(val), 'Must contain number')
  .refine((val) => /[!@#$%]/.test(val), 'Must contain special character')

// ✅ superRefine — multiple errors, cross-field validation
const registrationSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
  }
})
```

### 110.4 — Server Action Validation

```typescript
'use server'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10),
  tags: z.array(z.string()).max(5).default([]),
})

type ActionState =
  | { success: true; data: Post }
  | { success: false; errors: Record<string, string[]> }

export async function createPost(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // Parse FormData to object
  const raw = {
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.getAll('tags'),
  }

  // Validate with safeParse (doesn't throw)
  const result = createPostSchema.safeParse(raw)

  if (!result.success) {
    // Return field-level errors
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // result.data is fully typed and validated
  const post = await db.post.create({ data: result.data })
  revalidatePath('/posts')
  return { success: true, data: post }
}
```

### 110.5 — API Request/Response Validation

```typescript
// ✅ Route Handler with Zod validation
import { NextRequest, NextResponse } from 'next/server'

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams)
  const result = querySchema.safeParse(searchParams)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { page, pageSize, search } = result.data
  // Use validated params...
}
```

### 110.6 — Schema Composition

```typescript
// ✅ Extend schemas
const baseUserSchema = z.object({ name: z.string(), email: z.string().email() })
const createUserSchema = baseUserSchema.extend({ password: z.string().min(8) })
const updateUserSchema = baseUserSchema.partial() // All fields optional

// ✅ Pick / Omit
const loginSchema = baseUserSchema.pick({ email: true }).extend({ password: z.string() })
const publicUserSchema = baseUserSchema.omit({ email: true })

// ✅ Merge two schemas
const merged = schemaA.merge(schemaB) // schemaB fields override schemaA

// ✅ Union / Discriminated union
const paymentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), cardNumber: z.string(), cvv: z.string() }),
  z.object({ type: z.literal('bank'), accountNumber: z.string(), routingNumber: z.string() }),
])
```

### 110.7 — Error Formatting

```typescript
// ✅ flatten() — simple field → errors mapping
const result = schema.safeParse(data)
if (!result.success) {
  const errors = result.error.flatten()
  // { formErrors: string[], fieldErrors: { name?: string[], email?: string[] } }
}

// ✅ format() — nested error tree
const formatted = result.error.format()
// { name: { _errors: ['Required'] }, email: { _errors: ['Invalid email'] } }

// ✅ Custom error map (global)
z.setErrorMap((issue, ctx) => {
  if (issue.code === 'too_small' && issue.minimum === 1) {
    return { message: 'This field is required' }
  }
  return { message: ctx.defaultError }
})
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | `.parse()` in Server Actions | Throws on invalid — crashes action | `.safeParse()` + return errors |
| 2 | Duplicate types + schemas | Type drift, maintenance burden | `z.infer<typeof schema>` |
| 3 | Validation in components | Mixed concerns, not reusable | Schemas in `lib/validations/` |
| 4 | String numbers in forms without coerce | FormData is always strings | `z.coerce.number()` |
| 5 | No error messages | Generic "invalid" to user | Custom messages in every field |

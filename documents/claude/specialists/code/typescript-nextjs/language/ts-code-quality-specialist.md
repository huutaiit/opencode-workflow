# TypeScript Code Quality Specialist
# TypeScriptコード品質スペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | All TypeScript files |
| **Variant** | ALL |
| **Pattern Numbers** | 105.1–105.8 |
| **Source Paths** | `**/*.ts`, `**/*.tsx`, `eslint.config.*`, `.prettierrc`, `tsconfig.json` |
| **File Count** | N/A (applies to all) |
| **Naming Convention** | See ts-fundamentals-specialist 102.8 |
| **Imports From** | N/A (tooling-level) |
| **Imported By** | ALL specialists |
| **Cannot Import** | N/A |
| **Dependencies** | eslint@9, @typescript-eslint/*@8, prettier@3, eslint-plugin-import |
| **When To Use** | Project setup, code quality enforcement |
| **Source Skeleton** | `eslint.config.mjs`, `.prettierrc`, `tsconfig.json` |
| **Specialist Type** | rule-set |
| **Purpose** | ESLint 9 flat config, Prettier, import organization, early returns, functional style, DRY principles |
| **Activation Trigger** | eslint, prettier, code quality, lint, format, import order, code style |

---

## Description

Code quality rules and tooling configuration for TypeScript + Next.js. Covers ESLint 9 flat config, Prettier integration, import organization, and coding style guidelines.

---

## Rules

### 105.1 — ESLint 9 Flat Config

```javascript
// eslint.config.mjs — ESLint 9+ flat config format
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import next from '@next/eslint-plugin-next'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      '@next/next': next,
    },
    rules: {
      // TypeScript strict
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'error',

      // React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import organization
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      }],
      'import/no-cycle': 'error',
    },
  },
  {
    // Ignore patterns
    ignores: ['.next/', 'node_modules/', 'dist/', '*.config.*'],
  }
)
```

### 105.2 — Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

**Rule**: Prettier handles formatting, ESLint handles logic. Never use ESLint for formatting rules (no `max-len`, `indent`, `quotes` in ESLint).

### 105.3 — Early Returns (Guard Clauses)

```typescript
// ❌ Deeply nested
function processUser(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission('admin')) {
        return performAdminAction(user)
      } else {
        return performUserAction(user)
      }
    } else {
      return { error: 'User inactive' }
    }
  } else {
    return { error: 'No user' }
  }
}

// ✅ Guard clauses — flat, readable
function processUser(user: User | null) {
  if (!user) return { error: 'No user' }
  if (!user.isActive) return { error: 'User inactive' }
  if (!user.hasPermission('admin')) return performUserAction(user)
  return performAdminAction(user)
}
```

### 105.4 — Functional & Immutable Style

```typescript
// ✅ Prefer functional transforms over mutation
const activeUsers = users
  .filter((user) => user.isActive)
  .map((user) => ({ ...user, displayName: `${user.firstName} ${user.lastName}` }))
  .toSorted((a, b) => a.displayName.localeCompare(b.displayName))

// ✅ Use structuredClone for deep copy (not JSON.parse(JSON.stringify))
const copy = structuredClone(originalObject)

// ✅ toSorted/toReversed/toSpliced — non-mutating array methods (ES2023)
const sorted = items.toSorted((a, b) => a.name.localeCompare(b.name))
const reversed = items.toReversed()

// ✅ Object.groupBy (ES2024)
const grouped = Object.groupBy(users, (user) => user.role)

// ✅ Prefer Map/Set for lookups (O(1) vs O(n))
const userMap = new Map(users.map((u) => [u.id, u]))
const uniqueIds = new Set(items.map((i) => i.id))
```

### 105.5 — DRY Without Over-Abstraction

```typescript
// ❌ Premature abstraction — 3 similar lines is OK
function createGenericCRUD<T>(resource: string) {
  // 200 lines of generic code for 3 similar endpoints
}

// ✅ Repeat if only 2-3 cases — abstract only when 4+ patterns emerge
async function getUsers() { return api.get<User[]>('/users') }
async function getPosts() { return api.get<Post[]>('/posts') }
async function getComments() { return api.get<Comment[]>('/comments') }

// ✅ Abstract when genuine pattern emerges (4+ repetitions)
// AND the abstraction is simpler than the repetition
```

**Rule**: Three similar lines of code is better than a premature abstraction. Abstract only when the pattern is proven (4+ cases) and the abstraction is genuinely simpler.

### 105.6 — Code Comments

```typescript
// ✅ Comment WHY, not WHAT
// Keycloak returns apps_access in two formats for backward compatibility
const apps = jwt.apps_access ?? Object.keys(jwt.resource_access ?? {})

// ✅ TODO with explicit problem description
// TODO: Token refresh race condition — if two requests fail simultaneously,
// both trigger refresh. Need queue-based dedup (see tokenRefresh.ts)

// ❌ NEVER comment WHAT (the code already says this)
// Get the user name
const userName = user.name

// ❌ NEVER leave commented-out code
// const oldValue = computeOld(data)
// if (oldValue > threshold) { ... }
```

### 105.7 — Function Size & Responsibility

```typescript
// ✅ Functions should do ONE thing
// ✅ Aim for < 30 lines per function
// ✅ If you need a comment to explain a section → extract to named function

// ❌ Too long
async function handleFormSubmit(data: FormData) {
  // validate...  (15 lines)
  // transform... (20 lines)
  // save...      (15 lines)
  // notify...    (10 lines)
}

// ✅ Extract steps
async function handleFormSubmit(data: FormData) {
  const validated = validateFormData(data)
  const transformed = transformForApi(validated)
  const saved = await saveToApi(transformed)
  await notifySuccess(saved)
}
```

### 105.8 — Constants Over Magic Values

```typescript
// ❌ Magic values
if (retryCount > 3) { /* ... */ }
setTimeout(callback, 30000)
if (user.role === 'admin') { /* ... */ }

// ✅ Named constants
const MAX_RETRY_COUNT = 3
const AUTO_SAVE_INTERVAL_MS = 30_000
const ROLES = { Admin: 'admin', User: 'user', Guest: 'guest' } as const

if (retryCount > MAX_RETRY_COUNT) { /* ... */ }
setTimeout(callback, AUTO_SAVE_INTERVAL_MS)
if (user.role === ROLES.Admin) { /* ... */ }
```

**Note**: Use numeric separators (`30_000`) for readability with large numbers.

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | ESLint formatting rules | Conflicts with Prettier | Prettier for formatting, ESLint for logic |
| 2 | Deep nesting (>3 levels) | Hard to read, error-prone | Guard clauses + early returns |
| 3 | Mutating arrays/objects | Side effects, bugs | toSorted, spread, structuredClone |
| 4 | Premature abstraction | Over-engineering, complexity | Wait for 4+ patterns |
| 5 | Commented-out code | Noise, confusion, git has history | Delete it |
| 6 | Magic numbers/strings | Unclear intent | Named constants |

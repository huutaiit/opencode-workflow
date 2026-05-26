# Prisma ORM Specialist
# Prisma ORMスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: app-router-fullstack

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data Access / Infrastructure |
| **Directory Pattern** | `prisma/schema.prisma`, `lib/prisma.ts`, `lib/db.ts` |
| **Variant** | app-router-fullstack |
| **Pattern Numbers** | 108.1–108.9 |
| **Source Paths** | `prisma/**`, `lib/prisma.ts`, `lib/db.ts` |
| **File Count** | ~5-10 (schema, client, repositories) |
| **Naming Convention** | PascalCase models, camelCase fields, kebab-case files |
| **Imports From** | `@prisma/client` |
| **Imported By** | Server Components, Server Functions, Route Handlers |
| **Cannot Import** | Client Components (Prisma runs server-only) |
| **Dependencies** | @prisma/client, prisma (devDep) |
| **When To Use** | Full-stack Next.js with direct DB access, ORM data layer |
| **Source Skeleton** | `prisma/schema.prisma`, `lib/prisma.ts`, `lib/db.ts` |
| **Specialist Type** | tool |
| **Purpose** | Prisma ORM: schema design, relations, migrations, query optimization, transactions, type safety, security |
| **Activation Trigger** | prisma, schema.prisma, PrismaClient, findMany, findUnique, create, update, migration |

---

## Description

Prisma ORM patterns for Next.js fullstack applications. Covers schema design, relation management, migration strategy, query optimization, and error handling. Source: official Prisma AI documentation.

---

## Rules

### 108.1 — Schema Design

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ✅ Meaningful domain-driven model names
// ✅ Explicit @id, @unique, @relation
// ✅ Soft deletes via deletedAt
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete

  @@index([email])
  @@index([deletedAt])
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
  @@index([published, createdAt])
}

enum Role {
  USER
  ADMIN
}
```

### 108.2 — Client Singleton (Next.js)

```typescript
// lib/prisma.ts — singleton for development hot-reload
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 108.3 — Query Optimization

```typescript
// ✅ select — only fetch needed fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
})

// ✅ include — eager load relations (prevent N+1)
const posts = await prisma.post.findMany({
  include: { author: { select: { name: true } }, tags: true },
})

// ❌ N+1 Problem
const posts = await prisma.post.findMany()
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } })
  // ❌ N queries for N posts!
}

// ✅ Pagination
const posts = await prisma.post.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
})

// ✅ Cursor-based pagination (more efficient for large datasets)
const posts = await prisma.post.findMany({
  take: 20,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0,
  orderBy: { createdAt: 'desc' },
})
```

### 108.4 — Transactions

```typescript
// ✅ Interactive transaction — multiple dependent operations
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { name: 'Alice', email: 'alice@example.com' } })
  const post = await tx.post.create({ data: { title: 'First Post', authorId: user.id } })
  return { user, post }
})

// ✅ Batch transaction — independent operations
const [users, posts] = await prisma.$transaction([
  prisma.user.findMany(),
  prisma.post.findMany({ where: { published: true } }),
])
```

### 108.5 — Migration Strategy

```bash
# Development — create and apply migration
npx prisma migrate dev --name add_user_role

# Production — apply only (no schema drift detection)
npx prisma migrate deploy

# Generate client after schema change
npx prisma generate
```

**Rules**:
- NEVER modify existing migrations — create new ones
- Descriptive migration names: `add_user_role`, `create_post_tags_relation`
- Review migration SQL before production deploy
- Keep migrations idempotent and reversible

### 108.6 — Error Handling

```typescript
import { Prisma } from '@prisma/client'

async function createUser(data: CreateUserDto) {
  try {
    return await prisma.user.create({ data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': // Unique constraint violation
          throw new AppError('Email already exists', 409)
        case 'P2025': // Record not found
          throw new AppError('User not found', 404)
        case 'P2003': // Foreign key constraint
          throw new AppError('Referenced record does not exist', 400)
        default:
          throw new AppError(`Database error: ${error.code}`, 500)
      }
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new AppError('Invalid data provided', 400)
    }
    throw error
  }
}
```

### 108.7 — Repository Pattern

```typescript
// ✅ Separate data access from business logic
function createUserRepository(db: PrismaClient) {
  return {
    findById: (id: string) =>
      db.user.findUnique({ where: { id, deletedAt: null } }),

    findMany: (params: { page: number; pageSize: number; role?: Role }) =>
      db.user.findMany({
        where: { deletedAt: null, ...(params.role && { role: params.role }) },
        take: params.pageSize,
        skip: (params.page - 1) * params.pageSize,
        orderBy: { createdAt: 'desc' },
      }),

    create: (data: Prisma.UserCreateInput) =>
      db.user.create({ data }),

    softDelete: (id: string) =>
      db.user.update({ where: { id }, data: { deletedAt: new Date() } }),
  }
}
```

### 108.8 — Security

- Input validation at boundaries BEFORE database operations
- Built-in SQL injection protection (parameterized queries)
- Row-level security for multi-tenant: always filter by `tenantId`
- NEVER expose raw PrismaClient in API responses
- NEVER expose internal IDs without authorization checks

### 108.9 — AI Safety Guardrails

Prisma CLI detects AI coding assistants and blocks destructive commands:
- `prisma migrate reset --force` → blocked without `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=true`
- Applies to: Cursor, Claude Code, Gemini CLI, and others

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | No singleton in dev | Multiple PrismaClient instances on hot-reload | Global singleton pattern |
| 2 | Select * (no select/include) | Over-fetching, slow queries | Explicit select or include |
| 3 | N+1 queries in loops | N extra queries | Use include or batch query |
| 4 | Modifying existing migrations | Schema drift, production failures | Create new migration |
| 5 | Exposing PrismaClient in API | Security risk, leaks schema | Repository pattern |

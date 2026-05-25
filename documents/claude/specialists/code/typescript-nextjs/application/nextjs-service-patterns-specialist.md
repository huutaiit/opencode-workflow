# Next.js Service Patterns Specialist
# Next.jsサービスパターンスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application / Core |
| **Directory Pattern** | `core/di/`, `core/services/`, `domain/use-cases/`, `infrastructure/repositories/` |
| **Variant** | ALL |
| **Pattern Numbers** | 117.1–117.5 |
| **Source Paths** | `core/**`, `domain/**`, `infrastructure/**` |
| **File Count** | Varies (5-50+ depending on complexity) |
| **Naming Convention** | camelCase factories: `createUserRepository`, `getUserFactory` |
| **Imports From** | API clients, domain interfaces |
| **Imported By** | Server Components, Client Components (via hooks), Server Functions |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (architecture pattern) |
| **When To Use** | Enterprise apps needing testable, decoupled service layer |
| **Source Skeleton** | `core/di/modules/{domain}Container.ts`, `domain/repositories/{domain}Repository.ts`, `infrastructure/repositories/{domain}RepositoryImpl.ts` |
| **Specialist Type** | pattern |
| **Purpose** | Frontend service patterns: Repository, DI Factory/Container, Use-case layer, API abstraction. Extracted from StarX4CRM production. |
| **Activation Trigger** | repository, factory, container, dependency injection, DI, use case, service layer, API abstraction |

---

## Description

Service layer patterns for enterprise Next.js applications. Extracted from StarX4CRM production (48+ DI modules). Provides testable, decoupled architecture without framework dependency.

---

## Rules

### 117.1 — Repository Pattern (Domain Interface)

```typescript
// domain/repositories/user-repository.ts — INTERFACE (domain layer)
export interface UserRepository {
  findById(id: string): Promise<User | null>
  findMany(params: FindManyParams): Promise<PaginatedResult<User>>
  create(data: CreateUserDto): Promise<User>
  update(id: string, data: UpdateUserDto): Promise<User>
  delete(id: string): Promise<void>
}

// infrastructure/repositories/user-repository-impl.ts — IMPLEMENTATION
import type { UserRepository } from '@/domain/repositories/user-repository'

export function createUserRepository(apiClient: ApiClient): UserRepository {
  const basePath = '/users'

  return {
    findById: (id) => apiClient.get(`${basePath}/${id}`),
    findMany: (params) => apiClient.get(basePath, { params }),
    create: (data) => apiClient.post(basePath, data),
    update: (id, data) => apiClient.put(`${basePath}/${id}`, data),
    delete: (id) => apiClient.delete(`${basePath}/${id}`),
  }
}
```

**Key**: Domain layer defines INTERFACE. Infrastructure implements it. Domain never imports infrastructure.

### 117.2 — Factory + Container DI Pattern

```typescript
// core/di/modules/user-container.ts
import { createApiClient } from '@/infrastructure/api/axios'
import { createUserRepository } from '@/infrastructure/repositories/user-repository-impl'
import { createGetUserUseCase } from '@/domain/use-cases/get-user'
import { createCreateUserUseCase } from '@/domain/use-cases/create-user'

// Wire dependencies
const apiClient = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_URL! })
const userRepository = createUserRepository(apiClient)

// Export factories (lazy instantiation)
export const userContainer = {
  getUserFactory: (tenantKey: string) => createGetUserUseCase(tenantKey, userRepository),
  createUserFactory: (tenantKey: string) => createCreateUserUseCase(tenantKey, userRepository),
  listUsersFactory: (tenantKey: string) => createListUsersUseCase(tenantKey, userRepository),
}
```

**Pattern**: Repository → UseCase → Factory → Container → Hook/Component

### 117.3 — Use-Case Layer

```typescript
// domain/use-cases/get-user.ts
import type { UserRepository } from '@/domain/repositories/user-repository'

export function createGetUserUseCase(tenantKey: string, repo: UserRepository) {
  return async (userId: string): Promise<User> => {
    const user = await repo.findById(userId)
    if (!user) throw new AppError('User not found', 404)
    return user
  }
}

// domain/use-cases/create-user.ts
export function createCreateUserUseCase(tenantKey: string, repo: UserRepository) {
  return async (data: CreateUserDto): Promise<User> => {
    // Business validation
    if (await repo.findByEmail(data.email)) {
      throw new AppError('Email already exists', 409)
    }
    return repo.create({ ...data, tenantKey })
  }
}
```

### 117.4 — Hook Integration (Client Components)

```typescript
// presentation/hooks/use-user.ts
'use client'
import { userContainer } from '@/core/di/modules/user-container'
import { useState, useEffect } from 'react'

export function useUser(tenantKey: string, userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const getUser = userContainer.getUserFactory(tenantKey)
    setLoading(true)
    getUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [tenantKey, userId])

  return { user, loading, error }
}
```

### 117.5 — Provider Composition for DI

```typescript
// presentation/providers/AppProviders.tsx
// ✅ Correct nesting order matters
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>           {/* Redux — outermost */}
      <LocaleProvider>        {/* i18n */}
        <AntdProvider>        {/* UI config */}
          <FCMProvider>       {/* Notifications */}
            {children}
          </FCMProvider>
        </AntdProvider>
      </LocaleProvider>
    </StoreProvider>
  )
}
```

**Rule**: Providers that others depend on go outermost. Most specific providers go innermost.

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | Direct API calls in components | Tight coupling, untestable | Repository + DI container |
| 2 | Business logic in components | Mixed concerns | Use-case layer |
| 3 | `new` in components | Cannot mock, hard to test | Factory functions |
| 4 | God container | One container for everything | Split by domain module |
| 5 | Circular imports in DI | Runtime errors | Dependency direction: domain ← infra |

# TypeScript Design Patterns Specialist
# TypeScriptデザインパターンスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | All TypeScript files |
| **Variant** | ALL |
| **Pattern Numbers** | 104.1–104.7 |
| **Source Paths** | `**/*.ts`, `**/*.tsx` |
| **File Count** | N/A (applies to all) |
| **Naming Convention** | PascalCase for classes/factories, camelCase for instances |
| **Imports From** | N/A (language-level) |
| **Imported By** | ALL specialists |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (built-in) |
| **When To Use** | Complex state management, API abstraction, DI wiring |
| **Source Skeleton** | `core/di/modules/{domain}Container.ts`, `domain/use-cases/{action}.ts` |
| **Specialist Type** | language |
| **Purpose** | Design patterns adapted for React/Next.js: Factory, Strategy, Observer, Builder, Repository, DI without framework |
| **Activation Trigger** | design pattern, factory, strategy, observer, builder, repository, dependency injection, DI |

---

## Description

Classical design patterns adapted for TypeScript + React/Next.js context. Emphasis on functional patterns over OOP. Extracted from StarX4CRM production patterns (DI Factory/Container) and generalized.

---

## Rules

### 104.1 — Factory Pattern (API Client Creation)

```typescript
// ✅ Factory function — creates configured instances
interface ApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, data: unknown): Promise<T>
}

function createApiClient(config: {
  baseUrl: string
  headers?: Record<string, string>
  interceptors?: RequestInterceptor[]
}): ApiClient {
  const { baseUrl, headers = {}, interceptors = [] } = config

  async function request<T>(method: string, path: string, data?: unknown): Promise<T> {
    let requestConfig = { method, headers: { ...headers }, body: data ? JSON.stringify(data) : undefined }

    // Apply interceptors
    for (const interceptor of interceptors) {
      requestConfig = await interceptor(requestConfig)
    }

    const response = await fetch(`${baseUrl}${path}`, requestConfig)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, data: unknown) => request<T>('POST', path, data),
  }
}

// Usage — different factories for different services
const coreApi = createApiClient({ baseUrl: '/api/core' })
const sfaApi = createApiClient({ baseUrl: '/api/sfa', headers: { 'X-Module': 'SFA' } })
```

### 104.2 — DI Container Pattern (Frontend)

```typescript
// ✅ Container = object that wires factories together
// Adapted from StarX4CRM production pattern

// Repository interface (domain layer)
interface UserRepository {
  getById(id: string): Promise<User>
  create(data: CreateUserDto): Promise<User>
}

// Repository implementation (infrastructure layer)
function createUserRepository(apiClient: ApiClient): UserRepository {
  return {
    getById: (id) => apiClient.get(`/users/${id}`),
    create: (data) => apiClient.post('/users', data),
  }
}

// Use case (domain layer)
function createGetUserUseCase(repo: UserRepository) {
  return async (id: string): Promise<User> => {
    return repo.getById(id)
  }
}

// Container — wires everything
const apiClient = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_URL! })
const userRepository = createUserRepository(apiClient)

export const userContainer = {
  getUserFactory: () => createGetUserUseCase(userRepository),
  createUserFactory: () => createCreateUserUseCase(userRepository),
}
```

### 104.3 — Strategy Pattern (Validation/Formatting)

```typescript
// ✅ Strategy = interchangeable algorithms
interface ValidationStrategy<T> {
  validate(value: T): ValidationResult
}

type ValidationResult = { valid: true } | { valid: false; errors: string[] }

// Concrete strategies
const emailValidation: ValidationStrategy<string> = {
  validate(value) {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    return isValid ? { valid: true } : { valid: false, errors: ['Invalid email format'] }
  },
}

const phoneValidation: ValidationStrategy<string> = {
  validate(value) {
    const isValid = /^\+?[\d\s-]{10,}$/.test(value)
    return isValid ? { valid: true } : { valid: false, errors: ['Invalid phone format'] }
  },
}

// Usage — swap strategy at runtime
function validateField(value: string, strategy: ValidationStrategy<string>): ValidationResult {
  return strategy.validate(value)
}
```

### 104.4 — Observer Pattern (Event Bus)

```typescript
// ✅ Type-safe event bus
type EventMap = {
  'user:login': { userId: string; timestamp: number }
  'user:logout': { userId: string }
  'notification:new': { id: string; title: string; body: string }
}

type EventHandler<T> = (data: T) => void

function createEventBus() {
  const handlers = new Map<string, Set<EventHandler<unknown>>>()

  return {
    on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler as EventHandler<unknown>)
      return () => handlers.get(event)?.delete(handler as EventHandler<unknown>)
    },

    emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
      handlers.get(event)?.forEach((handler) => handler(data))
    },
  }
}

// Usage
const bus = createEventBus()
const unsubscribe = bus.on('user:login', ({ userId }) => {
  updateLoginStatus(userId)
})
bus.emit('user:login', { userId: '123', timestamp: Date.now() })
unsubscribe() // Cleanup
```

### 104.5 — Builder Pattern (Complex Object Construction)

```typescript
// ✅ Builder for complex query/config objects
interface QueryConfig {
  filters: Record<string, unknown>
  sort: { field: string; order: 'asc' | 'desc' }[]
  pagination: { page: number; pageSize: number }
  includes: string[]
}

function createQueryBuilder() {
  const config: QueryConfig = {
    filters: {},
    sort: [],
    pagination: { page: 1, pageSize: 20 },
    includes: [],
  }

  return {
    where(field: string, value: unknown) {
      config.filters[field] = value
      return this
    },
    orderBy(field: string, order: 'asc' | 'desc' = 'asc') {
      config.sort.push({ field, order })
      return this
    },
    page(page: number, pageSize: number = 20) {
      config.pagination = { page, pageSize }
      return this
    },
    include(...relations: string[]) {
      config.includes.push(...relations)
      return this
    },
    build(): QueryConfig {
      return structuredClone(config)
    },
  }
}

// Usage — fluent API
const query = createQueryBuilder()
  .where('status', 'active')
  .where('role', 'admin')
  .orderBy('createdAt', 'desc')
  .page(1, 50)
  .include('posts', 'profile')
  .build()
```

### 104.6 — Repository Pattern (Data Access Abstraction)

```typescript
// ✅ Generic repository interface
interface Repository<T, CreateDto, UpdateDto> {
  findById(id: string): Promise<T | null>
  findMany(query?: QueryConfig): Promise<{ data: T[]; total: number }>
  create(dto: CreateDto): Promise<T>
  update(id: string, dto: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}

// ✅ Implementation via factory (not class inheritance)
function createRepository<T, CreateDto, UpdateDto>(
  apiClient: ApiClient,
  resourcePath: string
): Repository<T, CreateDto, UpdateDto> {
  return {
    findById: (id) => apiClient.get(`${resourcePath}/${id}`),
    findMany: (query) => apiClient.get(resourcePath, { params: query }),
    create: (dto) => apiClient.post(resourcePath, dto),
    update: (id, dto) => apiClient.put(`${resourcePath}/${id}`, dto),
    delete: (id) => apiClient.delete(`${resourcePath}/${id}`),
  }
}
```

### 104.7 — Composition Over Inheritance

```typescript
// ❌ Class inheritance — rigid, hard to test
class BaseService {
  constructor(protected api: ApiClient) {}
  protected async handleError(error: unknown) { /* ... */ }
}
class UserService extends BaseService {
  async getUser(id: string) { /* ... */ }
}

// ✅ Composition — flexible, testable
function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleApiError(error)
      throw error
    }
  }) as T
}

// ✅ Use structured logger — NEVER console.log in production code
function withLogging<T extends (...args: unknown[]) => Promise<unknown>>(name: string, fn: T): T {
  return (async (...args: Parameters<T>) => {
    logger.debug(`[${name}] called`, { args })
    const result = await fn(...args)
    logger.debug(`[${name}] returned`, { result })
    return result
  }) as T
}

// Compose behaviors
const getUser = withLogging('getUser', withErrorHandling(
  async (id: string) => apiClient.get<User>(`/users/${id}`)
))
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | Deep class inheritance | Rigid, hard to test, fragile base class | Composition + factories |
| 2 | Singleton with mutable state | Hidden dependencies, test pollution | DI container |
| 3 | God object / service | Too many responsibilities | Split by domain |
| 4 | Anemic domain model | Logic scattered in services | Encapsulate in domain types |
| 5 | Direct `new` in components | Tight coupling, untestable | Factory + DI container |

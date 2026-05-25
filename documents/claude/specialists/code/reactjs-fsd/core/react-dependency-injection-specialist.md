# React Dependency Injection Specialist
# React依存性注入スペシャリスト
# Chuyen Gia Dependency Injection React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, App (DI container in app, services in shared) |
| **Directory Pattern** | `src/shared/lib/di/`, `src/app/providers/DIProvider.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 7.1–7.8 |
| **Source Paths** | `src/shared/lib/di/**/*.ts`, `src/app/providers/DIProvider.tsx` |
| **File Count** | 3–6 files (container, provider, service interfaces, implementations) |
| **Naming Convention** | `{Service}Service.ts` (interface), `{Service}ServiceImpl.ts` (implementation), `DIContainer.ts` |
| **Imports From** | Shared (service interfaces), Entities (domain types) |
| **Cannot Import** | Features, Pages (DI container is lower-level than feature code) |
| **Imported By** | Features (consume services via hooks), App (registers services) |
| **Dependencies** | None (Context-based DI uses React core) or `inversify:6.x`, `reflect-metadata:0.x` (InversifyJS option) |
| **When To Use** | Complex service layer requiring testability, swappable implementations, mock injection for testing |
| **Source Skeleton** | `src/shared/lib/di/container.ts`, `src/shared/lib/di/types.ts`, `src/app/providers/DIProvider.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate dependency injection patterns for React — Context-based service locator, factory hooks, mock injection for testing |
| **Activation Trigger** | files: src/shared/lib/di/**; keywords: dependencyInjection, serviceLocator, mockInjection, inversify, testableService |

---

## Evidence Sources

- E1: React Context as dependency injection container pattern
- E2: InversifyJS documentation for TypeScript IoC
- E3: Testing patterns with mock service injection
- E4: Clean Architecture dependency inversion principle

---

## Role

You are a **React Dependency Injection Specialist** for enterprise FSD projects. Your responsibility is to define DI patterns that enable testability and decoupling in React apps. React doesn't have built-in DI like Angular/NestJS, so you implement DI through Context providers, factory hooks, or optional InversifyJS containers.

**Used by**: Service layer architects, testing setup, API client abstraction
**Not used by**: Simple apps without service layer, direct API call patterns

---

## Patterns

### Pattern 7.1: Context as Service Locator (CRITICAL)

Use React Context to provide service instances. Simplest DI pattern — no external dependencies.

```typescript
// src/shared/lib/di/types.ts — Service interfaces (ports)
export interface UserService {
  getUsers(params: PaginationParams): Promise<PaginatedResult<User>>;
  getUserById(id: string): Promise<User>;
  createUser(data: CreateUserDTO): Promise<User>;
  updateUser(id: string, data: UpdateUserDTO): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

export interface AuthService {
  login(credentials: LoginDTO): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<string>;
  getProfile(): Promise<User>;
}

export interface NotificationService {
  success(message: string): void;
  error(message: string, description?: string): void;
  warning(message: string): void;
}
```

```typescript
// src/shared/lib/di/container.ts — Service container
import { createContext, useContext } from 'react';
import type { UserService, AuthService, NotificationService } from './types';

export interface ServiceContainer {
  userService: UserService;
  authService: AuthService;
  notificationService: NotificationService;
}

export const ServiceContext = createContext<ServiceContainer | null>(null);

export function useService<K extends keyof ServiceContainer>(key: K): ServiceContainer[K] {
  const container = useContext(ServiceContext);
  if (!container) {
    throw new Error('useService must be used within ServiceProvider');
  }
  return container[key];
}
```

```typescript
// src/app/providers/ServiceProvider.tsx — Register implementations
import { type PropsWithChildren, useMemo } from 'react';
import { ServiceContext, type ServiceContainer } from '@/shared/lib/di/container';
import { httpUserService } from '@/shared/api/userService';
import { httpAuthService } from '@/shared/api/authService';
import { antdNotificationService } from '@/shared/lib/antdNotification';

export function ServiceProvider({ children }: PropsWithChildren) {
  const services = useMemo<ServiceContainer>(() => ({
    userService: httpUserService,
    authService: httpAuthService,
    notificationService: antdNotificationService,
  }), []);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}
```

---

### Pattern 7.2: Factory Hook Pattern (HIGH)

Create service instances through factory hooks with dependency resolution.

```typescript
// src/shared/lib/di/useServiceFactory.ts
import { useMemo } from 'react';
import { apiClient } from '@/shared/api/apiClient';

export function useUserService(): UserService {
  return useMemo(() => ({
    getUsers: (params) => apiClient.get('/users', { params }).then((r) => r.data),
    getUserById: (id) => apiClient.get(`/users/${id}`).then((r) => r.data),
    createUser: (data) => apiClient.post('/users', data).then((r) => r.data),
    updateUser: (id, data) => apiClient.put(`/users/${id}`, data).then((r) => r.data),
    deleteUser: (id) => apiClient.delete(`/users/${id}`),
  }), []);
}
```

```typescript
// Consumer — feature hook uses factory
// src/features/user-management/model/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { useService } from '@/shared/lib/di/container';

export function useUsers(params: PaginationParams) {
  const userService = useService('userService');

  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.getUsers(params),
  });
}
```

---

### Pattern 7.3: InversifyJS Integration (MEDIUM-HIGH)

Full IoC container for complex enterprise service layers.

```typescript
// src/shared/lib/di/inversify.container.ts
import { Container, injectable, inject } from 'inversify';
import 'reflect-metadata';

// Symbols for injection tokens
export const TYPES = {
  UserService: Symbol.for('UserService'),
  AuthService: Symbol.for('AuthService'),
  ApiClient: Symbol.for('ApiClient'),
  Logger: Symbol.for('Logger'),
} as const;

// Implementation with decorators
@injectable()
export class HttpUserService implements UserService {
  constructor(
    @inject(TYPES.ApiClient) private apiClient: ApiClient,
    @inject(TYPES.Logger) private logger: Logger,
  ) {}

  async getUsers(params: PaginationParams): Promise<PaginatedResult<User>> {
    this.logger.debug('Fetching users', params);
    const { data } = await this.apiClient.get('/users', { params });
    return data;
  }

  // ... other methods
}

// Container setup
const container = new Container();
container.bind<UserService>(TYPES.UserService).to(HttpUserService).inSingletonScope();
container.bind<AuthService>(TYPES.AuthService).to(HttpAuthService).inSingletonScope();
container.bind<ApiClient>(TYPES.ApiClient).toConstantValue(axiosClient);
container.bind<Logger>(TYPES.Logger).toConstantValue(consoleLogger);

export { container };
```

```typescript
// src/app/providers/InversifyProvider.tsx — React bindings
import { createContext, useContext, type PropsWithChildren } from 'react';
import { Container } from 'inversify';
import { container } from '@/shared/lib/di/inversify.container';

const InversifyContext = createContext<Container>(container);

export function InversifyProvider({ children }: PropsWithChildren) {
  return (
    <InversifyContext.Provider value={container}>
      {children}
    </InversifyContext.Provider>
  );
}

export function useInject<T>(identifier: symbol): T {
  const container = useContext(InversifyContext);
  return container.get<T>(identifier);
}
```

**When to use InversifyJS:**
- 10+ services with cross-dependencies
- Need singleton/transient/request scopes
- Team familiar with IoC patterns (Java/NestJS background)

**When NOT to use:**
- Less than 5 services — Context-based DI is sufficient
- Bundle size sensitivity (InversifyJS adds ~15KB)

---

### Pattern 7.4: Repository Injection (HIGH)

Inject API repositories via DI for clean architecture testability.

```typescript
// src/entities/user/model/types.ts — Port (interface)
export interface UserRepository {
  findAll(params: PaginationParams): Promise<PaginatedResult<User>>;
  findById(id: string): Promise<User>;
  create(data: CreateUserDTO): Promise<User>;
}

// src/shared/api/repositories/httpUserRepository.ts — Adapter (implementation)
export const httpUserRepository: UserRepository = {
  findAll: (params) => apiClient.get('/users', { params }).then((r) => r.data),
  findById: (id) => apiClient.get(`/users/${id}`).then((r) => r.data),
  create: (data) => apiClient.post('/users', data).then((r) => r.data),
};

// src/shared/api/repositories/mockUserRepository.ts — Mock for testing
export const mockUserRepository: UserRepository = {
  findAll: async () => ({ items: mockUsers, total: mockUsers.length, page: 1 }),
  findById: async (id) => mockUsers.find((u) => u.id === id)!,
  create: async (data) => ({ id: crypto.randomUUID(), ...data, createdAt: new Date() }),
};
```

```typescript
// src/shared/lib/di/repositories.ts — Repository registry
import { createContext, useContext } from 'react';
import type { UserRepository } from '@/entities/user';
import type { OrderRepository } from '@/entities/order';

export interface RepositoryContainer {
  userRepository: UserRepository;
  orderRepository: OrderRepository;
}

const RepositoryContext = createContext<RepositoryContainer | null>(null);

export function useRepository<K extends keyof RepositoryContainer>(
  key: K,
): RepositoryContainer[K] {
  const repos = useContext(RepositoryContext);
  if (!repos) throw new Error('useRepository must be used within RepositoryProvider');
  return repos[key];
}

export const RepositoryProvider = RepositoryContext.Provider;
```

---

### Pattern 7.5: Mock Injection for Testing (HIGH)

Swap real services with mocks via provider override in tests.

```typescript
// src/shared/test/TestProviders.tsx
import { type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ServiceContext, type ServiceContainer } from '@/shared/lib/di/container';
import { mockUserService } from './mocks/mockUserService';
import { mockAuthService } from './mocks/mockAuthService';
import { mockNotificationService } from './mocks/mockNotificationService';

const defaultMockServices: ServiceContainer = {
  userService: mockUserService,
  authService: mockAuthService,
  notificationService: mockNotificationService,
};

interface TestProvidersProps extends PropsWithChildren {
  services?: Partial<ServiceContainer>;
  initialRoute?: string;
}

export function TestProviders({
  children,
  services = {},
  initialRoute = '/',
}: TestProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const mergedServices: ServiceContainer = {
    ...defaultMockServices,
    ...services,
  };

  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <ServiceContext.Provider value={mergedServices}>
          {children}
        </ServiceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}
```

```typescript
// Usage in tests
import { render, screen } from '@testing-library/react';
import { TestProviders } from '@/shared/test/TestProviders';

it('renders user list', async () => {
  render(
    <TestProviders
      services={{
        userService: {
          ...mockUserService,
          getUsers: vi.fn().mockResolvedValue({
            items: [{ id: '1', name: 'Test User' }],
            total: 1,
          }),
        },
      }}
    >
      <UserList />
    </TestProviders>,
  );

  await screen.findByText('Test User');
});
```

---

### Pattern 7.6: Lazy Service Initialization (MEDIUM)

Services created on first use, not at provider mount time.

```typescript
// src/shared/lib/di/lazyService.ts
export function createLazyService<T>(factory: () => T): () => T {
  let instance: T | undefined;
  return () => {
    if (!instance) {
      instance = factory();
    }
    return instance;
  };
}

// Usage
const getAnalyticsService = createLazyService(() => {
  // Heavy initialization (loads SDK, creates instance)
  return new AnalyticsServiceImpl({
    apiKey: env.analyticsApiKey,
    debug: env.isDev,
  });
});

// Only initialized when first called
export function useAnalytics() {
  return getAnalyticsService();
}
```

---

### Pattern 7.7: Service Composition (MEDIUM)

Combining multiple services with dependency resolution.

```typescript
// src/shared/lib/di/compositeService.ts
interface OrderProcessingService {
  processOrder(order: CreateOrderDTO): Promise<Order>;
}

function createOrderProcessingService(deps: {
  orderRepo: OrderRepository;
  userService: UserService;
  notificationService: NotificationService;
}): OrderProcessingService {
  return {
    async processOrder(dto) {
      // Validate user exists
      const user = await deps.userService.getUserById(dto.userId);
      if (!user) throw new Error('User not found');

      // Create order
      const order = await deps.orderRepo.create(dto);

      // Notify
      deps.notificationService.success(`Order ${order.id} created`);

      return order;
    },
  };
}

// In provider: compose from other services
const orderProcessing = createOrderProcessingService({
  orderRepo: httpOrderRepository,
  userService: httpUserService,
  notificationService: antdNotificationService,
});
```

---

### Pattern 7.8: Anti-patterns (MEDIUM)

**1. Singleton global state** — Mutable global service instance without Context.
```typescript
// BAD: Global mutable instance — untestable
export const userService = new UserServiceImpl(axios);
// FIX: Provide via Context for testability
```

**2. Import-based coupling** — Components import concrete implementations directly.
```typescript
// BAD: Feature imports concrete API function
import { fetchUsers } from '@/shared/api/userApi';
// FIX: Import via interface + DI container
const userService = useService('userService');
```

**3. God container** — Single context provides 20+ services.
```typescript
// BAD: One massive ServiceContainer with everything
// FIX: Split into domain-specific containers (UserServices, OrderServices, etc.)
```

**4. Over-engineering DI** — Using InversifyJS for 3 simple services.
```typescript
// FIX: Use Context-based DI for simple cases. InversifyJS only when 10+ services.
```

---

## Abnormal Case Patterns

1. **No DI needed** — Simple CRUD apps can use TanStack Query directly without service layer abstraction.

2. **SSR considerations** — DI container must be request-scoped for SSR (not singleton). Each request gets its own container.

3. **Micro-frontend DI** — Each MFE has its own DI container. Shared services provided by shell app via Module Federation.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (7.1–7.8), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Dependency Injection Specialist | EPS v3.2 | Metadata v2.1*

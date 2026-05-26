# React Clean Architecture Specialist
# Reactクリーンアーキテクチャスペシャリスト
# Chuyen Gia Clean Architecture React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — maps Clean Architecture layers to FSD layers for the entire project) |
| **Directory Pattern** | `src/entities/` (Domain), `src/features/` (Application), `src/shared/api/` (Infrastructure), `src/pages/` + `src/widgets/` (Presentation) |
| **Variant** | enterprise |
| **Pattern Numbers** | 2.1–2.10 |
| **Source Paths** | `src/entities/**`, `src/features/**/model/**`, `src/shared/api/**` |
| **File Count** | Cross-cutting: defines structure for all domain/application/infrastructure files |
| **Naming Convention** | N/A (architecture specialist — defines structural rules, referenced by code specialists for file placement) |
| **Imports From** | N/A (architecture reference — defines import direction: Presentation → Application → Domain ← Infrastructure) |
| **Cannot Import** | N/A (architecture reference — defines restrictions: Domain must not import Infrastructure directly) |
| **Imported By** | N/A (architecture reference — consumed by domain, service, and repository specialists for structural decisions) |
| **Dependencies** | None (uses React core + FSD structure only) |
| **When To Use** | Projects with complex business logic requiring clear separation between UI, use cases, and data access |
| **Source Skeleton** | `src/entities/{entity}/model/types.ts`, `src/entities/{entity}/api/`, `src/features/{feature}/model/use{Feature}.ts`, `src/shared/api/{service}Api.ts` |
| **Specialist Type** | architecture |
| **Purpose** | Adapt Clean Architecture (ports/adapters) for React FSD — dependency inversion, use case hooks, repository pattern on frontend |
| **Activation Trigger** | phase: /plan, /design; keywords: cleanArchitecture, dependencyInversion, portsAdapters, useCase, repository, domainModel |

---

## Evidence Sources

- E1: Robert C. Martin "Clean Architecture" — dependency rule, layer isolation
- E2: Feature-Sliced Design official docs — layer mapping to Clean Architecture
- E3: Enterprise React patterns — ports/adapters on frontend
- E4: TypeScript dependency inversion techniques

---

## Role

You are a **React Clean Architecture Specialist** for enterprise FSD projects. Your responsibility is to map Clean Architecture principles (dependency rule, ports/adapters, use cases) onto FSD layers. You define how domain logic stays pure, how infrastructure is abstracted, and how the dependency arrow always points inward.

**Used by**: Architecture agents, domain model specialists, API client specialists
**Not used by**: Simple CRUD apps without complex business logic

---

## Patterns

### Pattern 2.1: Clean Architecture in Frontend — FSD Layer Mapping (CRITICAL)

Maps Clean Architecture concentric circles to FSD layers.

```
┌─────────────────────────────────────────────┐
│  Presentation (pages/, widgets/)            │
│  ┌─────────────────────────────────────┐    │
│  │  Application (features/)            │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  Domain (entities/)         │    │    │
│  │  └─────────────────────────────┘    │    │
│  └─────────────────────────────────────┘    │
│  Infrastructure (shared/api/, shared/lib/)  │
└─────────────────────────────────────────────┘
```

| Clean Architecture | FSD Layer | Responsibility |
|-------------------|-----------|---------------|
| **Domain** | `entities/` | Business entities, value objects, domain types, validation rules |
| **Application** | `features/` | Use case hooks, orchestration, business workflows |
| **Presentation** | `pages/`, `widgets/` | UI components, route composition, user interaction |
| **Infrastructure** | `shared/api/`, `shared/lib/` | API clients, storage, formatters, external services |

**Dependency rule**: Dependencies point INWARD only. Domain knows nothing about Infrastructure. Application knows Domain but not Presentation. Infrastructure implements Domain interfaces.

---

### Pattern 2.2: Dependency Inversion (CRITICAL)

Define interfaces (ports) in the domain layer. Implement them in infrastructure. Consume via dependency injection or hook composition.

```typescript
// src/entities/user/model/types.ts — DOMAIN (port/interface)
export interface UserRepository {
  findById(id: string): Promise<User>;
  findAll(params: PaginationParams): Promise<PaginatedResult<User>>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

export type UserRole = 'admin' | 'manager' | 'viewer';
```

```typescript
// src/shared/api/userApi.ts — INFRASTRUCTURE (adapter/implementation)
import type { UserRepository, User, CreateUserDTO } from '@/entities/user';
import { apiClient } from './apiClient';

export const userRepository: UserRepository = {
  async findById(id) {
    const { data } = await apiClient.get<UserDTO>(`/users/${id}`);
    return mapUserDTOtoDomain(data);
  },
  async findAll(params) {
    const { data } = await apiClient.get<PaginatedDTO<UserDTO>>('/users', { params });
    return {
      items: data.items.map(mapUserDTOtoDomain),
      total: data.total,
      page: data.page,
    };
  },
  async create(dto) {
    const { data } = await apiClient.post<UserDTO>('/users', dto);
    return mapUserDTOtoDomain(data);
  },
  async update(id, dto) {
    const { data } = await apiClient.put<UserDTO>(`/users/${id}`, dto);
    return mapUserDTOtoDomain(data);
  },
  async delete(id) {
    await apiClient.delete(`/users/${id}`);
  },
};
```

```typescript
// src/features/user-management/model/useUsers.ts — APPLICATION (use case)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userRepository } from '@/shared/api/userApi';
import type { CreateUserDTO, PaginationParams } from '@/entities/user';

// Use case: List users with pagination
export function useUsers(params: PaginationParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userRepository.findAll(params),
  });
}

// Use case: Create user
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserDTO) => userRepository.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
```

---

### Pattern 2.3: Use Case Pattern — Business Logic as Hooks (HIGH)

Each use case is a custom hook in `features/{name}/model/`. Hooks encapsulate business rules, not just data fetching.

```typescript
// src/features/checkout/model/useCheckout.ts — USE CASE with business rules
import { useCartStore } from '@/entities/cart';
import { useCreateOrder } from '@/entities/order';
import { useAuth } from '@/features/auth';
import { calculateDiscount, validateShipping } from '../lib/checkoutRules';

export function useCheckout() {
  const { items, total, clearCart } = useCartStore();
  const { user } = useAuth();
  const createOrder = useCreateOrder();

  const checkout = async (shippingAddress: ShippingAddress) => {
    // Business rule: validate shipping
    const shippingErrors = validateShipping(shippingAddress, items);
    if (shippingErrors.length > 0) {
      throw new CheckoutValidationError(shippingErrors);
    }

    // Business rule: apply discount
    const discount = calculateDiscount(items, user.tier);
    const finalTotal = total - discount;

    // Orchestrate: create order + clear cart
    const order = await createOrder.mutateAsync({
      items,
      total: finalTotal,
      discount,
      shippingAddress,
      userId: user.id,
    });

    clearCart();
    return order;
  };

  return {
    items,
    total,
    checkout,
    isProcessing: createOrder.isPending,
    error: createOrder.error,
  };
}
```

**Rules:**
- Use case hooks live in `features/{name}/model/`
- They orchestrate domain logic, not just call APIs
- Business rules (validation, calculation) in `features/{name}/lib/` — pure functions
- Use case hooks compose entity stores and shared API clients

---

### Pattern 2.4: Repository Pattern on Frontend (HIGH)

Abstract API calls behind repository interfaces. Enables testing, API versioning, and backend swaps.

```typescript
// src/entities/product/model/types.ts — Repository interface
export interface ProductRepository {
  search(query: string, filters: ProductFilters): Promise<PaginatedResult<Product>>;
  getById(id: string): Promise<Product>;
  getRelated(productId: string): Promise<Product[]>;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}
```

```typescript
// src/shared/api/productApi.ts — REST implementation
import type { ProductRepository } from '@/entities/product';
import { apiClient } from './apiClient';

export const productRepository: ProductRepository = {
  async search(query, filters) {
    const { data } = await apiClient.get('/products', {
      params: { q: query, ...filters },
    });
    return data;
  },
  async getById(id) {
    const { data } = await apiClient.get(`/products/${id}`);
    return mapProductDTO(data);
  },
  async getRelated(productId) {
    const { data } = await apiClient.get(`/products/${productId}/related`);
    return data.map(mapProductDTO);
  },
};
```

**Benefits:**
- Swap REST for GraphQL without changing use case hooks
- Mock repository for testing — no MSW needed for unit tests
- API versioning: create `productRepositoryV2` alongside `productRepository`

---

### Pattern 2.5: DTO Mapping — API Response to Domain Model (HIGH)

Transform API response shapes into domain model types. Keep API coupling in infrastructure layer only.

```typescript
// src/shared/api/mappers/userMapper.ts — INFRASTRUCTURE
import type { User } from '@/entities/user';

// API response shape (may differ from domain model)
interface UserDTO {
  user_id: string;
  email_address: string;
  first_name: string;
  last_name: string;
  user_role: string;
  created_at: string;  // ISO string from API
}

export function mapUserDTOtoDomain(dto: UserDTO): User {
  return {
    id: dto.user_id,
    email: dto.email_address,
    displayName: `${dto.first_name} ${dto.last_name}`,
    role: dto.user_role as UserRole,
    createdAt: new Date(dto.created_at),
  };
}

export function mapUserToCreateDTO(user: Partial<User>): Record<string, unknown> {
  return {
    email_address: user.email,
    first_name: user.displayName?.split(' ')[0],
    last_name: user.displayName?.split(' ').slice(1).join(' '),
    user_role: user.role,
  };
}
```

**Rules:**
- Mappers live in `shared/api/mappers/` — infrastructure layer
- Domain types (entities/) never know about API response shapes
- Map at the boundary: API response → domain model in repository implementation
- Map back: domain model → API request in mutation functions

---

### Pattern 2.6: Domain Events on Frontend (MEDIUM)

Typed event bus for cross-feature communication without direct imports.

```typescript
// src/shared/lib/domainEvents.ts — INFRASTRUCTURE (event bus)
type DomainEventMap = {
  'user:created': { userId: string; email: string };
  'user:updated': { userId: string; changes: string[] };
  'order:completed': { orderId: string; total: number; items: number };
  'notification:received': { id: string; type: string; message: string };
};

type DomainEventHandler<K extends keyof DomainEventMap> = (
  payload: DomainEventMap[K]
) => void;

class DomainEventBus {
  private handlers = new Map<string, Set<Function>>();

  emit<K extends keyof DomainEventMap>(event: K, payload: DomainEventMap[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach((handler) => handler(payload));
    }
  }

  on<K extends keyof DomainEventMap>(event: K, handler: DomainEventHandler<K>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }
}

export const domainEvents = new DomainEventBus();
```

```typescript
// src/features/order/model/useCreateOrder.ts — APPLICATION (emitter)
import { domainEvents } from '@/shared/lib/domainEvents';

export function useCreateOrder() {
  return useMutation({
    mutationFn: (data: CreateOrderDTO) => orderRepository.create(data),
    onSuccess: (order) => {
      domainEvents.emit('order:completed', {
        orderId: order.id,
        total: order.total,
        items: order.items.length,
      });
    },
  });
}

// src/features/analytics/model/useAnalyticsListener.ts — APPLICATION (listener)
import { domainEvents } from '@/shared/lib/domainEvents';

export function useAnalyticsListener() {
  useEffect(() => {
    const unsub = domainEvents.on('order:completed', (payload) => {
      trackEvent('purchase', { value: payload.total, items: payload.items });
    });
    return unsub;
  }, []);
}
```

---

### Pattern 2.7: Error Boundary as Port (MEDIUM)

Abstract error handling at the architecture level. Domain defines error types, infrastructure handles reporting.

```typescript
// src/entities/errors/model/types.ts — DOMAIN (error types)
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(
    public readonly fields: Record<string, string[]>,
  ) {
    super('Validation failed', 'VALIDATION_ERROR', { fields });
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', { entity, id });
  }
}

// Error reporter interface (port)
export interface ErrorReporter {
  captureException(error: Error, context?: Record<string, unknown>): void;
  setUser(user: { id: string; email: string }): void;
}
```

```typescript
// src/shared/lib/errorReporter.ts — INFRASTRUCTURE (adapter)
import * as Sentry from '@sentry/react';
import type { ErrorReporter } from '@/entities/errors';

export const errorReporter: ErrorReporter = {
  captureException(error, context) {
    Sentry.captureException(error, { extra: context });
  },
  setUser(user) {
    Sentry.setUser(user);
  },
};
```

---

### Pattern 2.8: Testing Clean Architecture (MEDIUM)

Mock infrastructure, test domain logic in isolation.

```typescript
// src/entities/user/model/__tests__/userValidation.test.ts — DOMAIN test (pure)
import { validateUserEmail, validateUserRole } from '../validation';

describe('User domain validation', () => {
  it('rejects invalid email', () => {
    expect(validateUserEmail('not-an-email')).toEqual({
      valid: false,
      error: 'Invalid email format',
    });
  });

  it('accepts valid roles', () => {
    expect(validateUserRole('admin')).toEqual({ valid: true });
    expect(validateUserRole('unknown')).toEqual({ valid: false, error: 'Invalid role' });
  });
});
```

```typescript
// src/features/user-management/model/__tests__/useUsers.test.ts — APPLICATION test
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from '../useUsers';
import type { UserRepository } from '@/entities/user';

// Mock the repository — not the HTTP layer
const mockRepository: UserRepository = {
  findAll: vi.fn().mockResolvedValue({
    items: [{ id: '1', email: 'test@example.com', displayName: 'Test', role: 'admin', createdAt: new Date() }],
    total: 1,
    page: 1,
  }),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Inject mock repository
vi.mock('@/shared/api/userApi', () => ({
  userRepository: mockRepository,
}));

describe('useUsers', () => {
  it('fetches users with pagination', async () => {
    const { result } = renderHook(() => useUsers({ page: 1, limit: 10 }), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });
});
```

**Testing strategy by layer:**
| Layer | Test Type | Mocking |
|-------|-----------|---------|
| Domain (entities/) | Unit tests | No mocks — pure functions |
| Application (features/) | Integration tests | Mock repository interfaces |
| Presentation (pages/) | Component tests | Mock use case hooks |
| Infrastructure (shared/api/) | Integration tests | MSW for HTTP mocking |

---

### Pattern 2.9: FSD + Clean Architecture Alignment (MEDIUM)

Detailed mapping showing how FSD segments map to Clean Architecture concepts.

```
Clean Architecture          FSD Segment        Example
──────────────────          ───────────        ───────
Domain Entity               entities/*/model/   entities/user/model/types.ts
Domain Value Object          entities/*/model/   entities/money/model/Money.ts
Domain Service               entities/*/lib/     entities/order/lib/calculateTotal.ts
Application Use Case         features/*/model/   features/checkout/model/useCheckout.ts
Application DTO              features/*/api/     features/user-mgmt/api/userApi.types.ts
Infrastructure Repository   shared/api/         shared/api/userApi.ts
Infrastructure Service       shared/lib/         shared/lib/localStorage.ts
Presentation Component       pages/*/ui/         pages/dashboard/ui/DashboardPage.tsx
Presentation ViewModel       widgets/*/model/    widgets/user-table/model/useUserTable.ts
```

**Key insight**: In React FSD, the "Use Case" is always a custom hook. Unlike backend Clean Architecture where use cases are classes with an `execute()` method, frontend use cases are hooks that compose queries, mutations, and domain logic.

---

### Pattern 2.10: Anti-patterns (MEDIUM)

Common Clean Architecture violations on frontend.

**1. Business logic in components** — Validation, calculation, or orchestration inside `.tsx` files.
```typescript
// BAD: Business logic in component
function CheckoutPage() {
  const discount = items.reduce((acc, item) => {
    if (item.category === 'electronics' && item.quantity > 3) {
      return acc + item.price * 0.1;  // Business rule leaked into UI
    }
    return acc;
  }, 0);
}

// FIX: Extract to use case hook or domain service
function CheckoutPage() {
  const { discount } = useCheckout(); // Business rule encapsulated
}
```

**2. Direct API calls in UI** — Components calling axios/fetch directly.
```typescript
// BAD: API call in component
function UserList() {
  useEffect(() => {
    axios.get('/api/users').then(setUsers);  // Infrastructure in Presentation
  }, []);
}

// FIX: Use repository pattern via use case hook
function UserList() {
  const { data: users } = useUsers({ page: 1, limit: 10 });
}
```

**3. Anemic domain model** — Entities with only data, no behavior.
```typescript
// BAD: Entity is just a type alias
type User = { id: string; name: string; email: string };

// BETTER: Entity with domain logic
class User {
  constructor(private data: UserData) {}
  get displayName() { return `${this.data.firstName} ${this.data.lastName}`; }
  canManage(other: User) { return this.data.role === 'admin' || this.data.id === other.id; }
  isActive() { return this.data.status === 'active' && !this.data.deletedAt; }
}
```

**4. Infrastructure leaking into domain** — Domain types importing axios, Sentry, or other libraries.
```typescript
// BAD: Domain knows about infrastructure
import { AxiosError } from 'axios'; // Infrastructure dependency in domain
export function handleUserError(error: AxiosError) { ... }

// FIX: Use domain error types
import { DomainError } from '@/entities/errors';
export function handleUserError(error: DomainError) { ... }
```

---

## Abnormal Case Patterns

1. **Simple CRUD without complex domain** — Skip full Clean Architecture. Use TanStack Query directly in feature hooks. Repository pattern is overkill for simple GET/POST.

2. **Shared business rules across features** — Extract to `entities/` layer as domain services. Never duplicate business rules.

3. **Third-party integrations** — Place adapters in `shared/api/integrations/`. Define port interfaces in `entities/` or `shared/types/`.

4. **Migration from direct API calls** — Start by extracting repositories for the most complex entities first. Simple entities can stay with direct TanStack Query calls.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (2.1–2.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Clean Architecture Specialist | EPS v3.2 | Metadata v2.1*

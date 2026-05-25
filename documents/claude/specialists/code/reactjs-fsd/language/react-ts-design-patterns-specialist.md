# React TypeScript Design Patterns Specialist
# React TypeScriptデザインパターンスペシャリスト
# Chuyen Gia Design Patterns TypeScript React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — design patterns applicable across all layers) |
| **Directory Pattern** | `src/shared/lib/patterns/`, `src/shared/lib/{pattern}/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 11.1–11.10 |
| **Source Paths** | `src/shared/lib/**/*.ts`, `src/features/**/model/**/*.ts` |
| **File Count** | 5–12 pattern implementation files |
| **Naming Convention** | `{Pattern}.ts` (e.g., `EventBus.ts`, `QueryBuilder.ts`), `create{Thing}.ts` (factories) |
| **Imports From** | Shared (types, config) |
| **Cannot Import** | Features, Pages (patterns are reusable utilities, not feature-specific) |
| **Imported By** | Features (use factories, strategies), Shared (compose patterns), Entities (use adapters) |
| **Dependencies** | None (pure TypeScript patterns) |
| **When To Use** | Creating extensible service layer, event-driven communication, undo/redo, query building, strategy-based validation |
| **Source Skeleton** | `src/shared/lib/event-bus/EventBus.ts`, `src/shared/lib/factory/create{Entity}.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate classic design patterns adapted for TypeScript + React — Factory, Strategy, Observer, Adapter, Builder, Command |
| **Activation Trigger** | files: src/shared/lib/**; keywords: designPattern, factory, strategy, observer, eventBus, builder, adapter, command |

---

## Evidence Sources

- E1: Gang of Four design patterns adapted for TypeScript
- E2: React patterns library (compound, HOC, render props as pattern implementations)
- E3: Enterprise TypeScript service layer patterns
- E4: Event-driven frontend architecture patterns

---

## Role

You are a **TypeScript Design Patterns Specialist** for enterprise React FSD projects. Your responsibility is to adapt classic and modern design patterns for TypeScript + React. You help create extensible, testable service layers using Factory, Strategy, Observer, Builder, and Command patterns within the FSD architecture.

**Used by**: Service layer architects, complex feature implementations, cross-cutting concerns
**Not used by**: Simple CRUD features, trivial component rendering

---

## Patterns

### Pattern 11.1: Factory Pattern (CRITICAL)

Create instances through factory functions — components, hooks, services.

```typescript
// src/shared/lib/factory/createApiService.ts
interface ApiServiceConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ApiService<T> {
  getAll(params?: PaginationParams): Promise<PaginatedResponse<T>>;
  getById(id: string): Promise<T>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export function createApiService<T extends { id: string }>(
  resource: string,
  config: ApiServiceConfig,
): ApiService<T> {
  const client = axios.create({
    baseURL: `${config.baseUrl}/${resource}`,
    headers: config.headers,
    timeout: config.timeout ?? 30000,
  });

  return {
    getAll: (params) => client.get('', { params }).then((r) => r.data),
    getById: (id) => client.get(`/${id}`).then((r) => r.data),
    create: (data) => client.post('', data).then((r) => r.data),
    update: (id, data) => client.patch(`/${id}`, data).then((r) => r.data),
    delete: (id) => client.delete(`/${id}`),
  };
}

// Usage — create typed service per entity
const userService = createApiService<User>('users', { baseUrl: '/api' });
const orderService = createApiService<Order>('orders', { baseUrl: '/api' });

// Hook factory
export function createQueryHook<T extends { id: string }>(
  resource: string,
  service: ApiService<T>,
) {
  return function useResourceList(params?: PaginationParams) {
    return useQuery({
      queryKey: [resource, 'list', params],
      queryFn: () => service.getAll(params),
    });
  };
}

const useUsers = createQueryHook('users', userService);
const useOrders = createQueryHook('orders', orderService);
```

---

### Pattern 11.2: Strategy Pattern (HIGH)

Interchangeable algorithms selected at runtime.

```typescript
// src/shared/lib/validation/strategies.ts

// Strategy interface
interface ValidationStrategy<T> {
  validate(data: T): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

// Concrete strategies
const strictValidation: ValidationStrategy<CreateUserDTO> = {
  validate(data) {
    const errors: Record<string, string[]> = {};
    if (!data.email.endsWith('@company.com')) {
      errors.email = ['Must use company email'];
    }
    if (data.displayName.length < 3) {
      errors.displayName = ['Minimum 3 characters'];
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },
};

const relaxedValidation: ValidationStrategy<CreateUserDTO> = {
  validate(data) {
    const errors: Record<string, string[]> = {};
    if (!data.email.includes('@')) {
      errors.email = ['Invalid email'];
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },
};

// Context — selects strategy based on config/role
export function getValidationStrategy(
  userRole: UserRole,
): ValidationStrategy<CreateUserDTO> {
  switch (userRole) {
    case 'admin': return relaxedValidation;   // Admins: relaxed rules
    case 'manager':
    case 'viewer': return strictValidation;   // Others: strict rules
  }
}
```

```typescript
// Auth strategy pattern
interface AuthStrategy {
  login(credentials: unknown): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<string>;
}

const oauthStrategy: AuthStrategy = { /* OAuth2 PKCE implementation */ };
const samlStrategy: AuthStrategy = { /* SAML SSO implementation */ };
const basicStrategy: AuthStrategy = { /* Username/password implementation */ };

export function getAuthStrategy(method: string): AuthStrategy {
  const strategies: Record<string, AuthStrategy> = {
    oauth: oauthStrategy,
    saml: samlStrategy,
    basic: basicStrategy,
  };
  return strategies[method] ?? basicStrategy;
}
```

---

### Pattern 11.3: Observer Pattern — Event Bus (HIGH)

Typed publish/subscribe for cross-feature communication.

```typescript
// src/shared/lib/event-bus/EventBus.ts
type EventMap = {
  'user:created': { userId: string; email: string };
  'user:updated': { userId: string; changes: string[] };
  'user:deleted': { userId: string };
  'order:completed': { orderId: string; total: number };
  'notification:received': { id: string; type: string; message: string };
  'theme:changed': { mode: 'light' | 'dark' };
};

type EventHandler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

class TypedEventBus {
  private handlers = new Map<keyof EventMap, Set<Function>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<K>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }

  once<K extends keyof EventMap>(event: K, handler: EventHandler<K>): () => void {
    const unsubscribe = this.on(event, (payload) => {
      handler(payload);
      unsubscribe();
    });
    return unsubscribe;
  }
}

export const eventBus = new TypedEventBus();

// React hook for auto-cleanup
export function useEventBus<K extends keyof EventMap>(
  event: K,
  handler: EventHandler<K>,
) {
  useEffect(() => {
    return eventBus.on(event, handler);
  }, [event, handler]);
}
```

---

### Pattern 11.4: Decorator Pattern — Function Composition (MEDIUM-HIGH)

Enhance functions with cross-cutting concerns (logging, timing, caching).

```typescript
// src/shared/lib/decorators/withLogging.ts
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  label: string,
): T {
  return (async (...args: any[]) => {
    console.group(`[${label}]`);
    console.log('Args:', args);
    const start = performance.now();
    try {
      const result = await fn(...args);
      console.log('Result:', result);
      console.log(`Duration: ${(performance.now() - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }) as T;
}

// src/shared/lib/decorators/withCache.ts
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ttl: number = 60000,
): T {
  const cache = new Map<string, { data: any; timestamp: number }>();

  return (async (...args: any[]) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const result = await fn(...args);
    cache.set(key, { data: result, timestamp: Date.now() });
    return result;
  }) as T;
}

// Compose decorators
const getUser = withLogging(
  withCache(
    (id: string) => apiClient.get(`/users/${id}`).then((r) => r.data),
    30000,
  ),
  'getUser',
);
```

---

### Pattern 11.5: Builder Pattern (MEDIUM-HIGH)

Fluent API for constructing complex objects step by step.

```typescript
// src/shared/lib/builder/QueryBuilder.ts
interface QueryOptions {
  filters: Record<string, unknown>;
  sort: { field: string; order: 'asc' | 'desc' }[];
  pagination: { page: number; limit: number };
  includes: string[];
}

export class QueryBuilder {
  private options: QueryOptions = {
    filters: {},
    sort: [],
    pagination: { page: 1, limit: 20 },
    includes: [],
  };

  where(field: string, value: unknown): this {
    this.options.filters[field] = value;
    return this;
  }

  sortBy(field: string, order: 'asc' | 'desc' = 'asc'): this {
    this.options.sort.push({ field, order });
    return this;
  }

  page(page: number, limit: number = 20): this {
    this.options.pagination = { page, limit };
    return this;
  }

  include(...relations: string[]): this {
    this.options.includes.push(...relations);
    return this;
  }

  build(): QueryOptions {
    return { ...this.options };
  }

  toParams(): Record<string, string> {
    const params: Record<string, string> = {};
    Object.entries(this.options.filters).forEach(([k, v]) => {
      params[`filter[${k}]`] = String(v);
    });
    if (this.options.sort.length) {
      params.sort = this.options.sort.map((s) => `${s.order === 'desc' ? '-' : ''}${s.field}`).join(',');
    }
    params.page = String(this.options.pagination.page);
    params.limit = String(this.options.pagination.limit);
    if (this.options.includes.length) {
      params.include = this.options.includes.join(',');
    }
    return params;
  }
}

// Usage
const query = new QueryBuilder()
  .where('role', 'admin')
  .where('status', 'active')
  .sortBy('createdAt', 'desc')
  .page(1, 50)
  .include('orders', 'profile')
  .toParams();

// Result: { 'filter[role]': 'admin', 'filter[status]': 'active', sort: '-createdAt', page: '1', limit: '50', include: 'orders,profile' }
```

---

### Pattern 11.6: Adapter Pattern (MEDIUM)

Wrap third-party libraries with project-specific interfaces.

```typescript
// src/shared/lib/storage/StorageAdapter.ts
interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

// LocalStorage adapter
export const localStorageAdapter: StorageAdapter = {
  get<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  },
  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key: string): void {
    localStorage.removeItem(key);
  },
  clear(): void {
    localStorage.clear();
  },
};

// SessionStorage adapter
export const sessionStorageAdapter: StorageAdapter = {
  get<T>(key: string): T | null {
    const item = sessionStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  },
  set<T>(key: string, value: T): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  remove(key: string): void {
    sessionStorage.removeItem(key);
  },
  clear(): void {
    sessionStorage.clear();
  },
};

// In-memory adapter (for SSR/testing)
export function createMemoryStorageAdapter(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    get: <T>(key: string) => { const v = store.get(key); return v ? JSON.parse(v) as T : null; },
    set: <T>(key: string, value: T) => store.set(key, JSON.stringify(value)),
    remove: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}
```

---

### Pattern 11.7: Singleton Pattern (MEDIUM)

When appropriate — single instance for stateful services.

```typescript
// src/shared/lib/websocket/WebSocketManager.ts
class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private socket: WebSocket | null = null;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  connect(url: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    this.socket = new WebSocket(url);
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  send(data: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.socket.send(JSON.stringify(data));
  }

  // Reset for testing
  static resetInstance(): void {
    WebSocketManager.instance?.disconnect();
    WebSocketManager.instance = null;
  }
}

// When singletons are appropriate in React:
// - WebSocket connections (one per app)
// - Analytics SDK instances
// - Logger instances
// When NOT: State management (use Zustand/Context), API clients (use factory)
```

---

### Pattern 11.8: Command Pattern — Undo/Redo (MEDIUM)

Action queuing and undo/redo functionality.

```typescript
// src/shared/lib/command/CommandManager.ts
interface Command<TState> {
  execute(state: TState): TState;
  undo(state: TState): TState;
  description: string;
}

export class CommandManager<TState> {
  private history: Command<TState>[] = [];
  private position = -1;

  execute(command: Command<TState>, state: TState): TState {
    // Remove any future commands after current position
    this.history = this.history.slice(0, this.position + 1);
    this.history.push(command);
    this.position++;
    return command.execute(state);
  }

  undo(state: TState): TState | null {
    if (this.position < 0) return null;
    const command = this.history[this.position];
    this.position--;
    return command.undo(state);
  }

  redo(state: TState): TState | null {
    if (this.position >= this.history.length - 1) return null;
    this.position++;
    const command = this.history[this.position];
    return command.execute(state);
  }

  get canUndo(): boolean { return this.position >= 0; }
  get canRedo(): boolean { return this.position < this.history.length - 1; }
}

// Usage — text editor commands
const addTextCommand = (text: string): Command<EditorState> => ({
  execute: (state) => ({ ...state, content: state.content + text }),
  undo: (state) => ({ ...state, content: state.content.slice(0, -text.length) }),
  description: `Add "${text}"`,
});
```

---

### Pattern 11.9: State Pattern — Workflow Steps (MEDIUM)

State machines for multi-step workflows.

```typescript
// src/shared/lib/state-machine/StateMachine.ts
type StateConfig<TState extends string, TEvent extends string> = {
  [S in TState]: {
    on: Partial<Record<TEvent, TState>>;
    onEnter?: () => void;
    onExit?: () => void;
  };
};

export function createStateMachine<TState extends string, TEvent extends string>(
  config: StateConfig<TState, TEvent>,
  initialState: TState,
) {
  let currentState = initialState;

  return {
    get state() { return currentState; },

    send(event: TEvent): TState {
      const stateConfig = config[currentState];
      const nextState = stateConfig.on[event];

      if (!nextState) {
        console.warn(`No transition for event "${event}" in state "${currentState}"`);
        return currentState;
      }

      stateConfig.onExit?.();
      currentState = nextState;
      config[nextState].onEnter?.();

      return currentState;
    },

    can(event: TEvent): boolean {
      return event in (config[currentState].on ?? {});
    },
  };
}

// Usage — order workflow
const orderMachine = createStateMachine({
  draft: { on: { submit: 'pending' } },
  pending: { on: { approve: 'approved', reject: 'rejected' } },
  approved: { on: { ship: 'shipped' } },
  shipped: { on: { deliver: 'delivered' } },
  delivered: { on: {} },
  rejected: { on: { revise: 'draft' } },
}, 'draft');

orderMachine.send('submit');  // → 'pending'
orderMachine.send('approve'); // → 'approved'
orderMachine.can('ship');     // → true
```

---

### Pattern 11.10: Anti-patterns (MEDIUM)

**1. Overusing patterns** — Applying Strategy for 2 variants.
```typescript
// BAD: Strategy pattern for light/dark theme (just use a ternary)
// FIX: Use pattern when there are 3+ strategies or strategies are complex
```

**2. Premature abstraction** — Creating Factory before you have 2+ things to create.
```typescript
// BAD: createUserService() when you only have one implementation
// FIX: Start with direct implementation, extract factory when second use case appears
```

**3. Pattern for pattern's sake** — Using Observer when simple prop drilling works.
```typescript
// BAD: EventBus for parent → child communication
// FIX: Use props. EventBus for cross-feature (sibling/unrelated) communication only
```

**4. Mutable singletons without reset** — Singleton holds state that leaks between tests.
```typescript
// BAD: Singleton without resetInstance()
// FIX: Always add reset method for testing
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (11.1–11.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React TypeScript Design Patterns Specialist | EPS v3.2 | Metadata v2.1*

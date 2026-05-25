# NestJS Dependency Injection Specialist — Core
# NestJS依存性注入スペシャリスト — コア
# Chuyen Gia Tiem Phu Thuoc NestJS — Loi

**Version**: 2.0.0
**Technology**: NestJS 10+ Dependency Injection
**Aspect**: Dependency Injection
**Category**: core
**Purpose**: Knowledge provider for NestJS DI container — constructor injection, custom providers, injection tokens, provider scopes, interface segregation

---

## Metadata

```json
{
  "id": "nestjs-dependency-injection-specialist",
  "technology": "NestJS 10+ Dependency Injection",
  "aspect": "Dependency Injection",
  "category": "core",
  "subcategory": "nestjs",
  "lines": 580,
  "token_cost": 3400,
  "version": "2.0.0",
  "evidence": [
    "E1: DI patterns — constructor injection, provider registration, IoC container",
    "E3: DI/IoC — inversion of control, interface-based injection",
    "E5: p2plend DI — real-world NestJS dependency injection patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (DI cross-cutting — providers registered and injected in every layer) |
| **Variant** | ALL |
| **Pattern Numbers** | 202.1–202.8 |
| **Directory Pattern** | `src/{layer}/**/*.ts` (cross-cutting DI patterns) |
| **Naming Convention** | `{name}.provider.ts`, `{NAME}_TOKEN.ts`, `{name}.factory.ts` |
| **Imports From** | Domain (port interfaces for injection tokens), Application (use case interfaces) |
| **Imported By** | ALL (every layer receives injected dependencies) |
| **Cannot Import** | N/A (DI wiring is structural — but providers themselves must respect layer rules) |
| **Dependencies** | @nestjs/common, @nestjs/core |
| **When To Use** | Every NestJS project — core framework patterns |
| **Source Skeleton** | src/{layer}/{feature}/*.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS DI container — custom providers, injection scopes, circular dependency resolution |
| **Activation Trigger** | files: **/*.ts; keywords: injectable, inject, provider, useClass, useFactory, scope |

> **See also**: nestjs-module-architecture (201) for module-level organization

---

## Role

You are a **NestJS Dependency Injection Specialist**. Your responsibility is to provide DI best practices for NestJS microservice projects following clean architecture. You supply patterns for constructor injection, custom providers, injection tokens for port interfaces, provider scopes, and testing overrides.

**Used by**: Any code agent working with NestJS provider wiring and IoC
**Not used by**: Non-NestJS stacks, projects not using DI container

---

## Patterns

### Pattern 202.1: Constructor Injection

**Category**: DI Fundamentals
**Description**: Default DI pattern — inject via constructor params with types.

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}
}
```

```typescript
// Multiple injection sources — keep constructor lean (3-5 params max)
// If >5 params, consider extracting a facade or splitting the service
@Injectable()
export class LoanService {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepo: LoanRepositoryPort,
    @Inject(RISK_SERVICE) private readonly riskService: RiskServicePort,
    private readonly config: ConfigService,
  ) {}
}
```

**Key Points**:
- NestJS resolves by class type (concrete) or injection token (interface)
- Keep constructor params ≤5 — more signals too many responsibilities
- `private readonly` convention — prevents reassignment and exposes in class

---

### Pattern 202.2: Custom Providers

**Category**: DI Fundamentals
**Description**: useClass, useFactory, useValue for flexible provider registration.

```typescript
// useClass — swappable implementation (strategy pattern)
{ provide: PaymentGateway, useClass: StripeGateway }

// useFactory — async init or config-dependent
{
  provide: 'REDIS_CLIENT',
  useFactory: async (config: ConfigService) => {
    const client = new Redis({
      host: config.get('REDIS_HOST'),
      port: config.get('REDIS_PORT'),
    });
    await client.ping(); // verify connection
    return client;
  },
  inject: [ConfigService],
}

// useValue — static values, mocks, constants
{ provide: 'APP_VERSION', useValue: '2.1.0' }
```

**Key Points**:
- useClass: for swappable implementations (prod vs test, strategy pattern)
- useFactory: when initialization needs async or depends on other providers
- useValue: constants, config objects, test mocks
- Factory function can be async — NestJS awaits before provider is available

---

### Pattern 202.3: Injection Tokens (Clean Architecture Ports)

**Category**: DI Fundamentals
**Description**: Symbol tokens for interface-based injection — domain defines port, infra provides impl.

```typescript
// domain/ports/order-repository.port.ts
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export interface OrderRepositoryPort {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
}

// infrastructure/persistence/typeorm-order.repository.ts
@Injectable()
export class TypeOrmOrderRepository implements OrderRepositoryPort {
  constructor(@InjectRepository(OrderEntity) private repo: Repository<OrderEntity>) {}
  async findById(id: string) { return this.repo.findOne({ where: { id } }); }
  async save(order: Order) { return this.repo.save(order); }
  async findByStatus(status: OrderStatus) { return this.repo.find({ where: { status } }); }
}

// module registration
{ provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository }

// consumer injection
@Injectable()
export class OrderService {
  constructor(@Inject(ORDER_REPOSITORY) private repo: OrderRepositoryPort) {}
}
```

**Key Points**:
- Symbol tokens = unique, no collision risk (unlike string tokens)
- Domain defines the interface, infrastructure provides the implementation
- Consumer depends on abstraction (port), never on concrete class
- Export token from single file — never recreate Symbol()

---

### Pattern 202.4: Provider Scopes

**Category**: DI Fundamentals
**Description**: DEFAULT (singleton), REQUEST (per-request), TRANSIENT (per-injection).

```typescript
// REQUEST scope — per-request context (multi-tenant, user context)
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  constructor(@Inject(REQUEST) private request: Request) {}
  get tenantId(): string { return this.request.headers['x-tenant-id'] as string; }
  get userId(): string { return this.request.user?.id; }
}

// TRANSIENT scope — new instance per injection point (rare)
@Injectable({ scope: Scope.TRANSIENT })
export class RequestLogger {
  private context: string;
  setContext(ctx: string) { this.context = ctx; }
  log(message: string) { console.log(`[${this.context}] ${message}`); }
}
```

**Key Points**:
- DEFAULT (singleton): 99% of services — stateless, shared instance
- REQUEST: per-request state (tenant context, user identity, request tracing)
- TRANSIENT: unique instance per injection — use for stateful helpers
- Scope bubble-up: REQUEST-scoped provider forces all consumers to be REQUEST-scoped too

---

### Pattern 202.5: Interface Segregation

**Category**: Advanced DI
**Description**: Define narrow port interfaces in Domain, implement in Infrastructure.

```typescript
// Narrow interfaces — split by consumer needs
export interface ReadOrderPort {
  findById(id: string): Promise<Order | null>;
  findByUser(userId: string): Promise<Order[]>;
}
export interface WriteOrderPort {
  save(order: Order): Promise<Order>;
  delete(id: string): Promise<void>;
}

// Single implementation satisfies both
@Injectable()
export class TypeOrmOrderRepository implements ReadOrderPort, WriteOrderPort {
  // ... implements all methods
}

// Different tokens for different consumers
{ provide: READ_ORDER_PORT, useClass: TypeOrmOrderRepository }
{ provide: WRITE_ORDER_PORT, useClass: TypeOrmOrderRepository }
```

**Key Points**:
- Split interfaces by read/write or by consumer feature
- Enables different implementations (CQRS: read from cache, write to DB)
- Consumers declare minimal dependency surface

---

### Pattern 202.6: Multi-Provider and Composite Injection

**Category**: Advanced DI
**Description**: Inject multiple implementations of same interface.

```typescript
// Multiple notification channels
const NOTIFIER = Symbol('NOTIFIER');

@Module({
  providers: [
    { provide: NOTIFIER, useClass: EmailNotifier, multi: false },
    // NestJS doesn't support multi natively — use array pattern:
    {
      provide: 'NOTIFIERS',
      useFactory: (email: EmailNotifier, sms: SmsNotifier, push: PushNotifier) =>
        [email, sms, push],
      inject: [EmailNotifier, SmsNotifier, PushNotifier],
    },
  ],
})
export class NotificationModule {}

@Injectable()
export class NotificationService {
  constructor(@Inject('NOTIFIERS') private notifiers: Notifier[]) {}
  async notifyAll(user: User, msg: string) {
    await Promise.all(this.notifiers.map(n => n.send(user, msg)));
  }
}
```

**Key Points**:
- NestJS lacks native multi-provider — use factory + array pattern
- Useful for plugin systems, notification channels, validation chains
- Order matters if notifiers have priority

---

### Pattern 202.7: Optional Injection

**Category**: Advanced DI
**Description**: @Optional() for graceful degradation when provider may not exist.

```typescript
@Injectable()
export class MetricsService {
  constructor(
    @Optional() @Inject('PROMETHEUS') private prometheus?: PrometheusClient,
    @Optional() @Inject('DATADOG') private datadog?: DatadogClient,
  ) {}

  recordMetric(name: string, value: number) {
    this.prometheus?.gauge(name, value);
    this.datadog?.metric(name, value);
  }
}
```

**Key Points**:
- @Optional() resolves to undefined if provider not registered
- Always null-check before use — TypeScript `?.` operator
- Use for optional integrations (metrics, tracing, feature flags)

---

### Pattern 202.8: Testing DI Overrides

**Category**: Advanced DI
**Description**: Override providers in TestingModule for unit testing.

```typescript
describe('OrderService', () => {
  let service: OrderService;
  let mockRepo: jest.Mocked<OrderRepositoryPort>;

  beforeEach(async () => {
    mockRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      findByStatus: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: ORDER_REPOSITORY, useValue: mockRepo },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('should create order', async () => {
    mockRepo.save.mockResolvedValue(mockOrder);
    const result = await service.create(createOrderDto);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
  });
});
```

**Key Points**:
- Use jest.Mocked<T> for type-safe mock creation
- Override at provider level, not module level — more precise
- Symbol tokens make test setup explicit — no hidden dependencies

---

### Pattern 202.9: Lazy Resolution with ModuleRef

**Category**: Advanced DI
**Description**: Resolve providers at runtime — bypass scope constraints, handle circular deps.

```typescript
@Injectable()
export class OrderSaga {
  constructor(private moduleRef: ModuleRef) {}

  async onOrderCreated(event: OrderCreatedEvent) {
    // Lazy-resolve REQUEST-scoped provider from DEFAULT-scoped service
    const tenantCtx = await this.moduleRef.resolve(TenantContext, event.contextId);

    // Lazy-resolve to break circular dependency
    const paymentService = this.moduleRef.get(PaymentService, { strict: false });
    await paymentService.createInvoice(event.orderId, tenantCtx.tenantId);
  }
}
```

```typescript
// Dynamic provider creation — instantiate at runtime
@Injectable()
export class PluginLoader {
  constructor(private moduleRef: ModuleRef) {}

  async loadPlugin(name: string): Promise<PluginInterface> {
    const PluginClass = this.registry.get(name);
    if (!PluginClass) throw new NotFoundException(`Plugin ${name} not found`);
    return this.moduleRef.create(PluginClass);
  }
}
```

**Key Points**:
- `moduleRef.get()` = singleton lookup (throws if not found), `strict: false` searches parent modules
- `moduleRef.resolve()` = respects scopes, returns new instance for TRANSIENT
- `moduleRef.create()` = instantiate class with DI but don't register as provider
- Use for: breaking circular deps, runtime plugins, scope-crossing

---

### Pattern 202.10: Provider Factories for Complex Initialization

**Category**: Advanced DI
**Description**: Factory providers with async setup, cleanup, and health checks.

```typescript
// Database connection factory with health check and graceful shutdown
{
  provide: DataSource,
  useFactory: async (config: ConfigService, logger: LoggerService) => {
    const ds = new DataSource({
      type: 'postgres',
      host: config.getOrThrow('DB_HOST'),
      port: config.get('DB_PORT', 5432),
      database: config.getOrThrow('DB_NAME'),
      entities: [__dirname + '/**/*.entity.{ts,js}'],
      synchronize: false,
    });

    try {
      await ds.initialize();
      logger.log('Database connected', 'DataSourceFactory');
    } catch (error) {
      logger.error('Database connection failed', error.stack, 'DataSourceFactory');
      throw error; // fail fast — don't start app without DB
    }

    return ds;
  },
  inject: [ConfigService, LoggerService],
}

// Cleanup on app shutdown
@Injectable()
export class DataSourceCleanup implements OnApplicationShutdown {
  constructor(private dataSource: DataSource) {}
  async onApplicationShutdown() {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}
```

**Key Points**:
- Validate required config with `getOrThrow()` — fail fast on startup
- Log connection success/failure for observability
- Always pair factory with OnApplicationShutdown for resource cleanup
- Never silently catch connection errors — throw to prevent app from starting in broken state

---

## Best Practices

### Token Management
- One `tokens/` directory per domain — export all tokens from barrel
- Use Symbol() not string — prevents accidental collision
- Name convention: `UPPER_SNAKE_CASE` for token constants

### Scope Management
- Default to singleton (DEFAULT) — only use REQUEST when truly needed
- REQUEST scope propagates up the injection chain — plan carefully
- Never use TRANSIENT unless instance isolation is required

### Clean Architecture DI
- Domain layer: defines port interfaces + token constants
- Infrastructure layer: implements ports, registered in module
- Application layer: receives ports via constructor injection
- Presentation layer: receives application services

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Service Locator | `moduleRef.get()` everywhere instead of constructor injection | Use constructor injection; reserve ModuleRef for edge cases |
| God Service | 10+ constructor params | Split into focused services or extract facade |
| String Tokens | `@Inject('ORDER_REPO')` — collision risk | Use Symbol() tokens exclusively |
| Concrete Injection | Inject TypeOrmOrderRepo directly | Inject via port interface + token |
| Scope Abuse | REQUEST scope for stateless services | Default singleton unless per-request state needed |
| Factory Without Cleanup | Async factory creates connection, no shutdown hook | Pair with OnApplicationShutdown |

---

## Testing Patterns

```typescript
// 1. Quick mock factory for repository ports
function createMockRepo<T>(): jest.Mocked<T> {
  return {
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  } as any;
}

const mockLoanRepo = createMockRepo<LoanRepositoryPort>();
{ provide: LOAN_REPOSITORY, useValue: mockLoanRepo }
```

```typescript
// 2. Test scope behavior — verify REQUEST scope creates new instances
it('should create new instance per resolve call', async () => {
  const ctx1 = await moduleRef.resolve(TenantContext);
  const ctx2 = await moduleRef.resolve(TenantContext);
  expect(ctx1).not.toBe(ctx2); // TRANSIENT = new instance each time
});
```

```typescript
// 3. Test factory provider initialization
it('should fail fast on missing config', async () => {
  await expect(
    Test.createTestingModule({
      providers: [
        { provide: ConfigService, useValue: { get: () => undefined, getOrThrow: () => { throw new Error(); } } },
        dataSourceProvider, // the factory provider
      ],
    }).compile(),
  ).rejects.toThrow();
});
```

---

## Abnormal Case Patterns

1. **Circular dependency between providers** — ServiceA injects ServiceB and vice versa. Fix: extract shared logic into third service, or `forwardRef(() => ServiceB)` as last resort.

2. **Scope bubble-up** — REQUEST-scoped provider injected into DEFAULT-scoped. Fix: make consumer REQUEST-scoped too, or use `ModuleRef.resolve()` for lazy resolution.

3. **Token mismatch** — Symbol in registration differs from Symbol in @Inject(). Fix: export token from single file, import consistently.

4. **Missing provider in module** — @Injectable() not listed in providers[]. Fix: add to module providers or import the providing module.

5. **useFactory returns undefined** — Async factory doesn't await or config key missing. Fix: validate config values, throw explicit error on missing.

6. **Overriding provider in wrong module** — Test overrides provider in parent module but child creates its own. Fix: override in the module that actually registers the provider.

7. **ModuleRef.get() returns wrong instance** — Multiple providers with same class registered in different modules. Fix: use `strict: true` (default) to search only current module, or use unique tokens.

8. **Memory leak with TRANSIENT providers** — New instance created per injection, never garbage collected while module lives. Fix: limit TRANSIENT to lightweight helpers; for heavy resources, use singleton with reset method.

---

## DI Debugging Reference

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Nest can't resolve dependencies of X (?, Y)` | Missing provider for param at index `?` | Register provider or add @Inject() with correct token |
| `A circular dependency has been detected` | Two providers inject each other | Extract shared service, use forwardRef(), or ModuleRef |
| `Scope "REQUEST" is not available in this context` | REQUEST-scoped in non-HTTP context (cron, queue) | Use ModuleRef.resolve() with explicit context ID |
| `Cannot read property of undefined` | @Optional() provider not registered | Add null-check (?.operator) before accessing |
| `Provider X is not part of any module` | @Injectable() missing from module providers[] | Add to providers array in the correct module |

### Debug Utilities

```typescript
// Log all registered providers in a module
const app = await NestFactory.create(AppModule);
const providers = app.get(ModuleRef)['container']
  .getModules()
  .forEach((mod) => {
    console.log(`Module: ${mod.metatype.name}`);
    mod.providers.forEach((p, token) => console.log(`  - ${String(token)}`));
  });
```

```typescript
// Verify provider resolution at startup
@Injectable()
export class DiHealthCheck implements OnModuleInit {
  constructor(
    @Inject(ORDER_REPOSITORY) private orderRepo: OrderRepositoryPort,
    @Inject(PAYMENT_PORT) private paymentPort: PaymentPort,
  ) {}

  onModuleInit() {
    const deps = [this.orderRepo, this.paymentPort];
    deps.forEach((dep, i) => {
      if (!dep) throw new Error(`Critical dependency at index ${i} is undefined`);
    });
  }
}
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E3, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (202.1-202.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Dependency Injection Specialist — Core | EPS v3.2*

# NestJS Module Architecture Specialist — Core
# NestJSモジュールアーキテクチャスペシャリスト — コア
# Chuyen Gia Kien Truc Module NestJS — Loi

**Version**: 2.0.0
**Technology**: NestJS 10+ Modules
**Aspect**: Module Architecture
**Category**: core
**Purpose**: Knowledge provider for NestJS module system — feature modules, dynamic modules, lazy loading, dependency wiring

---

## Metadata

```json
{
  "id": "nestjs-module-architecture-specialist",
  "technology": "NestJS 10+ Modules",
  "aspect": "Module Architecture",
  "category": "core",
  "subcategory": "nestjs",
  "lines": 600,
  "token_cost": 3500,
  "version": "2.0.0",
  "evidence": [
    "E1: 6 architecture rules — module boundaries, single responsibility, encapsulation",
    "E2: Modular organization — feature-based module decomposition",
    "E5: p2plend modules — real-world NestJS module patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (structural — module system organizes every layer) |
| **Variant** | ALL |
| **Pattern Numbers** | 201.1–201.8 |
| **Directory Pattern** | `src/{layer}/{feature}.module.ts` |
| **Naming Convention** | `{feature}.module.ts`, `app.module.ts` |
| **Imports From** | ALL (structural — modules import/export across layers) |
| **Imported By** | ALL (every layer is organized into modules) |
| **Cannot Import** | N/A (structural concern — modules wire dependencies, not business logic) |
| **Dependencies** | @nestjs/common, @nestjs/core |
| **When To Use** | Every NestJS project — core framework patterns |
| **Source Skeleton** | src/{layer}/{feature}/*.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS module system — feature modules, dynamic modules, lazy loading, dependency wiring |
| **Activation Trigger** | files: **/*.module.ts; keywords: module, provider, import, export, global, dynamic |

> **See also**: nestjs-dependency-injection (202) for provider mechanics within modules

---

## Role

You are a **NestJS Module Architecture Specialist**. Your responsibility is to provide module system best practices for NestJS microservice projects following clean architecture. You supply patterns for feature module design, dynamic module configuration, lazy loading, circular dependency prevention, and Nx library modules.

**Used by**: Any code agent working with NestJS module organization
**Not used by**: Non-NestJS stacks (Express raw, Fastify standalone)

---

## Patterns

### Pattern 201.1: Feature Module

**Category**: Module Fundamentals
**Description**: 1 module = 1 bounded context, co-locate controller+service+entity.

```typescript
// src/infrastructure/order/order.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, OrderMapper],
  exports: [OrderService], // only expose service, not internals
})
export class OrderModule {}
```

```typescript
// Clean architecture: domain module has NO framework imports
// src/domain/order/order-domain.module.ts
@Module({
  providers: [
    { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },
    OrderDomainService,
  ],
  exports: [ORDER_REPOSITORY, OrderDomainService],
})
export class OrderDomainModule {}
```

**Key Points**:
- Export only what consumers need — internal providers stay private
- In clean-arch: separate domain module (pure) from infrastructure module (TypeORM)
- Co-locate related providers — controller, service, repository in same module

---

### Pattern 201.2: Module Imports/Exports

**Category**: Module Fundamentals
**Description**: Explicit exports enforce encapsulation — internal providers stay private.

```typescript
@Module({
  imports: [UserModule],        // imports UserModule's exports
  providers: [AuthService, TokenService, SessionStore], // 3 internal
  exports: [AuthService],       // only 1 visible to importers
})
export class AuthModule {}
```

```typescript
// Re-export pattern: SharedModule exposes multiple sub-modules
@Module({
  imports: [LoggerModule, ConfigModule, CacheModule],
  exports: [LoggerModule, ConfigModule, CacheModule], // re-export all
})
export class SharedModule {}
```

**Key Points**:
- Avoid re-exporting everything — creates hidden coupling
- Use re-export pattern ONLY for infrastructure bundles (SharedModule)
- Track exports: if >5 exports, module may have too many responsibilities

---

### Pattern 201.3: Circular Dependency Prevention

**Category**: Module Fundamentals
**Description**: Prefer event-based decoupling over forwardRef().

```typescript
// AVOID: forwardRef creates tight coupling
@Module({ imports: [forwardRef(() => OrderModule)] })
export class PaymentModule {}

// PREFER: extract shared interface module
@Module({
  providers: [{ provide: PAYMENT_PORT, useClass: PaymentAdapter }],
  exports: [PAYMENT_PORT],
})
export class PaymentInterfaceModule {} // both Order and Payment import this

// PREFER: event-based decoupling
@Injectable()
export class PaymentService {
  constructor(private eventEmitter: EventEmitter2) {}
  async process(payment: Payment) {
    await this.save(payment);
    this.eventEmitter.emit('payment.completed', { paymentId: payment.id });
  }
}
```

**Key Points**:
- forwardRef() is a code smell — signals architectural boundary violation
- 3 solutions: (1) extract shared interface module, (2) event-based, (3) merge modules
- In clean-arch: domain modules should NEVER have circular deps

---

### Pattern 201.4: Dynamic Modules

**Category**: Module Fundamentals
**Description**: ConfigModule.forRoot/forRootAsync for configurable modules.

```typescript
@Module({})
export class CacheModule {
  static forRoot(options: CacheOptions): DynamicModule {
    return {
      module: CacheModule,
      providers: [
        { provide: CACHE_OPTIONS, useValue: options },
        CacheService,
      ],
      exports: [CacheService],
    };
  }

  static forRootAsync(options: CacheAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: options.imports || [],
      providers: [
        {
          provide: CACHE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        CacheService,
      ],
      exports: [CacheService],
    };
  }
}

// Usage
CacheModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    host: config.get('REDIS_HOST'),
    ttl: config.get('CACHE_TTL'),
  }),
  inject: [ConfigService],
})
```

**Key Points**:
- forRoot() for sync, forRootAsync() for config-dependent setup
- Always validate options — throw on missing required fields
- Convention: forRoot = singleton (global), forFeature = scoped (per-module)

---

### Pattern 201.5: Global Modules

**Category**: Advanced Module Patterns
**Description**: @Global() for cross-cutting (logger, config) — limit to 2-3 max.

```typescript
@Global()
@Module({
  providers: [
    LoggerService,
    { provide: APP_CONFIG, useFactory: () => loadConfig() },
  ],
  exports: [LoggerService, APP_CONFIG],
})
export class CoreModule {}
```

**Key Points**:
- Max 2-3 global modules (CoreModule, ConfigModule, LoggerModule)
- Overuse breaks encapsulation — dependency tracking becomes impossible
- Never make domain modules global

---

### Pattern 201.6: Lazy Loading

**Category**: Advanced Module Patterns
**Description**: LazyModuleLoader for heavy modules loaded on-demand.

```typescript
@Injectable()
export class ReportTrigger {
  constructor(private lazyLoader: LazyModuleLoader) {}

  async generate(reportType: string) {
    const { ReportModule } = await import('./report.module');
    const moduleRef = await this.lazyLoader.load(() => ReportModule);
    const service = moduleRef.get(ReportService);
    return service.build(reportType);
  }
}
```

**Key Points**:
- Reduces startup time for rarely-used features (reports, admin, analytics)
- Lazy modules cannot inject providers from eager modules unless @Global()
- Use for modules >50KB or with heavy initialization (PDF, Excel, ML)

---

### Pattern 201.7: Module Testing

**Category**: Advanced Module Patterns
**Description**: Test module in isolation with overridden providers.

```typescript
describe('OrderModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [OrderModule],
    })
      .overrideProvider(OrderRepository)
      .useValue(createMockRepository())
      .overrideProvider(EventEmitter2)
      .useValue({ emit: jest.fn() })
      .compile();
  });

  it('should resolve OrderService', () => {
    const service = module.get<OrderService>(OrderService);
    expect(service).toBeDefined();
  });

  it('should use mock repository', () => {
    const repo = module.get<OrderRepository>(OrderRepository);
    expect(repo.find).toBeDefined(); // mock method
  });
});
```

**Key Points**:
- Override only external dependencies (DB, cache, messaging)
- Test module wiring — verify all providers resolve correctly
- Integration test: import real module, override only I/O providers

---

### Pattern 201.8: Nx Library Modules

**Category**: Advanced Module Patterns
**Description**: Shared lib as NestJS module pattern in Nx monorepo.

```typescript
// libs/shared/auth/src/lib/shared-auth.module.ts
@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
  providers: [JwtStrategy, AuthGuard, TokenService],
  exports: [AuthGuard, TokenService],
})
export class SharedAuthModule {}

// apps/lending-service/src/app.module.ts
@Module({
  imports: [SharedAuthModule, SharedDatabaseModule],
})
export class AppModule {}
```

**Key Points**:
- Nx libs = reusable NestJS modules across microservices
- Enforce dependency constraints via `nx.json` tags
- Barrel export: `libs/shared/auth/src/index.ts` exports module + types only

---

### Pattern 201.9: Module Composition & Aggregation

**Category**: Advanced Module Patterns
**Description**: Compose complex feature modules from smaller, focused sub-modules.

```typescript
// Feature aggregate module — composes sub-modules
@Module({
  imports: [
    LoanApplicationModule,    // application layer
    LoanDomainModule,         // domain logic
    LoanInfrastructureModule, // TypeORM repos, external APIs
    LoanPresentationModule,   // controllers, gateways
  ],
  exports: [LoanDomainModule], // only expose domain to other features
})
export class LoanFeatureModule {}

// AppModule imports only feature aggregate modules
@Module({
  imports: [
    CoreModule,           // global: logger, config
    LoanFeatureModule,    // feature aggregate
    PaymentFeatureModule,
    NotificationFeatureModule,
  ],
})
export class AppModule {}
```

**Key Points**:
- Feature aggregate = single import point for entire bounded context
- Internal sub-modules stay private — only domain or application layer is exported
- AppModule reads like a table of contents — one import per business capability

---

### Pattern 201.10: Module Configuration Validation

**Category**: Advanced Module Patterns
**Description**: Validate module options at startup — fail fast on misconfiguration.

```typescript
@Module({})
export class MessagingModule {
  static forRoot(options: MessagingOptions): DynamicModule {
    // Fail fast — don't wait for first message to discover misconfiguration
    if (!options.brokerUrl) {
      throw new Error('MessagingModule: brokerUrl is required');
    }
    if (!options.queues?.length) {
      throw new Error('MessagingModule: at least one queue must be defined');
    }

    return {
      module: MessagingModule,
      global: true,
      providers: [
        { provide: MESSAGING_OPTIONS, useValue: Object.freeze(options) },
        MessagingService,
        ...options.queues.map(q => ({
          provide: `QUEUE_${q.name}`,
          useFactory: (svc: MessagingService) => svc.createQueue(q),
          inject: [MessagingService],
        })),
      ],
      exports: [MessagingService],
    };
  }
}
```

**Key Points**:
- Validate in forRoot/forRootAsync — throw descriptive errors on missing fields
- Object.freeze options to prevent mutation after initialization
- Dynamic providers (queues, exchanges) generated from validated config

---

## Best Practices

### Organization
- 1 feature = 1 module — never merge unrelated features
- Group modules by clean-architecture layer, then by domain
- Keep AppModule thin — only import top-level feature/aggregate modules
- Naming: `{Feature}Module` for features, `{Infrastructure}Module` for technical concerns

### Encapsulation
- Default: providers are private. Export explicitly what's needed
- Never export entities or repositories — expose service interfaces only
- Use injection tokens (symbols) for cross-module contracts
- Module boundary = API contract — changing exports is a breaking change

### Scalability
- Extract shared infrastructure into Nx libs early (auth, database, messaging)
- Lazy-load admin/reporting modules to reduce cold-start
- Monitor module count: >30 modules/service = consider service split
- Use module composition (201.9) for complex features with multiple layers

### Performance
- Prefer `@Global()` sparingly — each global module adds to every module's scope resolution
- Lazy modules reduce startup by ~50-200ms per heavy module
- Avoid deep module nesting (>3 levels) — flattens better for NestJS container

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| God Module | AppModule with 50+ providers | Extract into feature modules |
| Export Everything | `exports: [...providers]` copies full array | Export only service interfaces |
| forwardRef Everywhere | Masks circular dependencies | Extract shared interface module |
| Global Everything | `@Global()` on 10+ modules | Reserve for 2-3 infra modules max |
| Import Chains | A→B→C→D just to reach one provider | Direct import of the needed module |
| Barrel Module | Re-export 20 sub-modules | Import specific modules directly |

---

## Testing Patterns

```typescript
// 1. Minimal module test — verify DI wiring
const module = await Test.createTestingModule({
  imports: [LendingModule],
})
  .overrideProvider(getRepositoryToken(Loan))
  .useValue(mockRepo)
  .compile();

expect(module.get(LoanService)).toBeDefined();
expect(module.get(LoanController)).toBeDefined();
```

```typescript
// 2. Integration test — real module, mock external I/O
const module = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(DataSource)
  .useValue(createTestDataSource())
  .compile();

const app = module.createNestApplication();
await app.init();
```

```typescript
// 3. Test dynamic module with custom options
const module = await Test.createTestingModule({
  imports: [
    CacheModule.forRoot({ host: 'localhost', port: 6379, ttl: 300 }),
  ],
}).compile();

const cacheService = module.get(CacheService);
expect(cacheService).toBeDefined();
await expect(cacheService.get('key')).resolves.toBeNull();
```

```typescript
// 4. Test module isolation — verify no provider leakage
const module = await Test.createTestingModule({
  imports: [OrderModule],
}).compile();

// OrderRepository should NOT be accessible outside the module
expect(() => module.get(OrderRepository)).toThrow();
// Only exported OrderService is accessible
expect(module.get(OrderService)).toBeDefined();
```

---

## Abnormal Case Patterns

1. **Circular dependency error** — Two modules import each other directly. Fix: extract shared interface module or use EventEmitter2.

2. **Provider not found in module scope** — Provider in ModuleA injected in ModuleB without import. Fix: ModuleA exports provider AND ModuleB imports ModuleA.

3. **Global module leaking internals** — @Global() exports too many providers. Fix: limit exports to cross-cutting services only.

4. **Dynamic module options lost** — forRootAsync useFactory returns undefined. Fix: validate options, provide defaults, throw on missing required fields.

5. **Lazy module can't inject eager provider** — Lazy-loaded module tries to inject non-global provider. Fix: make the dependency @Global() or pass it as dynamic module option.

6. **Module import order matters for guards** — APP_GUARD registration depends on module import order. Fix: register APP_GUARD in AppModule directly, not in feature modules.

7. **Nx lib module breaks at runtime** — Barrel export doesn't include module class. Fix: ensure `index.ts` exports the module class, not just types.

8. **forRootAsync deadlock** — useFactory depends on a provider from the same module being configured. Fix: move the dependency to a separate, already-initialized module.

9. **Test module bleeds state** — Singleton providers retain state between test files. Fix: call `module.close()` in afterAll, or use `Test.createTestingModule` per describe block.

10. **Module re-import doubles providers** — Same module imported by multiple parents creates duplicate instances. Fix: NestJS deduplicates by default — but custom providers with `useFactory` may not. Use module-level singleton pattern.

---

## Common Module Structures Reference

### Microservice App Module
```
AppModule
├── CoreModule (@Global: config, logger, health)
├── DatabaseModule (TypeORM connection)
├── AuthModule (guards, strategies)
├── LoanFeatureModule (aggregate)
│   ├── LoanApplicationModule (use cases)
│   ├── LoanDomainModule (entities, services)
│   └── LoanInfrastructureModule (repos, APIs)
├── PaymentFeatureModule
├── NotificationModule
└── GrpcModule (transport layer)
```

### BFF App Module
```
AppModule
├── CoreModule (@Global: config, logger)
├── AuthModule (token validation only)
├── LoanBffModule (orchestration → lending-service)
├── PaymentBffModule (orchestration → payment-service)
└── GatewayModule (API composition, response shaping)
```

### Worker App Module
```
AppModule
├── CoreModule (@Global: config, logger)
├── DatabaseModule
├── QueueModule (Bull/BullMQ consumers)
│   ├── EmailQueueModule
│   ├── NotificationQueueModule
│   └── ReportQueueModule
└── SchedulerModule (@nestjs/schedule cron jobs)
```

### Module Size Guidelines
| Module Size | Providers | Action |
|------------|-----------|--------|
| Small | 1–5 | Single module, co-located |
| Medium | 6–15 | Single module, may need sub-grouping |
| Large | 16–30 | Split into sub-modules, compose with aggregate |
| Too Large | >30 | Mandatory split — likely multiple bounded contexts |

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (201.1-201.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Module Architecture Specialist — Core | EPS v3.2*

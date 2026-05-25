# NestJS Decorators & Lifecycle Specialist — Core
# NestJSデコレータ＆ライフサイクルスペシャリスト — コア
# Chuyen Gia Decorator va Vong Doi NestJS — Loi

**Version**: 1.0.0
**Technology**: NestJS 10+ Decorators & Lifecycle
**Aspect**: Custom Decorators, Metadata Reflection, Lifecycle Hooks
**Category**: core
**Purpose**: Knowledge provider for NestJS custom decorators, metadata reflection, and application lifecycle hooks

---

## Metadata

```json
{
  "id": "nestjs-decorators-lifecycle-specialist",
  "technology": "NestJS 10+ Decorators & Lifecycle",
  "aspect": "Custom Decorators & Lifecycle Hooks",
  "category": "core",
  "subcategory": "nestjs",
  "lines": 480,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: NestJS custom decorators — createParamDecorator, SetMetadata, applyDecorators",
    "E1: NestJS lifecycle — OnModuleInit, OnApplicationBootstrap, OnModuleDestroy",
    "E5: p2plend lifecycle — graceful shutdown, resource initialization patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — decorators and lifecycle apply to every layer) |
| **Variant** | ALL |
| **Pattern Numbers** | 274.1–274.8 |
| **Directory Pattern** | `src/{layer}/decorators/`, `src/shared/decorators/` |
| **Naming Convention** | `{name}.decorator.ts`, `{module}.lifecycle.ts` |
| **Imports From** | ALL (decorators extract context from any layer) |
| **Imported By** | ALL (decorators used across controllers, services, guards) |
| **Cannot Import** | N/A (cross-cutting utility) |
| **Dependencies** | @nestjs/common, @nestjs/core |
| **When To Use** | Every NestJS project — core framework patterns |
| **Source Skeleton** | src/{layer}/{feature}/*.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS custom decorators and lifecycle hooks — param decorators, metadata, module lifecycle |
| **Activation Trigger** | files: **/decorators/**; keywords: createParamDecorator, setMetadata, onModuleInit, onModuleDestroy |

---

## Role

You are a **NestJS Decorators & Lifecycle Specialist**. You supply patterns for creating custom decorators (parameter, method, class), metadata reflection, and application lifecycle hooks (initialization, bootstrap, shutdown).

**Used by**: Any code agent building custom NestJS decorators or managing app lifecycle
**Not used by**: Non-NestJS stacks

---

## Patterns

### Pattern 274.1: Custom Parameter Decorators

**Category**: Decorators
**Description**: createParamDecorator for extracting request context.

```typescript
// decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// Usage in controller
@Get('profile')
getProfile(@CurrentUser() user: User) { return user; }

@Get('name')
getName(@CurrentUser('name') name: string) { return { name }; }
```

```typescript
// decorators/tenant-id.decorator.ts
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    if (!tenantId) throw new BadRequestException('Missing X-Tenant-Id header');
    return tenantId as string;
  },
);
```

**Key Points**:
- createParamDecorator receives ExecutionContext — access HTTP, gRPC, WS contexts
- `data` parameter allows decorator arguments: @CurrentUser('email')
- Throw exceptions inside decorator for validation — NestJS catches them

---

### Pattern 250.2: Custom Method Decorators

**Category**: Decorators
**Description**: Compose decorators using applyDecorators and SetMetadata.

```typescript
// decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// decorators/roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// decorators/api-endpoint.decorator.ts — composite
export function ApiEndpoint(summary: string, ...roles: string[]) {
  return applyDecorators(
    Roles(...roles),
    ApiOperation({ summary }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
  );
}

// Usage
@Post('approve')
@ApiEndpoint('Approve loan application', 'admin', 'underwriter')
approve(@Body() dto: ApproveLoanDto) { ... }
```

**Key Points**:
- SetMetadata stores data on route handler — retrieved by guards/interceptors via Reflector
- applyDecorators combines multiple decorators into one — reduces decorator stack
- Convention: export metadata key constant alongside decorator

---

### Pattern 250.3: Metadata Reflection with Reflector

**Category**: Decorators
**Description**: Read custom metadata in guards and interceptors.

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // no roles required

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

```typescript
// Check if route is public (skip auth)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

**Key Points**:
- Reflector.getAllAndOverride: checks handler first, then class (handler wins)
- Reflector.getAllAndMerge: merges metadata from handler + class (array concat)
- Always handle missing metadata (return true/false depending on default policy)

---

### Pattern 250.4: Class Decorators

**Category**: Decorators
**Description**: Custom class-level decorators for module-wide behavior.

```typescript
// Aggregate root decorator — marks entity as aggregate
export const AGGREGATE_ROOT_KEY = 'isAggregateRoot';
export const AggregateRoot = () => SetMetadata(AGGREGATE_ROOT_KEY, true);

@AggregateRoot()
export class Loan {
  // domain entity
}

// Cacheable controller decorator
export function CacheableController(prefix: string, ttl: number) {
  return applyDecorators(
    Controller(prefix),
    UseInterceptors(new CacheInterceptor(ttl)),
  );
}

@CacheableController('loans', 60)
export class LoanController { ... }
```

---

### Pattern 250.5: OnModuleInit — Module Initialization

**Category**: Lifecycle Hooks
**Description**: Run initialization logic when module is ready.

```typescript
@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    await this.runMigrations();
    await this.seedInitialData();
    this.logger.log('Database initialized');
  }
}

@Injectable()
export class GrpcClientService implements OnModuleInit {
  private client: ClientGrpc;

  onModuleInit() {
    this.userService = this.client.getService<UserServiceClient>('UserService');
    this.logger.log('gRPC client connected');
  }
}
```

**Key Points**:
- Called once per module after all providers are instantiated
- Can be async — NestJS awaits before continuing
- Use for: DB connections, gRPC client init, cache warm-up
- Order: follows module import order (deepest dependency first)

---

### Pattern 250.6: OnApplicationBootstrap — App Ready

**Category**: Lifecycle Hooks
**Description**: Run after all modules initialized, before listening.

```typescript
@Injectable()
export class AppBootstrapService implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    this.logger.log('All modules initialized — app ready to receive requests');
    this.metricsService.recordStartup(Date.now() - this.startTime);
    this.healthService.markReady();
  }
}
```

**Key Points**:
- Fires after ALL OnModuleInit hooks complete
- Use for: health check readiness, metrics, post-init validation
- Difference from OnModuleInit: app-wide vs module-scoped

---

### Pattern 250.7: OnModuleDestroy / OnApplicationShutdown

**Category**: Lifecycle Hooks
**Description**: Cleanup resources on shutdown.

```typescript
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.dataSource.destroy();
    this.logger.log('Database connections closed');
  }
}

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Shutting down on signal: ${signal}`);
    await this.drainInFlightRequests();
    await this.closeMessageConsumers();
    await this.flushMetrics();
  }
}

// Enable shutdown hooks in main.ts
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks(); // REQUIRED — listens for SIGTERM, SIGINT
```

**Key Points**:
- enableShutdownHooks() MUST be called — not enabled by default
- OnModuleDestroy: per-module cleanup (DB connections, gRPC channels)
- OnApplicationShutdown: app-wide (drain requests, flush logs, close consumers)
- signal parameter: 'SIGTERM' (K8s), 'SIGINT' (Ctrl+C)

---

### Pattern 274.8: BeforeApplicationShutdown

**Category**: Lifecycle Hooks
**Description**: Last chance to drain connections before destroy.

```typescript
@Injectable()
export class RequestDrainService implements BeforeApplicationShutdown {
  async beforeApplicationShutdown(signal?: string) {
    this.logger.log('Draining in-flight requests...');
    await this.httpServer.close(); // stop accepting new requests
    await new Promise(resolve => setTimeout(resolve, 5000)); // grace period
    this.logger.log('All requests drained');
  }
}
```

**Key Points**:
- Fires BEFORE OnApplicationShutdown — use for request draining
- K8s sends SIGTERM → 30s grace period → SIGKILL
- Lifecycle order: BeforeApplicationShutdown → OnModuleDestroy → OnApplicationShutdown

---

## Best Practices

### Decorators
- One decorator per file — `decorators/{name}.decorator.ts`
- Export metadata key constant alongside decorator function
- Use applyDecorators to compose complex decorator stacks
- Test decorators with mock ExecutionContext

### Lifecycle
- Enable shutdown hooks in main.ts — required for graceful shutdown
- Keep OnModuleInit fast (<2s) — slow init blocks app startup
- OnApplicationShutdown: close resources in reverse dependency order
- Log lifecycle events for debugging startup/shutdown issues

---

## Testing Patterns

```typescript
// Test custom parameter decorator
describe('CurrentUser', () => {
  it('should extract user from request', () => {
    const mockUser = { id: '1', name: 'Test' };
    const ctx = createMockExecutionContext({ user: mockUser });
    const factory = CurrentUser[Symbol.for('ROUTE_ARGS_METADATA')]; // internal
    // Easier: test via controller integration test
  });
});

// Test lifecycle hooks
describe('DatabaseService', () => {
  it('should run migrations on init', async () => {
    const service = new DatabaseService(mockDataSource, mockLogger);
    await service.onModuleInit();
    expect(mockDataSource.runMigrations).toHaveBeenCalled();
  });
});
```

---

## Abnormal Case Patterns

1. **Decorator metadata not found** — SetMetadata key typo. Fix: export key as constant, import consistently.

2. **Shutdown hooks not firing** — enableShutdownHooks() not called. Fix: add to main.ts before app.listen().

3. **OnModuleInit timeout** — Slow DB migration blocks startup. Fix: set timeout, run heavy migrations in CI, not at startup.

4. **Memory leak from event listeners** — OnModuleInit registers listeners, OnModuleDestroy doesn't clean up. Fix: always removeListener in destroy.

5. **Parameter decorator returns undefined** — Request property not set (missing auth middleware). Fix: check request.user exists, throw if required.

6. **Lifecycle order confusion** — OnModuleInit of ModuleB runs before ModuleA. Fix: import order in AppModule determines init order.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (274.1-274.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Decorators & Lifecycle Specialist — Core | EPS v3.2*

# NestJS AOP Interceptors Specialist — Cross-Cutting
# NestJS AOPインターセプタースペシャリスト — 横断的関心事
# Chuyen Gia AOP Interceptor NestJS — Cat Ngang

**Version**: 1.0.0
**Technology**: NestJS 10+ AOP (Aspect-Oriented Patterns)
**Aspect**: AOP & Cross-Cutting Interceptors
**Category**: cross-cutting
**Purpose**: Knowledge provider for NestJS AOP patterns — ExecutionContext, CallHandler, metadata reflection, decorator composition, cross-cutting concern separation via interceptors and decorators

---

## Metadata

```json
{
  "id": "nestjs-aop-interceptors-specialist",
  "technology": "NestJS 10+ AOP Patterns",
  "aspect": "AOP & Cross-Cutting Interceptors",
  "category": "cross-cutting",
  "subcategory": "nestjs",
  "lines": 400,
  "token_cost": 2400,
  "version": "1.0.0",
  "evidence": [
    "E1: NestJS official docs — Interceptors, ExecutionContext, Reflector",
    "E2: Spring AOP concepts adapted — @Before/@After/@Around patterns in NestJS",
    "E3: Decorator composition — applyDecorators() for clean cross-cutting"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 240.1–240.8 |
| **Directory Pattern** | `src/presentation/interceptors/` |
| **Naming Convention** | `{concern}.interceptor.ts`, `{concern}.decorator.ts` |
| **Imports From** | Application (metadata, tokens), Infrastructure (cache, metrics) |
| **Imported By** | Presentation (controllers decorated), Application (services with metadata) |
| **Cannot Import** | Domain (AOP is infrastructure concern) |
| **Dependencies** | @nestjs/common (Reflector, SetMetadata) |
| **When To Use** | Aspect-oriented cross-cutting — audit, metrics, idempotency via decorators |
| **Source Skeleton** | src/shared/decorators/{concern}.decorator.ts, src/presentation/interceptors/{concern}.interceptor.ts |
| **Specialist Type** | code |
| **Purpose** | AOP with interceptors — cross-cutting concerns, logging, caching, transformation |
| **Activation Trigger** | files: **/*.interceptor.ts; keywords: nestInterceptor, callHandler, tap, map, catchError |

> **See also**: nestjs-middleware-interceptors (207) for basic interceptor patterns

---

## Role

You are a **NestJS AOP Interceptors Specialist**. You supply patterns for aspect-oriented programming in NestJS — using interceptors as around-advice, Reflector for metadata-driven behavior, decorator composition for clean cross-cutting, and ExecutionContext for transport-agnostic logic.

**Used by**: Any code agent implementing cross-cutting concerns (audit, logging, caching, metrics)
**Not used by**: Non-NestJS stacks, simple CRUD without cross-cutting needs

---

## Patterns

### Pattern 240.1: ExecutionContext Deep Dive

**Category**: AOP Fundamentals
**Description**: ExecutionContext provides transport-agnostic access to handler metadata.

```typescript
@Injectable()
export class UnifiedLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = context.getType(); // 'http' | 'rpc' | 'ws'
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    if (type === 'http') {
      const req = context.switchToHttp().getRequest();
      this.logger.log(`HTTP ${req.method} ${req.url} → ${className}.${methodName}`);
    } else if (type === 'rpc') {
      const data = context.switchToRpc().getData();
      this.logger.log(`RPC → ${className}.${methodName}`);
    }

    const start = Date.now();
    return next.handle().pipe(
      tap(() => this.logger.log(`${className}.${methodName} — ${Date.now() - start}ms`)),
    );
  }
}
```

**Key Points**:
- `context.getType()` determines transport — write ONE interceptor for all protocols
- `context.getClass()` and `context.getHandler()` for reflection metadata
- Always check type before calling `switchToHttp()` / `switchToRpc()` / `switchToWs()`

---

### Pattern 240.2: Reflector & Metadata-Driven Behavior

**Category**: AOP Fundamentals
**Description**: SetMetadata + Reflector for declarative behavior control.

```typescript
// Define metadata key + decorator
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const CACHE_TTL_KEY = 'cache-ttl';
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_KEY, ttl);

// Read metadata in interceptor/guard
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private cache: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ttl = this.reflector.getAllAndOverride<number>(CACHE_TTL_KEY, [
      context.getHandler(),  // method-level metadata (highest priority)
      context.getClass(),    // class-level metadata (fallback)
    ]);
    if (!ttl) return next.handle(); // no cache metadata → skip

    const key = this.buildCacheKey(context);
    return from(this.cache.get(key)).pipe(
      switchMap(cached => cached
        ? of(cached)
        : next.handle().pipe(tap(data => this.cache.set(key, data, ttl))),
      ),
    );
  }
}
```

**Key Points**:
- `getAllAndOverride()` checks handler first, then class — method overrides class
- `getAllAndMerge()` combines handler + class metadata — useful for roles
- Metadata is the NestJS equivalent of Java annotations for AOP

---

### Pattern 240.3: Decorator Composition

**Category**: AOP Fundamentals
**Description**: applyDecorators() combines multiple decorators into one clean decorator.

```typescript
// Combine auth + roles + swagger into single decorator
export function AdminOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('admin'),
    ApiBearerAuth(),
    ApiResponse({ status: 403, description: 'Admin access required' }),
  );
}

// Combine cache + timing
export function Cached(ttl: number = 60) {
  return applyDecorators(
    CacheTTL(ttl),
    UseInterceptors(CacheInterceptor),
  );
}

// Usage — clean controller
@AdminOnly()
@Get('admin/users')
listAdminUsers() { return this.listUsersUseCase.execute(); }

@Cached(300)
@Get('products')
listProducts() { return this.listProductsUseCase.execute(); }
```

**Key Points**:
- Reduces decorator noise on handlers — 1 decorator instead of 4
- Enforces consistent patterns — all admin routes get same guards + docs
- Type-safe — decorators are composable functions

---

### Pattern 240.4: Audit Trail Interceptor

**Category**: Enterprise AOP
**Description**: Automatic audit logging for write operations via metadata.

```typescript
export const AUDITABLE = 'auditable';
export const Auditable = (action: string) => SetMetadata(AUDITABLE, action);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(AUDITABLE, context.getHandler());
    if (!action) return next.handle();

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    const before = { method: req.method, path: req.url, body: req.body };

    return next.handle().pipe(
      tap(result => {
        this.auditService.log({ action, userId, before, after: result, timestamp: new Date() });
      }),
    );
  }
}

// Usage
@Post()
@Auditable('CREATE_ORDER')
create(@Body() dto: CreateOrderDto) { /* ... */ }

@Delete(':id')
@Auditable('DELETE_ORDER')
remove(@Param('id') id: string) { /* ... */ }
```

---

### Pattern 240.5: Performance Metrics Interceptor

**Category**: Enterprise AOP
**Description**: Collect endpoint response time metrics for monitoring.

```typescript
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const duration = Number(process.hrtime.bigint() - start) / 1e6; // ms
        this.metrics.recordHistogram('http_request_duration_ms', duration, {
          controller: className,
          method: methodName,
        });
      }),
      catchError(err => {
        this.metrics.increment('http_request_errors_total', {
          controller: className,
          method: methodName,
          error: err.constructor.name,
        });
        return throwError(() => err);
      }),
    );
  }
}
```

---

### Pattern 240.6: Idempotency Interceptor

**Category**: Enterprise AOP
**Description**: Prevent duplicate processing via idempotency key header.

```typescript
export const IDEMPOTENT = 'idempotent';
export const Idempotent = () => SetMetadata(IDEMPOTENT, true);

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private cache: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isIdempotent = this.reflector.get<boolean>(IDEMPOTENT, context.getHandler());
    if (!isIdempotent) return next.handle();

    const req = context.switchToHttp().getRequest();
    const key = req.headers['idempotency-key'];
    if (!key) throw new BadRequestException('Idempotency-Key header required');

    return from(this.cache.get(`idempotency:${key}`)).pipe(
      switchMap(cached => {
        if (cached) return of(cached); // return cached result
        return next.handle().pipe(
          tap(result => this.cache.set(`idempotency:${key}`, result, 86400)),
        );
      }),
    );
  }
}
```

---

## Best Practices

### Design
- One interceptor per concern — audit, caching, metrics, logging are separate
- Use metadata (SetMetadata) for opt-in behavior — not everything needs audit
- Decorator composition reduces noise — 1 decorator beats 5

### Performance
- `process.hrtime.bigint()` for nanosecond precision — not `Date.now()`
- Cache interceptors should have bypass mechanism for mutations
- Avoid heavy computation in interceptors — they run on EVERY request

### Testing
- Test interceptors in isolation with mock ExecutionContext and CallHandler
- Verify metadata-driven skip behavior — ensure interceptor is no-op without metadata

---

## Testing Patterns

```typescript
// Test audit interceptor
describe('AuditInterceptor', () => {
  it('should log audit entry for decorated handler', async () => {
    const mockAudit = { log: jest.fn() };
    const interceptor = new AuditInterceptor(new Reflector(), mockAudit as any);
    const ctx = createMockExecutionContext({ user: { id: '123' } });
    Reflect.defineMetadata(AUDITABLE, 'CREATE_ORDER', ctx.getHandler());
    const handler = { handle: () => of({ id: 'order-1' }) };

    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE_ORDER' }));
  });

  it('should skip non-auditable handlers', async () => {
    const mockAudit = { log: jest.fn() };
    const interceptor = new AuditInterceptor(new Reflector(), mockAudit as any);
    const ctx = createMockExecutionContext();
    const handler = { handle: () => of({ id: 'order-1' }) };

    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockAudit.log).not.toHaveBeenCalled();
  });
});
```

---

## Abnormal Case Patterns

1. **Interceptor breaks RPC** — `switchToHttp()` called on gRPC context. Fix: check `context.getType()` first.

2. **Metadata not found** — Reflector returns undefined for missing SetMetadata. Fix: always null-check metadata before acting.

3. **Observable not subscribed** — Returning `next.handle()` without piping in conditional branch. Fix: always return `next.handle()` in the skip case.

4. **Audit interceptor slows write path** — Synchronous audit DB write in tap(). Fix: emit to async queue, process asynchronously.

5. **Cache key collision** — Same cache key for different users. Fix: include userId/tenantId in cache key.

6. **Decorator order affects behavior** — @UseGuards before @UseInterceptors matters. Fix: document expected order in decorator composition.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (240.1-240.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS AOP Interceptors Specialist — Cross-Cutting | EPS v3.2*

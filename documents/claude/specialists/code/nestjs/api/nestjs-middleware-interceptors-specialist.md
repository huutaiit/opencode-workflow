# NestJS Middleware Interceptors Specialist — API
# NestJSミドルウェアインターセプタースペシャリスト — API
# Chuyen Gia Middleware va Interceptor NestJS — API

**Version**: 1.0.0
**Technology**: NestJS 10+ Middleware, Interceptors
**Aspect**: Middleware & Interceptors
**Category**: api
**Purpose**: Knowledge provider for NestJS middleware and interceptor patterns — request processing, response transformation, logging, caching, timeout handling, execution order

---

## Metadata

```json
{
  "id": "nestjs-middleware-interceptors-specialist",
  "technology": "NestJS 10+ Middleware + Interceptors",
  "aspect": "Middleware & Interceptors",
  "category": "api",
  "subcategory": "nestjs",
  "lines": 250,
  "token_cost": 1500,
  "version": "1.0.0",
  "evidence": [
    "E1: NestJS official docs — Middleware, Interceptors, Execution context",
    "E2: Clean architecture cross-cutting concerns — logging, caching, timing at Presentation layer",
    "E3: RxJS operator patterns — tap, map, timeout, catchError for interceptor composition"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 207.1–207.8 |
| **Directory Pattern** | `src/presentation/interceptors/`, `src/presentation/middleware/` |
| **Naming Convention** | `{name}.middleware.ts`, `{Name}.interceptor.ts`, `logging.interceptor.ts` |
| **Imports From** | Application (context/metadata), Infrastructure (cache for cache interceptor) |
| **Imported By** | Presentation (applied to controllers via decorators or module config) |
| **Cannot Import** | Domain directly (middleware is transport concern, not business logic) |
| **Dependencies** | @nestjs/common, rxjs |
| **When To Use** | Cross-cutting HTTP concerns — logging, caching, timing, compression |
| **Source Skeleton** | src/presentation/middleware/{name}.middleware.ts, src/presentation/interceptors/{name}.interceptor.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS middleware and interceptors — request/response transformation, logging, caching |
| **Activation Trigger** | files: **/*.interceptor.ts, **/*.middleware.ts; keywords: nestInterceptor, nestMiddleware, use |

---

## Role

You are a **NestJS Middleware & Interceptors Specialist**. Your responsibility is to provide middleware and interceptor patterns for NestJS microservice projects following clean architecture. You supply patterns for NestMiddleware implementation, NestInterceptor with RxJS operators, execution order understanding, logging, response transformation, timeout handling, caching, and middleware application configuration. Middleware and interceptors are Presentation-layer concerns — they handle transport/cross-cutting logic, not business rules.

**Used by**: Any code agent building cross-cutting HTTP concerns in NestJS
**Not used by**: Non-NestJS stacks, agents working on domain or pure application logic

---

## Patterns

### Pattern 207.1–207.4: Core Middleware & Interceptor Patterns (HIGH)

```
207.1 NestMiddleware: Implements NestMiddleware interface with use(req, res, next).
      Executes before route handler. Used for logging, CORS, body parsing, auth token extraction.
```

```typescript
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

```
207.2 Interceptor basics: @Injectable() implements NestInterceptor, intercept(context, next).
      next.handle() returns Observable — use RxJS operators for pre/post processing.
```

```typescript
@Injectable()
export class WrapResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({ success: true, data, timestamp: new Date().toISOString() })),
    );
  }
}
```

```
207.3 Execution order: Middleware -> Guards -> Interceptors (before) -> Pipes -> Handler
      -> Interceptors (after) -> Exception Filters. Understanding order is critical for debugging.
```

```typescript
// Execution flow for a request:
// 1. CorrelationIdMiddleware.use()     — middleware
// 2. JwtAuthGuard.canActivate()        — guard
// 3. LoggingInterceptor (before)       — interceptor pre
// 4. ValidationPipe.transform()        — pipe
// 5. Controller.handler()              — handler
// 6. LoggingInterceptor (after)        — interceptor post
// 7. HttpExceptionFilter.catch()       — filter (only on error)
```

```
207.4 Logging interceptor: Log request method/URL and response time using tap() operator.
      Non-intrusive — does not modify request or response data.
```

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => this.logger.log(`${method} ${url} — ${Date.now() - start}ms`)),
    );
  }
}
```

### Pattern 207.5–207.8: Advanced Patterns (MEDIUM-HIGH)

```
207.5 Transform interceptor: map() operator wraps response in standard envelope format.
      Ensures consistent API response structure across all endpoints.
```

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        statusCode: context.switchToHttp().getResponse().statusCode,
      })),
    );
  }
}
```

```
207.6 Timeout interceptor: timeout() operator with catchError for TimeoutError.
      Prevents long-running handlers from holding connections indefinitely.
```

```typescript
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError(err => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException('Request timed out after 5000ms');
        }
        throw err;
      }),
    );
  }
}
```

```
207.7 Cache interceptor: Check cache before handler, store result after.
      Use @CacheKey() and @CacheTTL() decorators with built-in CacheInterceptor or custom.
```

```typescript
@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductController {
  @Get()
  @CacheTTL(30)
  findAll(): Promise<Product[]> {
    return this.findProductsUseCase.execute();
  }

  @Get(':id')
  @CacheKey('product')
  @CacheTTL(60)
  findOne(@Param('id') id: string): Promise<Product> {
    return this.findProductUseCase.execute(id);
  }
}
```

```
207.8 Apply middleware: configure(consumer) in module's configure() method.
      Use forRoutes(), exclude(), apply() to target specific routes or controllers.
```

```typescript
@Module({ controllers: [UserController, OrderController] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, LoggerMiddleware)
      .forRoutes('*');
    consumer
      .apply(AuthTokenMiddleware)
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes(UserController, OrderController);
  }
}
```

### Pattern 207.9–207.12: Enterprise Middleware & Interceptor Patterns

```
207.9 Rate limiting middleware: Use @nestjs/throttler or custom middleware for API rate limiting.
      Apply per-route or globally to prevent abuse.
```

```typescript
// Using @nestjs/throttler (recommended)
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

// Custom rate limiter middleware (for fine-grained control)
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const key = `ratelimit:${req.ip}:${req.path}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);
    if (count > 100) throw new HttpException('Too Many Requests', 429);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, 100 - count));
    next();
  }
}
```

```
207.10 Request/Response compression: Enable gzip compression for large API responses.
       Critical for BFF services returning aggregated data.
```

```typescript
// main.ts — using compression middleware
import * as compression from 'compression';
app.use(compression({ threshold: 1024, level: 6 }));

// Or per-route with custom interceptor for conditional compression
@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!req.headers['accept-encoding']?.includes('gzip')) {
      return next.handle();
    }
    return next.handle(); // compression middleware handles encoding
  }
}
```

```
207.11 Security headers middleware: Set security headers (HSTS, X-Frame-Options, CSP).
       Use helmet middleware for standard security headers.
```

```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false, // needed for Swagger UI
}));

// Custom middleware for service-specific headers
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Request-ID', req['correlationId'] || randomUUID());
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.removeHeader('X-Powered-By');
    next();
  }
}
```

```
207.12 Exclude interceptor: Custom decorator to skip specific interceptors on certain routes.
       Useful when global interceptor should not apply to health checks, metrics, etc.
```

```typescript
export const NO_TRANSFORM = 'no-transform';
export const NoTransform = () => SetMetadata(NO_TRANSFORM, true);

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.get<boolean>(NO_TRANSFORM, context.getHandler());
    if (skip) return next.handle();
    return next.handle().pipe(
      map(data => ({ success: true, data })),
    );
  }
}

// Usage
@Get('health')
@NoTransform()
healthCheck() { return { status: 'ok' }; }
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Business Logic in Middleware | Auth validation with DB lookup in middleware | Use Guards for auth, middleware for headers only |
| No Error Handling in Middleware | `next()` called even when middleware fails | Always try/catch, call `next(err)` or throw |
| Unbounded Interceptor | Global interceptor without exclude option | Add metadata-based skip mechanism |
| tap() with Side Effects that Throw | Error in tap() kills the stream | Wrap side effects in try/catch inside tap() |
| Multiple Response Wrappers | 2+ transform interceptors wrapping response | Single global transform interceptor |
| Middleware State | Storing request state on middleware class | Middleware is singleton — use req object for per-request state |

---

## Best Practices

### Execution Order
- Request flow: Middleware → Guards → Interceptors (before) → Pipes → Handler → Interceptors (after) → Filters
- Middleware: raw request (Express/Fastify level) — logging, CORS, body parsing, headers
- Interceptors: NestJS level — transformation, caching, timing, error mapping

### Design Rules
- Middleware for transport-level concerns (headers, correlation IDs, rate limiting, compression)
- Interceptors for business cross-cutting (caching, timing, response transformation)
- Never put business logic in middleware or interceptors
- Use `tap()` for side effects, `map()` for data transformation, `catchError()` for error mapping

### Registration
- Global middleware: `app.use()` in main.ts (Express-level, no DI)
- Module middleware: `consumer.apply().forRoutes()` in configure() (supports DI)
- Global interceptors: `APP_INTERCEPTOR` provider (supports DI) or `app.useGlobalInterceptors()`

---

## Testing Patterns

```typescript
// 1. Test interceptor timeout
describe('TimeoutInterceptor', () => {
  it('should throw RequestTimeoutException after 5s', async () => {
    const interceptor = new TimeoutInterceptor(5000);
    const mockHandler = { handle: () => of(null).pipe(delay(6000)) };
    const ctx = createMockExecutionContext();
    await expect(
      lastValueFrom(interceptor.intercept(ctx, mockHandler)),
    ).rejects.toThrow(RequestTimeoutException);
  });
});
```

```typescript
// 2. Test transform interceptor wraps response
describe('TransformInterceptor', () => {
  it('should wrap response in standard envelope', async () => {
    const interceptor = new TransformInterceptor(new Reflector());
    const mockHandler = { handle: () => of({ id: 1, name: 'test' }) };
    const ctx = createMockExecutionContext();
    const result = await lastValueFrom(interceptor.intercept(ctx, mockHandler));
    expect(result).toEqual({ success: true, data: { id: 1, name: 'test' } });
  });
});
```

```typescript
// 3. Test middleware sets correlation ID
describe('CorrelationIdMiddleware', () => {
  it('should set correlation ID header', () => {
    const middleware = new CorrelationIdMiddleware();
    const req = { headers: {} } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();
    middleware.use(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', expect.any(String));
    expect(next).toHaveBeenCalled();
  });
});
```

```typescript
// 4. E2E test — verify response envelope
it('should wrap response in standard format', () => {
  return request(app.getHttpServer())
    .get('/orders')
    .expect(200)
    .expect(res => {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
});
```

---

## Abnormal Case Patterns

1. **Interceptor swallows errors** — map() instead of tap() for logging. Fix: tap() for side effects, let errors propagate.

2. **Middleware not applied** — Module doesn't implement NestModule. Fix: add `implements NestModule` + configure().

3. **Timeout kills streaming** — TimeoutInterceptor on SSE/download. Fix: exclude via custom @NoTimeout() decorator.

4. **Cache stale after mutation** — GET cached, POST doesn't invalidate. Fix: manual eviction in mutation handlers.

5. **Interceptor order wrong** — Multiple @UseInterceptors applied, wrong execution order. Fix: order matches decorator array order (left to right = outer to inner).

6. **Middleware blocks async** — Middleware with async operation doesn't call next(). Fix: always await async work then call next().

7. **Rate limiter counts preflight** — OPTIONS requests counted against rate limit. Fix: exclude OPTIONS in rate limit middleware.

8. **Compression double-encodes** — gzip middleware + CDN compression = corrupt response. Fix: check upstream headers, skip if already compressed.

9. **Global interceptor on microservice** — HTTP interceptor applied to gRPC transport. Fix: check `host.getType()` before `switchToHttp()`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (207.1-207.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Middleware Interceptors Specialist — API | EPS v3.2*

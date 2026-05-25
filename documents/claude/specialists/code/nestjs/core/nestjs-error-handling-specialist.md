# NestJS Error Handling Specialist — Core
# NestJSエラーハンドリングスペシャリスト — コア
# Chuyen Gia Xu Ly Loi NestJS — Loi

**Version**: 2.0.0
**Technology**: NestJS 10+ Error Handling
**Aspect**: Error Handling
**Category**: core
**Purpose**: Knowledge provider for NestJS error handling — domain exceptions, exception filters, error response DTOs, RPC exceptions

---

## Metadata

```json
{
  "id": "nestjs-error-handling-specialist",
  "technology": "NestJS 10+ Error Handling",
  "aspect": "Error Handling",
  "category": "core",
  "subcategory": "nestjs",
  "lines": 560,
  "token_cost": 3300,
  "version": "2.0.0",
  "evidence": [
    "E1: Error handling — exception hierarchies, global filters, consistent responses",
    "E3: Exception filters — @Catch decorator, ExceptionFilter interface",
    "E5: p2plend error handling — real-world NestJS exception patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Application, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 203.1–203.8 |
| **Directory Pattern** | `src/presentation/filters/`, `src/domain/exceptions/` |
| **Naming Convention** | `{Name}.exception.ts`, `{Name}.exception-filter.ts` |
| **Imports From** | Domain (domain exception types), Application (error codes) |
| **Imported By** | Presentation (filters), Infrastructure (adapters throw domain exceptions) |
| **Cannot Import** | Infrastructure directly (domain exceptions are pure) |
| **Dependencies** | @nestjs/common, @nestjs/core |
| **When To Use** | Every NestJS project — core framework patterns |
| **Source Skeleton** | src/{layer}/{feature}/*.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS exception handling — global filters, domain exceptions, HTTP error mapping |
| **Activation Trigger** | files: **/*.filter.ts, **/exceptions/**; keywords: exceptionFilter, catch, httpException, domainException |

---

## Role

You are a **NestJS Error Handling Specialist**. You supply patterns for domain exception hierarchies, exception filters, HTTP-to-domain error mapping, RPC exceptions, and standardized error responses.

**Used by**: Any code agent working with NestJS error flows
**Not used by**: Non-NestJS stacks

---

## Patterns

### Pattern 203.1: Domain Exception Hierarchy

**Category**: Error Fundamentals
**Description**: Pure exceptions in domain layer, no NestJS deps.

```typescript
// domain/exceptions/base.exception.ts
export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly statusHint: number; // hint for HTTP mapping, NOT HttpStatus import
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }
}

// domain/exceptions/not-found.exception.ts
export class EntityNotFoundException extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';
  readonly statusHint = 404;
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, { entity, id });
  }
}

// domain/exceptions/business-rule.exception.ts
export class BusinessRuleViolationException extends DomainException {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly statusHint = 422;
  constructor(rule: string, details?: Record<string, any>) {
    super(`Business rule violated: ${rule}`, details);
  }
}
```

**Key Points**:
- Domain exceptions are PURE TypeScript — no `@nestjs/*` imports
- Carry error code + contextual data for structured logging
- statusHint is a number, NOT NestJS HttpStatus enum — keeps domain pure

---

### Pattern 203.2: Application Error Codes

**Category**: Error Fundamentals
**Description**: Centralized error codes for consistent client handling and i18n.

```typescript
export enum ErrorCode {
  // Auth
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  // Lending domain
  LOAN_NOT_FOUND = 'LOAN_NOT_FOUND',
  INSUFFICIENT_BALANCE = 'LOAN_INSUFFICIENT_BALANCE',
  DUPLICATE_APPLICATION = 'LOAN_DUPLICATE_APPLICATION',
  // General
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CONFLICT = 'CONFLICT',
}
```

**Key Points**:
- Prefix codes by domain (AUTH_, LOAN_, PAYMENT_) for quick identification
- Codes are strings, not numbers — more readable in logs and API responses
- Map to i18n keys for multi-language error messages

---

### Pattern 203.3: Exception Filters

**Category**: Error Fundamentals
**Description**: @Catch() transforms domain exceptions into HTTP/RPC responses.

```typescript
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.statusHint;

    const body: ErrorResponseDto = {
      code: exception.code,
      message: exception.message,
      details: exception.details,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.warn(`[${exception.code}] ${exception.message}`, {
      status, path: request.url, details: exception.details,
    });

    response.status(status).json(body);
  }
}
```

```typescript
// Catch-all filter for unhandled exceptions (MUST be registered)
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    response.status(status).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Key Points**:
- Register DomainExceptionFilter BEFORE GlobalExceptionFilter (order matters)
- Never expose stack traces in production — only log them server-side
- Filter chain: DomainException → HttpException → catch-all

---

### Pattern 203.4: Global Filter Registration

**Category**: Error Fundamentals
**Description**: APP_FILTER providers for consistent error response format.

```typescript
@Module({
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },    // catch-all (last)
    { provide: APP_FILTER, useClass: DomainExceptionFilter },    // domain errors
    { provide: APP_FILTER, useClass: ValidationExceptionFilter }, // class-validator errors
  ],
})
export class AppModule {}
```

**Key Points**:
- Multiple APP_FILTER providers = filter chain (last registered = first to catch)
- Use DI-based registration (APP_FILTER) over app.useGlobalFilters() — supports injection

---

### Pattern 203.5: RPC Exception Handling

**Category**: Advanced Errors
**Description**: Transport-specific filters for gRPC/TCP/RabbitMQ.

```typescript
@Catch(DomainException)
export class GrpcExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const grpcStatusMap: Record<number, number> = {
      404: 5,  // NOT_FOUND
      409: 6,  // ALREADY_EXISTS
      422: 3,  // INVALID_ARGUMENT
      403: 7,  // PERMISSION_DENIED
    };
    throw new RpcException({
      code: grpcStatusMap[exception.statusHint] ?? 13, // INTERNAL
      message: exception.message,
    });
  }
}

// Register per microservice
const grpcApp = await NestFactory.createMicroservice(AppModule, { transport: Transport.GRPC });
grpcApp.useGlobalFilters(new GrpcExceptionFilter());
```

**Key Points**:
- Each transport needs its own exception filter (HTTP, gRPC, RabbitMQ)
- Hybrid apps: register HTTP filters globally, RPC filters on microservice instance
- gRPC status codes differ from HTTP — maintain explicit mapping

---

### Pattern 203.6: Async Error Handling

**Category**: Advanced Errors
**Description**: Transform external errors into domain exceptions.

```typescript
@Injectable()
export class PaymentService {
  async processPayment(dto: PaymentDto): Promise<Payment> {
    try {
      const result = await this.gateway.charge(dto);
      return this.mapper.toDomain(result);
    } catch (error) {
      if (error.code === 'CARD_DECLINED') {
        throw new PaymentDeclinedException(dto.orderId, error.message);
      }
      throw new PaymentGatewayException(dto.orderId, error.message);
    }
  }
}
```

**Key Points**:
- NestJS auto-catches thrown errors in async controller methods
- Use try/catch in services only to transform or enrich errors
- Never empty catch blocks — always re-throw or log

---

### Pattern 203.7: Validation Exception Filter

**Category**: Advanced Errors
**Description**: Transform class-validator errors into structured response.

```typescript
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const exceptionResponse = exception.getResponse() as any;

    response.status(400).json({
      code: 'VALIDATION_FAILED',
      message: 'Input validation failed',
      details: Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message
        : [exceptionResponse.message],
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

### Pattern 203.8: Error Response DTO

**Category**: Advanced Errors
**Description**: Standardized error shape for all API consumers.

```typescript
export class ErrorResponseDto {
  code: string;
  message: string;
  details?: Record<string, any> | string[];
  timestamp: string;
  path?: string;
}
// Response: { "code": "LOAN_NOT_FOUND", "message": "Loan with id abc not found",
//             "details": { "entity": "Loan", "id": "abc" }, "timestamp": "..." }
```

---

### Pattern 203.9: Error Enrichment Interceptor

**Category**: Advanced Errors
**Description**: Interceptor adds request context (correlationId, userId) to all errors.

```typescript
@Injectable()
export class ErrorEnrichmentInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers['x-correlation-id'] || randomUUID();
    const userId = request.user?.id;

    return next.handle().pipe(
      catchError((error) => {
        // Enrich domain exceptions with request context
        if (error instanceof DomainException) {
          error.details = {
            ...error.details,
            correlationId,
            userId,
          };
        }
        return throwError(() => error);
      }),
    );
  }
}
```

**Key Points**:
- Interceptor runs BEFORE exception filter — enriches before formatting
- Add correlationId for distributed tracing across microservices
- Never modify the error type — only add context to existing error
- Register globally: `{ provide: APP_INTERCEPTOR, useClass: ErrorEnrichmentInterceptor }`

---

### Pattern 203.10: Error Aggregation for Bulk Operations

**Category**: Advanced Errors
**Description**: Collect partial failures in batch operations — don't fail-fast.

```typescript
export class BulkOperationException extends DomainException {
  readonly code = 'BULK_OPERATION_PARTIAL';
  readonly statusHint = 207; // Multi-Status

  constructor(
    public readonly successes: { id: string; result: any }[],
    public readonly failures: { id: string; error: string; code: string }[],
  ) {
    super(
      `Bulk operation: ${successes.length} succeeded, ${failures.length} failed`,
      { successCount: successes.length, failureCount: failures.length },
    );
  }
}

// Usage in service
async bulkUpdateLoans(updates: LoanUpdate[]): Promise<BulkResult> {
  const successes: { id: string; result: any }[] = [];
  const failures: { id: string; error: string; code: string }[] = [];

  for (const update of updates) {
    try {
      const result = await this.updateLoan(update);
      successes.push({ id: update.id, result });
    } catch (error) {
      failures.push({
        id: update.id,
        error: error.message,
        code: error instanceof DomainException ? error.code : 'UNKNOWN',
      });
    }
  }

  if (failures.length > 0) {
    throw new BulkOperationException(successes, failures);
  }
  return { successes };
}
```

**Key Points**:
- HTTP 207 Multi-Status for partial success — client can handle individually
- Collect ALL results before throwing — don't lose successful operations
- Filter registers 207 response with both successes and failures

---

### Pattern 203.11: Error Recovery & Retry Pattern

**Category**: Advanced Errors
**Description**: Automatic retry for transient failures with exponential backoff.

```typescript
@Injectable()
export class RetryableService {
  async withRetry<T>(
    operation: () => Promise<T>,
    options: { maxRetries: number; baseDelay: number; retryOn: string[] },
  ): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const isRetryable = error instanceof DomainException
          && options.retryOn.includes(error.code);
        if (!isRetryable || attempt === options.maxRetries) throw error;
        const delay = options.baseDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError!;
  }
}

// Usage
const result = await this.retryable.withRetry(
  () => this.paymentGateway.charge(amount),
  { maxRetries: 3, baseDelay: 200, retryOn: ['GATEWAY_TIMEOUT', 'CONNECTION_RESET'] },
);
```

**Key Points**:
- Only retry transient errors — never retry business logic failures
- Exponential backoff prevents thundering herd on downstream services
- maxRetries ≤3, baseDelay ≥200ms for production safety

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Catch-and-Ignore | `catch (e) { }` — error silently disappears | Always re-throw or log |
| Format in Controller | Each controller returns different error shape | Centralize in global filter |
| HttpException in Domain | `throw new NotFoundException()` in domain service | Use DomainException, map in filter |
| Generic Messages | `throw new Error('error')` — no context | Include entity, ID, operation in message |
| Log Everything | Log stack trace for 404s | Log stack only for 5xx, warn for 4xx |
| No Catch-All | Missing GlobalExceptionFilter | Always register catch-all as last filter |

---

## Best Practices

### Layer Separation
- Domain exceptions: pure TypeScript, no framework deps
- Application: enriches domain errors with context (error codes, user-facing messages)
- Presentation: maps domain errors to transport-specific responses (HTTP, gRPC)

### Consistency
- ONE error response shape for entire API — ErrorResponseDto
- All exceptions carry `code` field — enables client-side switch statements
- Log structured (JSON) — never just `console.error(e.message)`

### Production Safety
- Never expose stack traces in responses — log them server-side only
- Always register catch-all GlobalExceptionFilter — prevents raw Express errors
- Rate-limit error logging to prevent log flooding from attack patterns

---

## Testing Patterns

```typescript
// 1. Test exception filter output
describe('DomainExceptionFilter', () => {
  it('should return structured error response', () => {
    const filter = new DomainExceptionFilter(mockLogger);
    const exception = new EntityNotFoundException('Loan', '123');
    const mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = createMockArgumentsHost(mockResponse);

    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ENTITY_NOT_FOUND' }),
    );
  });
});
```

```typescript
// 2. E2E test — verify error response through full pipeline
it('should return 404 with domain error code', async () => {
  const response = await request(app.getHttpServer())
    .get('/loans/nonexistent-id')
    .expect(404);

  expect(response.body).toEqual(
    expect.objectContaining({
      code: 'ENTITY_NOT_FOUND',
      message: expect.stringContaining('Loan'),
      timestamp: expect.any(String),
    }),
  );
});
```

```typescript
// 3. Test domain exception hierarchy
describe('DomainException', () => {
  it('should carry code and details', () => {
    const ex = new BusinessRuleViolationException('Max loan amount exceeded', { max: 50000 });
    expect(ex.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(ex.statusHint).toBe(422);
    expect(ex.details).toEqual({ max: 50000 });
    expect(ex).toBeInstanceOf(DomainException);
    expect(ex).toBeInstanceOf(Error);
  });
});
```

---

## Abnormal Case Patterns

1. **Stack trace leak in production** — No global filter catches unknown exceptions. Fix: register catch-all GlobalExceptionFilter.

2. **Domain exception imports HttpException** — Couples domain to framework. Fix: use statusHint number, map in filter.

3. **Swallowed error in async chain** — Promise rejection caught but not re-thrown. Fix: always re-throw as domain exception or log explicitly.

4. **RPC filter missing** — HTTP filter registered but gRPC returns raw errors. Fix: register transport-specific filters.

5. **Multiple error response formats** — Different controllers return different error shapes. Fix: centralize in global exception filter, never format errors in controllers.

6. **Validation errors not caught** — class-validator throws BadRequestException, but filter only catches DomainException. Fix: add ValidationExceptionFilter.

7. **Filter order wrong** — Catch-all filter registered before DomainExceptionFilter, intercepts domain errors. Fix: register catch-all FIRST in providers array (NestJS processes last-registered first).

8. **Error in error filter** — Exception filter itself throws. Fix: keep filters simple, never inject services that can throw; catch errors within filter with try/catch.

9. **gRPC status code mismatch** — HTTP 400 mapped to gRPC INTERNAL instead of INVALID_ARGUMENT. Fix: maintain explicit HTTP→gRPC status code mapping table.

10. **Unhandled promise rejection** — Async event handler throws without catch. Fix: wrap event handlers with try/catch, log error, emit error event.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E3, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (203.1-203.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Error Handling Specialist — Core | EPS v3.2*

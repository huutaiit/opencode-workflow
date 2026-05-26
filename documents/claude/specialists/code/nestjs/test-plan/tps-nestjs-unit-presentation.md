# Test Plan Specialist — NestJS Unit Testing: Presentation Layer
# テストプランスペシャリスト — NestJS プレゼンテーション層ユニットテスト
# Chuyen Gia Test — Unit Test Presentation Layer NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Unit Testing — Presentation Layer
**Purpose**: Presentation layer unit testing — controller routing, guard authorization, pipe validation, interceptor behavior, filter error mapping, WebSocket gateway events

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-UNIT-PRES |
| **Directory Pattern** | `src/presentation/**/*.spec.ts` |
| **Naming Convention** | `{entity}.controller.spec.ts`, `{name}.guard.spec.ts`, `{name}.pipe.spec.ts` |
| **Imports From** | Application (mocked use cases), Presentation (SUT) |
| **Imported By** | N/A (test files) |
| **Cannot Import** | Infrastructure directly (controllers inject use cases, not repos) |
| **Dependencies** | jest, @nestjs/testing, supertest |
| **When To Use** | DD/Plan generates controllers, guards, pipes, interceptors, filters |
| **Source Skeleton** | `src/presentation/controllers/{entity}.controller.spec.ts` |
| **Specialist Type** | code |
| **Purpose** | Presentation layer unit testing — controller routing, guard authorization, pipe validation, interceptor behavior, filter error mapping |
| **Activation Trigger** | files: **/presentation/**/*.spec.ts; keywords: controllerTest, guardTest, pipeTest, interceptorTest |

---

## Key Principle

Presentation tests verify **thin layer behavior**: correct routing, status codes, guard authorization, pipe transformation, interceptor cross-cutting. Mock ALL use cases — business logic already tested in application layer.

---

## Patterns

### Pattern UT-P.1: Controller Testing (Thin — Mock Use Cases)

```typescript
// presentation/controllers/order.controller.spec.ts
describe('OrderController', () => {
  let controller: OrderController;
  let createOrderUseCase: jest.Mocked<CreateOrderUseCase>;
  let findOrderUseCase: jest.Mocked<FindOrderUseCase>;

  beforeEach(async () => {
    createOrderUseCase = { execute: jest.fn() } as any;
    findOrderUseCase = { execute: jest.fn() } as any;

    const module = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: CreateOrderUseCase, useValue: createOrderUseCase },
        { provide: FindOrderUseCase, useValue: findOrderUseCase },
      ],
    }).compile();

    controller = module.get(OrderController);
  });

  describe('POST /orders', () => {
    it('should delegate to CreateOrderUseCase and return result', async () => {
      createOrderUseCase.execute.mockResolvedValue(mockOrderResponse);
      const result = await controller.create(createOrderDto);
      expect(createOrderUseCase.execute).toHaveBeenCalledWith(createOrderDto);
      expect(result).toEqual(mockOrderResponse);
    });

    it('should propagate use case exceptions (not catch them)', async () => {
      createOrderUseCase.execute.mockRejectedValue(new EmptyOrderException());
      await expect(controller.create(invalidDto)).rejects.toThrow(EmptyOrderException);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return order by ID', async () => {
      findOrderUseCase.execute.mockResolvedValue(mockOrderResponse);
      const result = await controller.findOne('uuid-1');
      expect(result.id).toBe(mockOrderResponse.id);
    });
  });
});
```

---

### Pattern UT-P.2: Guard Testing

```typescript
// presentation/guards/roles.guard.spec.ts
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();
    guard = module.get(RolesGuard);
    reflector = module.get(Reflector);
  });

  function createMockContext(user: any, requiredRoles: string[]): ExecutionContext {
    jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  it('should allow access when user has required role', () => {
    const ctx = createMockContext({ id: 'u1', role: 'admin' }, ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    const ctx = createMockContext({ id: 'u1', role: 'user' }, ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should allow access when no roles required (public endpoint)', () => {
    const ctx = createMockContext({ id: 'u1', role: 'user' }, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny access when no user present', () => {
    const ctx = createMockContext(null, ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
```

---

### Pattern UT-P.3: Pipe Testing

```typescript
// presentation/pipes/parse-money.pipe.spec.ts
describe('ParseMoneyPipe', () => {
  let pipe: ParseMoneyPipe;

  beforeEach(() => { pipe = new ParseMoneyPipe(); });

  it('should parse valid money string', () => {
    const result = pipe.transform({ amount: '100.50', currency: 'USD' });
    expect(result).toEqual(Money.create(100.50, 'USD'));
  });

  it('should throw BadRequestException on negative amount', () => {
    expect(() => pipe.transform({ amount: '-10', currency: 'USD' }))
      .toThrow(BadRequestException);
  });

  it('should throw BadRequestException on invalid currency', () => {
    expect(() => pipe.transform({ amount: '100', currency: 'INVALID' }))
      .toThrow(BadRequestException);
  });

  it('should throw on non-numeric amount', () => {
    expect(() => pipe.transform({ amount: 'abc', currency: 'USD' }))
      .toThrow(BadRequestException);
  });
});
```

---

### Pattern UT-P.4: Interceptor Testing

```typescript
// presentation/interceptors/logging.interceptor.spec.ts
describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = { log: jest.fn(), error: jest.fn() } as any;
    interceptor = new LoggingInterceptor(logger);
  });

  it('should log request duration on success', (done) => {
    const context = createMockExecutionContext('GET', '/orders');
    const next: CallHandler = { handle: () => of({ data: 'test' }) };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('GET /orders'));
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('ms'));
        done();
      },
    });
  });

  it('should log error on failure', (done) => {
    const context = createMockExecutionContext('POST', '/orders');
    const next: CallHandler = { handle: () => throwError(() => new Error('fail')) };

    interceptor.intercept(context, next).subscribe({
      error: () => {
        expect(logger.error).toHaveBeenCalled();
        done();
      },
    });
  });
});
```

---

### Pattern UT-P.5: Exception Filter Testing

```typescript
// presentation/filters/domain-exception.filter.spec.ts
describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;

  beforeEach(() => { filter = new DomainExceptionFilter(); });

  it('should map InsufficientFundsException to 422', () => {
    const mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockHost = {
      switchToHttp: () => ({ getResponse: () => mockResponse, getRequest: () => ({ url: '/pay' }) }),
    } as any;

    filter.catch(new InsufficientFundsException('acc-1', m100, m50), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(422);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'INSUFFICIENT_FUNDS',
      statusCode: 422,
    }));
  });

  it('should map OrderNotFoundException to 404', () => {
    const mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockHost = {
      switchToHttp: () => ({ getResponse: () => mockResponse, getRequest: () => ({}) }),
    } as any;

    filter.catch(new OrderNotFoundException('order-1'), mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });
});
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test controller with real use case | Tests application logic, not routing | Mock use cases (UT-P.1) |
| 2 | Skip guard edge cases | Security gap — untested role combinations | Test every role + no-role + no-user (UT-P.2) |
| 3 | Test interceptor with real I/O | Slow, flaky | Use RxJS `of()` and `throwError()` (UT-P.4) |
| 4 | No filter testing | Domain exceptions return 500 in production | Map every domain exception to HTTP status (UT-P.5) |

---

## Coverage Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| Controllers | 80% | Routing + delegation (thin — no business logic) |
| Guards | 95% | Security-critical — every role combination |
| Pipes | 95% | Input validation — every valid + invalid input |
| Interceptors | 80% | Cross-cutting behavior — success + error paths |
| Exception Filters | 100% | Every domain exception → HTTP status mapping |

---

*Test Plan Specialist — NestJS Unit Testing: Presentation Layer | EPS v10.0*

# NestJS Controller Routing Specialist — API
# NestJSコントローラールーティングスペシャリスト — API
# Chuyen Gia Dinh Tuyen Controller NestJS — API

**Version**: 2.0.0
**Technology**: NestJS 10+ Controllers
**Aspect**: Controller Routing
**Category**: api
**Purpose**: Knowledge provider for NestJS controller patterns — route decorators, parameter extraction, versioning, serialization, file upload, hybrid transport

---

## Metadata

```json
{
  "id": "nestjs-controller-routing-specialist",
  "technology": "NestJS 10+ Controllers",
  "aspect": "Controller Routing",
  "category": "api",
  "subcategory": "nestjs",
  "lines": 480,
  "token_cost": 2800,
  "version": "2.0.0",
  "evidence": [
    "E1: NestJS official docs — Controllers, Routing, Versioning",
    "E2: Clean architecture controller layer — thin controllers, delegate to use cases",
    "E3: Microservice hybrid transport — REST + gRPC dual-protocol controllers"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 205.1–205.10 |
| **Directory Pattern** | `src/presentation/controllers/` |
| **Naming Convention** | `{entity}.controller.ts`, `{feature}.controller.ts` |
| **Imports From** | Application (use cases via port interfaces, DTOs) |
| **Imported By** | None (HTTP entry point — terminal, consumed by external clients) |
| **Cannot Import** | Domain directly (must go through Application use cases), Infrastructure directly (no repo/DB access) |
| **Dependencies** | @nestjs/common |
| **When To Use** | REST API endpoints with HTTP method decorators |
| **Source Skeleton** | src/presentation/controllers/{entity}.controller.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS HTTP controllers — routing, parameter extraction, response handling, versioning |
| **Activation Trigger** | files: **/*.controller.ts; keywords: controller, get, post, put, delete, param, body |

---

## Role

You are a **NestJS Controller Routing Specialist**. Your responsibility is to provide controller-layer patterns for NestJS microservice projects following clean architecture. You supply patterns for route definition, HTTP method decorators, parameter extraction, response serialization, API versioning, file uploads, and hybrid REST+gRPC controllers. Controllers are thin — they delegate all business logic to Application-layer use cases.

**Used by**: Any code agent building REST/HTTP endpoints in NestJS
**Not used by**: Non-NestJS stacks, agents working on domain or infrastructure layers only

---

## Patterns

### Pattern 205.1–205.5: Controller Fundamentals (HIGH)

```
205.1 Controller decorator: @Controller('resource') sets the route prefix for all endpoints.
      One controller per resource/aggregate. Keep controllers thin — no business logic.
```

```typescript
@Controller('users')
export class UserController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}
}
```

```
205.2 HTTP method decorators: @Get(), @Post(), @Put(), @Patch(), @Delete() map to HTTP verbs.
      Sub-routes passed as arguments: @Get(':id'), @Post('bulk').
```

```typescript
@Controller('orders')
export class OrderController {
  @Get()
  findAll(): Promise<OrderResponseDto[]> { return this.findOrdersUseCase.execute(); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.createOrderUseCase.execute(dto);
  }
}
```

```
205.3 Route parameters: @Param(), @Query(), @Body() extract data from request.
      Always type parameters with DTO classes for validation integration.
```

```typescript
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
  return this.findOrderUseCase.execute(id);
}

@Get()
search(@Query() query: SearchOrderDto): Promise<PaginatedDto<OrderResponseDto>> {
  return this.searchOrdersUseCase.execute(query);
}
```

```
205.4 Response serialization: ClassSerializerInterceptor with @Exclude()/@Expose() on DTOs.
      Applied globally or per-controller. Controls which fields appear in JSON response.
```

```typescript
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UserController {
  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.findUserUseCase.execute(id);
  }
}

// In DTO
export class UserResponseDto {
  @Expose() id: string;
  @Expose() email: string;
  @Exclude() passwordHash: string;
}
```

```
205.5 API versioning: URI versioning via @Controller({ version: '1', path: 'users' }).
      Enable in main.ts with app.enableVersioning({ type: VersioningType.URI }).
```

```typescript
// main.ts
app.enableVersioning({ type: VersioningType.URI });

// v1 controller
@Controller({ version: '1', path: 'users' })
export class UserV1Controller { /* GET /v1/users */ }

// v2 controller
@Controller({ version: '2', path: 'users' })
export class UserV2Controller { /* GET /v2/users */ }
```

### Pattern 205.6–205.10: Advanced Controller Patterns (MEDIUM-HIGH)

```
205.6 File upload: @UseInterceptors(FileInterceptor('file')) with @UploadedFile().
      Use ParseFilePipe for validation (size, type). Multer handles multipart.
```

```typescript
@Post('avatar')
@UseInterceptors(FileInterceptor('file'))
uploadAvatar(
  @UploadedFile(new ParseFilePipe({
    validators: [new MaxFileSizeValidator({ maxSize: 5_000_000 }),
                 new FileTypeValidator({ fileType: 'image/*' })],
  })) file: Express.Multer.File,
) {
  return this.uploadAvatarUseCase.execute(file);
}
```

```
205.7 Controller-UseCase binding: Controller injects use cases, NOT repositories.
      Clean architecture boundary — controllers depend on Application ports only.
```

```typescript
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly processPayment: ProcessPaymentUseCase,
    private readonly refundPayment: RefundPaymentUseCase,
  ) {}

  @Post()
  process(@Body() dto: ProcessPaymentDto) {
    return this.processPayment.execute(dto);
  }
}
```

```
205.8 Response codes: @HttpCode() overrides default, @Header() sets custom headers,
      @Redirect() for redirections. POST defaults to 201, others to 200.
```

```typescript
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
  return this.deleteOrderUseCase.execute(id);
}

@Get('export')
@Header('Content-Type', 'text/csv')
exportCsv(): Promise<string> {
  return this.exportOrdersUseCase.execute();
}
```

```
205.9 Streaming responses: StreamableFile for large data (CSV exports, file downloads).
      Set Content-Type and Content-Disposition headers for proper client handling.
```

```typescript
@Get('download/:id')
getFile(@Param('id') id: string): StreamableFile {
  const stream = this.fileUseCase.getReadStream(id);
  return new StreamableFile(stream, {
    type: 'application/octet-stream',
    disposition: `attachment; filename="${id}.pdf"`,
  });
}
```

```
205.10 Hybrid controller: Same controller handles REST + gRPC via @GrpcMethod().
       Used in microservice architecture where internal services use gRPC, external use REST.
```

```typescript
@Controller('orders')
export class OrderController {
  @Get(':id')
  findOneRest(@Param('id') id: string) {
    return this.findOrderUseCase.execute(id);
  }

  @GrpcMethod('OrderService', 'FindOne')
  findOneGrpc(data: { id: string }) {
    return this.findOrderUseCase.execute(data.id);
  }
}
```

### Pattern 205.11–205.13: Request Context & Advanced Routing

```
205.11 Custom decorators: Extract common request data with reusable param decorators.
       Prefer custom decorators over repeated @Req() access — type-safe, testable.
```

```typescript
// presentation/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;
    return data ? user?.[data] : user;
  },
);

// Usage in controller
@Get('profile')
getProfile(@CurrentUser() user: UserPayload) {
  return this.getUserProfileUseCase.execute(user.id);
}

@Get('settings')
getSettings(@CurrentUser('id') userId: string) {
  return this.getSettingsUseCase.execute(userId);
}
```

```
205.12 Route grouping with module prefix: Use RouterModule for route aggregation.
       Useful in monorepo where multiple modules contribute to same API namespace.
```

```typescript
// Group admin routes under /admin
@Module({
  imports: [
    RouterModule.register([
      {
        path: 'admin',
        module: AdminModule,
        children: [
          { path: 'users', module: AdminUserModule },
          { path: 'reports', module: AdminReportModule },
        ],
      },
    ]),
  ],
})
export class AppModule {}
// Result: /admin/users/..., /admin/reports/...
```

```
205.13 Content negotiation: Multiple response formats from same endpoint.
       Rarely needed, but useful for export endpoints (JSON vs CSV vs XML).
```

```typescript
@Get('export')
@Header('Vary', 'Accept')
export(@Req() req: Request) {
  const accept = req.headers['accept'];
  if (accept?.includes('text/csv')) {
    return this.exportCsvUseCase.execute();
  }
  return this.exportJsonUseCase.execute();
}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Fat Controller | Business logic in controller methods | Extract to use case classes |
| Request Object Leak | Using `@Req()` everywhere | Create typed custom decorators |
| No Input Validation | Raw @Body() without pipe | Use ValidationPipe + DTO class |
| Deep Nesting | `/a/:aId/b/:bId/c/:cId/d` | Max 2 levels, use query for deeper |
| Verb in Route | `/api/getUsers`, `/api/createOrder` | Use HTTP methods: `GET /users`, `POST /orders` |
| Mixed Concerns | Same controller handles REST + WebSocket | Separate controller per transport |
| Raw Repo in Controller | `this.repo.find()` in controller | Inject use case, not repository |

---

## Best Practices

### Controller Design
- One controller per resource/aggregate — never mix unrelated endpoints
- Controllers are THIN — validate input, delegate to use case, serialize output
- Max 7-8 endpoints per controller — split if growing beyond
- Use DTOs for both input (@Body) and output (return type)

### Route Design
- RESTful naming: plural nouns, no verbs in paths (`/orders`, not `/getOrders`)
- Nested resources: `/users/:userId/orders` — max 2 levels deep
- Use ParseUUIDPipe on ALL UUID params — prevent DB-level errors
- Versioning: prefer URI (/v1/users) for public APIs, header for internal

### Response Conventions
- POST → 201 Created with Location header
- DELETE → 204 No Content
- PATCH → 200 with updated resource
- Error responses use global exception filter format (see error-handling 203)

---

## Testing Patterns

```typescript
// 1. Unit test — mock use cases
describe('OrderController', () => {
  let controller: OrderController;
  let mockCreateOrder: jest.Mocked<CreateOrderUseCase>;

  beforeEach(async () => {
    mockCreateOrder = { execute: jest.fn() } as any;
    const module = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: CreateOrderUseCase, useValue: mockCreateOrder },
      ],
    }).compile();
    controller = module.get(OrderController);
  });

  it('should create order and return result', async () => {
    const dto = { items: [{ productId: '1', qty: 2 }] };
    mockCreateOrder.execute.mockResolvedValue({ id: 'abc', ...dto });
    const result = await controller.create(dto);
    expect(result.id).toBe('abc');
  });
});
```

```typescript
// 2. E2E test with supertest
it('/POST orders', () => {
  return request(app.getHttpServer())
    .post('/orders')
    .send({ items: [{ productId: '1', qty: 2 }] })
    .expect(201)
    .expect(res => expect(res.body.id).toBeDefined());
});
```

```typescript
// 3. E2E test — versioned route
it('/v2/users returns new format', () => {
  return request(app.getHttpServer())
    .get('/v2/users/123')
    .expect(200)
    .expect(res => expect(res.body.fullName).toBeDefined()); // v2 merges first+last
});
```

```typescript
// 4. Test file upload
it('/POST avatar', () => {
  return request(app.getHttpServer())
    .post('/users/avatar')
    .attach('file', Buffer.from('fake-image'), 'avatar.png')
    .expect(201);
});
```

```typescript
// 5. Test custom decorator in isolation
describe('CurrentUser decorator', () => {
  it('should extract user from request', () => {
    const mockCtx = createMockExecutionContext({ user: { id: '123', role: 'admin' } });
    const result = CurrentUser(undefined, mockCtx);
    expect(result).toEqual({ id: '123', role: 'admin' });
  });
});
```

---

## Route Design Reference

| Operation | Method | Route | Status | Body |
|-----------|--------|-------|--------|------|
| List | GET | `/resources` | 200 | Paginated array |
| Detail | GET | `/resources/:id` | 200 | Single resource |
| Create | POST | `/resources` | 201 | Created resource |
| Full Update | PUT | `/resources/:id` | 200 | Updated resource |
| Partial Update | PATCH | `/resources/:id` | 200 | Updated resource |
| Delete | DELETE | `/resources/:id` | 204 | Empty |
| Bulk Create | POST | `/resources/bulk` | 201 | Array of created |
| Search | GET | `/resources/search` | 200 | Filtered array |
| Sub-resource | GET | `/resources/:id/items` | 200 | Related array |

---

## Abnormal Case Patterns

1. **Route conflict** — Two controllers register same path. Fix: use module-scoped prefixes or versioning.

2. **Missing ParseUUIDPipe** — Invalid UUID reaches DB. Fix: always use `@Param('id', ParseUUIDPipe)`.

3. **File upload OOM** — No size limit. Fix: ParseFilePipe + MaxFileSizeValidator.

4. **Circular dependency** — Controller imports use case that imports controller module. Fix: Application never imports Presentation.

5. **Controller has business logic** — Validation, calculation, or DB queries in controller. Fix: extract to use case, controller only delegates.

6. **Missing @HttpCode on POST** — Returns 200 instead of 201. Fix: add @HttpCode(HttpStatus.CREATED) on all POST endpoints.

7. **Stream response not flushed** — StreamableFile with large data hangs. Fix: ensure stream emits 'end', set proper Content-Length or use chunked encoding.

8. **Versioned route shadows non-versioned** — `/users` matches both v1 and default. Fix: always enable versioning globally, set default version.

9. **Serialization leaks sensitive fields** — @Expose/@Exclude not applied globally. Fix: use `ClassSerializerInterceptor` at app level with `excludeExtraneousValues: true`.

10. **CORS blocked on file download** — StreamableFile response missing CORS headers. Fix: configure CORS globally in main.ts, add `Access-Control-Expose-Headers` for Content-Disposition.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (205.1-205.10), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Controller Routing Specialist — API | EPS v3.2*

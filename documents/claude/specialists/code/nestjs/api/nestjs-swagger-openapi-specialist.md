# NestJS Swagger OpenAPI Specialist — API
# NestJS Swagger OpenAPIスペシャリスト — API
# Chuyen Gia Swagger OpenAPI NestJS — API

**Version**: 1.0.0
**Technology**: NestJS 10+ @nestjs/swagger, OpenAPI 3.0
**Aspect**: Swagger & OpenAPI Documentation
**Category**: api
**Purpose**: Knowledge provider for NestJS Swagger patterns — setup, decorators, DTO documentation, CLI plugin, schema generation, security docs, multi-spec

---

## Metadata

```json
{
  "id": "nestjs-swagger-openapi-specialist",
  "technology": "NestJS 10+ @nestjs/swagger + OpenAPI 3.0",
  "aspect": "Swagger & OpenAPI Documentation",
  "category": "api",
  "subcategory": "nestjs",
  "lines": 230,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: NestJS official docs — OpenAPI (Swagger) integration",
    "E2: OpenAPI 3.0 specification — schema, security, tags, operations",
    "E3: @nestjs/swagger CLI plugin — automatic @ApiProperty inference from TypeScript"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 208.1–208.8 |
| **Directory Pattern** | `src/presentation/controllers/` (decorators on controllers) |
| **Naming Convention** | N/A (decorators applied to existing controllers/DTOs, not new file creation) |
| **Imports From** | Framework (@nestjs/swagger decorators — applied to Presentation controllers and Application DTOs). Shares paths with 205/206 — Swagger adds decorators, does not create new files |
| **Imported By** | None (generates OpenAPI spec consumed by external API clients/tools) |
| **Cannot Import** | Domain (Swagger decorators must not leak into domain entities), Infrastructure (docs are presentation-only) |
| **Dependencies** | @nestjs/swagger, swagger-ui-express |
| **When To Use** | REST API documentation with OpenAPI/Swagger UI |
| **Source Skeleton** | src/main.ts (setup), decorators on controllers and DTOs |
| **Specialist Type** | code |
| **Purpose** | NestJS OpenAPI/Swagger — API documentation, schema generation, decorator-based docs |
| **Activation Trigger** | files: **/*.controller.ts; keywords: apiTags, apiOperation, apiResponse, swagger, openapi |

---

## Role

You are a **NestJS Swagger OpenAPI Specialist**. Your responsibility is to provide API documentation patterns for NestJS microservice projects following clean architecture. You supply patterns for Swagger setup, endpoint tagging, operation descriptions, response documentation, DTO schema generation, CLI plugin automation, security scheme decoration, and multi-spec separation. Swagger decorators are applied to Presentation controllers and Application DTOs — they must never leak into Domain entities.

**Used by**: Any code agent documenting REST APIs in NestJS
**Not used by**: Non-NestJS stacks, gRPC-only services, agents working on domain layer

---

## Patterns

### Pattern 208.1–208.4: Swagger Fundamentals (HIGH)

```
208.1 Swagger setup: Configure DocumentBuilder and SwaggerModule.createDocument() in main.ts.
      Serves interactive Swagger UI at /api-docs and JSON spec at /api-docs-json.
```

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Order Service API')
  .setDescription('Microservice for order management')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```

```
208.2 @ApiTags: Group endpoints by resource/feature in Swagger UI.
      Apply at controller level — one tag per controller.
```

```typescript
@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  @Get()
  findAll() { /* grouped under "Orders" tag */ }
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  @Post()
  process() { /* grouped under "Payments" tag */ }
}
```

```
208.3 @ApiOperation: Summary + description for each endpoint.
      Summary appears in the endpoint list, description in the expanded detail.
```

```typescript
@Get(':id')
@ApiOperation({
  summary: 'Get order by ID',
  description: 'Retrieves a single order with all line items and status history.',
})
findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
  return this.findOrderUseCase.execute(id);
}
```

```
208.4 @ApiResponse: Document success and error response shapes with status codes.
      Use type for DTO reference, description for human-readable explanation.
```

```typescript
@Post()
@ApiResponse({ status: 201, description: 'Order created', type: OrderResponseDto })
@ApiResponse({ status: 400, description: 'Validation failed' })
@ApiResponse({ status: 409, description: 'Duplicate order reference' })
create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
  return this.createOrderUseCase.execute(dto);
}
```

### Pattern 208.5–208.8: Advanced Swagger Patterns (MEDIUM-HIGH)

```
208.5 DTO decorators: @ApiProperty() on DTO fields for schema generation.
      Provides type, description, example, enum values for OpenAPI spec.
```

```typescript
export class CreateOrderDto {
  @ApiProperty({ description: 'Customer UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID() customerId: string;

  @ApiProperty({ enum: OrderPriority, default: OrderPriority.NORMAL })
  @IsEnum(OrderPriority) priority: OrderPriority;

  @ApiProperty({ type: [OrderItemDto], minItems: 1 })
  @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

```
208.6 CLI plugin: nest-cli.json plugin auto-generates @ApiProperty() from TypeScript types.
      Reduces boilerplate — no manual @ApiProperty() needed for basic fields.
```

```json
// nest-cli.json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true,
          "dtoFileNameSuffix": [".dto.ts", ".entity.ts"]
        }
      }
    ]
  }
}
```

```
208.7 @ApiSecurity/@ApiBearerAuth: Document authentication requirements per endpoint.
      Applied at controller or method level. Matches addBearerAuth() in DocumentBuilder.
```

```typescript
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  @Get()
  @ApiOperation({ summary: 'List orders (authenticated)' })
  findAll() { /* requires Bearer token */ }

  @Post('public')
  @ApiSecurity({})  // override: this endpoint is public
  createPublic(@Body() dto: PublicOrderDto) { /* no auth */ }
}
```

```
208.8 Multiple specs: Separate Swagger docs for internal/external APIs.
      Use include option in createDocument() to scope which modules appear in each spec.
```

```typescript
// External API spec — only public controllers
const externalConfig = new DocumentBuilder()
  .setTitle('Order Service — External API').setVersion('1.0').build();
const externalDoc = SwaggerModule.createDocument(app, externalConfig, {
  include: [PublicOrderModule, PublicPaymentModule],
});
SwaggerModule.setup('api-docs/external', app, externalDoc);

// Internal API spec — all controllers
const internalConfig = new DocumentBuilder()
  .setTitle('Order Service — Internal API').setVersion('1.0').addBearerAuth().build();
const internalDoc = SwaggerModule.createDocument(app, internalConfig, {
  include: [OrderModule, PaymentModule, AdminModule],
});
SwaggerModule.setup('api-docs/internal', app, internalDoc);
```

### Pattern 208.9–208.12: Enterprise Swagger Patterns

```
208.9 Paginated response documentation: Standard pagination envelope DTO for list endpoints.
      Use @ApiExtraModels + getSchemaPath for generic wrapper types.
```

```typescript
@ApiExtraModels(PaginatedResponseDto)
@Controller('orders')
export class OrderController {
  @Get()
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        { properties: { data: { type: 'array', items: { $ref: getSchemaPath(OrderResponseDto) } } } },
      ],
    },
  })
  findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<OrderResponseDto>> {
    return this.listOrdersUseCase.execute(query);
  }
}

// Pagination wrapper DTO
export class PaginatedResponseDto<T> {
  @ApiProperty({ type: 'array' }) data: T[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
```

```
208.10 Standard error response schema: Document error format consistently across all endpoints.
       Use @ApiExtraModels for shared error DTO.
```

```typescript
export class ErrorResponseDto {
  @ApiProperty({ example: 'ENTITY_NOT_FOUND' }) code: string;
  @ApiProperty({ example: 'Order with id abc not found' }) message: string;
  @ApiProperty({ required: false }) details?: Record<string, any>;
  @ApiProperty({ example: '2024-01-15T10:30:00Z' }) timestamp: string;
}

// Reusable decorator for common error responses
export function ApiCommonErrors() {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Validation failed', type: ErrorResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
    ApiResponse({ status: 500, description: 'Internal server error', type: ErrorResponseDto }),
  );
}

// Usage
@Get(':id')
@ApiCommonErrors()
@ApiResponse({ status: 404, description: 'Order not found', type: ErrorResponseDto })
findOne(@Param('id') id: string) {}
```

```
208.11 API versioning in Swagger: Separate Swagger docs per API version.
       Each version gets its own DocumentBuilder and spec endpoint.
```

```typescript
// v1 spec
const v1Config = new DocumentBuilder()
  .setTitle('Order Service API v1')
  .setVersion('1.0')
  .addServer('/v1')
  .build();
const v1Doc = SwaggerModule.createDocument(app, v1Config, {
  include: [OrderV1Module],
});
SwaggerModule.setup('api-docs/v1', app, v1Doc);

// v2 spec
const v2Config = new DocumentBuilder()
  .setTitle('Order Service API v2')
  .setVersion('2.0')
  .addServer('/v2')
  .build();
const v2Doc = SwaggerModule.createDocument(app, v2Config, {
  include: [OrderV2Module],
});
SwaggerModule.setup('api-docs/v2', app, v2Doc);
```

```
208.12 Swagger spec export: Generate OpenAPI JSON/YAML for external tools (Postman, codegen).
       Use in CI/CD to validate spec changes and generate client SDKs.
```

```typescript
// Export spec as JSON file during build
import { writeFileSync } from 'fs';

async function generateSpec() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder().setTitle('Order Service').build();
  const doc = SwaggerModule.createDocument(app, config);
  writeFileSync('./openapi-spec.json', JSON.stringify(doc, null, 2));
  await app.close();
}
generateSpec();

// In CI: validate spec
// npx @openapitools/openapi-generator-cli validate -i openapi-spec.json
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| @ApiProperty on Domain | Swagger decorators leak into domain entities | Use separate response DTOs |
| No Error Schemas | Only success responses documented | Add @ApiResponse for 400, 401, 404, 500 |
| Swagger in Prod | API docs publicly accessible | Conditionally enable based on NODE_ENV |
| No Examples | Schemas without example values | Add `example:` to @ApiProperty |
| Giant Single Spec | One spec with 200+ endpoints | Split by version or public/internal |
| Missing CLI Plugin | Manual @ApiProperty on every field | Enable CLI plugin in nest-cli.json |

---

## Best Practices

### Documentation Quality
- Document ALL endpoints — @ApiOperation + @ApiResponse on every method
- Use @ApiTags() per controller — groups endpoints in Swagger UI
- CLI plugin auto-generates most @ApiProperty() — only add manually for special cases
- Add realistic `example:` values — helps frontend developers understand the format

### Security
- Never expose Swagger in production or protect with auth middleware
- Separate internal/external specs — external gets public endpoints only
- Always add @ApiBearerAuth() on authenticated endpoints
- Disable Swagger in production: `if (config.get('NODE_ENV') !== 'production')`

### Maintenance
- Export OpenAPI spec in CI — validate breaking changes
- Use @ApiExtraModels for shared DTOs (pagination, error responses)
- Create reusable decorator functions (ApiCommonErrors) for repeated patterns

---

## Testing Patterns

```typescript
// 1. Validate OpenAPI spec is generated correctly
it('should generate valid OpenAPI spec', async () => {
  const config = new DocumentBuilder().setTitle('Test').build();
  const doc = SwaggerModule.createDocument(app, config);
  expect(doc.paths['/orders']).toBeDefined();
  expect(doc.paths['/orders'].post.requestBody).toBeDefined();
});
```

```typescript
// 2. Validate spec schema matches DTO
it('should include all DTO properties in spec', async () => {
  const doc = SwaggerModule.createDocument(app, config);
  const orderSchema = doc.components.schemas['CreateOrderDto'];
  expect(orderSchema.properties['customerId']).toBeDefined();
  expect(orderSchema.properties['items']).toBeDefined();
  expect(orderSchema.required).toContain('customerId');
});
```

```typescript
// 3. Snapshot test for spec stability
it('should match spec snapshot', async () => {
  const doc = SwaggerModule.createDocument(app, config);
  // Remove version/timestamp for stable comparison
  delete doc.info.version;
  expect(doc).toMatchSnapshot();
});
```

```typescript
// 4. Validate error response documentation
it('should document error responses', async () => {
  const doc = SwaggerModule.createDocument(app, config);
  const postOrders = doc.paths['/orders'].post;
  expect(postOrders.responses['400']).toBeDefined();
  expect(postOrders.responses['401']).toBeDefined();
});
```

---

## Swagger Decorator Quick Reference

| Decorator | Level | Purpose |
|-----------|-------|---------|
| `@ApiTags('name')` | Controller | Group endpoints |
| `@ApiOperation({})` | Method | Summary + description |
| `@ApiResponse({})` | Method | Response status + schema |
| `@ApiProperty({})` | DTO field | Schema property docs |
| `@ApiBearerAuth()` | Controller/Method | Auth requirement |
| `@ApiParam({})` | Method | Path parameter docs |
| `@ApiQuery({})` | Method | Query parameter docs |
| `@ApiBody({})` | Method | Request body docs |
| `@ApiExtraModels()` | Controller | Register extra schemas |
| `@ApiHeader({})` | Method | Custom header docs |
| `@ApiExcludeEndpoint()` | Method | Hide from spec |
| `@ApiExcludeController()` | Controller | Hide entire controller |

---

## Abnormal Case Patterns

1. **Swagger on domain entities** — @ApiProperty on domain. Fix: use separate response DTOs.

2. **CLI plugin not generating** — DTO files don't match pattern. Fix: ensure `.dto.ts` suffix + plugin in nest-cli.json.

3. **Missing response type** — @ApiResponse without `type`. Fix: always specify `type: ResponseDto`.

4. **Bearer auth not shown** — `.addBearerAuth()` without `@ApiBearerAuth()`. Fix: apply at controller level.

5. **Swagger exposed in production** — API docs accessible publicly. Fix: conditionally setup: `if (process.env.NODE_ENV !== 'production')`.

6. **Circular reference in DTO** — DTO references itself, Swagger crashes. Fix: use `@ApiProperty({ type: () => ChildDto })` lazy reference.

7. **Generic type lost** — `PaginatedResponseDto<T>` becomes empty `data` array. Fix: use `@ApiExtraModels` + `getSchemaPath` for generic wrappers.

8. **CLI plugin conflicts with transforms** — class-transformer decorators confuse the Swagger plugin. Fix: set `classValidatorShim: true` in plugin config.

9. **Spec too large** — Single spec >2MB with 100+ DTOs. Fix: split into multiple specs by module or version.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (208.1-208.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Swagger OpenAPI Specialist — API | EPS v3.2*

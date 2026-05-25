# NestJS Validation Pipes Specialist — API
# NestJSバリデーションパイプスペシャリスト — API
# Chuyen Gia Validation Pipes NestJS — API

**Version**: 1.0.0
**Technology**: NestJS 10+ Validation, class-validator, class-transformer
**Aspect**: Validation & Pipes
**Category**: api
**Purpose**: Knowledge provider for NestJS validation patterns — global ValidationPipe, class-validator decorators, custom pipes, DTO transformation, whitelist enforcement

---

## Metadata

```json
{
  "id": "nestjs-validation-pipes-specialist",
  "technology": "NestJS 10+ Validation + class-validator + class-transformer",
  "aspect": "Validation & Pipes",
  "category": "api",
  "subcategory": "nestjs",
  "lines": 240,
  "token_cost": 1500,
  "version": "1.0.0",
  "evidence": [
    "E1: NestJS official docs — Pipes, Validation, Transformation",
    "E2: class-validator/class-transformer — decorator-based validation ecosystem",
    "E3: Clean architecture input validation — validate at boundary, domain stays pure"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 206.1–206.8 |
| **Directory Pattern** | `src/presentation/pipes/`, `src/application/dto/` |
| **Naming Convention** | `{Name}.pipe.ts`, `{action}-{entity}.dto.ts`, `create-{entity}.dto.ts`, `update-{entity}.dto.ts` |
| **Imports From** | Domain (entity constraints, value object rules), Application (DTO type definitions) |
| **Imported By** | Presentation (controllers use pipes for input validation), Application (use cases receive validated DTOs) |
| **Cannot Import** | Infrastructure (validation is pure logic, no DB/external calls) |
| **Dependencies** | class-validator, class-transformer, @nestjs/mapped-types |
| **When To Use** | Input validation and DTO transformation at API boundary |
| **Source Skeleton** | src/application/dto/{action}-{entity}.dto.ts, src/presentation/pipes/{name}.pipe.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS validation — class-validator, ValidationPipe, custom pipes, DTO transformation |
| **Activation Trigger** | files: **/*.pipe.ts, **/*.dto.ts; keywords: validationPipe, isString, isNumber, transform |

---

## Role

You are a **NestJS Validation Pipes Specialist**. Your responsibility is to provide validation and DTO transformation patterns for NestJS microservice projects following clean architecture. You supply patterns for global ValidationPipe configuration, class-validator decorators, class-transformer usage, custom pipes, DTO inheritance utilities, nested validation, custom validators, and whitelist enforcement. All validation occurs at the Presentation/Application boundary — domain entities remain pure.

**Used by**: Any code agent building input validation or DTOs in NestJS
**Not used by**: Non-NestJS stacks, agents working on domain entities only

---

## Patterns

### Pattern 206.1–206.4: Validation Fundamentals (HIGH)

```
206.1 Global ValidationPipe: Configure once in main.ts with whitelist, transform,
      forbidNonWhitelisted. Applies to all incoming requests automatically.
```

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
}));
```

```
206.2 class-validator decorators: Declarative validation on DTO properties.
      @IsString(), @IsEmail(), @MinLength(), @IsEnum(), @IsOptional() for field rules.
```

```typescript
export class CreateUserDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsEnum(UserRole) role: UserRole;
  @IsOptional() @IsString() bio?: string;
}
```

```
206.3 class-transformer: @Transform() for custom conversion, @Type() for nested objects,
      plainToInstance() for manual DTO creation. Used with transform: true in ValidationPipe.
```

```typescript
export class SearchOrderDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt() @Min(1) page: number = 1;

  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsOptional() @IsString() search?: string;

  @Type(() => Date)
  @IsOptional() @IsDate() createdAfter?: Date;
}
```

```
206.4 Custom pipe: @Injectable() implements PipeTransform for domain-specific validation.
      Use when class-validator decorators are insufficient (e.g., DB lookups excluded — pure logic only).
```

```typescript
@Injectable()
export class ParseOrderStatusPipe implements PipeTransform<string, OrderStatus> {
  transform(value: string, metadata: ArgumentMetadata): OrderStatus {
    const status = OrderStatus[value?.toUpperCase()];
    if (!status) throw new BadRequestException(`Invalid order status: ${value}`);
    return status;
  }
}

// Usage: @Query('status', ParseOrderStatusPipe) status: OrderStatus
```

### Pattern 206.5–206.8: Advanced Validation Patterns (MEDIUM-HIGH)

```
206.5 DTO inheritance: PartialType(), PickType(), OmitType(), IntersectionType()
      from @nestjs/mapped-types. Derive Update/Patch DTOs from Create DTO.
```

```typescript
import { PartialType, OmitType, IntersectionType } from '@nestjs/mapped-types';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class CreateUserProfileDto extends IntersectionType(
  CreateUserDto,
  OmitType(ProfileDto, ['id'] as const),
) {}
```

```
206.6 Nested validation: @ValidateNested() + @Type(() => NestedDto) for object/array fields.
      Without @Type(), class-validator cannot instantiate nested objects for validation.
```

```typescript
export class CreateOrderDto {
  @IsString() customerId: string;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  items: OrderItemDto[];
}

export class OrderItemDto {
  @IsString() productId: string;
  @IsInt() @Min(1) quantity: number;
}
```

```
206.7 Custom validator: @ValidatorConstraint + @Validate for business rules.
      Encapsulates complex validation logic reusable across DTOs.
```

```typescript
@ValidatorConstraint({ name: 'isBusinessEmail', async: false })
export class IsBusinessEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string): boolean {
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com'];
    const domain = email.split('@')[1];
    return !freeDomains.includes(domain);
  }
  defaultMessage(): string { return 'Must use a business email address'; }
}

// Usage on DTO field
@Validate(IsBusinessEmailConstraint) email: string;
```

```
206.8 Whitelist + forbidNonWhitelisted: Strip unknown properties (whitelist: true),
      reject if unknown present (forbidNonWhitelisted: true). Prevents mass-assignment attacks.
```

```typescript
// Global config (recommended)
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })

// Per-route override
@Post()
create(
  @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  dto: CreateUserDto,
) { return this.createUserUseCase.execute(dto); }
```

### Pattern 206.9–206.12: Enterprise Validation Patterns

```
206.9 Conditional validation: @ValidateIf() for fields that only require validation
      under certain conditions. Avoids overly strict DTOs.
```

```typescript
export class PaymentDto {
  @IsEnum(PaymentMethod) method: PaymentMethod;

  @ValidateIf(o => o.method === PaymentMethod.CREDIT_CARD)
  @IsString() @IsCreditCard() cardNumber?: string;

  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsString() @IsIBAN() bankAccount?: string;
}
```

```
206.10 Validation groups: @IsString({ groups: ['create'] }) for different validation
       rules on same DTO for create vs update operations.
```

```typescript
export class UserDto {
  @IsString({ groups: ['create', 'update'] })
  name: string;

  @IsEmail({}, { groups: ['create'] }) // required on create only
  email: string;

  @IsOptional({ groups: ['update'] }) // optional on update
  @IsString({ groups: ['update'] })
  bio?: string;
}

// Controller: apply group
@Post()
create(@Body(new ValidationPipe({ groups: ['create'] })) dto: UserDto) {}

@Patch(':id')
update(@Body(new ValidationPipe({ groups: ['update'] })) dto: UserDto) {}
```

```
206.11 Async custom validator: @ValidatorConstraint({ async: true }) for validators
       that need external lookups (check uniqueness, cross-field DB validation).
```

```typescript
@ValidatorConstraint({ name: 'isEmailUnique', async: true })
@Injectable()
export class IsEmailUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private userRepo: UserRepository) {}

  async validate(email: string): Promise<boolean> {
    const existing = await this.userRepo.findByEmail(email);
    return !existing;
  }
  defaultMessage(): string { return 'Email already registered'; }
}

// Register in module: useContainer(app.select(AppModule), { fallbackOnErrors: true });
```

```
206.12 DTO-to-Domain mapping: Validated DTO → Domain entity conversion boundary.
       DTOs are Presentation/Application. Domain entities have their own invariants.
```

```typescript
// Application layer — map validated DTO to domain command
@Injectable()
export class CreateOrderUseCase {
  async execute(dto: CreateOrderDto): Promise<OrderResponseDto> {
    // DTO already validated by pipe — trust the shape
    const order = Order.create({
      customerId: CustomerId.from(dto.customerId), // value object validation
      items: dto.items.map(i => OrderItem.create(i.productId, i.quantity)),
    });
    const saved = await this.orderRepo.save(order);
    return OrderMapper.toResponse(saved);
  }
}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| No Global Pipe | Each controller configures its own ValidationPipe | Set global pipe in main.ts |
| Domain Validation in DTO | Business rules in @ValidatorConstraint accessing repos | Validate shape in DTO, business rules in domain |
| Missing @Type | Nested objects pass as plain objects, not validated | Always pair @ValidateNested + @Type |
| enableImplicitConversion + strict | Converts "abc" to NaN silently | Validate after conversion, add @IsNotEmpty |
| DTO without class | Using interface instead of class for @Body | class-validator needs class instances |
| Shared mutable DTO | Same DTO instance reused across requests | ValidationPipe creates new instance per request |
| No error message i18n | Hardcoded English validation messages | Use custom message factory per locale |

---

## Best Practices

### DTO Design
- One DTO per operation: CreateOrderDto, UpdateOrderDto, SearchOrderDto
- Use OmitType, PickType, IntersectionType for DTO composition — avoid duplication
- Always enable `whitelist: true` + `forbidNonWhitelisted: true` globally

### Validation Strategy
- Global ValidationPipe in main.ts — consistent across all endpoints
- Custom validators for business rules (e.g., @IsLoanAmountValid)
- Transform: true for automatic type coercion (query params string→number)

---

## Testing Patterns

```typescript
// 1. Unit test — DTO validation
describe('CreateOrderDto validation', () => {
  it('should reject missing required fields', async () => {
    const dto = plainToInstance(CreateOrderDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept valid input', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      customerId: 'uuid-here',
      items: [{ productId: 'uuid-here', quantity: 2 }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

```typescript
// 2. Test conditional validation
describe('PaymentDto conditional', () => {
  it('should require cardNumber for credit card', async () => {
    const dto = plainToInstance(PaymentDto, { method: 'CREDIT_CARD' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'cardNumber')).toBe(true);
  });

  it('should NOT require cardNumber for bank transfer', async () => {
    const dto = plainToInstance(PaymentDto, {
      method: 'BANK_TRANSFER', bankAccount: 'DE89370400440532013000',
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'cardNumber')).toBe(false);
  });
});
```

```typescript
// 3. Test custom pipe
describe('ParseOrderStatusPipe', () => {
  const pipe = new ParseOrderStatusPipe();

  it('should parse valid status', () => {
    expect(pipe.transform('PENDING', {} as any)).toBe(OrderStatus.PENDING);
  });

  it('should throw on invalid status', () => {
    expect(() => pipe.transform('INVALID', {} as any)).toThrow(BadRequestException);
  });
});
```

```typescript
// 4. E2E test — validation error format
it('should return 400 with validation details', () => {
  return request(app.getHttpServer())
    .post('/orders')
    .send({ items: [] }) // ArrayMinSize(1) fails
    .expect(400)
    .expect(res => {
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.details).toBeInstanceOf(Array);
    });
});
```

```typescript
// 5. Test whitelist strips unknown fields
it('should strip unknown properties', async () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const dto = await pipe.transform(
    { name: 'test', email: 'test@example.com', isAdmin: true },
    { metatype: CreateUserDto, type: 'body', data: '' },
  );
  expect(dto).not.toHaveProperty('isAdmin');
});
```

---

## Validation Decorator Quick Reference

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@IsString()` | String type check | `name: string` |
| `@IsEmail()` | Email format | `email: string` |
| `@IsInt()` / `@IsNumber()` | Integer / Number | `age: number` |
| `@Min(n)` / `@Max(n)` | Numeric range | `@Min(1) @Max(100)` |
| `@MinLength(n)` | String min length | `@MinLength(2) name` |
| `@IsEnum(E)` | Enum value | `@IsEnum(Status) status` |
| `@IsUUID()` | UUID format | `@IsUUID() id` |
| `@IsOptional()` | Allow undefined | `@IsOptional() bio?` |
| `@ValidateNested()` | Validate nested objects | `+ @Type(() => Dto)` |
| `@IsArray()` | Array type | `+ @ArrayMinSize(1)` |
| `@ValidateIf(fn)` | Conditional validation | `@ValidateIf(o => o.type === 'X')` |
| `@Matches(regex)` | Regex pattern | `@Matches(/^[A-Z]{3}$/)` |

---

## Abnormal Case Patterns

1. **Nested object not validated** — @ValidateNested without @Type(). Fix: always pair both decorators.

2. **Query params as strings** — `?page=1` arrives as "1", fails @IsInt(). Fix: `transform: true, enableImplicitConversion: true`.

3. **Mass-assignment** — Extra fields like `role: "admin"` reach use case. Fix: `whitelist: true, forbidNonWhitelisted: true`.

4. **PartialType empty object** — All fields optional, empty object passes. Fix: class-level validator requiring at least one field.

5. **Array validation skipped** — `@IsArray()` without `@ValidateNested({ each: true })`. Fix: add `each: true` for array items.

6. **Enum validation allows numbers** — `@IsEnum(Status)` accepts numeric index. Fix: use `@IsIn(Object.values(Status))` for string enums.

7. **Async validator not triggered** — @ValidatorConstraint({ async: true }) but ValidationPipe sync. Fix: class-validator handles async automatically; ensure `useContainer()` called for DI.

8. **Transform runs before validate** — Class-transformer @Transform converts invalid value before class-validator rejects it. Fix: validate primitive type first, then transform.

9. **Circular DTO reference** — OrderDto has items: OrderItemDto which has order: OrderDto. Fix: break cycle — child DTO should not reference parent.

10. **Validation groups ignored** — Global pipe doesn't specify groups. Fix: override with per-route `new ValidationPipe({ groups: ['create'] })`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (206.1-206.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Validation Pipes Specialist — API | EPS v3.2*

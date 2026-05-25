# NestJS Mapper Patterns Specialist — Application
# NestJSマッパーパターンスペシャリスト — アプリケーション
# Chuyen Gia Mau Mapper NestJS — Ung Dung

**Version**: 1.0.0
**Technology**: NestJS 10+ Data Mapping
**Aspect**: DTO/Entity Mapping Patterns
**Category**: application
**Purpose**: Knowledge provider for NestJS data mapping — class-transformer, manual mapping, DTO factories, response shaping

---

## Metadata

```json
{
  "id": "nestjs-mapper-patterns-specialist",
  "technology": "NestJS 10+ Data Mapping",
  "aspect": "DTO/Entity Mapping",
  "category": "application",
  "subcategory": "nestjs",
  "lines": 320,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: class-transformer — plainToInstance, @Transform, @Expose, @Exclude",
    "E2: Clean architecture — DTO boundary between layers",
    "E5: p2plend mappers — entity ↔ DTO transformation patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 271.1–271.6 |
| **Directory Pattern** | `src/application/{feature}/` |
| **Naming Convention** | `{entity}.mapper.ts`, `{action}-{entity}.dto.ts` |
| **Imports From** | Domain (entity types), Infrastructure (persistence entity types) |
| **Imported By** | Application (services use mappers), Presentation (serialization) |
| **Cannot Import** | Presentation directly |
| **Dependencies** | @nestjs/common |
| **When To Use** | Application layer — use cases, services, mappers in clean architecture |
| **Source Skeleton** | src/application/{feature}/{action}.use-case.ts, src/application/{feature}/{entity}.mapper.ts |
| **Specialist Type** | code |
| **Purpose** | Mapper patterns — domain↔ORM entity mapping, DTO transformation, automapper |
| **Activation Trigger** | files: **/*.mapper.ts; keywords: mapper, toDomain, toOrm, toResponse, transform |

---

## Role

You are a **NestJS Mapper Patterns Specialist**. You supply patterns for data transformation between layers — entity-to-DTO, DTO-to-entity, nested mapping, and response shaping.

**Used by**: Any code agent building data transformations in NestJS
**Not used by**: Non-NestJS stacks

---

## Patterns

### Pattern 271.1: Manual Mapper

**Category**: Mapping Fundamentals
**Description**: Explicit mapping method — safest and most maintainable.

```typescript
@Injectable()
export class LoanMapper {
  toResponse(entity: Loan): LoanResponseDto {
    return {
      id: entity.id,
      status: entity.status,
      amount: entity.amount.toNumber(), // Decimal.js → number
      borrowerName: entity.borrower.fullName,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  toDomain(dto: CreateLoanDto): Partial<Loan> {
    return {
      amount: new Decimal(dto.amount),
      term: dto.termMonths,
      purpose: dto.purpose,
    };
  }

  toListResponse(entities: Loan[]): LoanResponseDto[] {
    return entities.map(e => this.toResponse(e));
  }
}
```

**Key Points**:
- Manual mapping = explicit, type-safe, easy to debug
- Preferred over class-transformer for complex transformations
- One mapper per aggregate — co-located with DTOs

---

### Pattern 244.2: class-transformer

**Category**: Mapping Fundamentals
**Description**: Decorator-based transformation for simple DTOs.

```typescript
export class UserResponseDto {
  @Expose() id: string;
  @Expose() email: string;
  @Expose() name: string;
  @Exclude() passwordHash: string;
  @Exclude() internalNotes: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: string;
}

// Usage
const dto = plainToInstance(UserResponseDto, userEntity, {
  excludeExtraneousValues: true, // only @Expose() fields included
});
```

**Key Points**:
- `excludeExtraneousValues: true` = whitelist mode — only @Expose() fields
- @Transform for custom value transformations (dates, decimals)
- Works with ClassSerializerInterceptor for automatic response transformation

---

### Pattern 244.3: DTO Factory Pattern

**Category**: Mapping Fundamentals
**Description**: Static factory methods on DTOs for cleaner mapping.

```typescript
export class OrderResponseDto {
  id: string;
  status: string;
  total: number;
  itemCount: number;

  static from(order: Order): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.status = order.status;
    dto.total = order.total.toNumber();
    dto.itemCount = order.items.length;
    return dto;
  }

  static fromList(orders: Order[]): OrderResponseDto[] {
    return orders.map(OrderResponseDto.from);
  }
}

// Usage in service
return OrderResponseDto.from(savedOrder);
```

**Key Points**:
- Static factory = no DI needed, simple transformation
- Good for DTOs with computed fields (itemCount from items.length)
- Combine with manual mapper for complex cases

---

### Pattern 244.4: Nested Mapping

**Category**: Advanced Mapping
**Description**: Map complex nested structures.

```typescript
@Injectable()
export class OrderMapper {
  constructor(private readonly itemMapper: OrderItemMapper) {}

  toResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      total: order.total.toNumber(),
      items: order.items.map(item => this.itemMapper.toResponse(item)),
      customer: {
        id: order.customer.id,
        name: order.customer.fullName,
      },
    };
  }
}
```

**Key Points**:
- Compose mappers for nested objects — don't flatten everything in one mapper
- Lazy map: only map nested data if client requests it (GraphQL field resolvers)
- Avoid circular mapping (Order → Customer → Orders) — map only what's needed

---

### Pattern 244.5: Paginated Response Mapping

**Category**: Advanced Mapping
**Description**: Wrap paginated results with metadata.

```typescript
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  static from<E, D>(
    items: E[],
    total: number,
    page: number,
    limit: number,
    mapper: (item: E) => D,
  ): PaginatedResponseDto<D> {
    const dto = new PaginatedResponseDto<D>();
    dto.data = items.map(mapper);
    dto.meta = { total, page, limit, totalPages: Math.ceil(total / limit) };
    return dto;
  }
}

// Usage
const [loans, total] = await this.loanRepo.findAndCount(page, limit);
return PaginatedResponseDto.from(loans, total, page, limit, this.mapper.toResponse);
```

---

### Pattern 271.6: Request DTO to Domain

**Category**: Advanced Mapping
**Description**: Transform validated input into domain objects.

```typescript
@Injectable()
export class LoanApplicationMapper {
  toDomainCommand(dto: CreateLoanDto, userId: string): CreateLoanCommand {
    return {
      borrowerId: userId,
      amount: new Decimal(dto.amount),
      termMonths: dto.termMonths,
      purpose: dto.purpose,
      requestedAt: new Date(),
    };
  }
}
```

**Key Points**:
- DTO → domain command object (not entity directly)
- Enrich with context (userId from auth, timestamps)
- Domain objects use value objects (Decimal, not number)

---

## Best Practices

### Design
- Manual mapper for complex transformations, class-transformer for simple ones
- One mapper per aggregate root — co-located in application/{feature}/mappers/
- Never expose domain entities to presentation — always map to DTOs

### Performance
- Avoid mapping in loops with N+1 queries — batch load first, then map
- Cache mapper instances (singleton scope) — they're stateless
- Use `plainToInstance` with `excludeExtraneousValues` for security

---

## Testing Patterns

```typescript
describe('LoanMapper', () => {
  const mapper = new LoanMapper();

  it('should map entity to response DTO', () => {
    const entity = createMockLoan({ amount: new Decimal('1000.50') });
    const dto = mapper.toResponse(entity);
    expect(dto.amount).toBe(1000.5);
    expect(dto.id).toBe(entity.id);
    expect(dto).not.toHaveProperty('passwordHash');
  });
});
```

---

## Abnormal Case Patterns

1. **Domain entity leaked to response** — Controller returns entity directly. Fix: always use mapper/DTO.
2. **Decimal precision lost** — `Decimal.js` → `number` loses precision for large amounts. Fix: return as string for financial data.
3. **Circular mapping** — Order maps Customer which maps Orders. Fix: map only needed depth.
4. **Missing @Expose** — class-transformer with `excludeExtraneousValues` returns empty object. Fix: add @Expose on all needed fields.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5)?
- [ ] **Q2**: Pattern IDs unique (271.1-271.6)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*NestJS Mapper Patterns Specialist — Application | EPS v3.2*

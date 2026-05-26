# NestJS Search Criteria Specialist — Patterns
# NestJS検索条件スペシャリスト — パターン
# Chuyen Gia Tieu Chi Tim Kiem NestJS — Pattern

**Version**: 1.0.0
**Technology**: NestJS 10+ Dynamic Search & Filtering
**Aspect**: Search Criteria
**Category**: patterns
**Purpose**: Knowledge provider for NestJS dynamic search — filter builders, TypeORM QueryBuilder, specification pattern, sort/order, full-text search

---

## Metadata

```json
{
  "id": "nestjs-search-criteria-specialist",
  "technology": "NestJS 10+ Dynamic Search",
  "aspect": "Search Criteria",
  "category": "patterns",
  "subcategory": "nestjs",
  "lines": 300,
  "token_cost": 1800,
  "version": "1.0.0",
  "evidence": [
    "E1: TypeORM QueryBuilder — dynamic WHERE, ORDER BY, JOIN construction",
    "E2: Specification pattern — composable query criteria",
    "E3: Full-text search — PostgreSQL tsvector or Elasticsearch integration"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 253.1–253.5 |
| **Directory Pattern** | `src/application/dto/` |
| **Dependencies** | none (built on TypeORM QueryBuilder) |
| **When To Use** | Dynamic search filtering and sort from user query params |
| **Source Skeleton** | src/application/dto/search-{entity}.dto.ts, src/infrastructure/persistence/{entity}-search.service.ts |
| **Specialist Type** | code |
| **Purpose** | Search criteria patterns — dynamic filters, sorting, full-text search |
| **Activation Trigger** | files: **/dto/**search*; keywords: searchCriteria, filter, sort, fullTextSearch |

---

## Role

You are a **NestJS Search Criteria Specialist**. You supply patterns for dynamic search and filtering — building TypeORM queries from user input, composable specifications, safe sort/order handling, and full-text search integration.

---

## Patterns

### Pattern 253.1: Search DTO with Dynamic Filters

**Category**: Search Fundamentals
**Description**: DTO captures all possible filter/sort/pagination options.

```typescript
export class SearchOrderDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @Type(() => Date) @IsDate() createdAfter?: Date;
  @IsOptional() @Type(() => Date) @IsDate() createdBefore?: Date;
  @IsOptional() @IsNumber() @Min(0) minAmount?: number;
  @IsOptional() @IsNumber() maxAmount?: number;
  @IsOptional() @IsString() search?: string; // full-text
  @IsOptional() @IsIn(['createdAt', 'amount', 'status']) sortBy?: string;
  @IsOptional() @IsIn(['ASC', 'DESC']) sortOrder?: 'ASC' | 'DESC';
}
```

---

### Pattern 253.2: Dynamic Query Builder

**Category**: Search Fundamentals
**Description**: Build TypeORM query from search DTO — apply only provided filters.

```typescript
@Injectable()
export class OrderSearchService {
  constructor(@InjectRepository(OrderEntity) private repo: Repository<OrderEntity>) {}

  async search(dto: SearchOrderDto): Promise<PaginatedResult<OrderEntity>> {
    const qb = this.repo.createQueryBuilder('order');

    // Apply only provided filters
    if (dto.status) qb.andWhere('order.status = :status', { status: dto.status });
    if (dto.customerId) qb.andWhere('order.customerId = :customerId', { customerId: dto.customerId });
    if (dto.createdAfter) qb.andWhere('order.createdAt >= :after', { after: dto.createdAfter });
    if (dto.createdBefore) qb.andWhere('order.createdAt <= :before', { before: dto.createdBefore });
    if (dto.minAmount) qb.andWhere('order.totalAmount >= :min', { min: dto.minAmount });
    if (dto.maxAmount) qb.andWhere('order.totalAmount <= :max', { max: dto.maxAmount });

    // Full-text search (PostgreSQL)
    if (dto.search) {
      qb.andWhere("to_tsvector('english', order.description) @@ plainto_tsquery(:search)", {
        search: dto.search,
      });
    }

    // Safe sort — only allowed columns
    const sortBy = dto.sortBy || 'createdAt';
    const sortOrder = dto.sortOrder || 'DESC';
    qb.orderBy(`order.${sortBy}`, sortOrder);

    // Paginate
    const [data, total] = await qb
      .skip((dto.page - 1) * dto.limit)
      .take(dto.limit)
      .getManyAndCount();

    return { data, total, page: dto.page, limit: dto.limit, totalPages: Math.ceil(total / dto.limit) };
  }
}
```

**Key Points**:
- Only apply filter if value provided — empty DTO returns all records (with pagination)
- Use parameterized queries (`:status`) — NEVER string concatenation (SQL injection)
- Whitelist sortBy columns — prevent sorting on unindexed or non-existent columns

---

### Pattern 253.3: Specification Pattern

**Category**: Advanced Search
**Description**: Composable, reusable query criteria as classes.

```typescript
export interface Specification<T> {
  apply(qb: SelectQueryBuilder<T>): void;
}

export class StatusSpec implements Specification<OrderEntity> {
  constructor(private status: OrderStatus) {}
  apply(qb: SelectQueryBuilder<OrderEntity>) {
    qb.andWhere('order.status = :status', { status: this.status });
  }
}

export class DateRangeSpec implements Specification<OrderEntity> {
  constructor(private from: Date, private to: Date) {}
  apply(qb: SelectQueryBuilder<OrderEntity>) {
    qb.andWhere('order.createdAt BETWEEN :from AND :to', { from: this.from, to: this.to });
  }
}

// Compose specifications
function applySpecs<T>(qb: SelectQueryBuilder<T>, specs: Specification<T>[]): void {
  specs.forEach(spec => spec.apply(qb));
}

// Usage
const specs: Specification<OrderEntity>[] = [];
if (dto.status) specs.push(new StatusSpec(dto.status));
if (dto.createdAfter && dto.createdBefore) specs.push(new DateRangeSpec(dto.createdAfter, dto.createdBefore));
applySpecs(qb, specs);
```

---

### Pattern 253.4: Safe Sort with Whitelist

**Category**: Security
**Description**: Prevent SQL injection and performance issues via sort whitelist.

```typescript
const ALLOWED_SORT_FIELDS: Record<string, string> = {
  createdAt: 'order.createdAt',
  amount: 'order.totalAmount',
  status: 'order.status',
  customerName: 'customer.name', // join required
};

function applySafeSort(qb: SelectQueryBuilder<any>, sortBy: string, order: 'ASC' | 'DESC') {
  const column = ALLOWED_SORT_FIELDS[sortBy];
  if (!column) throw new BadRequestException(`Invalid sort field: ${sortBy}`);
  qb.orderBy(column, order);
}
```

---

## Best Practices

- Always parameterize queries — `andWhere('col = :val', { val })` not string interpolation
- Whitelist sort columns — prevent sorting on unindexed columns
- Index commonly filtered columns (status, createdAt, customerId)
- Full-text search: PostgreSQL `tsvector` for simple, Elasticsearch for complex

---

## Abnormal Case Patterns

1. **SQL injection** — Sort field from user input concatenated directly. Fix: whitelist map.
2. **Slow query** — Filter on unindexed column with large table. Fix: add database index.
3. **Empty result on valid search** — Date timezone mismatch. Fix: use UTC consistently.
4. **N+1 on search results** — Relations loaded per row. Fix: add `.leftJoinAndSelect()` in query.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (253.1-253.4)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Search Criteria Specialist — Patterns | EPS v3.2*

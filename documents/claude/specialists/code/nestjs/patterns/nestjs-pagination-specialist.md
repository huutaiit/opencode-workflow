# NestJS Pagination Specialist — Patterns
# NestJSページネーションスペシャリスト — パターン
# Chuyen Gia Phan Trang NestJS — Pattern

**Version**: 1.0.0
**Technology**: NestJS 10+ Pagination Patterns
**Aspect**: Pagination
**Category**: patterns
**Purpose**: Knowledge provider for NestJS pagination — offset, cursor, keyset pagination with TypeORM/Prisma, paginated response DTOs, infinite scroll support

---

## Metadata

```json
{
  "id": "nestjs-pagination-specialist",
  "technology": "NestJS 10+ Pagination",
  "aspect": "Pagination",
  "category": "patterns",
  "subcategory": "nestjs",
  "lines": 320,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Offset pagination — page/limit with COUNT, simple but O(n) for large offsets",
    "E2: Cursor pagination — after/before cursor for stable, efficient paging",
    "E3: TypeORM/Prisma pagination — framework-specific query patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 252.1–252.6 |
| **Directory Pattern** | `src/application/dto/`, `src/shared/pagination/` |
| **Dependencies** | none (built on TypeORM/Prisma) |
| **When To Use** | Offset and cursor pagination for list endpoints |
| **Source Skeleton** | src/shared/pagination/paginated-result.dto.ts, src/shared/pagination/pagination-query.dto.ts |
| **Specialist Type** | code |
| **Purpose** | Pagination patterns — offset, cursor, keyset pagination, paginated response DTOs |
| **Activation Trigger** | files: **/pagination/**; keywords: pagination, page, cursor, offset, limit |

---

## Role

You are a **NestJS Pagination Specialist**. You supply patterns for paginating data in NestJS — offset-based for simple UIs, cursor-based for feeds/infinite scroll, keyset for large datasets, and standardized response envelopes.

---

## Patterns

### Pattern 252.1: Offset Pagination (Page + Limit)

**Category**: Basic Pagination
**Description**: Traditional page/limit — simple, suitable for ≤10K records.

```typescript
// DTO
export class PaginationQueryDto {
  @IsOptional() @IsInt() @Min(1) page: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit: number = 20;
}

// Service
async findAll(query: PaginationQueryDto): Promise<PaginatedResult<Order>> {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await this.orderRepo.findAndCount({
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

---

### Pattern 252.2: Cursor Pagination

**Category**: Advanced Pagination
**Description**: Cursor-based — stable for real-time feeds, no page drift.

```typescript
// DTO
export class CursorQueryDto {
  @IsOptional() @IsString() after?: string; // cursor = encoded ID
  @IsOptional() @IsInt() @Min(1) @Max(100) limit: number = 20;
}

// Service
async findAll(query: CursorQueryDto): Promise<CursorResult<Order>> {
  const { after, limit } = query;
  const qb = this.orderRepo.createQueryBuilder('order')
    .orderBy('order.createdAt', 'DESC')
    .addOrderBy('order.id', 'DESC')
    .take(limit + 1); // fetch one extra to check hasMore

  if (after) {
    const cursor = this.decodeCursor(after); // { createdAt, id }
    qb.where('(order.createdAt, order.id) < (:date, :id)', cursor);
  }

  const results = await qb.getMany();
  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;

  return {
    data,
    hasMore,
    endCursor: data.length > 0 ? this.encodeCursor(data[data.length - 1]) : null,
  };
}

private encodeCursor(entity: Order): string {
  return Buffer.from(JSON.stringify({ createdAt: entity.createdAt, id: entity.id })).toString('base64');
}
```

---

### Pattern 252.3: Paginated Response DTOs

**Category**: Response Format
**Description**: Standardized pagination envelopes.

```typescript
// Offset response
export class PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Cursor response
export class CursorResult<T> {
  data: T[];
  hasMore: boolean;
  endCursor: string | null;
}
```

---

### Pattern 252.4: When to Use Which

| Method | Best For | Performance | Stability |
|--------|----------|-------------|-----------|
| Offset | Admin panels, ≤10K rows | O(n) for large offsets | Pages shift on insert/delete |
| Cursor | Feeds, infinite scroll | O(1) consistent | Stable across mutations |
| Keyset | Large datasets, ≥100K rows | O(log n) with index | Stable, requires sorted column |

---

### Pattern 252.5: Reusable Pagination Helper

**Category**: Utility
**Description**: Generic pagination function for any TypeORM repository.

```typescript
export async function paginate<T>(
  repo: Repository<T>,
  query: PaginationQueryDto,
  where?: FindOptionsWhere<T>,
  order?: FindOptionsOrder<T>,
): Promise<PaginatedResult<T>> {
  const { page, limit } = query;
  const [data, total] = await repo.findAndCount({
    where,
    order: order ?? { createdAt: 'DESC' } as any,
    skip: (page - 1) * limit,
    take: limit,
  });
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// Usage
return paginate(this.orderRepo, query, { status: OrderStatus.ACTIVE });
```

---

### Pattern 252.6: Cursor-based Pagination (Large Datasets)

**When**: Dataset > 100K rows, OFFSET becomes O(n). Cursor encodes position for O(1) seek.

```typescript
// Encode cursor: base64 of composite key (createdAt + id for uniqueness)
function encodeCursor(entity: { id: string; createdAt: Date }): string {
  return Buffer.from(`${entity.createdAt.toISOString()}|${entity.id}`).toString('base64');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const [date, id] = Buffer.from(cursor, 'base64').toString().split('|');
  return { createdAt: new Date(date), id };
}

// TypeORM: cursor-based query
async findAfterCursor(cursor: string | null, limit: number): Promise<CursorPage<Order>> {
  const qb = this.repo.createQueryBuilder('order')
    .orderBy('order.createdAt', 'DESC')
    .addOrderBy('order.id', 'DESC')
    .take(limit + 1); // fetch 1 extra to detect hasMore

  if (cursor) {
    const { createdAt, id } = decodeCursor(cursor);
    qb.where('(order.createdAt, order.id) < (:date, :id)', { date: createdAt, id });
  }

  const items = await qb.getMany();
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  return {
    data: items,
    cursor: items.length > 0 ? encodeCursor(items[items.length - 1]) : null,
    hasMore,
  };
}
```

---

### Pattern 252.7: Keyset Pagination

**When**: Strict ordering guarantee needed. Uses WHERE clause instead of OFFSET.

```typescript
// Keyset: WHERE id > :lastId ORDER BY id LIMIT :limit
// Requires: stable unique ordering column (usually PK)
async findByKeyset(lastId: string | null, limit: number): Promise<Order[]> {
  const qb = this.repo.createQueryBuilder('order')
    .orderBy('order.id', 'ASC')
    .take(limit);

  if (lastId) {
    qb.where('order.id > :lastId', { lastId });
  }

  return qb.getMany();
}

// Prisma equivalent:
const results = await prisma.order.findMany({
  take: limit,
  skip: lastId ? 1 : 0,
  ...(lastId && { cursor: { id: lastId } }),
  orderBy: { id: 'asc' },
});
```

**Index requirement**: `CREATE INDEX idx_order_id ON orders (id ASC)` — ensures O(1) seek.

---

### Pattern 252.8: Infinite Scroll Response

**When**: Frontend needs cursor-based response for infinite scroll UX.

```typescript
// Response DTO — frontend-friendly format
export class CursorPageDto<T> {
  data: T[];
  meta: {
    cursor: string | null;  // opaque cursor for next page
    hasMore: boolean;        // false = end of list
    count: number;           // items in this page
  };
}

// Interceptor: auto-wrap cursor responses
@Injectable()
export class CursorPaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<CursorPageDto<any>> {
    return next.handle().pipe(
      map((result) => ({
        data: result.data,
        meta: { cursor: result.cursor, hasMore: result.hasMore, count: result.data.length },
      })),
    );
  }
}
```

---

## Best Practices

- Default limit: 20, max: 100 — prevent clients requesting 10K rows
- Always include total count for offset pagination (UI needs it for page numbers)
- Cursor pagination: opaque cursor (base64) — clients shouldn't parse it
- Index the sort column — pagination without index = full table scan

---

## Abnormal Case Patterns

1. **Slow COUNT(*)** — Large table with offset pagination. Fix: use cursor pagination or estimated count.
2. **Page drift** — New rows inserted between page requests. Fix: cursor pagination for stable ordering.
3. **No limit cap** — Client sends limit=999999. Fix: `@Max(100)` validation on limit.
4. **Sort column not indexed** — ORDER BY without index causes sort in memory. Fix: add DB index.
5. **Cursor tampered** — Client modifies base64 cursor. Fix: validate decoded cursor fields.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (252.1-252.5)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Pagination Specialist — Patterns | EPS v3.2*

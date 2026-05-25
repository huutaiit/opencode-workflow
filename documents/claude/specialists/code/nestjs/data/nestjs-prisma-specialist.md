# NestJS Prisma Specialist — Data
# NestJS Prismaスペシャリスト — データ
# Chuyen Gia Prisma NestJS — Du Lieu

**Version**: 1.0.0
**Technology**: NestJS 10+ Prisma ORM
**Aspect**: Prisma ORM Integration
**Category**: data
**Purpose**: Knowledge provider for NestJS Prisma — schema design, Prisma Client, relations, transactions, migrations, NestJS integration, testing

---

## Metadata

```json
{
  "id": "nestjs-prisma-specialist",
  "technology": "NestJS 10+ Prisma ORM",
  "aspect": "Prisma ORM Integration",
  "category": "data",
  "subcategory": "nestjs",
  "lines": 320,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Prisma — type-safe ORM with auto-generated client from schema",
    "E2: NestJS + Prisma — PrismaService, module integration, testing patterns",
    "E3: Prisma migrations — schema-first migrations, seeding"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 267.1–267.6 |
| **Directory Pattern** | `src/infrastructure/persistence/prisma/` |
| **Dependencies** | @prisma/client, prisma |
| **When To Use** | Alternative ORM with type-safe client generated from schema |
| **Source Skeleton** | prisma/schema.prisma, src/infrastructure/prisma/prisma.service.ts |
| **Specialist Type** | code |
| **Purpose** | Prisma ORM integration — schema, client, migrations, type-safe queries |
| **Activation Trigger** | files: **/prisma/**; keywords: prisma, prismaClient, prismaService, schema.prisma |

---

## Patterns

### Pattern 267.1: PrismaService

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Pattern 267.2: Schema Design

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Order {
  id          String      @id @default(uuid())
  customerId  String      @map("customer_id")
  status      OrderStatus @default(PENDING)
  totalAmount Decimal     @map("total_amount") @db.Decimal(12, 2)
  items       OrderItem[]
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  deletedAt   DateTime?   @map("deleted_at")

  @@map("orders")
  @@index([customerId])
  @@index([status])
}

enum OrderStatus {
  PENDING
  APPROVED
  REJECTED
  COMPLETED
  CANCELLED
}
```

### Pattern 267.3: Repository with Prisma

```typescript
@Injectable()
export class PrismaOrderRepository implements OrderRepositoryPort {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({
      where: { id, deletedAt: null },
      include: { items: true },
    });
    return record ? OrderMapper.toDomain(record) : null;
  }

  async save(order: Order): Promise<Order> {
    const data = OrderMapper.toPrisma(order);
    const saved = await this.prisma.order.upsert({
      where: { id: order.id },
      create: data,
      update: data,
      include: { items: true },
    });
    return OrderMapper.toDomain(saved);
  }

  async findByCustomer(customerId: string, page: number, limit: number): Promise<PaginatedResult<Order>> {
    const [records, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId, deletedAt: null },
        include: { items: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { customerId, deletedAt: null } }),
    ]);
    return { data: records.map(OrderMapper.toDomain), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
```

### Pattern 267.4: Transactions

```typescript
async createOrderWithPayment(dto: CreateOrderDto): Promise<Order> {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: OrderMapper.toPrisma(dto) });
    await tx.payment.create({
      data: { orderId: order.id, amount: order.totalAmount, status: 'PENDING' },
    });
    await tx.inventory.updateMany({
      where: { productId: { in: dto.items.map(i => i.productId) } },
      data: { reserved: { increment: 1 } },
    });
    return OrderMapper.toDomain(order);
  });
}
```

### Pattern 267.5: Soft Delete Middleware

```typescript
// Prisma middleware for automatic soft delete filtering
this.prisma.$use(async (params, next) => {
  if (params.action === 'findMany' || params.action === 'findFirst') {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null; // exclude soft-deleted by default
    }
  }
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }
  return next(params);
});
```

---

## Best Practices

- `prisma generate` after schema changes — regenerates typed client
- Use `$transaction` for multi-table writes — ACID guarantee
- Soft delete via middleware — transparent to application code
- Index columns used in WHERE and ORDER BY in schema

---

## Abnormal Case Patterns

1. **Client out of sync** — Schema changed, client not regenerated. Fix: run `prisma generate`.
2. **N+1 on relations** — Include not specified. Fix: use `include: { items: true }`.
3. **Transaction timeout** — Long transaction blocks other queries. Fix: keep transactions short (<5s).
4. **Migration conflict** — Two developers create conflicting migrations. Fix: resolve in PR, `prisma migrate resolve`.

---

*NestJS Prisma Specialist — Data | EPS v3.2*

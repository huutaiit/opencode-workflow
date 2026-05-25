# NestJS CRUD Base Specialist — Patterns
# NestJS CRUDベーススペシャリスト — パターン
# Chuyen Gia CRUD Base NestJS — Pattern

**Version**: 1.0.0
**Technology**: NestJS 10+ Generic CRUD
**Aspect**: CRUD Base Patterns
**Category**: patterns
**Purpose**: Knowledge provider for NestJS generic CRUD — base service, base controller, base entity, soft delete, bulk operations with TypeORM/Prisma generics

---

## Metadata

```json
{
  "id": "nestjs-crud-base-specialist",
  "technology": "NestJS 10+ Generic CRUD",
  "aspect": "CRUD Base Patterns",
  "category": "patterns",
  "subcategory": "nestjs",
  "lines": 380,
  "token_cost": 2300,
  "version": "1.0.0",
  "evidence": [
    "E1: TypeORM generic repository — Repository<T> pattern",
    "E2: Generic CRUD service — reduce boilerplate across entities",
    "E3: Soft delete — logical delete with deletedAt column"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 254.1–254.6 |
| **Directory Pattern** | `src/shared/base/` |
| **Dependencies** | none (generic TypeScript patterns) |
| **When To Use** | Reusable base entity, service, controller for standard CRUD operations |
| **Source Skeleton** | src/shared/base/base.entity.ts, src/shared/base/base-crud.service.ts |
| **Specialist Type** | code |
| **Purpose** | CRUD base patterns — generic repository, base service, abstract controller |
| **Activation Trigger** | files: **/base/**; keywords: crudBase, genericRepository, baseService, abstractController |

---

## Role

You are a **NestJS CRUD Base Specialist**. You supply patterns for generic, reusable CRUD operations — base entity with common fields, generic service with type-safe CRUD, generic controller, soft delete, and bulk operations.

---

## Patterns

### Pattern 254.1: Base Entity

**Category**: Foundation
**Description**: Common fields for all entities — id, timestamps, soft delete.

```typescript
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;
}

// Usage
@Entity('orders')
export class OrderEntity extends BaseEntity {
  @Column() customerId: string;
  @Column('decimal') totalAmount: number;
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;
}
```

**Key Points**:
- UUID primary key — no sequential ID leakage
- `timestamptz` — always store with timezone
- `@DeleteDateColumn` — TypeORM auto-filters soft-deleted records

---

### Pattern 254.2: Generic CRUD Service

**Category**: Foundation
**Description**: Type-safe base service with standard CRUD operations.

```typescript
export abstract class BaseCrudService<T extends BaseEntity> {
  constructor(protected readonly repo: Repository<T>) {}

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repo.find(options);
  }

  async findById(id: string): Promise<T> {
    const entity = await this.repo.findOneBy({ id } as any);
    if (!entity) throw new EntityNotFoundException(this.entityName, id);
    return entity;
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: DeepPartial<T>): Promise<T> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async hardDelete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  protected abstract get entityName(): string;
}

// Usage
@Injectable()
export class OrderService extends BaseCrudService<OrderEntity> {
  constructor(@InjectRepository(OrderEntity) repo: Repository<OrderEntity>) {
    super(repo);
  }
  protected get entityName() { return 'Order'; }

  // Add domain-specific methods
  async findByCustomer(customerId: string): Promise<OrderEntity[]> {
    return this.repo.find({ where: { customerId } as any });
  }
}
```

---

### Pattern 254.3: Generic CRUD Controller

**Category**: Foundation
**Description**: Base controller with standard REST endpoints.

```typescript
export abstract class BaseCrudController<T extends BaseEntity> {
  constructor(protected readonly service: BaseCrudService<T>) {}

  @Get()
  findAll(): Promise<T[]> { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<T> {
    return this.service.findById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.delete(id);
  }
}

// Usage — add create/update with specific DTOs
@Controller('orders')
export class OrderController extends BaseCrudController<OrderEntity> {
  constructor(private readonly orderService: OrderService) {
    super(orderService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrderDto): Promise<OrderEntity> {
    return this.orderService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderDto): Promise<OrderEntity> {
    return this.orderService.update(id, dto);
  }
}
```

---

### Pattern 254.4: Soft Delete

**Category**: Advanced CRUD
**Description**: Logical delete with automatic filtering.

```typescript
// TypeORM @DeleteDateColumn auto-filters:
// - repo.find() excludes soft-deleted
// - repo.findOne() excludes soft-deleted
// - Use repo.createQueryBuilder().withDeleted() to include

// Soft delete
await this.repo.softRemove(entity); // sets deletedAt

// Restore
await this.repo.recover(entity); // clears deletedAt

// Include deleted in query
const allIncludingDeleted = await this.repo
  .createQueryBuilder('order')
  .withDeleted()
  .getMany();
```

---

### Pattern 254.5: Bulk Operations

**Category**: Advanced CRUD
**Description**: Efficient bulk create/update/delete with transaction.

```typescript
async bulkCreate(items: DeepPartial<T>[]): Promise<T[]> {
  return this.repo.manager.transaction(async manager => {
    const entities = manager.create(this.repo.target, items);
    return manager.save(entities);
  });
}

async bulkUpdate(updates: { id: string; data: DeepPartial<T> }[]): Promise<T[]> {
  return this.repo.manager.transaction(async manager => {
    const results: T[] = [];
    for (const { id, data } of updates) {
      const entity = await manager.findOneBy(this.repo.target, { id } as any);
      if (!entity) throw new EntityNotFoundException(this.entityName, id);
      Object.assign(entity, data);
      results.push(await manager.save(entity));
    }
    return results;
  });
}

async bulkDelete(ids: string[]): Promise<void> {
  await this.repo.softDelete(ids);
}
```

---

### Pattern 254.6: When NOT to Use Generic CRUD

**Category**: Decision Guide
**Description**: Generic base is not always appropriate.

| Scenario | Generic CRUD? | Why |
|----------|--------------|-----|
| Simple resource (tags, categories) | Yes | Standard CRUD, no special logic |
| Complex domain (loans, payments) | Partial | Use base entity, custom service |
| Event-sourced aggregate | No | State built from events, not CRUD |
| Read-only view | No | No create/update/delete needed |
| Multi-tenant with row security | Partial | Need custom findAll with tenant filter |

---

## Best Practices

- Use generics for 80% boilerplate, add domain methods on top
- Base entity: always include UUID, timestamps, soft delete
- Base controller: findAll + findOne + delete are generic; create/update need specific DTOs
- Transaction for bulk operations — all-or-nothing consistency

---

## Abnormal Case Patterns

1. **Soft-deleted records in reports** — forgot `.withDeleted()`. Fix: use withDeleted for admin/audit views.
2. **Generic service too restrictive** — Every entity needs custom logic. Fix: override specific methods, keep base for common ones.
3. **Bulk update N+1** — Individual findOneBy per item. Fix: batch-load with `findByIds()`, then update.
4. **UUID collision** — Extremely unlikely but possible. Fix: database unique constraint catches it.
5. **Base controller leaks sensitive data** — findAll returns all fields. Fix: use response DTOs with serialization.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (254.1-254.6)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS CRUD Base Specialist — Patterns | EPS v3.2*

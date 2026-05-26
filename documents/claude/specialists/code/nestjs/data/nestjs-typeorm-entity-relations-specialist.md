# NestJS TypeORM Entity & Relations Specialist — Data
# NestJS TypeORMエンティティ＆リレーションスペシャリスト — データ
# Chuyen Gia Entity va Relation TypeORM NestJS — Du Lieu

**Version**: 2.0.0
**Technology**: NestJS 10+ TypeORM Entity Design
**Aspect**: TypeORM Entity & Relations
**Category**: data
**Purpose**: Knowledge provider for TypeORM entity design — entity definitions, relation mapping, column types, inheritance, embedded entities, repository patterns, entity mappers

---

## Metadata

```json
{
  "id": "nestjs-typeorm-entity-relations-specialist",
  "technology": "NestJS 10+ TypeORM Entity Design",
  "aspect": "TypeORM Entity & Relations",
  "category": "data",
  "subcategory": "nestjs",
  "lines": 500,
  "token_cost": 3000,
  "version": "2.0.0",
  "evidence": [
    "E1: TypeORM entity decorators — @Entity, @Column, @OneToMany, @ManyToOne",
    "E4: Entity design patterns — inheritance, embedded, value objects in ORM",
    "E5: p2plend entities — real-world TypeORM entity patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Domain |
| **Variant** | ALL |
| **Pattern Numbers** | 209.1–209.8 |
| **Directory Pattern** | `src/domain/entities/`, `src/infrastructure/persistence/` |
| **Naming Convention** | `{entity}.entity.ts`, `{entity}.repository.ts`, `{entity}.mapper.ts` |
| **Imports From** | Domain (entity interfaces, value objects), Infrastructure (TypeORM decorators) |
| **Imported By** | Application (via port interfaces) |
| **Cannot Import** | Presentation, Application directly |
| **Dependencies** | @nestjs/typeorm, typeorm, pg |
| **When To Use** | SQL database with TypeORM — entity design, relations, repositories |
| **Source Skeleton** | src/infrastructure/persistence/entities/{entity}.entity.ts, src/infrastructure/persistence/{entity}.repository.ts |
| **Specialist Type** | code |
| **Purpose** | TypeORM entities and relations — column types, relations, cascades, entity lifecycle |
| **Activation Trigger** | files: **/*.entity.ts; keywords: entity, column, oneToMany, manyToOne, typeorm |

> **See also**: nestjs-typeorm-queries-migrations (209.9+) for QueryBuilder, transactions, migrations

---

## Role

You are a **NestJS TypeORM Entity & Relations Specialist**. You supply patterns for TypeORM entity design in NestJS clean architecture — entity definitions, relation types, column configuration, inheritance strategies, embedded entities, port-based repository abstraction, and entity-domain mapping.

**Used by**: Any code agent designing database entities with TypeORM in NestJS
**Not used by**: Prisma-based projects, non-SQL databases

---

## Patterns

### Pattern 209.1: Entity Definition

**Category**: Entity Fundamentals
**Description**: Standard entity with typed columns, UUID primary key, timestamps.

```typescript
@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

**Key Points**:
- UUID primary key — no sequential ID exposure
- Explicit column names with `name:` — control DB naming (snake_case)
- `timestamptz` for dates — always timezone-aware
- `@DeleteDateColumn` enables soft delete automatically

---

### Pattern 209.2: Relations

**Category**: Entity Fundamentals
**Description**: Define @OneToMany, @ManyToOne, @ManyToMany with proper owning side.

```typescript
// One-to-Many: Order → OrderItems
@Entity('orders')
export class OrderEntity {
  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true, eager: false })
  items: OrderItemEntity[];
}

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;
}

// Many-to-Many: User ↔ Roles
@Entity('users')
export class UserEntity {
  @ManyToMany(() => RoleEntity, { eager: true }) // eager for roles (always needed)
  @JoinTable({ name: 'user_roles' })
  roles: RoleEntity[];
}
```

**Key Points**:
- `@JoinColumn` on the owning side (ManyToOne side)
- `cascade: true` on parent — creating parent creates children automatically
- `onDelete: 'CASCADE'` — DB-level cascade for referential integrity
- `eager: true` only for always-needed relations (e.g., roles) — performance impact

---

### Pattern 209.3: Column Types Reference

**Category**: Entity Configuration

| TypeScript | PostgreSQL | Decorator |
|-----------|-----------|-----------|
| `string` | `varchar` | `@Column()` |
| `string` (long) | `text` | `@Column({ type: 'text' })` |
| `number` (int) | `integer` | `@Column({ type: 'int' })` |
| `number` (decimal) | `decimal` | `@Column({ type: 'decimal', precision: 12, scale: 2 })` |
| `boolean` | `boolean` | `@Column({ type: 'boolean', default: false })` |
| `Date` | `timestamptz` | `@Column({ type: 'timestamptz' })` |
| `enum` | `enum` | `@Column({ type: 'enum', enum: Status })` |
| `object` | `jsonb` | `@Column({ type: 'jsonb' })` |
| `string[]` | `text[]` | `@Column({ type: 'text', array: true })` |

---

### Pattern 209.4: Port-Based Repository

**Category**: Clean Architecture
**Description**: Domain defines interface, Infrastructure implements with TypeORM.

```typescript
// domain/ports/order-repository.port.ts
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export interface OrderRepositoryPort {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
  findByCustomer(customerId: string): Promise<Order[]>;
  delete(id: string): Promise<void>;
}

// infrastructure/persistence/typeorm-order.repository.ts
@Injectable()
export class TypeOrmOrderRepository implements OrderRepositoryPort {
  constructor(
    @InjectRepository(OrderEntity) private repo: Repository<OrderEntity>,
  ) {}

  async findById(id: string): Promise<Order | null> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['items'],
    });
    return entity ? OrderMapper.toDomain(entity) : null;
  }

  async save(order: Order): Promise<Order> {
    const ormEntity = OrderMapper.toOrm(order);
    const saved = await this.repo.save(ormEntity);
    return OrderMapper.toDomain(saved);
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    const entities = await this.repo.find({
      where: { customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(OrderMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}

// Module wiring
{ provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository }
```

**Key Points**:
- Domain port is PURE interface — no TypeORM imports
- Repository returns Domain entities, not ORM entities
- Mapper converts between ORM ↔ Domain at the boundary
- `softDelete` instead of `delete` — preserve audit trail

---

### Pattern 209.5: Entity Mapper

**Category**: Clean Architecture
**Description**: Convert between ORM entity and domain model.

```typescript
export class OrderMapper {
  static toDomain(entity: OrderEntity): Order {
    return Order.reconstitute({
      id: entity.id,
      customerId: entity.customerId,
      status: entity.status,
      totalAmount: Money.create(entity.totalAmount, 'VND'),
      items: entity.items?.map(OrderItemMapper.toDomain) ?? [],
      createdAt: entity.createdAt,
    });
  }

  static toOrm(domain: Order): OrderEntity {
    const entity = new OrderEntity();
    entity.id = domain.id;
    entity.customerId = domain.customerId;
    entity.status = domain.status;
    entity.totalAmount = domain.totalAmount.amount;
    entity.items = domain.items.map(OrderItemMapper.toOrm);
    return entity;
  }
}
```

---

### Pattern 209.6: Entity Inheritance

**Category**: Advanced Entity
**Description**: Single Table Inheritance for polymorphic entities.

```typescript
@Entity('notifications')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class NotificationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() recipientId: string;
  @Column() message: string;
  @CreateDateColumn() createdAt: Date;
}

@ChildEntity('email')
export class EmailNotificationEntity extends NotificationEntity {
  @Column() emailAddress: string;
  @Column() subject: string;
}

@ChildEntity('sms')
export class SmsNotificationEntity extends NotificationEntity {
  @Column() phoneNumber: string;
}
```

---

### Pattern 209.7: Embedded Entities

**Category**: Advanced Entity
**Description**: Reuse column groups across entities without separate tables.

```typescript
export class Address {
  @Column({ nullable: true }) street: string;
  @Column({ nullable: true }) city: string;
  @Column({ nullable: true }) postalCode: string;
  @Column({ nullable: true }) country: string;
}

@Entity('users')
export class UserEntity {
  @Column(() => Address, { prefix: 'home' })
  homeAddress: Address; // columns: home_street, home_city, etc.

  @Column(() => Address, { prefix: 'work' })
  workAddress: Address; // columns: work_street, work_city, etc.
}
```

---

### Pattern 209.8: Custom Repository Methods

**Category**: Advanced Repository
**Description**: Encapsulate complex queries in repository methods.

```typescript
@Injectable()
export class TypeOrmOrderRepository implements OrderRepositoryPort {
  // ... basic CRUD from 209.4

  async findPendingOlderThan(hours: number): Promise<Order[]> {
    const cutoff = new Date(Date.now() - hours * 3600_000);
    const entities = await this.repo.find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
      order: { createdAt: 'ASC' },
    });
    return entities.map(OrderMapper.toDomain);
  }

  async countByStatus(): Promise<Record<OrderStatus, number>> {
    const result = await this.repo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();
    return Object.fromEntries(result.map(r => [r.status, parseInt(r.count)]));
  }
}
```

---

## Best Practices

### Entity Design
- UUID primary keys — never expose sequential IDs
- Explicit column names (snake_case) — don't rely on auto-naming
- `timestamptz` for all dates — timezone-safe storage
- `@DeleteDateColumn` by default — soft delete for audit compliance

### Relations
- `eager: false` by default — load relations explicitly when needed
- `cascade: true` only on parent → child (not inverse)
- Use `@JoinColumn` on the owning side (FK holder)
- `onDelete: 'CASCADE'` on children — prevent orphan records

### Repository Pattern
- Repository returns Domain objects, not ORM entities
- One mapper class per aggregate — centralizes conversion logic
- Port interface in domain, implementation in infrastructure
- Soft delete as default — use `hardDelete` only for GDPR/compliance

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Domain uses @Entity | ORM leaks into domain | Separate ORM entity + domain entity + mapper |
| Eager on everything | Every query loads full graph | `eager: false`, load explicitly |
| No @JoinColumn | TypeORM guesses FK column | Always specify `@JoinColumn({ name: '...' })` |
| Decimal as number | Floating point precision loss | Use `decimal` column, Decimal.js in domain |
| Repository returns ORM | Controller sees TypeORM columns | Mapper converts ORM → Domain in repository |

---

## Testing Patterns

```typescript
// Integration test with real DB
describe('TypeOrmOrderRepository', () => {
  let repo: TypeOrmOrderRepository;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    const ormRepo = dataSource.getRepository(OrderEntity);
    repo = new TypeOrmOrderRepository(ormRepo);
  });

  it('should save and retrieve order', async () => {
    const order = Order.create('customer-1', [OrderItem.create('prod-1', 2, 100)]);
    const saved = await repo.save(order);
    const found = await repo.findById(saved.id);
    expect(found).toBeDefined();
    expect(found!.customerId).toBe('customer-1');
  });
});
```

---

## Abnormal Case Patterns

1. **N+1 query explosion** — Lazy-loaded relations in loops. Fix: `relations: ['items']` or `leftJoinAndSelect`.
2. **Entity/Domain coupling** — ORM entity used in domain. Fix: mapper + separate domain model.
3. **Cascade deletes unintended** — Parent delete cascades to children unexpectedly. Fix: explicitly set `onDelete` behavior.
4. **UUID collision** — Extremely rare but possible. Fix: DB unique constraint catches it.
5. **Decimal precision loss** — Using `number` for money. Fix: `decimal(12,2)` column + Decimal.js.
6. **Migration drift** — Schema changed manually. Fix: always use `typeorm migration:generate`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E4, E5)?
- [ ] **Q2**: Pattern IDs unique (209.1-209.8)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS TypeORM Entity & Relations Specialist — Data | EPS v3.2*

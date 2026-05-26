# NestJS Data Migration Specialist — Cross-Cutting
# NestJSデータマイグレーションスペシャリスト — 横断的関心事
# Chuyen Gia Di Chuyen Du Lieu NestJS — Cat Ngang

**Version**: 1.0.0
**Technology**: NestJS 10+ Data Migration (TypeORM)
**Aspect**: Data Migration
**Category**: cross-cutting
**Purpose**: Knowledge provider for NestJS data migration — TypeORM migrations, seed data, rollback strategies, schema validation, CI migration checks

---

## Metadata

```json
{
  "id": "nestjs-data-migration-specialist",
  "technology": "NestJS 10+ Data Migration (TypeORM)",
  "aspect": "Data Migration",
  "category": "cross-cutting",
  "subcategory": "nestjs",
  "lines": 220,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: TypeORM migrations — MigrationInterface with up/down for schema changes",
    "E2: Seed data — factory-based test/development data population",
    "E3: Rollback strategies — reversible migrations with down() for safe rollback",
    "E4: CI migration checks — automated pending migration detection in pipelines"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 229.1–229.8 |
| **Directory Pattern** | `src/infrastructure/persistence/migrations/` |
| **Naming Convention** | `{timestamp}-{description}.ts` (migration), `{order}-{name}.seed.ts`, `rollback-{name}.ts` |
| **Imports From** | Infrastructure only (TypeORM migration API, DataSource, QueryRunner) |
| **Imported By** | None (migrations executed by CLI runner, not imported by application code) |
| **Cannot Import** | Domain, Application, Presentation (migrations are standalone infrastructure scripts) |
| **Dependencies** | typeorm |
| **When To Use** | Database schema migrations, seed data, zero-downtime migration |
| **Source Skeleton** | src/infrastructure/database/migrations/*.ts, src/infrastructure/database/seeds/*.ts |
| **Specialist Type** | code |
| **Purpose** | Database migration management — TypeORM migrations, schema versioning, rollback |
| **Activation Trigger** | files: **/migrations/**; keywords: migration, queryRunner, createTable, alterColumn |

---

## Role

You are a **NestJS Data Migration Specialist**. Your responsibility is to provide data migration best practices for NestJS microservice projects following clean architecture. You supply patterns for TypeORM migration authoring, seed data management, rollback strategies, data transformation during schema changes, migration ordering, schema validation, and CI pipeline integration.

**Used by**: Any code agent working with NestJS database schema changes and data migrations
**Not used by**: Non-NestJS stacks, projects not using TypeORM, in-memory-only databases

---

## Patterns

### Pattern 229.1–229.4: Migration Fundamentals (HIGH)

```
229.1 TypeORM migration: implements MigrationInterface { up(queryRunner), down(queryRunner) }.
      Each migration is a single unit of schema change — atomic, reversible, timestamped.
```

```typescript
export class AddUserEmailIndex1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX idx_user_email ON "user" ("email")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_user_email`);
  }
}
```

```
229.2 Migration generation: typeorm migration:generate -d dataSource.ts.
      Auto-generates migration from entity diff — always review generated SQL before committing.
```

```typescript
// dataSource.ts — CLI-only DataSource for migration generation
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
});
// Run: npx typeorm migration:generate -d dataSource.ts src/infrastructure/database/migrations/AddUserEmailIndex
```

```
229.3 Seed data: Factory-based seed scripts for development/testing data.
      Seeds are idempotent — safe to run multiple times without duplicating data.
```

```typescript
export class UserSeed implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(User);
    const exists = await repo.findOneBy({ email: 'admin@test.com' });
    if (!exists) {
      await repo.save(repo.create({ email: 'admin@test.com', role: 'admin' }));
    }
  }
}
```

```
229.4 Rollback strategy: Every up() has corresponding down() for safe rollback.
      Test both up and down in development — never ship a migration without verified rollback.
```

```typescript
export class AddOrderStatusColumn1700000001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('order', new TableColumn({
      name: 'status', type: 'varchar', default: `'pending'`,
    }));
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('order', 'status');
  }
}
```

### Pattern 229.5–229.8: Advanced Migration Patterns (MEDIUM-HIGH)

```
229.5 Data migration: Transform existing data during schema changes.
      Combine DDL (add column) + DML (backfill data) in a single migration — wrap in transaction.
```

```typescript
export class SplitFullName1700000002000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('user', new TableColumn({ name: 'first_name', type: 'varchar', isNullable: true }));
    await queryRunner.addColumn('user', new TableColumn({ name: 'last_name', type: 'varchar', isNullable: true }));
    await queryRunner.query(`UPDATE "user" SET first_name = split_part(full_name, ' ', 1), last_name = split_part(full_name, ' ', 2)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'last_name');
    await queryRunner.dropColumn('user', 'first_name');
  }
}
```

```
229.6 Migration ordering: Timestamp-based ordering ensures correct execution sequence.
      TypeORM sorts by class name (timestamp prefix) — never manually rename timestamps.
```

```typescript
// Correct ordering via timestamp prefix:
// 1700000000000-CreateUserTable.ts     (runs first)
// 1700000001000-AddOrderStatusColumn.ts (runs second)
// 1700000002000-SplitFullName.ts        (runs third)
// Generate timestamps via: npx typeorm migration:create
```

```
229.7 Schema validation: Compare entity metadata with database schema on startup.
      Enable synchronize:false in production — use migrations only. Validate on dev/test startup.
```

```typescript
// app.module.ts — DataSource configuration
TypeOrmModule.forRoot({
  synchronize: false, // NEVER true in production
  migrationsRun: process.env.NODE_ENV === 'test', // auto-run in test only
  migrations: ['dist/infrastructure/database/migrations/*.js'],
}),
// Validate: npx typeorm schema:log -d dataSource.ts (shows pending DDL diff)
```

```
229.8 CI migration check: Run pending migrations check in CI pipeline before deploy.
      Fail CI if migrations are pending but not included — prevent drift between code and schema.
```

```typescript
// ci-migration-check.ts — run in CI pipeline
const dataSource = new DataSource(/* config */);
await dataSource.initialize();
const pending = await dataSource.showMigrations(); // true if pending
if (pending) {
  console.error('Pending migrations detected — run migrations before deploy');
  process.exit(1);
}
await dataSource.destroy();
```

---

### Pattern 229.9: Zero-downtime Migration (Expand-Contract)

**When**: Production system cannot tolerate downtime during schema changes.

```typescript
// Phase 1: EXPAND — add new column, keep old column
export class Migration1234_ExpandEmailColumn implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'email_normalized', type: 'varchar', isNullable: true, // nullable during transition
    }));
    // Backfill in batches (separate migration or background job)
    await queryRunner.query(`
      UPDATE users SET email_normalized = LOWER(email)
      WHERE email_normalized IS NULL
      LIMIT 10000
    `);
  }
}

// Phase 2: CONTRACT — after app reads from new column, drop old
export class Migration1235_ContractEmailColumn implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'email');
    await queryRunner.renameColumn('users', 'email_normalized', 'email');
    await queryRunner.changeColumn('users', 'email', new TableColumn({
      name: 'email', type: 'varchar', isNullable: false,
    }));
  }
}
```

**Key**: Deploy app reading BOTH columns between Phase 1 and Phase 2.

---

### Pattern 229.10: Rollback Strategy

```typescript
// Forward-only (recommended for production)
// - Never rely on down() in production — may lose data
// - If migration fails: fix forward with a new migration
// - down() only for development convenience

// Reversible (development only)
export class Migration1234 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('orders', new TableColumn({ name: 'priority', type: 'int', default: 0 }));
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders', 'priority');
  }
}

// Prisma rollback:
// prisma migrate resolve --rolled-back "20240101000000_add_priority"
// Then create new migration to fix the issue
```

**CI testing**: Always test `up()` → verify → `down()` → verify in CI pipeline before deploying.

---

### Pattern 229.11: Data Migration (Separate from Schema)

```typescript
// Data migrations: separate from schema migrations
// Run as background job or one-time script, NOT in TypeORM migration
@Injectable()
export class DataMigrationService {
  private readonly BATCH_SIZE = 5000;

  async migrateUserEmails(): Promise<void> {
    let processed = 0;
    let lastId: string | null = null;

    while (true) {
      const batch = await this.repo.createQueryBuilder('u')
        .where(lastId ? 'u.id > :lastId' : '1=1', { lastId })
        .orderBy('u.id', 'ASC')
        .take(this.BATCH_SIZE)
        .getMany();

      if (batch.length === 0) break;

      // Process batch — idempotent operation
      await this.repo.createQueryBuilder()
        .update(User)
        .set({ emailNormalized: () => 'LOWER(email)' })
        .whereInIds(batch.map(u => u.id))
        .execute();

      lastId = batch[batch.length - 1].id;
      processed += batch.length;
      this.logger.log(`Data migration: ${processed} users processed`);
    }
  }
}
```

**Key**: Cursor-based batching (not OFFSET), idempotent, progress logging, can resume if interrupted.

---

### Pattern 229.12: Migration Naming & Versioning

```
# Convention: {timestamp}-{description}.ts
# TypeORM auto-generates timestamp prefix

1712345678901-CreateUsersTable.ts        # Schema: create table
1712345678902-AddEmailIndexToUsers.ts     # Schema: add index
1712345678903-SeedDefaultRoles.ts         # Seed: initial data
1712345679001-BackfillNormalizedEmail.ts   # Data: backfill column

# Rules:
# - Timestamp ensures ordering across branches
# - PascalCase description in class name
# - Prefix convention for type: no prefix (schema), Seed* (seed), Backfill* (data)
# - Never rename or reorder existing migrations
# - Branch merge conflicts: re-generate timestamp for later migration
```

**Team coordination**: Lock file `migrations/.migration-lock` prevents concurrent migration generation. CI runs `typeorm migration:run` on test DB to verify ordering.

---

## Abnormal Case Patterns (4 patterns)

1. **Migration fails halfway with partial DDL applied** — Non-transactional DDL (e.g., MySQL) leaves schema in broken state. Fix: Use PostgreSQL where DDL is transactional, or split risky migrations into small atomic steps with tested rollback.

2. **Seed data conflicts with production data** — Seed script inserts records that clash with existing production IDs. Fix: Make seeds idempotent (229.3) with existence checks. Never seed with hardcoded primary keys in production environments.

3. **Entity drift — code entity does not match database schema** — Migration was committed but entity file was not updated. Fix: Run `typeorm schema:log` (229.7) in CI to detect entity-vs-schema drift before deploy.

4. **Down migration loses data irreversibly** — Column dropped in down() that contained production data. Fix: Data-destructive down() migrations should be flagged in code review. Consider soft-delete columns (rename with `_deprecated` suffix) instead of dropping.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3, E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (229.1-229.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Data Migration Specialist — Cross-Cutting | EPS v3.2*

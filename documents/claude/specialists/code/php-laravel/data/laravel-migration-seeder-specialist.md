# Laravel Migration & Seeder Specialist — Data
# Laravel マイグレーション＆シーダースペシャリスト — データ
# Chuyen Gia Migration va Seeder Laravel — Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Migrations & Seeders
**Aspect**: Migrations, Seeders, Factories
**Category**: data
**Purpose**: Knowledge provider for Laravel migration and seeder architecture — Blueprint schema, column modifiers, foreign keys, seeders with factories, transactions, squashing, anonymous migrations, and testing strategies

---

## Metadata

```json
{
  "id": "laravel-migration-seeder-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Migrations & Seeders",
  "aspect": "Migrations, Seeders, Factories",
  "category": "data",
  "subcategory": "php-laravel",
  "lines": 470,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 anonymous migrations — prevents class name collisions",
    "E2: Blueprint schema builder — fluent column/index/constraint definition",
    "E3: RefreshDatabase trait — test isolation with transaction rollback or migration reset"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 319.1–319.8 |
| **Directory Pattern** | `database/migrations/`, `database/seeders/`, `database/factories/` |
| **Naming Convention** | `YYYY_MM_DD_HHMMSS_{description}.php`, `{Entity}Seeder.php`, `{Entity}Factory.php` |
| **Imports From** | Domain (enums for default values) |
| **Imported By** | Testing (RefreshDatabase), CLI (artisan migrate/seed) |
| **Cannot Import** | Controllers, Services, Repositories |
| **Dependencies** | `illuminate/database` |
| **When To Use** | Every Laravel project managing database schema and test data |
| **Source Skeleton** | `database/migrations/*.php`, `database/seeders/*.php` |
| **Specialist Type** | code |
| **Purpose** | Migration and seeder patterns — schema definition, column modifiers, foreign keys, factories, transactions, squashing, anonymous migrations |
| **Activation Trigger** | files: `database/migrations/*.php`, `database/seeders/*.php`; keywords: migrate, Schema, Blueprint, seeder, factory, foreign |

---

## Role

You are a **Laravel Migration & Seeder Specialist**. Your responsibility is to provide best practices for PHP 8.3 + Laravel 11 database migrations and seeders — Blueprint schema building, column modifiers, foreign key constraints, seeders with model factories, database transactions in migrations, migration squashing, anonymous migrations, and testing with RefreshDatabase.

**Used by**: Any code agent working with Laravel database schema management and test data
**Not used by**: Non-Laravel stacks, projects using raw SQL migrations only

---

## Patterns

### Pattern 319.1: Migration Basics — Blueprint

**Category**: Schema Definition
**Description**: Standard migration structure with Blueprint for table creation and modification.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reference_number', 20)->unique();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('status', 30)->default('pending');
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
```

**Key Points**:
- Laravel 11 uses anonymous migration classes — `return new class extends Migration`
- `$table->id()` creates auto-incrementing `BIGINT UNSIGNED` primary key
- `$table->foreignId()->constrained()` creates FK with convention-based naming
- Always define `down()` for rollback — `Schema::dropIfExists()` is safe
- Add composite indexes for frequently queried column combinations

---

### Pattern 319.2: Column Modifiers

**Category**: Schema Definition
**Description**: Column type modifiers — nullable, default, after, change, and virtual columns.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            // Add columns with modifiers
            $table->string('sku', 50)->unique()->after('id');
            $table->decimal('weight', 8, 3)->nullable()->default(null)->after('price');
            $table->boolean('is_featured')->default(false)->after('is_active');
            $table->text('internal_notes')->nullable()->invisible();

            // Virtual/stored generated columns
            $table->decimal('price_with_tax', 12, 2)
                ->storedAs('price * 1.10')
                ->after('price');

            // Modify existing column
            $table->string('name', 500)->change(); // Was 255, now 500
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn([
                'sku', 'weight', 'is_featured',
                'internal_notes', 'price_with_tax',
            ]);
            $table->string('name', 255)->change();
        });
    }
};
```

**Key Points**:
- `after('column')` controls column position — MySQL only, ignored on PostgreSQL
- `storedAs()` creates database-level computed column — calculated on write
- `virtualAs()` creates virtual computed column — calculated on read, not stored
- `invisible()` hides column from `SELECT *` — MySQL 8.0+ only
- `change()` modifies existing column — requires `doctrine/dbal` for older Laravel

---

### Pattern 319.3: Foreign Keys

**Category**: Referential Integrity
**Description**: Foreign key constraints with cascade options, polymorphic morphs, and nullable relations.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();

            // Shorthand: foreignId + constrained + cascade
            $table->foreignId('order_id')
                ->constrained()
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // Nullable foreign key — optional relationship
            $table->foreignId('coupon_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // Explicit foreign key with custom reference
            $table->unsignedBigInteger('product_variant_id');
            $table->foreign('product_variant_id')
                ->references('id')
                ->on('product_variants')
                ->restrictOnDelete();

            // Polymorphic columns
            $table->morphs('itemable'); // itemable_id + itemable_type + index

            $table->integer('quantity')->unsigned();
            $table->decimal('unit_price', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
```

**Key Points**:
- `cascadeOnDelete()` — delete children when parent is deleted
- `nullOnDelete()` — set FK to NULL when parent is deleted (requires nullable)
- `restrictOnDelete()` — prevent parent deletion while children exist
- `$table->morphs('name')` creates `name_id`, `name_type`, and composite index
- `constrained()` infers table name from column — `user_id` → `users` table

---

### Pattern 319.4: Seeder with Factories

**Category**: Test Data
**Description**: Database seeder using model factories with relationships and realistic data.

```php
<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            ProductSeeder::class,
            UserSeeder::class,
        ]);
    }
}

final class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user — known credentials for development
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);

        // Regular users with orders
        $products = Product::all();

        User::factory()
            ->count(50)
            ->has(
                Order::factory()
                    ->count(rand(1, 10))
                    ->has(
                        OrderItem::factory()
                            ->count(rand(1, 5))
                            ->state(fn () => [
                                'product_id' => $products->random()->id,
                            ]),
                        relationship: 'items',
                    ),
                relationship: 'orders',
            )
            ->create();
    }
}
```

**Key Points**:
- `$this->call()` runs seeders in order — use for dependency ordering
- `has()` creates related models inline — replaces `afterCreating()` callbacks
- State closure `fn ()` re-evaluates per record for varied data
- Create known test accounts (admin) with explicit attributes for development
- `count()` before `has()` — creates N parents each with M children

---

### Pattern 319.5: Database Transactions in Migrations

**Category**: Migration Safety
**Description**: Wrapping migrations in transactions for atomic schema changes on supported databases.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Multi-step migration wrapped in transaction.
     * Note: MySQL does NOT support transactional DDL — only PostgreSQL does.
     */
    public function up(): void
    {
        // For PostgreSQL: atomic DDL + DML
        DB::transaction(function (): void {
            Schema::table('orders', function (Blueprint $table): void {
                $table->string('fulfillment_status', 30)
                    ->default('unfulfilled')
                    ->after('status');
            });

            // Backfill data based on existing status
            DB::table('orders')
                ->where('status', 'shipped')
                ->update(['fulfillment_status' => 'fulfilled']);

            DB::table('orders')
                ->where('status', 'partially_shipped')
                ->update(['fulfillment_status' => 'partial']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn('fulfillment_status');
        });
    }
};
```

**Key Points**:
- PostgreSQL supports transactional DDL — schema changes can be rolled back
- MySQL/MariaDB do NOT — DDL causes implicit commit; transaction has no effect on schema
- Use transactions for data migrations (DML) on all databases
- Backfill data in the same migration that adds the column
- For MySQL, consider two-step deployment: add column first, backfill second

---

### Pattern 319.6: Squashing Migrations

**Category**: Migration Management
**Description**: Squash migrations into SQL dump for faster fresh installs and cleaner history.

```php
// Command: php artisan schema:dump
// Output: database/schema/mysql-schema.sql (or pgsql-schema.sql)

// After squashing:
// 1. All existing migrations are preserved but skipped on fresh install
// 2. Schema dump is loaded first, then remaining migrations run
// 3. Safe to delete old migration files after dump

// Squash with prune — remove old migration files:
// php artisan schema:dump --prune

// Migration stub that references the dump:
```

```php
<?php

// After squash, new migrations continue normally:
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('timezone', 50)->default('UTC')->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('timezone');
        });
    }
};
```

**Key Points**:
- `schema:dump` creates a SQL snapshot of current schema state
- Fresh installs load the dump then run migrations created after the dump
- `--prune` deletes migrated files — use only when team agrees
- Squash when migration count exceeds 50+ files for faster CI/CD
- Schema dump is database-driver-specific — separate dumps for MySQL vs PostgreSQL

---

### Pattern 319.7: Anonymous Migrations (Laravel 11)

**Category**: Migration Structure
**Description**: Anonymous migration classes to prevent class name collisions in large projects.

```php
<?php

// Laravel 11 default: anonymous class — no naming conflicts
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Table-specific migration for better organization.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 50);
            $table->string('auditable_type');
            $table->unsignedBigInteger('auditable_id');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['auditable_type', 'auditable_id']);
            $table->index('user_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
```

**Key Points**:
- Anonymous classes (`return new class`) prevent `CreateUsersTable` name collisions
- Laravel 11 generates anonymous migrations by default via `make:migration`
- No need for unique class names — file path is the identifier
- Cannot reference anonymous migrations by class name — use file name for rollback
- All existing named migrations continue to work alongside anonymous ones

---

### Pattern 319.8: Testing with RefreshDatabase

**Category**: Test Isolation
**Description**: Database testing strategies — RefreshDatabase, DatabaseTransactions, and factory-driven assertions.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OrderTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Seed specific seeders for this test class.
     */
    protected string $seeder = \Database\Seeders\ProductSeeder::class;

    public function test_user_can_create_order(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'items' => [
                ['product_id' => 1, 'quantity' => 2],
            ],
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'status' => 'pending',
        ]);
    }

    public function test_order_total_is_calculated(): void
    {
        $order = Order::factory()
            ->has(\App\Models\OrderItem::factory()->count(3))
            ->create();

        $this->assertDatabaseCount('order_items', 3);
        $this->assertNotEquals(0, $order->fresh()->total_amount);
    }

    public function test_soft_deleted_order_excluded(): void
    {
        $order = Order::factory()->create();
        $order->delete();

        $this->assertSoftDeleted('orders', ['id' => $order->id]);
        $this->assertDatabaseHas('orders', ['id' => $order->id]); // Row still exists
    }
}
```

**Key Points**:
- `RefreshDatabase` migrates once, wraps each test in a transaction for speed
- `$seeder` property seeds specific data for the test class
- `assertDatabaseHas()` / `assertDatabaseMissing()` for existence checks
- `assertSoftDeleted()` verifies soft-deleted records
- `DatabaseTransactions` trait skips migration — use when DB is already migrated

---

## Best Practices

- **Anonymous migrations** — use Laravel 11 default anonymous classes to prevent name collisions
- **Always define down()** — enable rollback; use `dropIfExists()` for safety
- **Foreign key naming** — use `foreignId()->constrained()` for convention-based FK creation
- **Index strategically** — add indexes for columns used in WHERE, JOIN, ORDER BY clauses
- **Seed in order** — use `$this->call()` with dependency ordering in DatabaseSeeder
- **Transactions for DML** — wrap data backfill operations in `DB::transaction()`
- **Squash at scale** — dump schema when migration count exceeds 50 files
- **Test with RefreshDatabase** — fastest isolation strategy for feature tests

---

## Abnormal Case Patterns

1. **Migration class name collision** — two migrations with `CreateUsersTable` class. Fix: use anonymous migrations (Laravel 11 default).

2. **Foreign key on wrong column type** — `$table->integer('user_id')` FK to `$table->id()` (bigInteger). Fix: always use `foreignId()` which matches `id()` type.

3. **Down migration data loss** — `dropColumn()` in down() destroys data with no recovery. Fix: document that down() is destructive; consider soft-remove patterns for production.

4. **Seeder order dependency** — UserSeeder runs before RoleSeeder but needs roles. Fix: explicit ordering in `DatabaseSeeder::run()` via `$this->call()` array order.

5. **RefreshDatabase slow on large schema** — 200+ migrations take minutes per test run. Fix: use `schema:dump` to squash, or use `DatabaseTransactions` with pre-migrated DB.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (319.1–319.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Migration & Seeder Specialist — Data | EPS v3.2*

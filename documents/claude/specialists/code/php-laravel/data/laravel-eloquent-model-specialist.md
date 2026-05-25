# Laravel Eloquent Model Specialist — Data
# Laravel Eloquentモデルスペシャリスト — データ
# Chuyen Gia Eloquent Model Laravel — Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Eloquent Models
**Aspect**: Eloquent Model Definition
**Category**: data
**Purpose**: Knowledge provider for Eloquent model architecture — casts, fillable, hidden, accessors/mutators, factories, soft deletes, events, scopes, pruning, and serialization

---

## Metadata

```json
{
  "id": "laravel-eloquent-model-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Eloquent Models",
  "aspect": "Eloquent Model Definition",
  "category": "data",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 Eloquent model conventions — casts as method, typed properties",
    "E2: PHP 8.3 Attribute class for accessors/mutators — replacing legacy get/set prefixes",
    "E3: Prunable/MassPrunable traits — automated model cleanup via schedule"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 316.1–316.8 |
| **Directory Pattern** | `app/Models/` |
| **Naming Convention** | `{Entity}.php` |
| **Imports From** | Infrastructure (database, casts), Domain (enums, value objects) |
| **Imported By** | Application (services), Infrastructure (repositories, controllers) |
| **Cannot Import** | Controllers, Requests, Commands |
| **Dependencies** | `illuminate/database` |
| **When To Use** | Every Laravel project using Eloquent ORM for data persistence |
| **Source Skeleton** | `app/Models/{Entity}.php` |
| **Specialist Type** | code |
| **Purpose** | Eloquent model definition — casts, attributes, factories, soft deletes, events, scopes, pruning, serialization |
| **Activation Trigger** | files: `app/Models/*.php`; keywords: Model, fillable, casts, Attribute, SoftDeletes, Prunable |

---

## Role

You are a **Laravel Eloquent Model Specialist**. Your responsibility is to provide best practices for PHP 8.3 + Laravel 11 Eloquent model architecture — property casting, mass assignment protection, accessor/mutator patterns, model factories, soft deletion, model events, global scopes, prunable models, and serialization strategies.

**Used by**: Any code agent working with Laravel Eloquent models and database entities
**Not used by**: Non-Laravel stacks, projects using raw SQL only without Eloquent

---

## Patterns

### Pattern 316.1: Model Definition — Casts, Fillable, Hidden

**Category**: Model Fundamentals
**Description**: Eloquent model with PHP 8.3 typed properties, Laravel 11 casts() method, fillable/guarded, and hidden attributes.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class Order extends Model
{
    use HasFactory;

    protected $table = 'orders';

    protected $fillable = [
        'user_id',
        'reference_number',
        'total_amount',
        'currency',
        'status',
        'notes',
        'shipped_at',
    ];

    protected $hidden = [
        'internal_notes',
        'stripe_payment_id',
    ];

    /**
     * Laravel 11: casts as method replacing $casts property.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'status' => OrderStatus::class,
            'metadata' => 'array',
            'is_priority' => 'boolean',
            'shipped_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
        ];
    }
}
```

**Key Points**:
- Laravel 11 uses `casts()` method instead of `$casts` property — enables dynamic logic
- Use `immutable_datetime` for dates that should not be modified after creation
- Enum casting maps database values directly to PHP 8.3 backed enums
- Keep `$fillable` explicit — never use `$guarded = []` in production
- `$hidden` prevents sensitive fields from appearing in JSON/array output

---

### Pattern 316.2: Accessors and Mutators — Attribute Class (Laravel 11)

**Category**: Data Transformation
**Description**: PHP 8.3 + Laravel 11 accessor/mutator pattern using the Attribute class with get/set closures.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

final class Customer extends Model
{
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = ['first_name', 'last_name', 'email', 'phone'];

    /**
     * Full name accessor — computed from first_name + last_name.
     */
    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes): string => sprintf(
                '%s %s',
                $attributes['first_name'],
                $attributes['last_name'],
            ),
        );
    }

    /**
     * Email mutator — always store lowercase.
     */
    protected function email(): Attribute
    {
        return Attribute::make(
            get: fn (string $value): string => $value,
            set: fn (string $value): string => mb_strtolower($value),
        );
    }

    /**
     * Phone accessor with caching — prevents redundant formatting.
     */
    protected function formattedPhone(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes): string => preg_replace(
                '/(\d{3})(\d{3})(\d{4})/',
                '($1) $2-$3',
                $attributes['phone'],
            ),
        )->shouldCache();
    }
}
```

**Key Points**:
- `Attribute::make()` replaces legacy `getXAttribute()`/`setXAttribute()` methods
- Method name uses camelCase — Laravel maps `fullName()` to `$model->full_name`
- Use `shouldCache()` for expensive computed attributes
- Mutators (set) receive the incoming value and return the stored value
- Accessors can reference `$attributes` array for cross-field computation

---

### Pattern 316.3: Model Factories

**Category**: Testing & Seeding
**Description**: Model factory with states, sequences, and relationship creation for PHP 8.3.

```php
<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
final class OrderFactory extends Factory
{
    protected $model = Order::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'reference_number' => $this->faker->unique()->numerify('ORD-######'),
            'total_amount' => $this->faker->randomFloat(nbMaxDecimals: 2, min: 10, max: 5000),
            'currency' => 'USD',
            'status' => OrderStatus::Pending,
            'notes' => $this->faker->optional(weight: 0.3)->sentence(),
            'shipped_at' => null,
        ];
    }

    public function shipped(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => OrderStatus::Shipped,
            'shipped_at' => now()->subDays(rand(1, 14)),
        ]);
    }

    public function highValue(): static
    {
        return $this->state(fn (array $attributes): array => [
            'total_amount' => $this->faker->randomFloat(2, 5000, 50000),
            'is_priority' => true,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => OrderStatus::Cancelled,
        ]);
    }
}
```

**Key Points**:
- Factory class name matches model: `OrderFactory` for `Order` model
- Use `User::factory()` for foreign keys — creates related models automatically
- States are chainable: `Order::factory()->highValue()->shipped()->create()`
- `$this->faker->optional()` for nullable fields with controlled probability
- Return `static` from state methods for fluent chaining

---

### Pattern 316.4: Soft Deletes

**Category**: Data Lifecycle
**Description**: Soft delete implementation with querying, restoration, and permanent deletion.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Article extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = ['title', 'slug', 'body', 'published_at'];

    protected function casts(): array
    {
        return [
            'published_at' => 'immutable_datetime',
            'deleted_at' => 'immutable_datetime',
        ];
    }

    /**
     * Scope: only published and non-deleted articles.
     */
    public function scopePublished(\Illuminate\Database\Eloquent\Builder $query): void
    {
        $query->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}

// Usage examples:
// $article->delete();               // Soft delete — sets deleted_at
// $article->restore();              // Restore — nullifies deleted_at
// $article->forceDelete();          // Permanent delete — removes row
// Article::withTrashed()->get();    // Include soft-deleted records
// Article::onlyTrashed()->get();    // Only soft-deleted records
```

**Key Points**:
- `SoftDeletes` trait adds `deleted_at` column handling automatically
- Migration requires `$table->softDeletes()` column
- `withTrashed()` includes deleted records, `onlyTrashed()` returns only deleted
- `forceDelete()` permanently removes the record — use with caution
- Soft-deleted models are excluded from queries by default

---

### Pattern 316.5: Model Events

**Category**: Lifecycle Hooks
**Description**: Model event hooks for business logic — creating, created, updating, deleting.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

final class Product extends Model
{
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = ['name', 'slug', 'sku', 'price', 'stock_quantity'];

    protected static function booted(): void
    {
        static::creating(function (Product $product): void {
            $product->slug ??= Str::slug($product->name);
            $product->sku ??= 'SKU-' . strtoupper(Str::random(8));
        });

        static::updating(function (Product $product): void {
            if ($product->isDirty('name') && ! $product->isDirty('slug')) {
                $product->slug = Str::slug($product->name);
            }
        });

        static::deleting(function (Product $product): void {
            if ($product->stock_quantity > 0) {
                throw new \DomainException(
                    "Cannot delete product {$product->sku} with {$product->stock_quantity} items in stock.",
                );
            }
        });
    }

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'stock_quantity' => 'integer',
        ];
    }
}
```

**Key Points**:
- `booted()` is the recommended place for model event registration in Laravel 11
- `creating` fires before INSERT — use for auto-generating slugs, SKUs, defaults
- `isDirty('field')` checks if a specific attribute changed during update
- Throw domain exceptions in `deleting` to prevent invalid deletions
- Keep event logic simple — move complex business logic to observers or services

---

### Pattern 316.6: Global Scopes

**Category**: Query Constraints
**Description**: Global scopes applied automatically to all queries for a model — tenant filtering, active records.

```php
<?php

declare(strict_types=1);

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

final class ActiveScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $builder->where("{$model->getTable()}.is_active", true);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Scopes\ActiveScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;

#[ScopedBy(ActiveScope::class)]
final class Subscription extends Model
{
    protected $fillable = ['user_id', 'plan_id', 'is_active', 'expires_at'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'expires_at' => 'immutable_datetime',
        ];
    }
}

// Usage:
// Subscription::all();                           // Only active subscriptions
// Subscription::withoutGlobalScope(ActiveScope::class)->get();  // All records
```

**Key Points**:
- Laravel 11 `#[ScopedBy]` attribute replaces `booted()` scope registration
- Global scopes apply to ALL queries — use `withoutGlobalScope()` to bypass
- Prefix column with table name to avoid ambiguity in joins
- Use for multi-tenancy, soft deletes, active/inactive filtering
- Keep scopes single-purpose — one scope per concern

---

### Pattern 316.7: Prunable Models

**Category**: Data Lifecycle
**Description**: Automated cleanup of stale records using Prunable/MassPrunable traits with scheduled command.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\MassPrunable;

final class ActivityLog extends Model
{
    use MassPrunable;

    protected $fillable = ['user_id', 'action', 'payload', 'ip_address'];

    /**
     * Define the prunable query — records older than 90 days.
     */
    public function prunable(): \Illuminate\Database\Eloquent\Builder
    {
        return static::where('created_at', '<=', now()->subDays(90));
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

final class TemporaryUpload extends Model
{
    use Prunable;

    protected $fillable = ['user_id', 'file_path', 'disk'];

    public function prunable(): \Illuminate\Database\Eloquent\Builder
    {
        return static::where('created_at', '<=', now()->subHours(24));
    }

    /**
     * Cleanup hook — delete files from disk before record removal.
     */
    protected function pruning(): void
    {
        \Illuminate\Support\Facades\Storage::disk($this->disk)->delete($this->file_path);
    }
}

// Schedule in routes/console.php:
// Schedule::command('model:prune')->daily();
// Schedule::command('model:prune', ['--model' => TemporaryUpload::class])->hourly();
```

**Key Points**:
- `Prunable` fires model events and `pruning()` hook — use for cleanup side effects
- `MassPrunable` uses DELETE query directly — faster, no events, no `pruning()` hook
- Schedule `model:prune` command in `routes/console.php` (Laravel 11)
- Define retention period in `prunable()` query builder
- Use `MassPrunable` for high-volume tables (logs, metrics) where events are unnecessary

---

### Pattern 316.8: Model Serialization

**Category**: API Output
**Description**: Controlled JSON/array serialization with hidden, appended, and conditional attributes.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

final class UserProfile extends Model
{
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = ['user_id', 'bio', 'avatar_url', 'social_links', 'settings'];

    protected $hidden = ['settings', 'updated_at'];

    protected $appends = ['avatar_thumbnail'];

    protected function casts(): array
    {
        return [
            'social_links' => 'array',
            'settings' => 'encrypted:array',
        ];
    }

    protected function avatarThumbnail(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes): ?string => $attributes['avatar_url']
                ? $attributes['avatar_url'] . '?w=150&h=150&fit=crop'
                : null,
        );
    }

    /**
     * Conditional serialization — expose fields based on context.
     */
    public function toAdminArray(): array
    {
        return array_merge($this->toArray(), [
            'settings' => $this->settings,
            'updated_at' => $this->updated_at?->toISOString(),
        ]);
    }
}

// Usage:
// $profile->toArray();                          // Excludes hidden, includes appends
// $profile->makeVisible('settings')->toArray(); // Temporarily show hidden field
// $profile->makeHidden('bio')->toArray();       // Temporarily hide a field
// $profile->toAdminArray();                     // Custom serialization for admin views
```

**Key Points**:
- `$hidden` excludes fields from `toArray()` and `toJson()` output
- `$appends` includes computed attributes (accessors) in serialized output
- `makeVisible()`/`makeHidden()` override serialization per-instance — not persistent
- Use `encrypted:array` cast for sensitive data stored encrypted in database
- Create custom `toXxxArray()` methods for context-specific serialization needs

---

## Best Practices

- **Use casts() method** — Laravel 11 method-based casts replace the `$casts` property for flexibility
- **Explicit $fillable** — never use `$guarded = []` in production; whitelist mass-assignable fields
- **Enum casts** — map status/type columns to PHP 8.3 backed enums for type safety
- **Accessor caching** — use `shouldCache()` on expensive computed attributes
- **Immutable dates** — prefer `immutable_datetime` cast to prevent accidental mutation
- **Factory states** — create named states for common data scenarios (shipped, cancelled, premium)
- **Mark models final** — prevent inheritance unless explicitly designed for STI pattern
- **One model per entity** — avoid god models; split large models with concerns/traits

---

## Abnormal Case Patterns

1. **Mass assignment vulnerability** — using `$guarded = []` allows any field to be mass-assigned, including `is_admin`. Fix: always use explicit `$fillable` array.

2. **Accessor infinite loop** — accessor references `$this->attribute` which triggers the accessor again. Fix: use `$attributes['column']` array instead of `$this->column`.

3. **Factory state conflict** — two states set the same field to different values. Fix: design states as composable layers; document conflicts in factory docblocks.

4. **Soft delete cascade missing** — parent soft-deleted but children remain active with dangling foreign keys. Fix: implement cascading soft delete in model events or use `onDelete('cascade')` for hard deletes.

5. **Global scope interference with joins** — unqualified column name causes ambiguous column error. Fix: always prefix with `$model->getTable()` in scope's `apply()` method.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (316.1–316.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Eloquent Model Specialist — Data | EPS v3.2*

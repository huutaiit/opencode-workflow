# Laravel Eloquent Relationships Specialist — Data
# Laravel Eloquentリレーションシップスペシャリスト — データ
# Chuyen Gia Eloquent Relationships Laravel — Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Eloquent Relationships
**Aspect**: Eloquent Relationships
**Category**: data
**Purpose**: Knowledge provider for Eloquent relationship architecture — HasMany, BelongsTo, ManyToMany, polymorphic, eager loading, lazy loading prevention, relationship queries, and custom relationship classes

---

## Metadata

```json
{
  "id": "laravel-eloquent-relationships-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Eloquent Relationships",
  "aspect": "Eloquent Relationships",
  "category": "data",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 Eloquent relationship conventions — method-based definition with return types",
    "E2: Eager loading strategies — with/load to prevent N+1 queries",
    "E3: preventLazyLoading() — strict mode for detecting N+1 in development"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 317.1–317.8 |
| **Directory Pattern** | `app/Models/` |
| **Naming Convention** | `{Entity}.php` |
| **Imports From** | Domain (related models), Infrastructure (pivot models) |
| **Imported By** | Application (services), Infrastructure (repositories, controllers) |
| **Cannot Import** | Controllers, Requests, Commands |
| **Dependencies** | `illuminate/database` |
| **When To Use** | Every Laravel project defining entity relationships via Eloquent |
| **Source Skeleton** | `app/Models/{Entity}.php` |
| **Specialist Type** | code |
| **Purpose** | Eloquent relationship patterns — one-to-many, many-to-many, polymorphic, eager loading, lazy loading prevention |
| **Activation Trigger** | files: `app/Models/*.php`; keywords: hasMany, belongsTo, belongsToMany, morphTo, morphMany, with, load, eager |

---

## Role

You are a **Laravel Eloquent Relationships Specialist**. Your responsibility is to provide best practices for PHP 8.3 + Laravel 11 relationship definitions — HasMany/BelongsTo, ManyToMany with pivot, HasManyThrough, polymorphic relations, eager loading optimization, lazy loading prevention, relationship queries, and custom relationship classes.

**Used by**: Any code agent working with Laravel Eloquent model relationships
**Not used by**: Non-Laravel stacks, projects not using Eloquent ORM

---

## Patterns

### Pattern 317.1: HasMany / BelongsTo

**Category**: One-to-Many
**Description**: Basic one-to-many relationship with inverse, typed return, and relationship creation.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class User extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'email'];

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function recentOrders(): HasMany
    {
        return $this->hasMany(Order::class)
            ->where('created_at', '>=', now()->subDays(30))
            ->orderByDesc('created_at');
    }
}

final class Order extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'total_amount', 'status'];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

// Usage:
// $user->orders()->create(['total_amount' => 99.99, 'status' => 'pending']);
// $order->user;  // Lazy load parent
// $order->user()->associate($newUser)->save();
```

**Key Points**:
- Use PHPDoc `@return` generics for IDE autocomplete and static analysis
- Constrained relationships (recentOrders) encapsulate common filters
- `associate()` sets the foreign key on the child model
- Convention: `user_id` FK on `orders` table maps to `User` model automatically
- Always define both sides of the relationship for bidirectional traversal

---

### Pattern 317.2: ManyToMany with Pivot

**Category**: Many-to-Many
**Description**: Many-to-many relationship with pivot attributes, timestamps, and custom pivot model.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Role extends Model
{
    protected $fillable = ['name', 'guard_name'];

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('assigned_by', 'expires_at')
            ->withTimestamps()
            ->orderByPivot('created_at', 'desc');
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

final class RoleUser extends Pivot
{
    protected $table = 'role_user';

    public $incrementing = true;

    protected function casts(): array
    {
        return [
            'expires_at' => 'immutable_datetime',
            'assigned_by' => 'integer',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}

// In User model:
// public function roles(): BelongsToMany
// {
//     return $this->belongsToMany(Role::class)
//         ->using(RoleUser::class)
//         ->withPivot('assigned_by', 'expires_at')
//         ->withTimestamps();
// }

// Usage:
// $user->roles()->attach($roleId, ['assigned_by' => auth()->id()]);
// $user->roles()->detach($roleId);
// $user->roles()->sync([$roleId1, $roleId2 => ['expires_at' => now()->addYear()]]);
```

**Key Points**:
- `withPivot()` specifies extra columns on the pivot table to hydrate
- `withTimestamps()` auto-manages `created_at`/`updated_at` on pivot
- Custom pivot model via `using()` — enables casts, accessors, and methods on pivot
- `sync()` replaces all existing relations; `syncWithoutDetaching()` only adds
- `orderByPivot()` sorts by pivot table columns

---

### Pattern 317.3: HasManyThrough

**Category**: Through Relationships
**Description**: Access distant relations through an intermediate model — skip the middle table.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Country extends Model
{
    protected $fillable = ['name', 'code'];

    /**
     * Get all orders for the country through users.
     *
     * @return HasManyThrough<Order, User, $this>
     */
    public function orders(): HasManyThrough
    {
        return $this->hasManyThrough(
            related: Order::class,
            through: User::class,
            firstKey: 'country_id',   // FK on users table
            secondKey: 'user_id',     // FK on orders table
            localKey: 'id',           // PK on countries table
            secondLocalKey: 'id',     // PK on users table
        );
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}

// Usage:
// $country->orders;                    // All orders from users in this country
// $country->orders()->where('total_amount', '>', 1000)->get();
```

**Key Points**:
- HasManyThrough skips the intermediate model — Country -> User -> Order
- Use named parameters for clarity on foreign/local key mapping
- Useful for reporting: aggregate data across intermediate tables
- Laravel resolves the JOIN automatically — no manual query building needed
- HasOneThrough is the singular equivalent for one-to-one-to-one chains

---

### Pattern 317.4: Polymorphic Relations

**Category**: Polymorphic
**Description**: Polymorphic relationships for shared entities — comments, images, tags across multiple models.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

final class Comment extends Model
{
    protected $fillable = ['body', 'user_id', 'commentable_id', 'commentable_type'];

    /**
     * @return MorphTo<Model, $this>
     */
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }
}

final class Article extends Model
{
    protected $fillable = ['title', 'body'];

    /**
     * @return MorphMany<Comment, $this>
     */
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }
}

final class Video extends Model
{
    protected $fillable = ['title', 'url'];

    /**
     * @return MorphMany<Comment, $this>
     */
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }
}

// In AppServiceProvider boot():
// Relation::enforceMorphMap([
//     'article' => Article::class,
//     'video' => Video::class,
// ]);
```

**Key Points**:
- `morphTo()` on the child, `morphMany()` on each parent — polymorphic one-to-many
- `Relation::enforceMorphMap()` stores short aliases instead of FQCN — safer refactoring
- Migration needs `commentable_id` (unsignedBigInteger) and `commentable_type` (string)
- Use `$table->morphs('commentable')` shortcut in migrations
- MorphToMany for polymorphic many-to-many (tags, categories)

---

### Pattern 317.5: Eager Loading — with() and load()

**Category**: Performance
**Description**: Prevent N+1 queries using eager loading at query time or after retrieval.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;

final class UserController
{
    /**
     * Eager load at query time — single query per relationship.
     */
    public function index(): JsonResponse
    {
        $users = User::query()
            ->with([
                'orders' => fn ($query) => $query
                    ->where('status', 'completed')
                    ->orderByDesc('created_at'),
                'orders.items',           // Nested eager loading
                'profile:id,user_id,bio', // Select specific columns
            ])
            ->paginate(perPage: 25);

        return response()->json($users);
    }

    /**
     * Lazy eager load — load relationships after initial query.
     */
    public function show(User $user): JsonResponse
    {
        $user->load(['orders.items', 'profile']);

        // loadMissing — only loads if not already loaded
        $user->loadMissing('notifications');

        return response()->json($user);
    }

    /**
     * Eager load with aggregate — without loading full relation.
     */
    public function stats(): JsonResponse
    {
        $users = User::query()
            ->withCount('orders')
            ->withSum('orders', 'total_amount')
            ->withAvg('orders', 'total_amount')
            ->having('orders_count', '>', 5)
            ->get();

        // $user->orders_count, $user->orders_sum_total_amount
        return response()->json($users);
    }
}
```

**Key Points**:
- `with()` eager loads at query time — 1 additional query per relationship
- `load()` lazy-eager-loads after the model is already retrieved
- `loadMissing()` skips if relationship is already loaded — prevents redundant queries
- Constrained eager loading with closures for filtering/ordering
- `withCount()`/`withSum()`/`withAvg()` aggregate without loading full collections

---

### Pattern 317.6: Lazy Loading Prevention

**Category**: Performance Safety
**Description**: Strict mode to detect and prevent N+1 queries in development.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Prevent lazy loading in non-production environments
        Model::preventLazyLoading(
            ! $this->app->isProduction(),
        );

        // Optional: prevent silently discarding attributes
        Model::preventSilentlyDiscardingAttributes(
            ! $this->app->isProduction(),
        );

        // Optional: prevent accessing missing attributes
        Model::preventAccessingMissingAttributes(
            ! $this->app->isProduction(),
        );

        // Custom handler instead of exception (e.g., log warning)
        Model::handleLazyLoadingViolationUsing(
            function (Model $model, string $relation): void {
                $class = $model::class;
                logger()->warning(
                    "Lazy loading [{$relation}] on model [{$class}].",
                );
            },
        );
    }
}
```

**Key Points**:
- `preventLazyLoading()` throws `LazyLoadingViolationException` on lazy access
- Enable only in non-production — production should degrade gracefully
- `handleLazyLoadingViolationUsing()` customizes the response (log vs throw)
- `preventSilentlyDiscardingAttributes()` catches mass-assignment to non-fillable fields
- Combine all three strict modes for maximum safety in development

---

### Pattern 317.7: Relationship Queries

**Category**: Query Building
**Description**: Query through relationships — existence checks, aggregates, and subquery selects.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\Order;
use Illuminate\Database\Eloquent\Collection;

final class UserQueryService
{
    /**
     * Users who have at least one completed order over $100.
     */
    public function highValueCustomers(): Collection
    {
        return User::query()
            ->whereHas('orders', function ($query): void {
                $query->where('status', 'completed')
                    ->where('total_amount', '>', 100);
            })
            ->get();
    }

    /**
     * Users who have NO orders in the last 90 days.
     */
    public function inactiveCustomers(): Collection
    {
        return User::query()
            ->whereDoesntHave('orders', function ($query): void {
                $query->where('created_at', '>=', now()->subDays(90));
            })
            ->get();
    }

    /**
     * Users with their latest order as a subquery.
     */
    public function usersWithLatestOrder(): Collection
    {
        return User::query()
            ->addSelect([
                'latest_order_date' => Order::query()
                    ->select('created_at')
                    ->whereColumn('user_id', 'users.id')
                    ->orderByDesc('created_at')
                    ->limit(1),
            ])
            ->withCast(['latest_order_date' => 'datetime'])
            ->get();
    }
}
```

**Key Points**:
- `whereHas()` filters parent by child conditions — EXISTS subquery
- `whereDoesntHave()` returns parents without matching children — NOT EXISTS
- `addSelect()` with subquery avoids loading full relationship collections
- `withCast()` applies cast to computed subquery columns
- Prefer `whereHas()` over loading relationships then filtering in PHP

---

### Pattern 317.8: Custom Relationship Classes

**Category**: Advanced Patterns
**Description**: Custom relationship class for non-standard relationship logic.

```php
<?php

declare(strict_types=1);

namespace App\Models\Relations;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;

/**
 * Custom relationship: "best friend" — the user with whom this user
 * has exchanged the most messages.
 *
 * @extends Relation<\App\Models\User>
 */
final class BestFriend extends Relation
{
    public function __construct(
        Builder $query,
        private readonly Model $parent,
    ) {
        parent::__construct($query, $parent);
    }

    public function addConstraints(): void
    {
        if (static::$constraints) {
            $this->query
                ->selectRaw('users.*, COUNT(messages.id) as message_count')
                ->join('messages', function ($join): void {
                    $join->on('users.id', '=', 'messages.recipient_id')
                        ->where('messages.sender_id', '=', $this->parent->id);
                })
                ->groupBy('users.id')
                ->orderByDesc('message_count')
                ->limit(1);
        }
    }

    public function addEagerConstraints(array $models): void
    {
        $this->query->whereIn(
            'messages.sender_id',
            collect($models)->pluck('id')->all(),
        );
    }

    public function initRelation(array $models, $relation): array
    {
        foreach ($models as $model) {
            $model->setRelation($relation, null);
        }
        return $models;
    }

    public function match(array $models, Collection $results, $relation): array
    {
        foreach ($models as $model) {
            $match = $results->first(
                fn (Model $result) => $result->pivot_sender_id === $model->id,
            );
            $model->setRelation($relation, $match);
        }
        return $models;
    }

    public function getResults(): ?Model
    {
        return $this->query->first();
    }
}
```

**Key Points**:
- Extend `Relation` base class for completely custom relationship logic
- Implement `addConstraints()` for single-model loading, `addEagerConstraints()` for eager
- `initRelation()` sets default value, `match()` pairs results with parents
- `getResults()` returns the final result for lazy loading
- Use sparingly — most needs are covered by built-in relationship types

---

## Best Practices

- **Always define return types** — `HasMany`, `BelongsTo`, `BelongsToMany` with PHPDoc generics
- **Eager load by default** — use `$with` property for always-needed relationships
- **Enable preventLazyLoading** — catch N+1 issues in development before they reach production
- **Use morph maps** — `Relation::enforceMorphMap()` for stable, refactorable polymorphic types
- **Constrain eager loads** — filter/order within `with()` closures to reduce data transfer
- **Prefer withCount over loading** — `withCount()` for display; avoid loading full collections for counts
- **Name relationships clearly** — `activeOrders()`, `latestInvoice()` — communicate intent
- **Custom pivot models** — use `using()` for pivot tables with business logic or casts

---

## Abnormal Case Patterns

1. **N+1 query in loop** — iterating `$users` and accessing `$user->orders` without eager loading. Fix: use `User::with('orders')->get()` or enable `preventLazyLoading()`.

2. **Polymorphic FQCN in database** — `commentable_type` stores `App\Models\Article` instead of alias. Fix: use `Relation::enforceMorphMap()` in AppServiceProvider boot().

3. **Pivot data not available** — accessing `$role->pivot->assigned_by` returns null. Fix: add `withPivot('assigned_by')` to the relationship definition.

4. **Eager loading with select missing FK** — `with('profile:id,bio')` drops `user_id`, breaking the relationship join. Fix: always include foreign key in select: `profile:id,user_id,bio`.

5. **Detach cascade missing** — deleting a parent without detaching many-to-many relations leaves orphan pivot rows. Fix: use `deleting` event to `$model->roles()->detach()`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (317.1–317.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Eloquent Relationships Specialist — Data | EPS v3.2*

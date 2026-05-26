# Laravel Repository Pattern Specialist — Patterns
# Laravelリポジトリパターンスペシャリスト — パターン
# Chuyen Gia Repository Pattern Laravel — Mau Thiet Ke

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Repository Pattern
**Aspect**: Repository Pattern
**Category**: patterns
**Purpose**: Knowledge provider for repository pattern implementation — interfaces, Eloquent implementations, specification pattern, caching decorators, testing strategies, and repository vs query builder decisions

---

## Metadata

```json
{
  "id": "laravel-repository-pattern-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Repository Pattern",
  "category": "patterns",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Repository pattern — domain-infrastructure separation via interfaces",
    "E2: Eloquent ORM — ActiveRecord implementation as repository backend",
    "E3: Decorator pattern — transparent caching layer over repository"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 341.1–341.6 |
| **Directory Pattern** | `app/Repositories/` |
| **Naming Convention** | `{Entity}Repository.php`, `Eloquent{Entity}Repository.php` |
| **Imports From** | Domain (interfaces, entities) |
| **Imported By** | Application (services, handlers) |
| **Cannot Import** | Presentation (controllers, requests) |
| **Dependencies** | `illuminate/database`, `illuminate/cache` |
| **When To Use** | Complex domain logic requiring persistence abstraction |
| **Source Skeleton** | `app/Repositories/{Entity}Repository.php` |
| **Specialist Type** | code |
| **Purpose** | Repository pattern for Laravel — interface contracts, Eloquent implementations, specifications, caching, testing |
| **Activation Trigger** | files: `app/Repositories/*.php`; keywords: Repository, RepositoryInterface, Eloquent repository |

---

## Role

You are a **Laravel Repository Pattern Specialist**. Your responsibility is to provide best practices for implementing the repository pattern in Laravel 11+ — defining contracts, building Eloquent implementations, applying the specification pattern, adding caching decorators, and testing repository logic.

**Used by**: Any code agent working with data access abstraction in Laravel
**Not used by**: Simple CRUD apps where Eloquent models suffice, non-Laravel stacks

---

## Patterns

### Pattern 341.1: Repository Interface

**Category**: Contract Definition
**Description**: Define repository contracts as PHP interfaces in the domain layer for persistence abstraction.

```php
<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Product;
use Illuminate\Support\Collection;

interface ProductRepositoryInterface
{
    public function findById(int $id): ?Product;

    public function findBySlug(string $slug): ?Product;

    /**
     * @return Collection<int, Product>
     */
    public function findActive(): Collection;

    /**
     * @param array<string, mixed> $attributes
     */
    public function create(array $attributes): Product;

    /**
     * @param array<string, mixed> $attributes
     */
    public function update(Product $product, array $attributes): Product;

    public function delete(Product $product): bool;
}
```

**Key Points**:
- Place interfaces in `app/Contracts/Repositories/` — domain boundary
- Use return type declarations strictly — `?Product`, `Collection`, `bool`
- Keep interface methods domain-focused — no Eloquent-specific methods (e.g., no `query()`)
- One interface per aggregate root, not per database table

---

### Pattern 341.2: Eloquent Repository Implementation

**Category**: Infrastructure
**Description**: Concrete Eloquent-based repository implementing the domain contract.

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\ProductRepositoryInterface;
use App\Models\Product;
use Illuminate\Support\Collection;

final class EloquentProductRepository implements ProductRepositoryInterface
{
    public function __construct(
        private readonly Product $model,
    ) {}

    public function findById(int $id): ?Product
    {
        return $this->model->newQuery()->find($id);
    }

    public function findBySlug(string $slug): ?Product
    {
        return $this->model->newQuery()
            ->where('slug', $slug)
            ->first();
    }

    /**
     * @return Collection<int, Product>
     */
    public function findActive(): Collection
    {
        return $this->model->newQuery()
            ->where('is_active', true)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * @param array<string, mixed> $attributes
     */
    public function create(array $attributes): Product
    {
        return $this->model->newQuery()->create($attributes);
    }

    /**
     * @param array<string, mixed> $attributes
     */
    public function update(Product $product, array $attributes): Product
    {
        $product->update($attributes);
        return $product->refresh();
    }

    public function delete(Product $product): bool
    {
        return (bool) $product->delete();
    }
}
```

**Key Points**:
- Inject the model via constructor — enables testing with fresh instances
- Use `newQuery()` for every query — avoids scope leakage between calls
- Mark class `final` — repository implementations should not be extended
- Bind in service provider: `$this->app->bind(ProductRepositoryInterface::class, EloquentProductRepository::class)`

---

### Pattern 341.3: Repository with Specification

**Category**: Query Composition
**Description**: Specification pattern for composable, reusable query criteria.

```php
<?php

declare(strict_types=1);

namespace App\Repositories\Specifications;

use Illuminate\Database\Eloquent\Builder;

interface Specification
{
    public function apply(Builder $query): Builder;
}

final class IsActive implements Specification
{
    public function apply(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}

final class PriceRange implements Specification
{
    public function __construct(
        private readonly float $min,
        private readonly float $max,
    ) {}

    public function apply(Builder $query): Builder
    {
        return $query->whereBetween('price', [$this->min, $this->max]);
    }
}

final class InCategory implements Specification
{
    public function __construct(
        private readonly int $categoryId,
    ) {}

    public function apply(Builder $query): Builder
    {
        return $query->where('category_id', $this->categoryId);
    }
}
```

```php
// Repository method accepting specifications
/**
 * @param array<int, Specification> $specifications
 * @return Collection<int, Product>
 */
public function findBySpecifications(array $specifications): Collection
{
    $query = $this->model->newQuery();

    foreach ($specifications as $spec) {
        $query = $spec->apply($query);
    }

    return $query->get();
}

// Usage
$products = $repository->findBySpecifications([
    new IsActive(),
    new PriceRange(min: 10.0, max: 100.0),
    new InCategory(categoryId: 5),
]);
```

**Key Points**:
- Each specification encapsulates one filter criterion
- Specifications compose via array — no complex boolean logic needed
- Reusable across multiple repository methods
- Test each specification independently against Eloquent builder

---

### Pattern 341.4: Repository Caching Decorator

**Category**: Performance
**Description**: Decorator pattern for transparent caching over repository — no changes to consumers.

```php
<?php

declare(strict_types=1);

namespace App\Repositories\Decorators;

use App\Contracts\Repositories\ProductRepositoryInterface;
use App\Models\Product;
use Illuminate\Cache\CacheManager;
use Illuminate\Support\Collection;

final class CachingProductRepository implements ProductRepositoryInterface
{
    private const CACHE_TTL = 3600; // 1 hour
    private const CACHE_PREFIX = 'product:';

    public function __construct(
        private readonly ProductRepositoryInterface $inner,
        private readonly CacheManager $cache,
    ) {}

    public function findById(int $id): ?Product
    {
        return $this->cache->remember(
            key: self::CACHE_PREFIX . "id:{$id}",
            ttl: self::CACHE_TTL,
            callback: fn () => $this->inner->findById($id),
        );
    }

    public function findBySlug(string $slug): ?Product
    {
        return $this->cache->remember(
            key: self::CACHE_PREFIX . "slug:{$slug}",
            ttl: self::CACHE_TTL,
            callback: fn () => $this->inner->findBySlug($slug),
        );
    }

    public function findActive(): Collection
    {
        return $this->cache->remember(
            key: self::CACHE_PREFIX . 'active',
            ttl: self::CACHE_TTL,
            callback: fn () => $this->inner->findActive(),
        );
    }

    public function create(array $attributes): Product
    {
        $this->cache->forget(self::CACHE_PREFIX . 'active');
        return $this->inner->create($attributes);
    }

    public function update(Product $product, array $attributes): Product
    {
        $this->cache->forget(self::CACHE_PREFIX . "id:{$product->id}");
        $this->cache->forget(self::CACHE_PREFIX . "slug:{$product->slug}");
        $this->cache->forget(self::CACHE_PREFIX . 'active');
        return $this->inner->update($product, $attributes);
    }

    public function delete(Product $product): bool
    {
        $this->cache->forget(self::CACHE_PREFIX . "id:{$product->id}");
        $this->cache->forget(self::CACHE_PREFIX . 'active');
        return $this->inner->delete($product);
    }
}
```

**Key Points**:
- Decorator wraps the real repository — same interface, transparent to consumers
- Invalidate cache on write operations (create, update, delete)
- Bind via service provider: decorate the inner binding with caching layer
- Use cache tags when available (Redis) for bulk invalidation

---

### Pattern 341.5: Repository Testing

**Category**: Testing
**Description**: Integration tests for repository implementations using RefreshDatabase.

```php
<?php

declare(strict_types=1);

namespace Tests\Integration\Repositories;

use App\Models\Product;
use App\Repositories\EloquentProductRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class EloquentProductRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private EloquentProductRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = new EloquentProductRepository(new Product());
    }

    public function test_find_by_id_returns_product(): void
    {
        $product = Product::factory()->create();

        $found = $this->repository->findById($product->id);

        $this->assertNotNull($found);
        $this->assertEquals($product->id, $found->id);
    }

    public function test_find_by_id_returns_null_for_missing(): void
    {
        $found = $this->repository->findById(99999);

        $this->assertNull($found);
    }

    public function test_find_active_excludes_inactive(): void
    {
        Product::factory()->count(3)->create(['is_active' => true]);
        Product::factory()->count(2)->create(['is_active' => false]);

        $active = $this->repository->findActive();

        $this->assertCount(3, $active);
    }

    public function test_create_persists_product(): void
    {
        $product = $this->repository->create([
            'name' => 'Test Product',
            'slug' => 'test-product',
            'price' => 29.99,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_delete_removes_product(): void
    {
        $product = Product::factory()->create();

        $result = $this->repository->delete($product);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }
}
```

**Key Points**:
- Use `RefreshDatabase` trait — each test starts with clean state
- Test both happy path and edge cases (missing records, empty results)
- Instantiate repository directly — not through container — for unit-level control
- Verify side effects with `assertDatabaseHas()` / `assertDatabaseMissing()`

---

### Pattern 341.6: Repository vs Query Builder Decision

**Category**: Decision Guide
**Description**: When to use repository pattern vs direct Eloquent/Query Builder.

```php
// USE REPOSITORY when:
// 1. Domain logic is complex — multiple bounded contexts
// 2. Multiple data sources possible (Eloquent, API, cache)
// 3. Business rules around data access (specifications, policies)
// 4. Team size > 3 — contracts enforce consistency

// Service provider binding
final class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            abstract: ProductRepositoryInterface::class,
            concrete: EloquentProductRepository::class,
        );

        // With caching decorator
        $this->app->extend(
            abstract: ProductRepositoryInterface::class,
            closure: fn (ProductRepositoryInterface $repo, $app) =>
                new CachingProductRepository($repo, $app->make(CacheManager::class)),
        );
    }
}

// USE DIRECT ELOQUENT when:
// 1. Simple CRUD — no complex domain logic
// 2. Rapid prototyping — speed over abstraction
// 3. Single data source — Eloquent is the only option
// 4. Small team / small project — overhead not justified
```

**Key Points**:
- Repository adds indirection — justify the cost with complexity
- `$this->app->extend()` enables decorator chaining in service provider
- Start without repository, refactor to it when complexity demands
- Repository does NOT mean "wrap every Eloquent method" — expose domain operations only

---

## Best Practices

- **Interface-first design** — define contracts before implementations
- **One repository per aggregate root** — not per table; child entities accessed through root
- **No Eloquent leakage** — repository interface must not expose Builder, Query, or Eloquent-specific types
- **Use readonly constructor promotion** — PHP 8.3 constructor properties for immutable dependencies
- **Invalidate cache on writes** — caching decorators must bust cache for all affected keys
- **Prefer composition over inheritance** — decorators over abstract base repositories
- **Keep repositories thin** — business logic belongs in services, not repositories
- **Bind via service provider** — never instantiate repositories directly in controllers

---

## Abnormal Case Patterns

1. **Eloquent leakage in interface** — returning `Builder` or accepting `Closure` query callbacks. Fix: return domain objects or collections only.

2. **God repository** — 30+ methods on a single repository. Fix: split by aggregate root or use specifications for query composition.

3. **Cache stale after write** — forgetting to invalidate related cache keys on update/delete. Fix: invalidate all affected keys; use cache tags for group invalidation.

4. **Missing binding** — repository interface not bound in service provider. Fix: bind in a dedicated `RepositoryServiceProvider`.

5. **Testing with mocks instead of DB** — mocking Eloquent internals leads to false positives. Fix: use integration tests with `RefreshDatabase` for repositories.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (341.1–341.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Repository Pattern Specialist — Patterns | EPS v3.2*

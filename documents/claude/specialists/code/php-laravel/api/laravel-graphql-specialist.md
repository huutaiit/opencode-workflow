# Laravel GraphQL Specialist — API
# Laravel GraphQLスペシャリスト — API
# Chuyen Gia GraphQL Laravel — API

**Version**: 1.0.0
**Technology**: Laravel 11+ GraphQL (Lighthouse)
**Aspect**: GraphQL
**Category**: api
**Purpose**: Knowledge provider for Laravel 11+ GraphQL API with Lighthouse PHP — schema definition, queries, mutations, subscriptions, N+1 prevention, and custom directives

---

## Metadata

```json
{
  "id": "laravel-graphql-specialist",
  "technology": "Laravel 11+ GraphQL (Lighthouse)",
  "aspect": "GraphQL",
  "category": "api",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Lighthouse PHP v6 — schema-first GraphQL for Laravel with auto-generated resolvers",
    "E2: N+1 prevention — @with directive, batch loaders, DataLoader pattern",
    "E3: Subscriptions — Laravel Broadcasting + GraphQL subscriptions via Lighthouse"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 311.1–311.6 |
| **Directory Pattern** | `app/GraphQL/` |
| **Naming Convention** | `{Entity}.graphql` (schema), `{Entity}Query.php`, `{Entity}Mutation.php` |
| **Imports From** | Application (services), Domain (models) |
| **Imported By** | GraphQL endpoint (`/graphql`) |
| **Cannot Import** | Infrastructure (repositories directly) |
| **Dependencies** | `nuwave/lighthouse` |
| **When To Use** | When building flexible, client-driven APIs or alongside REST APIs |
| **Source Skeleton** | `app/GraphQL/{Queries,Mutations,Subscriptions,Types,Directives}/` |
| **Specialist Type** | code |
| **Purpose** | GraphQL API layer — schema definition, resolvers, subscriptions, N+1 optimization |
| **Activation Trigger** | files: `graphql/*.graphql`, `app/GraphQL/**/*.php`; keywords: GraphQL, Lighthouse, query, mutation, subscription |

---

## Role

You are a **Laravel GraphQL Specialist**. Your responsibility is to provide best practices for building GraphQL APIs with Laravel 11+ using Lighthouse PHP — schema-first design, query/mutation resolvers, type definitions, subscriptions, N+1 query prevention, and custom directives.

**Used by**: Any code agent building GraphQL APIs in Laravel with Lighthouse
**Not used by**: Non-Laravel stacks, REST-only APIs, projects using graphql-php directly

---

## Patterns

### Pattern 311.1: Lighthouse PHP Setup

**Category**: Setup & Configuration
**Description**: Install and configure Lighthouse PHP for Laravel 11 with schema-first approach.

```bash
composer require nuwave/lighthouse
php artisan vendor:publish --tag=lighthouse-schema
php artisan vendor:publish --tag=lighthouse-config
```

```php
<?php

// config/lighthouse.php — key configuration
return [
    'route' => [
        'uri' => '/graphql',
        'middleware' => [
            \Nuwave\Lighthouse\Support\Http\Middleware\AcceptJson::class,
            \App\Http\Middleware\ForceJsonResponse::class,
        ],
    ],
    'schema_path' => base_path('graphql/schema.graphql'),
    'namespaces' => [
        'models' => ['App\\Models'],
        'queries' => ['App\\GraphQL\\Queries'],
        'mutations' => ['App\\GraphQL\\Mutations'],
        'subscriptions' => ['App\\GraphQL\\Subscriptions'],
        'types' => ['App\\GraphQL\\Types'],
        'validators' => ['App\\GraphQL\\Validators'],
    ],
    'guard' => 'sanctum',
    'pagination' => [
        'default_count' => 15,
        'max_count' => 100,
    ],
];
```

```graphql
# graphql/schema.graphql — root schema
type Query
type Mutation
type Subscription

#import types/*.graphql
#import queries/*.graphql
#import mutations/*.graphql
#import subscriptions/*.graphql
```

**Key Points**:
- Lighthouse uses schema-first approach — define `.graphql` files, then implement resolvers
- Configure namespaces to match your directory structure
- Set `guard` to `sanctum` for token-based authentication
- `#import` splits schema into multiple files for maintainability
- Pagination defaults prevent over-fetching

---

### Pattern 311.2: Queries & Mutations

**Category**: Resolvers
**Description**: Define queries and mutations with schema directives and custom resolvers.

```graphql
# graphql/types/product.graphql
type Product {
    id: ID!
    name: String!
    slug: String!
    description: String
    price: Int!
    currency: Currency!
    is_active: Boolean!
    stock_quantity: Int!
    category: Category! @belongsTo
    tags: [Tag!]! @belongsToMany
    reviews: [Review!]! @hasMany
    reviews_count: Int! @count(relation: "reviews")
    created_at: DateTime!
    updated_at: DateTime!
}

enum Currency {
    USD
    EUR
    JPY
}
```

```graphql
# graphql/queries/product.graphql
extend type Query {
    product(slug: String! @eq): Product @find
    products(
        search: String @where(operator: "like", key: "name")
        category_id: Int @eq
        is_active: Boolean @eq
        orderBy: _ @orderBy(columns: ["created_at", "price", "name"])
    ): [Product!]! @paginate(defaultCount: 15, maxCount: 100)

    featuredProducts: [Product!]! @all @where(key: "is_featured", value: true)
}
```

```graphql
# graphql/mutations/product.graphql
extend type Mutation {
    createProduct(input: CreateProductInput! @spread): Product!
        @guard
        @can(ability: "create", model: "App\\Models\\Product")

    updateProduct(id: ID!, input: UpdateProductInput! @spread): Product!
        @guard
        @can(ability: "update", find: "id")

    deleteProduct(id: ID!): Product!
        @guard
        @can(ability: "delete", find: "id")
        @delete
}

input CreateProductInput {
    name: String! @rules(apply: ["required", "string", "max:255"])
    slug: String! @rules(apply: ["required", "string", "max:255", "unique:products,slug"])
    description: String @rules(apply: ["nullable", "string", "max:5000"])
    price: Int! @rules(apply: ["required", "integer", "min:0"])
    category_id: Int! @rules(apply: ["required", "exists:categories,id"])
}

input UpdateProductInput {
    name: String @rules(apply: ["sometimes", "string", "max:255"])
    description: String @rules(apply: ["nullable", "string", "max:5000"])
    price: Int @rules(apply: ["sometimes", "integer", "min:0"])
}
```

**Key Points**:
- `@find`, `@all`, `@paginate` — auto-generate resolvers from Eloquent
- `@guard` enforces authentication; `@can` checks Laravel policies
- `@spread` flattens input object into individual arguments
- `@rules` applies Laravel validation rules inline
- `@eq`, `@where`, `@orderBy` — filter/sort via query arguments
- `@belongsTo`, `@hasMany`, `@belongsToMany` — auto-resolve Eloquent relations

---

### Pattern 311.3: Custom Resolvers

**Category**: Business Logic
**Description**: Custom query and mutation resolvers for complex business logic beyond auto-generated CRUD.

```php
<?php

declare(strict_types=1);

namespace App\GraphQL\Queries;

use App\Models\Product;
use App\Services\ProductSearchService;
use Illuminate\Database\Eloquent\Collection;

final readonly class ProductSearch
{
    public function __construct(
        private ProductSearchService $searchService,
    ) {}

    /**
     * @param  null  $_
     * @param  array{query: string, filters: array, limit: int}  $args
     * @return Collection<int, Product>
     */
    public function __invoke(null $_, array $args): Collection
    {
        return $this->searchService->search(
            query: $args['query'],
            filters: $args['filters'] ?? [],
            limit: $args['limit'] ?? 20,
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\GraphQL\Mutations;

use App\DTOs\PlaceOrderData;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Support\Facades\DB;

final readonly class PlaceOrder
{
    public function __construct(
        private OrderService $orderService,
    ) {}

    /**
     * @param  null  $_
     * @param  array{input: array}  $args
     */
    public function __invoke(null $_, array $args): Order
    {
        return DB::transaction(function () use ($args): Order {
            $data = PlaceOrderData::from($args['input']);

            return $this->orderService->place(
                userId: auth()->id(),
                data: $data,
            );
        });
    }
}
```

```graphql
extend type Query {
    productSearch(
        query: String!
        filters: ProductSearchFilters
        limit: Int = 20
    ): [Product!]!
}

extend type Mutation {
    placeOrder(input: PlaceOrderInput!): Order!
        @guard
}
```

**Key Points**:
- Custom resolvers are invocable classes (`__invoke`) in configured namespace
- Resolver receives `$_` (root value) and `$args` (query arguments)
- Wrap mutations in `DB::transaction()` for data integrity
- Inject services via constructor for business logic delegation
- Reference resolver implicitly via naming convention or `@field` directive

---

### Pattern 311.4: Type Definitions & Enums

**Category**: Schema Design
**Description**: Define complex types, interfaces, unions, and PHP-backed enums for GraphQL.

```graphql
# graphql/types/common.graphql
scalar DateTime @scalar(class: "Nuwave\\Lighthouse\\Schema\\Types\\Scalars\\DateTime")
scalar JSON @scalar(class: "Nuwave\\Lighthouse\\Schema\\Types\\Scalars\\JSON")

interface Timestamped {
    created_at: DateTime!
    updated_at: DateTime!
}

type User implements Timestamped {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    created_at: DateTime!
    updated_at: DateTime!
}

enum UserRole {
    ADMIN @enum(value: "admin")
    EDITOR @enum(value: "editor")
    VIEWER @enum(value: "viewer")
}

enum OrderStatus {
    PENDING @enum(value: "pending")
    CONFIRMED @enum(value: "confirmed")
    SHIPPED @enum(value: "shipped")
    DELIVERED @enum(value: "delivered")
    CANCELLED @enum(value: "cancelled")
}

# Union type for search results
union SearchResult = Product | Post | User

type SearchResultList {
    items: [SearchResult!]!
    total_count: Int!
}
```

```php
<?php

declare(strict_types=1);

namespace App\GraphQL\Types;

use App\Models\Post;
use App\Models\Product;
use App\Models\User;

final class SearchResultType
{
    /**
     * Resolve the concrete type for a union.
     */
    public function resolveType(mixed $root): string
    {
        return match (true) {
            $root instanceof Product => 'Product',
            $root instanceof Post => 'Post',
            $root instanceof User => 'User',
            default => throw new \RuntimeException('Unknown search result type'),
        };
    }
}
```

**Key Points**:
- Use `@enum(value:)` to map GraphQL enum values to PHP string/enum values
- Interfaces define shared fields across types
- Union types combine different object types in a single field
- Custom scalars (DateTime, JSON) parse/serialize complex values
- Type resolvers determine concrete type for interfaces and unions

---

### Pattern 311.5: N+1 Prevention

**Category**: Performance
**Description**: Prevent N+1 query problems using @with directive, batch loaders, and eager loading strategies.

```graphql
# Method 1: @with directive — eager loads relation
type Product {
    id: ID!
    name: String!
    category: Category! @belongsTo @with(relation: "category")
    tags: [Tag!]! @belongsToMany @with(relation: "tags")
}

# Method 2: @paginate with eager loading
extend type Query {
    products: [Product!]! @paginate @with(relation: "category,tags")
}

# Method 3: Aggregate with eager loading
type Order {
    id: ID!
    items: [OrderItem!]! @hasMany
    items_count: Int! @withCount(relation: "items")
    total_amount: Float! @withSum(relation: "items", column: "subtotal")
}
```

```php
<?php

declare(strict_types=1);

namespace App\GraphQL\Queries;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final readonly class Products
{
    /**
     * @param  array{first: int, page: int}  $args
     */
    public function __invoke(null $_, array $args): LengthAwarePaginator
    {
        return Product::query()
            ->with(['category', 'tags']) // Eager load to prevent N+1
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->paginate(
                perPage: $args['first'] ?? 15,
                page: $args['page'] ?? 1,
            );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\GraphQL\DataLoaders;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Nuwave\Lighthouse\Execution\DataLoader\BatchLoader;

final class CategoryBatchLoader extends BatchLoader
{
    /**
     * @param array<int, int> $keys Category IDs
     * @return Collection<int, Category>
     */
    public function resolve(): Collection
    {
        return Category::query()
            ->whereIn('id', $this->keys)
            ->get()
            ->keyBy('id');
    }
}
```

**Key Points**:
- `@with` directive eager-loads relations at schema level — most common fix
- `@withCount`, `@withSum`, `@withAvg` for aggregate loading
- Custom batch loaders for complex scenarios (DataLoader pattern)
- In custom resolvers, always eager-load with `->with()` before returning
- Use Lighthouse's built-in relation directives (`@belongsTo`, `@hasMany`) which auto-batch

---

### Pattern 311.6: Custom Directives

**Category**: Schema Extensions
**Description**: Create custom directives for reusable schema-level behavior — caching, rate limiting, transformation.

```php
<?php

declare(strict_types=1);

namespace App\GraphQL\Directives;

use Closure;
use GraphQL\Type\Definition\ResolveInfo;
use Illuminate\Support\Facades\Cache;
use Nuwave\Lighthouse\Schema\Directives\BaseDirective;
use Nuwave\Lighthouse\Schema\Values\FieldValue;
use Nuwave\Lighthouse\Support\Contracts\FieldMiddleware;

final class CacheResultDirective extends BaseDirective implements FieldMiddleware
{
    public static function definition(): string
    {
        return /** @lang GraphQL */ <<<'GRAPHQL'
"""
Cache the result of a field resolver.
"""
directive @cacheResult(
    "Cache TTL in seconds"
    ttl: Int = 300
    "Cache key prefix"
    prefix: String
) on FIELD_DEFINITION
GRAPHQL;
    }

    public function handleField(FieldValue $fieldValue): void
    {
        $fieldValue->wrapResolver(function (callable $resolver): Closure {
            return function (
                mixed $root,
                array $args,
                mixed $context,
                ResolveInfo $resolveInfo,
            ) use ($resolver): mixed {
                $ttl = $this->directiveArgValue('ttl', 300);
                $prefix = $this->directiveArgValue('prefix', 'graphql');

                $cacheKey = sprintf(
                    '%s:%s:%s',
                    $prefix,
                    $resolveInfo->fieldName,
                    md5(json_encode($args, JSON_THROW_ON_ERROR)),
                );

                return Cache::remember(
                    key: $cacheKey,
                    ttl: $ttl,
                    callback: fn () => $resolver($root, $args, $context, $resolveInfo),
                );
            };
        });
    }
}
```

```graphql
# Usage in schema
extend type Query {
    featuredProducts: [Product!]!
        @all
        @where(key: "is_featured", value: true)
        @cacheResult(ttl: 600, prefix: "products")

    categories: [Category!]!
        @all
        @cacheResult(ttl: 3600, prefix: "categories")
}
```

```php
<?php

declare(strict_types=1);

namespace App\GraphQL\Directives;

use Closure;
use GraphQL\Type\Definition\ResolveInfo;
use Nuwave\Lighthouse\Schema\Directives\BaseDirective;
use Nuwave\Lighthouse\Schema\Values\FieldValue;
use Nuwave\Lighthouse\Support\Contracts\FieldMiddleware;

final class UppercaseDirective extends BaseDirective implements FieldMiddleware
{
    public static function definition(): string
    {
        return /** @lang GraphQL */ <<<'GRAPHQL'
directive @uppercase on FIELD_DEFINITION
GRAPHQL;
    }

    public function handleField(FieldValue $fieldValue): void
    {
        $fieldValue->wrapResolver(function (callable $resolver): Closure {
            return function (mixed ...$args) use ($resolver): mixed {
                $result = $resolver(...$args);

                return is_string($result) ? mb_strtoupper($result) : $result;
            };
        });
    }
}
```

**Key Points**:
- Custom directives extend `BaseDirective` and implement middleware interfaces
- `definition()` returns GraphQL SDL defining directive syntax and arguments
- `FieldMiddleware` wraps the resolver — can add caching, logging, transformation
- Directive class name convention: `{Name}Directive` in `App\GraphQL\Directives`
- Directives are registered automatically by namespace convention
- Use `$this->directiveArgValue()` to access directive arguments from schema

---

## Best Practices

- **Schema-first design** — define GraphQL schema first, then implement resolvers
- **Use built-in directives** — `@paginate`, `@find`, `@belongsTo` before writing custom resolvers
- **Prevent N+1** — always use `@with` or eager-load in custom resolvers
- **Validate at schema level** — `@rules` directive for input validation
- **Authorize with directives** — `@guard`, `@can` for authentication and authorization
- **Split schema files** — one `.graphql` file per type, use `#import` for organization
- **Paginate by default** — never return unbounded lists, use `@paginate` with `maxCount`
- **Test with HTTP** — POST to `/graphql` with query string for integration tests
- **Custom directives for cross-cutting** — caching, rate limiting, logging as directives

---

## Abnormal Case Patterns

1. **N+1 in nested resolvers** — querying categories for each product in a list. Fix: use `@with(relation: "category")` or `@belongsTo` which auto-batches.

2. **Unbounded queries** — `@all` on a table with millions of rows. Fix: always use `@paginate` with `maxCount` limit for production endpoints.

3. **Business logic in schema** — complex conditions expressed purely in directives. Fix: create custom resolvers for complex business logic, use directives for simple CRUD.

4. **Missing authentication** — queries accessible without `@guard` directive. Fix: apply `@guard` at query/mutation level or globally in middleware config.

5. **Over-fetching prevention missing** — clients requesting deeply nested relations consuming server resources. Fix: configure query complexity analysis and depth limiting in Lighthouse config.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (311.1–311.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel GraphQL Specialist — API | EPS v3.2*

# Laravel API Resource Specialist — API
# Laravel APIリソーススペシャリスト — API
# Chuyen Gia API Resource Laravel — API

**Version**: 1.0.0
**Technology**: Laravel 11+ API Resources
**Aspect**: API Resources
**Category**: api
**Purpose**: Knowledge provider for Laravel 11+ API resource layer — JSON resources, resource collections, conditional attributes, resource relationships, pagination, wrapping, nested resources, and resource testing

---

## Metadata

```json
{
  "id": "laravel-api-resource-specialist",
  "technology": "Laravel 11+ API Resources",
  "aspect": "API Resources",
  "category": "api",
  "subcategory": "php-laravel",
  "lines": 440,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 API Resources — JsonResource, ResourceCollection, conditional attributes",
    "E2: Resource wrapping — data envelope, additional meta, pagination links",
    "E3: whenLoaded() — conditional relationship inclusion to prevent N+1"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 310.1–310.8 |
| **Directory Pattern** | `app/Http/Resources/` |
| **Naming Convention** | `{Entity}Resource.php`, `{Entity}Collection.php` |
| **Imports From** | Domain (models — via `$this->resource`) |
| **Imported By** | Controllers (returned from actions) |
| **Cannot Import** | Infrastructure (repositories), Application (services) |
| **Dependencies** | `laravel/framework` |
| **When To Use** | Every API endpoint returning model data |
| **Source Skeleton** | `app/Http/Resources/{Entity}Resource.php` |
| **Specialist Type** | code |
| **Purpose** | API response transformation — model to JSON structure with conditional attributes and relationships |
| **Activation Trigger** | files: `app/Http/Resources/*.php`; keywords: JsonResource, ResourceCollection, toArray, whenLoaded |

---

## Role

You are a **Laravel API Resource Specialist**. Your responsibility is to provide best practices for Laravel 11+ API resource layer — transforming Eloquent models into structured JSON responses with conditional attributes, relationship handling, pagination, collection customization, wrapping control, and resource testing.

**Used by**: Any code agent building API response layers in Laravel
**Not used by**: Non-Laravel stacks, Livewire-only applications, GraphQL-only APIs

---

## Patterns

### Pattern 310.1: JSON Resource Basics

**Category**: Resource Fundamentals
**Description**: Basic API resource transforming a model into a structured JSON response.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Product
 */
final class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price' => [
                'amount' => $this->price,
                'currency' => $this->currency->value,
                'formatted' => $this->formatted_price,
            ],
            'is_active' => $this->is_active,
            'stock_quantity' => $this->stock_quantity,
            'category' => CategoryResource::make($this->whenLoaded('category')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
```

```php
// Controller usage
public function show(Product $product): ProductResource
{
    $product->load(['category', 'tags']);

    return ProductResource::make($product);
}
```

**Key Points**:
- Use `@mixin` docblock for IDE autocompletion on `$this->` properties
- Mark resource `final` — resources rarely need inheritance
- Structure nested data (price object) for clean API contracts
- Use `toIso8601String()` for consistent date formatting
- `::make()` is preferred over `new ProductResource()` for readability

---

### Pattern 310.2: Resource Collections

**Category**: Collection Resources
**Description**: Custom resource collection with additional meta data and collection-level transformations.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

final class ProductCollection extends ResourceCollection
{
    /**
     * The resource that this collection collects.
     */
    public $collects = ProductResource::class;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
            'statistics' => [
                'total_products' => $this->collection->count(),
                'average_price' => $this->collection->avg(
                    fn (ProductResource $resource) => $resource->resource->price,
                ),
                'price_range' => [
                    'min' => $this->collection->min(
                        fn (ProductResource $resource) => $resource->resource->price,
                    ),
                    'max' => $this->collection->max(
                        fn (ProductResource $resource) => $resource->resource->price,
                    ),
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'api_version' => 'v1',
                'generated_at' => now()->toIso8601String(),
            ],
        ];
    }
}
```

```php
// Controller usage
public function index(): ProductCollection
{
    $products = Product::query()
        ->with(['category', 'tags'])
        ->active()
        ->paginate(perPage: 20);

    return new ProductCollection($products);
}
```

**Key Points**:
- `$collects` property specifies which resource class wraps each item
- Override `toArray()` for collection-level data (statistics, summaries)
- `with()` adds top-level meta alongside `data` — runs for both single and paginated
- Use `ResourceCollection` when you need collection-level customization
- Use `ProductResource::collection()` when default collection behavior suffices

---

### Pattern 310.3: Conditional Attributes

**Category**: Dynamic Output
**Description**: Include attributes conditionally based on request context, user role, or loaded state.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Order
 */
final class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status->value,
            'total' => $this->total,

            // Only include when relationship is loaded (prevents N+1)
            'customer' => UserResource::make($this->whenLoaded('customer')),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),

            // Only include for admin users
            'internal_notes' => $this->when(
                condition: $request->user()?->isAdmin(),
                value: $this->internal_notes,
            ),
            'profit_margin' => $this->when(
                condition: $request->user()?->hasPermission('view-financials'),
                value: fn () => $this->calculateProfitMargin(),
            ),

            // Include count when loaded (withCount)
            'items_count' => $this->whenCounted('items'),

            // Include aggregates when loaded (withSum, withAvg)
            'items_sum_quantity' => $this->whenAggregated('items', 'quantity', 'sum'),

            // Include when attribute exists on model
            'distance' => $this->whenHas('distance'),

            // Merge additional fields conditionally
            $this->mergeWhen($request->user()?->isAdmin(), [
                'cost_price' => $this->cost_price,
                'supplier_id' => $this->supplier_id,
                'admin_flags' => $this->admin_flags,
            ]),

            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
```

**Key Points**:
- `whenLoaded()` — only includes if relationship was eager-loaded (prevents N+1)
- `when()` — conditionally include based on boolean; use closure for lazy evaluation
- `whenCounted()` — includes `{relation}_count` if `withCount()` was used
- `whenAggregated()` — includes aggregated values (withSum, withAvg)
- `mergeWhen()` — merge multiple fields conditionally (admin-only fields)
- `whenHas()` — includes if attribute exists on model (computed/appended)

---

### Pattern 310.4: Resource Relationships

**Category**: Relationship Handling
**Description**: Handle nested resources, polymorphic relations, and relationship-specific resource selection.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Post
 */
final class PostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'body' => $this->body,
            'status' => $this->status->value,

            // BelongsTo — single resource
            'author' => UserResource::make($this->whenLoaded('author')),

            // HasMany — collection resource
            'comments' => CommentResource::collection($this->whenLoaded('comments')),

            // BelongsToMany with pivot data
            'tags' => TagResource::collection($this->whenLoaded('tags')),

            // MorphTo — polymorphic parent
            'commentable' => $this->whenLoaded('commentable', function () {
                return match ($this->commentable_type) {
                    'App\Models\Post' => PostResource::make($this->commentable),
                    'App\Models\Video' => VideoResource::make($this->commentable),
                    default => null,
                };
            }),

            // Pivot data access
            'pivot_data' => $this->whenPivotLoaded('post_tag', function () {
                return [
                    'order' => $this->pivot->order,
                    'added_at' => $this->pivot->created_at?->toIso8601String(),
                ];
            }),

            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
```

**Key Points**:
- Always use `whenLoaded()` for relationships — never access relations directly in resources
- `whenPivotLoaded()` exposes pivot table data safely
- Use `match` expression for polymorphic relation resource selection
- Nested resources create consistent, recursive JSON structure
- Null-safe operator `?->` for nullable timestamps/relations

---

### Pattern 310.5: Pagination with Resources

**Category**: Paginated Responses
**Description**: Paginated resource collections with customized pagination meta and links.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

final class UserCollection extends ResourceCollection
{
    public $collects = UserResource::class;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function paginationInformation(
        Request $request,
        array $paginated,
        array $default,
    ): array {
        return [
            'meta' => [
                'current_page' => $paginated['current_page'],
                'last_page' => $paginated['last_page'],
                'per_page' => $paginated['per_page'],
                'total' => $paginated['total'],
                'from' => $paginated['from'],
                'to' => $paginated['to'],
            ],
            'links' => [
                'first' => $paginated['first_page_url'],
                'last' => $paginated['last_page_url'],
                'prev' => $paginated['prev_page_url'],
                'next' => $paginated['next_page_url'],
            ],
        ];
    }
}
```

```php
// Controller — paginated response
public function index(Request $request): UserCollection
{
    $users = User::query()
        ->with(['roles', 'department'])
        ->when(
            $request->query('search'),
            fn ($q, $search) => $q->where('name', 'like', "%{$search}%"),
        )
        ->paginate(
            perPage: $request->integer('per_page', 15),
            columns: ['id', 'name', 'email', 'created_at'],
        );

    return new UserCollection($users);
}
```

**Key Points**:
- `paginationInformation()` customizes pagination meta/links structure
- Laravel auto-wraps paginated collections with `data`, `links`, `meta`
- Use `cursorPaginate()` for infinite scroll / real-time feeds
- Pass `$request->integer('per_page', 15)` for client-controlled page size
- Restrict page size: `min(max($request->integer('per_page', 15), 1), 100)`

---

### Pattern 310.6: Resource Wrapping

**Category**: Response Envelope
**Description**: Control the data wrapping behavior — custom wrap key, disable wrapping, additional envelope data.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
final class UserResource extends JsonResource
{
    // Change default wrap key from 'data' to 'user'
    public static $wrap = 'user';

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar_url' => $this->avatar_url,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'api_version' => 'v1',
                'request_id' => $request->header('X-Request-Id'),
            ],
        ];
    }
}
```

```php
// Disable wrapping globally (in AppServiceProvider)
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    // All resources return without 'data' envelope
    JsonResource::withoutWrapping();
}
```

```php
// Per-response additional data
public function show(User $user): UserResource
{
    return UserResource::make($user)
        ->additional([
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'feature_flags' => $user->activeFeatureFlags(),
        ]);
}
```

**Key Points**:
- `$wrap` property changes the envelope key (default: `'data'`)
- `withoutWrapping()` disables envelope globally — not recommended for paginated APIs
- `with()` adds data at the top level alongside the wrapped data
- `additional()` adds per-response extra data from the controller
- Consistent wrapping is important for frontend SDK compatibility

---

### Pattern 310.7: Nested Resources & Composed Responses

**Category**: Complex Responses
**Description**: Build complex response structures by composing multiple resources and adding computed data.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Order
 */
final class OrderDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => [
                'value' => $this->status->value,
                'label' => $this->status->label(),
                'color' => $this->status->color(),
                'allowed_transitions' => $this->status->allowedTransitions(),
            ],
            'customer' => UserResource::make($this->whenLoaded('customer')),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payment' => PaymentResource::make($this->whenLoaded('payment')),
            'shipment' => ShipmentResource::make($this->whenLoaded('shipment')),
            'timeline' => OrderEventResource::collection($this->whenLoaded('events')),
            'totals' => [
                'subtotal' => $this->subtotal,
                'tax' => $this->tax_amount,
                'shipping' => $this->shipping_cost,
                'discount' => $this->discount_amount,
                'total' => $this->total,
            ],
            'actions' => $this->when(
                condition: $request->user() !== null,
                value: fn () => [
                    'can_cancel' => $request->user()->can('cancel', $this->resource),
                    'can_refund' => $request->user()->can('refund', $this->resource),
                    'can_edit' => $request->user()->can('update', $this->resource),
                ],
            ),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
```

**Key Points**:
- Compose responses from multiple resource classes for consistency
- Include `actions` object with permission-based flags for frontend UI
- Structure enum data as objects with value, label, and metadata
- Use separate resource classes for detail vs list views (OrderResource vs OrderDetailResource)
- Totals as a nested object for clean financial data representation

---

### Pattern 310.8: Resource Testing

**Category**: Testing
**Description**: Test API resource output structure, conditional attributes, and pagination.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Resources;

use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class ProductResourceTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function resource_returns_expected_structure(): void
    {
        $product = Product::factory()
            ->for(Category::factory())
            ->create(['name' => 'Widget Pro', 'price' => 2999]);

        $product->load('category');
        $resource = ProductResource::make($product)->resolve();

        $this->assertArrayHasKey('id', $resource);
        $this->assertArrayHasKey('name', $resource);
        $this->assertArrayHasKey('price', $resource);
        $this->assertEquals('Widget Pro', $resource['name']);
        $this->assertEquals(2999, $resource['price']['amount']);
        $this->assertArrayHasKey('category', $resource);
    }

    #[Test]
    public function resource_omits_relationship_when_not_loaded(): void
    {
        $product = Product::factory()->create();

        // Do NOT load category
        $resource = ProductResource::make($product)->resolve();

        $this->assertArrayNotHasKey('category', $resource);
    }

    #[Test]
    public function collection_endpoint_returns_paginated_structure(): void
    {
        Product::factory()->count(25)->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/products');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'slug', 'price']],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
                'links' => ['first', 'last', 'prev', 'next'],
            ])
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.total', 25);
    }

    #[Test]
    public function resource_hides_admin_fields_for_regular_user(): void
    {
        $product = Product::factory()->create();
        $user = User::factory()->create(); // non-admin

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/products/{$product->slug}");

        $response->assertOk()
            ->assertJsonMissing(['cost_price', 'supplier_id']);
    }
}
```

**Key Points**:
- `->resolve()` converts resource to array without HTTP — useful for unit tests
- Test both loaded and unloaded relationship states
- Assert paginated structure with `meta` and `links`
- Test conditional attributes for different user roles
- Use `assertJsonMissing()` to verify hidden fields
- Feature tests via HTTP assertions validate full stack including resource

---

## Best Practices

- **Always use resources** — never return raw models or arrays from API controllers
- **whenLoaded() everywhere** — prevents N+1 when relationship is not eager-loaded
- **Separate list vs detail resources** — `UserResource` for lists, `UserDetailResource` for show
- **Mark resources final** — resources are leaf classes, no inheritance needed
- **Use @mixin docblock** — enables IDE autocompletion for `$this->` model properties
- **Consistent date format** — `toIso8601String()` for all timestamps
- **Include actions object** — permission-based flags help frontend render UI correctly
- **Test resource output** — verify structure, conditional attributes, pagination
- **Use with() for meta** — API version, request ID at top level
- **Structure enums as objects** — `{value, label, color}` not just raw string

---

## Abnormal Case Patterns

1. **Returning raw models** — `return $user` leaks hidden attributes, mutators, and relations. Fix: always wrap in `UserResource::make($user)`.

2. **Direct relation access without whenLoaded** — `'category' => new CategoryResource($this->category)` causes N+1 in collections. Fix: use `whenLoaded('category')`.

3. **Inconsistent wrapping** — some endpoints wrapped in `{data: ...}`, others return flat objects. Fix: use consistent resource wrapping or disable globally.

4. **Heavy computation in resource** — calculating aggregates inside `toArray()` for every item. Fix: precompute via `withCount()`, `withSum()` at query level.

5. **Missing pagination meta** — frontend pagination breaks because meta structure changed. Fix: use `paginationInformation()` for custom meta format and keep stable.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (310.1–310.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel API Resource Specialist — API | EPS v3.2*

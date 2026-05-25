# Laravel Controller & Routing Specialist — API
# Laravelコントローラ＆ルーティングスペシャリスト — API
# Chuyen Gia Controller va Routing Laravel — API

**Version**: 1.0.0
**Technology**: Laravel 11+ Controllers & Routing
**Aspect**: Controllers & Routing
**Category**: api
**Purpose**: Knowledge provider for Laravel 11+ controller architecture — resource controllers, API controllers, route model binding, nested resources, middleware assignment, response helpers, and controller testing

---

## Metadata

```json
{
  "id": "laravel-controller-routing-specialist",
  "technology": "Laravel 11+ Controllers & Routing",
  "aspect": "Controllers & Routing",
  "category": "api",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 routing — bootstrap/app.php withRouting(), no RouteServiceProvider",
    "E2: Resource controller conventions — 7 RESTful actions, apiResource() for API-only",
    "E3: Route model binding — implicit/explicit binding, scoped bindings for nested resources"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 307.1–307.10 |
| **Directory Pattern** | `app/Http/Controllers/` |
| **Naming Convention** | `{Entity}Controller.php` |
| **Imports From** | Application (services, DTOs), Domain (models) |
| **Imported By** | Routes (`routes/api.php`, `routes/web.php`) |
| **Cannot Import** | Infrastructure (repositories directly) |
| **Dependencies** | `laravel/framework` |
| **When To Use** | Every Laravel API or web endpoint requiring controller logic |
| **Source Skeleton** | `app/Http/Controllers/{Entity}Controller.php` |
| **Specialist Type** | code |
| **Purpose** | Controller architecture, routing patterns, route model binding, response formatting |
| **Activation Trigger** | files: `app/Http/Controllers/*.php`, `routes/api.php`; keywords: Controller, Route, apiResource, middleware |

---

## Role

You are a **Laravel Controller & Routing Specialist**. Your responsibility is to provide best practices for Laravel 11+ controller design — resource controllers, API resource controllers, invocable controllers, route model binding, nested resources, middleware assignment, response helpers, streaming responses, and controller testing.

**Used by**: Any code agent implementing Laravel API endpoints or web routes
**Not used by**: Non-Laravel stacks, projects using only Livewire without traditional controllers

---

## Patterns

### Pattern 307.1: Resource Controller

**Category**: Controller Fundamentals
**Description**: Full resource controller with all 7 RESTful actions following Laravel 11 conventions.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        $products = Product::query()
            ->with(['category', 'tags'])
            ->latest()
            ->paginate(perPage: 15);

        return ProductResource::collection($products);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->create(
            data: $request->validated(),
        );

        return ProductResource::make($product)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product): ProductResource
    {
        $product->load(['category', 'tags', 'reviews']);

        return ProductResource::make($product);
    }

    public function update(
        UpdateProductRequest $request,
        Product $product,
    ): ProductResource {
        $product = $this->productService->update(
            product: $product,
            data: $request->validated(),
        );

        return ProductResource::make($product);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->productService->delete(product: $product);

        return response()->json(status: 204);
    }
}
```

**Key Points**:
- Inject services via constructor promotion with `readonly`
- Use Form Request classes for validation, never validate inline
- Return API Resources, never raw arrays or models
- Mark controllers `final` unless extension is explicitly designed

---

### Pattern 307.2: API Resource Controller

**Category**: API-Only Controllers
**Description**: Streamlined controller for API-only routes using `apiResource()` — excludes `create` and `edit` actions.

```php
// routes/api.php
use App\Http\Controllers\OrderController;
use Illuminate\Support\Facades\Route;

Route::apiResource('orders', OrderController::class)
    ->middleware(['auth:sanctum'])
    ->scoped(['order' => 'uuid']);

// Generates: index, store, show, update, destroy
// Does NOT generate: create, edit (no HTML forms in API)
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;

final class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService,
    ) {}

    public function index(): JsonResponse
    {
        $orders = Order::query()
            ->forUser(auth()->id())
            ->with(['items', 'payment'])
            ->latest()
            ->cursorPaginate(perPage: 20);

        return OrderResource::collection($orders)
            ->response();
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orderService->place(
            userId: auth()->id(),
            items: $request->validated('items'),
            shippingAddress: $request->validated('shipping_address'),
        );

        return OrderResource::make($order)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Order $order): OrderResource
    {
        $this->authorize('view', $order);
        $order->load(['items.product', 'payment', 'shipment']);

        return OrderResource::make($order);
    }

    public function destroy(Order $order): JsonResponse
    {
        $this->authorize('delete', $order);
        $this->orderService->cancel(order: $order);

        return response()->json(status: 204);
    }
}
```

**Key Points**:
- `apiResource()` excludes `create` and `edit` — no form views needed
- Use `cursorPaginate()` for large datasets with real-time inserts
- `scoped()` enforces route key (e.g., UUID instead of auto-increment ID)
- Always authorize actions via `$this->authorize()` or Form Request

---

### Pattern 307.3: Invocable Controller

**Category**: Single-Action Controllers
**Description**: Controller with a single `__invoke()` method for one-off actions that don't fit RESTful resources.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ExportReportRequest;
use App\Services\ReportExportService;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ExportReportController extends Controller
{
    public function __construct(
        private readonly ReportExportService $exportService,
    ) {}

    public function __invoke(ExportReportRequest $request): StreamedResponse
    {
        $this->authorize('export', Report::class);

        return $this->exportService->streamCsv(
            filters: $request->validated(),
            filename: sprintf('report-%s.csv', now()->format('Y-m-d')),
        );
    }
}
```

```php
// routes/api.php
Route::post('/reports/export', ExportReportController::class)
    ->middleware(['auth:sanctum', 'throttle:exports'])
    ->name('reports.export');
```

**Key Points**:
- One controller = one action = one responsibility
- Route registration uses class name directly (no method string)
- Use for actions like: export, import, webhook handling, health checks
- Naming convention: `{Verb}{Noun}Controller.php`

---

### Pattern 307.4: Route Model Binding

**Category**: Routing
**Description**: Implicit and explicit model binding with customization for route key, scoping, and missing model handling.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Product extends Model
{
    use SoftDeletes;

    // Implicit binding uses 'slug' instead of 'id'
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    // Custom resolution logic
    public function resolveRouteBinding(
        mixed $value,
        ?string $field = null,
    ): ?self {
        return $this->query()
            ->where($field ?? $this->getRouteKeyName(), $value)
            ->where('is_active', true)
            ->first();
    }
}
```

```php
// Explicit binding in bootstrap/app.php or routes
use App\Models\Product;
use Illuminate\Support\Facades\Route;

Route::bind('product', function (string $value): Product {
    return Product::query()
        ->where('slug', $value)
        ->where('is_published', true)
        ->firstOrFail();
});

// Missing model handling
Route::get('/products/{product}', [ProductController::class, 'show'])
    ->missing(fn () => response()->json(
        data: ['error' => 'Product not found'],
        status: 404,
    ));
```

**Key Points**:
- Override `getRouteKeyName()` on the model for slug-based URLs
- `resolveRouteBinding()` for custom query logic (soft deletes, active only)
- `->missing()` for custom 404 responses per-route
- Explicit binding in service provider for complex resolution

---

### Pattern 307.5: Nested Resources

**Category**: Routing
**Description**: Nested resource routes with scoped binding to enforce parent-child relationships.

```php
// routes/api.php
use App\Http\Controllers\PostCommentController;
use Illuminate\Support\Facades\Route;

Route::apiResource('posts.comments', PostCommentController::class)
    ->scoped()
    ->shallow();

// Generates:
// GET    /posts/{post}/comments         → index
// POST   /posts/{post}/comments         → store
// GET    /comments/{comment}            → show (shallow)
// PUT    /comments/{comment}            → update (shallow)
// DELETE /comments/{comment}            → destroy (shallow)
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\JsonResponse;

final class PostCommentController extends Controller
{
    public function index(Post $post): JsonResponse
    {
        $comments = $post->comments()
            ->with('author:id,name,avatar')
            ->latest()
            ->paginate(perPage: 25);

        return CommentResource::collection($comments)->response();
    }

    public function store(
        StoreCommentRequest $request,
        Post $post,
    ): JsonResponse {
        $comment = $post->comments()->create([
            ...$request->validated(),
            'author_id' => auth()->id(),
        ]);

        return CommentResource::make($comment)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Comment $comment): CommentResource
    {
        $comment->load('author:id,name,avatar');

        return CommentResource::make($comment);
    }
}
```

**Key Points**:
- `->scoped()` ensures the child belongs to the parent (e.g., comment belongs to post)
- `->shallow()` generates direct URLs for show/update/destroy (no parent prefix)
- Child controller receives both parent and child model when not shallow
- Always eager-load relationships needed by the resource

---

### Pattern 307.6: Route Groups & Prefixes

**Category**: Route Organization
**Description**: Organize routes with groups, prefixes, name prefixes, and domain routing.

```php
// routes/api.php
use Illuminate\Support\Facades\Route;

// API version grouping
Route::prefix('v1')->as('v1.')->group(function (): void {
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::apiResource('products', ProductController::class);
        Route::apiResource('orders', OrderController::class);

        // Admin-only routes
        Route::middleware('role:admin')
            ->prefix('admin')
            ->as('admin.')
            ->group(function (): void {
                Route::apiResource('users', Admin\UserController::class);
                Route::post('reports/generate', Admin\GenerateReportController::class)
                    ->name('reports.generate');
            });
    });

    // Public routes
    Route::get('products/featured', [ProductController::class, 'featured'])
        ->name('products.featured');
});

// Subdomain routing
Route::domain('{tenant}.example.com')->group(function (): void {
    Route::apiResource('projects', TenantProjectController::class);
});
```

**Key Points**:
- `prefix()` adds URL segments; `as()` adds name prefix for `route()` helper
- Nest middleware groups to build layered authentication/authorization
- Use subdomain routing for multi-tenant applications
- Keep route files under 200 lines — split by domain into `routes/api/v1/*.php`

---

### Pattern 307.7: Controller Middleware

**Category**: Middleware Assignment
**Description**: Assign middleware at the controller level using constructor or `middleware()` static method in Laravel 11.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

final class ArticleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('auth:sanctum'),
            new Middleware('throttle:60,1', only: ['store', 'update']),
            new Middleware('cache.headers:public;max_age=600', only: ['index', 'show']),
            new Middleware('role:editor', except: ['index', 'show']),
        ];
    }

    public function index(): JsonResponse
    {
        // Public, cached, throttled
    }

    public function store(StoreArticleRequest $request): JsonResponse
    {
        // Auth + editor role + throttled
    }
}
```

**Key Points**:
- Laravel 11 uses `HasMiddleware` interface instead of constructor `$this->middleware()`
- `only` and `except` arrays control per-action middleware
- Prefer route-level middleware for simple cases, controller-level for complex per-action rules
- `Middleware` value object supports fluent `only()` and `except()` methods

---

### Pattern 307.8: Response Helpers

**Category**: Response Formatting
**Description**: Consistent API responses using response helpers, macros, and response classes.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

final class UserController extends Controller
{
    public function show(User $user): JsonResponse
    {
        return response()->json(
            data: [
                'data' => UserResource::make($user),
                'meta' => [
                    'generated_at' => now()->toIso8601String(),
                ],
            ],
            status: 200,
            headers: [
                'X-Request-Id' => request()->header('X-Request-Id'),
                'Cache-Control' => 'private, max-age=300',
            ],
        );
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);
        $user->delete();

        return response()->noContent(); // 204
    }

    public function download(User $user): JsonResponse
    {
        return response()->json(
            data: UserResource::make($user),
        )->header('Content-Disposition', 'attachment; filename="user.json"');
    }
}
```

**Key Points**:
- Use `response()->json()` with named args for clarity
- `response()->noContent()` for 204 responses (delete operations)
- Add custom headers via `->header()` or `headers` parameter
- Define response macros in AppServiceProvider for reusable response shapes

---

### Pattern 307.9: Streaming Responses

**Category**: Large Payloads
**Description**: Stream large datasets without memory exhaustion using StreamedResponse and StreamedJsonResponse.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\StreamedJsonResponse;

final class TransactionExportController extends Controller
{
    public function __invoke(): StreamedResponse
    {
        return response()->streamDownload(
            callback: function (): void {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, ['ID', 'Amount', 'Status', 'Date']);

                Transaction::query()
                    ->select(['id', 'amount', 'status', 'created_at'])
                    ->orderBy('created_at', 'desc')
                    ->lazy(chunkSize: 1000)
                    ->each(function (Transaction $tx) use ($handle): void {
                        fputcsv($handle, [
                            $tx->id,
                            $tx->amount,
                            $tx->status->value,
                            $tx->created_at->toDateTimeString(),
                        ]);
                    });

                fclose($handle);
            },
            name: 'transactions.csv',
            headers: ['Content-Type' => 'text/csv'],
        );
    }
}
```

```php
// StreamedJsonResponse for large JSON arrays (Laravel 11)
final class LargeDatasetController extends Controller
{
    public function __invoke(): StreamedJsonResponse
    {
        return response()->streamJson([
            'data' => Transaction::query()
                ->select(['id', 'amount', 'status'])
                ->lazy(chunkSize: 500),
        ]);
    }
}
```

**Key Points**:
- `lazy()` with chunk size prevents loading entire dataset into memory
- `streamDownload()` for file downloads (CSV, XML)
- `streamJson()` for large JSON arrays — streams items one by one
- Always set appropriate Content-Type headers

---

### Pattern 307.10: Controller Testing

**Category**: Testing
**Description**: Feature tests for controllers with authentication, authorization, and response assertions.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class ProductControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function index_returns_paginated_products(): void
    {
        Product::factory()->count(20)->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/products');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'price', 'category']],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
                'links',
            ])
            ->assertJsonCount(15, 'data');
    }

    #[Test]
    public function store_creates_product_with_valid_data(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/products', [
                'name' => 'Widget Pro',
                'price' => 29_99,
                'category_id' => 1,
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Widget Pro');

        $this->assertDatabaseHas('products', ['name' => 'Widget Pro']);
    }

    #[Test]
    public function show_returns_404_for_missing_product(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/products/nonexistent-slug')
            ->assertNotFound();
    }

    #[Test]
    public function destroy_requires_authorization(): void
    {
        $product = Product::factory()->create();
        $user = User::factory()->create(); // non-admin

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/products/{$product->slug}")
            ->assertForbidden();
    }
}
```

**Key Points**:
- Use `actingAs()` with guard name for Sanctum authentication
- `assertJsonStructure()` validates response shape without hardcoding values
- `assertJsonPath()` for specific value assertions
- Test both happy path and error cases (404, 403, 422)
- Use `RefreshDatabase` trait for clean state between tests

---

## Best Practices

- **Single responsibility** — one resource per controller; use invocable controllers for non-RESTful actions
- **Never put business logic in controllers** — delegate to service classes, keep controllers thin
- **Always type-hint return types** — `JsonResponse`, `ProductResource`, `AnonymousResourceCollection`
- **Use Form Requests** — never call `$request->validate()` inline in controllers
- **Authorize in controllers** — `$this->authorize()` or Form Request `authorize()` method
- **Eager-load in controllers** — load relationships before passing to resources
- **Use API Resources** — never return raw `Model::toArray()` from API endpoints
- **Name all routes** — enables `route()` helper and URL generation
- **Version API routes** — prefix with `/v1/`, `/v2/` for backward compatibility
- **Keep route files organized** — split into domain-specific files for large applications

---

## Abnormal Case Patterns

1. **Business logic in controllers** — controllers with 100+ line methods containing DB queries, calculations, and notifications. Fix: extract to service/action classes, controller methods should be 5-15 lines.

2. **Missing route model binding scope** — nested resource routes without `->scoped()` return any child regardless of parent. Fix: always use `->scoped()` for nested resources to enforce ownership.

3. **Returning raw models** — `return $product` leaks all model attributes including hidden fields. Fix: always wrap in API Resource that explicitly defines exposed attributes.

4. **N+1 in controller index** — paginating without eager loading causes N+1 queries when resource accesses relationships. Fix: add `->with()` before `paginate()`.

5. **Inconsistent response format** — some endpoints return `{data: ...}`, others return raw objects. Fix: always use API Resources which wrap in consistent `{data: ...}` format.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (307.1–307.10), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Controller & Routing Specialist — API | EPS v3.2*

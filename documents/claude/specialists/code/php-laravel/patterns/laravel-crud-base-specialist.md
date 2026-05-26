# Laravel CRUD Base Specialist — Patterns
# Laravel CRUDベーススペシャリスト — パターン
# Chuyen Gia CRUD Co Ban Laravel — Mau Thiet Ke

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x CRUD
**Aspect**: CRUD Operations
**Category**: patterns
**Purpose**: Knowledge provider for Laravel CRUD patterns — base controller traits, API CRUD resources, form request validation, authorization, soft deletes, and CRUD scaffolding

---

## Metadata

```json
{
  "id": "laravel-crud-base-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "CRUD Operations",
  "category": "patterns",
  "subcategory": "php-laravel",
  "lines": 430,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel resource controllers — RESTful CRUD with apiResource routes",
    "E2: Form requests — validation + authorization in dedicated request classes",
    "E3: Eloquent soft deletes — non-destructive delete with restore capability"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 347.1–347.6 |
| **Directory Pattern** | `app/Http/Controllers/Api/`, `app/Http/Requests/` |
| **Naming Convention** | `{Entity}Controller.php`, `Store{Entity}Request.php`, `Update{Entity}Request.php` |
| **Imports From** | Domain (models), Application (services) |
| **Imported By** | Routes (api.php) |
| **Cannot Import** | Infrastructure (repositories directly — use services) |
| **Dependencies** | `illuminate/routing`, `illuminate/validation`, `illuminate/auth` |
| **When To Use** | Standard resource endpoints with consistent patterns |
| **Source Skeleton** | `app/Http/Controllers/Api/{Entity}Controller.php` |
| **Specialist Type** | code |
| **Purpose** | CRUD patterns for Laravel — base controllers, resources, validation, authorization, soft deletes |
| **Activation Trigger** | files: `app/Http/Controllers/*Controller.php`; keywords: CRUD, resource, apiResource, store, update, destroy |

---

## Role

You are a **Laravel CRUD Base Specialist**. Your responsibility is to provide best practices for implementing CRUD operations in Laravel 11+ — reusable controller patterns, API resource responses, form request validation, policy-based authorization, soft delete handling, and scaffolding approaches.

**Used by**: Any code agent building standard resource endpoints in Laravel
**Not used by**: Non-CRUD endpoints (webhooks, RPC), non-Laravel stacks

---

## Patterns

### Pattern 347.1: CRUD Trait / Base Controller

**Category**: Reusability
**Description**: Reusable CRUD trait for consistent API controller behavior across resources.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Traits;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

trait HasCrudOperations
{
    abstract protected function model(): string;

    abstract protected function resource(): string;

    abstract protected function storeRequest(): string;

    abstract protected function updateRequest(): string;

    public function index(): AnonymousResourceCollection
    {
        $query = ($this->model())::query();

        if (method_exists($this, 'applyFilters')) {
            $query = $this->applyFilters($query);
        }

        $items = $query->paginate(
            perPage: min(request()->integer('per_page', 15), 100),
        );

        return ($this->resource())::collection($items);
    }

    public function show(int $id): JsonResource
    {
        $item = ($this->model())::findOrFail($id);

        return new ($this->resource())($item);
    }

    public function store(): JsonResponse
    {
        $request = app($this->storeRequest());
        $item = ($this->model())::create($request->validated());

        return (new ($this->resource())($item))
            ->response()
            ->setStatusCode(201);
    }

    public function update(int $id): JsonResource
    {
        $request = app($this->updateRequest());
        $item = ($this->model())::findOrFail($id);
        $item->update($request->validated());

        return new ($this->resource())($item->refresh());
    }

    public function destroy(int $id): JsonResponse
    {
        $item = ($this->model())::findOrFail($id);
        $item->delete();

        return response()->json(status: 204);
    }
}
```

```php
// Concrete controller using the trait
final class CategoryController extends Controller
{
    use HasCrudOperations;

    protected function model(): string { return \App\Models\Category::class; }
    protected function resource(): string { return \App\Http\Resources\CategoryResource::class; }
    protected function storeRequest(): string { return \App\Http\Requests\StoreCategoryRequest::class; }
    protected function updateRequest(): string { return \App\Http\Requests\UpdateCategoryRequest::class; }
}
```

**Key Points**:
- Trait provides default CRUD implementations — override individual methods when needed
- Abstract methods force concrete controllers to declare their model and resource classes
- Cap `per_page` to prevent abuse — max 100 is reasonable
- Trait is optional — complex controllers should implement methods directly

---

### Pattern 347.2: API CRUD Resource

**Category**: Presentation
**Description**: API Resource and ResourceCollection for consistent CRUD response formatting.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
                'formatted' => number_format($this->price, 2),
            ],
            'category' => new CategoryResource($this->whenLoaded('category')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

```php
// Routes — api.php
use App\Http\Controllers\Api\ProductController;

Route::apiResource('products', ProductController::class);
// Generates: index, show, store, update, destroy routes
// Without: create, edit (not needed for APIs)
```

**Key Points**:
- `apiResource` generates only API-relevant routes — no create/edit form routes
- `whenLoaded()` prevents N+1 — only serializes eager-loaded relations
- Always use ISO 8601 for dates — consistent, timezone-aware, parseable
- Resources decouple database schema from API contract

---

### Pattern 347.3: CRUD with Form Requests

**Category**: Validation
**Description**: Dedicated form request classes for store and update validation with shared rules.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Product::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('products')],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')],
            'is_active' => ['boolean'],
            'tags' => ['array', 'max:10'],
            'tags.*' => ['integer', Rule::exists('tags', 'id')],
        ];
    }
}

final class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('product'));
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('products')->ignore($this->route('product')),
            ],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:999999.99'],
            'category_id' => ['sometimes', 'integer', Rule::exists('categories', 'id')],
            'is_active' => ['boolean'],
        ];
    }
}
```

**Key Points**:
- Separate request classes for store (all required) and update (all sometimes)
- `authorize()` integrates with policies — authorization at request level
- `Rule::unique()->ignore()` on update — exclude current record from uniqueness check
- Array validation (`tags.*`) for nested input validation

---

### Pattern 347.4: CRUD with Authorization

**Category**: Security
**Description**: Policy-based authorization for CRUD operations with resource scoping.

```php
<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

final class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // All authenticated users can list
    }

    public function view(User $user, Product $product): bool
    {
        return $product->is_active || $user->id === $product->user_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('products.create');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->id === $product->user_id
            || $user->hasRole('admin');
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->id === $product->user_id
            || $user->hasRole('admin');
    }

    public function restore(User $user, Product $product): bool
    {
        return $user->hasRole('admin');
    }

    public function forceDelete(User $user, Product $product): bool
    {
        return $user->hasRole('super-admin');
    }
}
```

```php
// Controller with policy authorization
final class ProductController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Product::class, 'product');
    }

    public function index(): AnonymousResourceCollection
    {
        // Policy viewAny is auto-checked by authorizeResource
        $products = Product::query()
            ->visibleTo(auth()->user())
            ->paginate(15);

        return ProductResource::collection($products);
    }
}
```

**Key Points**:
- `authorizeResource()` in constructor maps CRUD methods to policy methods automatically
- Policies handle both ownership and role-based access
- Scope queries in index — user sees only their records plus public ones
- Separate `delete` vs `forceDelete` for soft delete workflows

---

### Pattern 347.5: CRUD with Soft Deletes

**Category**: Data Retention
**Description**: Soft delete support in CRUD operations — archive, restore, force delete.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ProductController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $products = Product::query()
            ->when(
                request()->boolean('include_trashed'),
                fn ($q) => $q->withTrashed(),
            )
            ->when(
                request()->boolean('only_trashed'),
                fn ($q) => $q->onlyTrashed(),
            )
            ->paginate(15);

        return ProductResource::collection($products);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);
        $product->delete(); // Soft delete

        return response()->json(status: 204);
    }

    public function restore(int $id): JsonResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $this->authorize('restore', $product);
        $product->restore();

        return response()->json(new ProductResource($product));
    }

    public function forceDelete(int $id): JsonResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $this->authorize('forceDelete', $product);
        $product->forceDelete();

        return response()->json(status: 204);
    }
}
```

```php
// Routes for soft delete operations
Route::apiResource('products', ProductController::class);
Route::post('products/{product}/restore', [ProductController::class, 'restore'])
    ->name('products.restore');
Route::delete('products/{product}/force', [ProductController::class, 'forceDelete'])
    ->name('products.force-delete');
```

**Key Points**:
- `delete()` soft-deletes; `forceDelete()` permanently removes
- `onlyTrashed()` for restore endpoints — find soft-deleted records only
- Separate authorization for delete vs restore vs forceDelete
- Custom routes for restore/forceDelete — not covered by apiResource

---

### Pattern 347.6: CRUD Scaffolding

**Category**: Developer Experience
**Description**: Artisan commands and conventions for rapid CRUD scaffolding.

```php
// Artisan commands for complete CRUD scaffolding
// php artisan make:model Product -mfcrs
// Creates: Model, Migration, Factory, Controller (resource), Seeder

// php artisan make:request StoreProductRequest
// php artisan make:request UpdateProductRequest
// php artisan make:resource ProductResource
// php artisan make:policy ProductPolicy --model=Product
// php artisan make:test ProductControllerTest
```

```php
// Standard CRUD file structure
// app/
//   Models/Product.php
//   Http/
//     Controllers/Api/ProductController.php
//     Requests/StoreProductRequest.php
//     Requests/UpdateProductRequest.php
//     Resources/ProductResource.php
//   Policies/ProductPolicy.php
// database/
//   migrations/xxxx_create_products_table.php
//   factories/ProductFactory.php
//   seeders/ProductSeeder.php
// tests/
//   Feature/ProductControllerTest.php
```

```php
// Feature test for CRUD endpoints
final class ProductControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_paginated_products(): void
    {
        Product::factory()->count(20)->create();

        $response = $this->getJson('/api/products?per_page=10');

        $response->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_store_creates_product(): void
    {
        $user = User::factory()->create();
        $category = Category::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/products', [
            'name' => 'New Product',
            'slug' => 'new-product',
            'price' => 29.99,
            'category_id' => $category->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'New Product');
    }

    public function test_update_validates_unique_slug(): void
    {
        $user = User::factory()->create();
        Product::factory()->create(['slug' => 'existing']);
        $product = Product::factory()->for($user)->create();

        $response = $this->actingAs($user)->putJson(
            "/api/products/{$product->id}",
            ['slug' => 'existing'],
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('slug');
    }

    public function test_destroy_soft_deletes_product(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->for($user)->create();

        $response = $this->actingAs($user)
            ->deleteJson("/api/products/{$product->id}");

        $response->assertNoContent();
        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }
}
```

**Key Points**:
- Use `make:model -mfcrs` for complete scaffolding in one command
- Follow Laravel naming conventions — consistency across team members
- Feature tests cover the full HTTP lifecycle — request to response
- Test validation errors with `assertJsonValidationErrors()`

---

## Best Practices

- **Use apiResource routes** — generates only API-needed routes
- **Separate store/update requests** — different validation rules for create vs update
- **Authorize at request level** — `authorize()` in form requests, not controllers
- **Return 201 on create** — HTTP status codes matter for API consumers
- **Return 204 on delete** — no content response for successful deletion
- **Cap per_page** — prevent abuse with `min(request->integer('per_page', 15), 100)`
- **Soft delete by default** — add `SoftDeletes` trait; hard delete only when required
- **Test all CRUD operations** — happy path, validation, authorization, edge cases

---

## Abnormal Case Patterns

1. **Mass assignment vulnerability** — using `$request->all()` instead of `$request->validated()`. Fix: always use `validated()` for model create/update.

2. **Missing authorization** — CRUD controller without policy or form request authorization. Fix: add `authorizeResource()` or `authorize()` in each method.

3. **N+1 in index** — listing entities without eager loading relations. Fix: add `with()` for relations used in resource serialization.

4. **Inconsistent response format** — some endpoints return raw arrays, others return resources. Fix: always use API Resources for response formatting.

5. **Hard delete without confirmation** — `forceDelete()` exposed without admin restriction. Fix: require `super-admin` role for permanent deletion.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (347.1–347.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel CRUD Base Specialist — Patterns | EPS v3.2*

# Laravel Livewire & Inertia.js Specialist — Livewire
# Laravel Livewire & Inertia.jsスペシャリスト — ライブワイヤー
# Chuyen Gia Livewire va Inertia.js Laravel — Livewire

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Livewire 3 / Inertia.js
**Aspect**: Reactive Frontend Integration
**Category**: livewire
**Purpose**: Knowledge provider for Laravel frontend integration — Livewire component basics, reactive properties, forms, Inertia.js setup, shared data, and hybrid API patterns

---

## Metadata

```json
{
  "id": "laravel-livewire-inertia-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Livewire 3 / Inertia.js",
  "aspect": "Reactive Frontend Integration",
  "category": "livewire",
  "subcategory": "php-laravel",
  "lines": 490,
  "token_cost": 3300,
  "version": "1.0.0",
  "evidence": [
    "E1: Livewire 3 — full-stack reactive components with Alpine.js",
    "E2: Inertia.js — monolith SPA bridge (Vue/React/Svelte)",
    "E3: Livewire forms — form objects with validation and submission",
    "E4: Hybrid API — combining Livewire components with REST endpoints"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 371.1–371.6 |
| **Directory Pattern** | `app/Livewire/`, `resources/views/livewire/`, `app/Http/Controllers/` |
| **Naming Convention** | `{Component}Component.php` (Livewire), `{Page}Controller.php` (Inertia) |
| **Imports From** | Application (services), Domain (models) |
| **Imported By** | N/A (presentation is the top layer) |
| **Cannot Import** | Infrastructure layer directly |
| **Dependencies** | `livewire/livewire` or `inertiajs/inertia-laravel` |
| **When To Use** | Interactive UIs, SPAs with Laravel backend, real-time forms |
| **Source Skeleton** | `app/Livewire/{Name}.php` + `resources/views/livewire/{name}.blade.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel Livewire & Inertia.js — reactive components, forms, SPA bridge |
| **Activation Trigger** | files: `app/Livewire/*.php`; keywords: Livewire, Inertia, reactive, wire:model, component |

---

## Role

You are a **Laravel Livewire & Inertia.js Specialist**. Your responsibility is to provide best practices for Laravel 11+ frontend integration — Livewire 3 component architecture, reactive properties, form handling, Inertia.js setup for SPA-like experiences, shared data patterns, and hybrid approaches combining Livewire with REST APIs.

**Used by**: Any code agent building interactive UIs with Laravel
**Not used by**: Pure API backends, non-Laravel stacks

---

## Patterns

### Pattern 371.1: Livewire Component Basics

**Category**: Component Architecture
**Description**: Build reactive Livewire 3 components with properties, actions, and lifecycle hooks.

```php
<?php

declare(strict_types=1);

namespace App\Livewire;

use App\Models\Product;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Collection;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

#[Title('Product Catalog')]
final class ProductCatalog extends Component
{
    use WithPagination;

    #[Url]
    public string $search = '';

    #[Url]
    public string $category = '';

    public string $sortBy = 'created_at';
    public string $sortDirection = 'desc';

    public function updatedSearch(): void
    {
        $this->resetPage(); // Reset pagination when search changes
    }

    public function updatedCategory(): void
    {
        $this->resetPage();
    }

    public function sort(string $column): void
    {
        if ($this->sortBy === $column) {
            $this->sortDirection = $this->sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            $this->sortBy = $column;
            $this->sortDirection = 'asc';
        }
    }

    #[Computed]
    public function products()
    {
        return Product::query()
            ->when($this->search, fn ($q) => $q->where('name', 'like', "%{$this->search}%"))
            ->when($this->category, fn ($q) => $q->where('category_id', $this->category))
            ->orderBy($this->sortBy, $this->sortDirection)
            ->paginate(20);
    }

    public function render(): View
    {
        return view('livewire.product-catalog');
    }
}
```

```blade
{{-- resources/views/livewire/product-catalog.blade.php --}}
<div>
    <div class="flex gap-4 mb-6">
        <input type="text" wire:model.live.debounce.300ms="search"
               placeholder="Search products..." class="input" />

        <select wire:model.live="category" class="select">
            <option value="">All Categories</option>
            @foreach(\App\Models\Category::all() as $cat)
                <option value="{{ $cat->id }}">{{ $cat->name }}</option>
            @endforeach
        </select>
    </div>

    <table>
        <thead>
            <tr>
                <th wire:click="sort('name')" class="cursor-pointer">Name</th>
                <th wire:click="sort('price')" class="cursor-pointer">Price</th>
                <th wire:click="sort('created_at')" class="cursor-pointer">Date</th>
            </tr>
        </thead>
        <tbody>
            @foreach($this->products as $product)
                <tr wire:key="{{ $product->id }}">
                    <td>{{ $product->name }}</td>
                    <td>{{ number_format($product->price, 2) }}</td>
                    <td>{{ $product->created_at->format('Y-m-d') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{ $this->products->links() }}
</div>
```

**Key Points**:
- `#[Url]` syncs property with URL query string — enables shareable/bookmarkable state
- `#[Computed]` caches the result within a single request lifecycle
- `wire:model.live.debounce.300ms` provides real-time search with debouncing
- `wire:key` is required in loops — prevents DOM diffing issues
- `updated{Property}()` lifecycle hook fires when a specific property changes

---

### Pattern 371.2: Reactive Properties

**Category**: State Management
**Description**: Manage component state with Livewire 3 property attributes and reactivity.

```php
<?php

declare(strict_types=1);

namespace App\Livewire;

use App\Models\Order;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Locked;
use Livewire\Attributes\Modelable;
use Livewire\Attributes\On;
use Livewire\Attributes\Reactive;
use Livewire\Component;

final class OrderStatusCard extends Component
{
    #[Locked] // Cannot be modified from frontend
    public int $orderId;

    #[Reactive] // Re-renders when parent passes new value
    public string $status;

    public bool $showDetails = false;

    public function mount(int $orderId): void
    {
        $this->orderId = $orderId;
        $order = Order::findOrFail($orderId);
        $this->status = $order->status;
    }

    public function toggleDetails(): void
    {
        $this->showDetails = ! $this->showDetails;
    }

    #[On('order-updated.{orderId}')]
    public function refreshOrder(): void
    {
        $order = Order::findOrFail($this->orderId);
        $this->status = $order->status;
    }

    public function cancelOrder(): void
    {
        $order = Order::findOrFail($this->orderId);
        $order->update(['status' => 'cancelled']);
        $this->status = 'cancelled';

        $this->dispatch('order-updated', orderId: $this->orderId);
        $this->dispatch('notify', message: 'Order cancelled successfully.');
    }

    public function render(): View
    {
        return view('livewire.order-status-card');
    }
}
```

**Key Points**:
- `#[Locked]` prevents client-side tampering — critical for IDs and sensitive data
- `#[Reactive]` triggers re-render when parent component passes new value
- `#[On('event')]` listens for dispatched events — supports dynamic event names with properties
- `$this->dispatch()` fires events to other components
- `mount()` runs once on initial render — set up state from database here

---

### Pattern 371.3: Livewire Forms

**Category**: Form Handling
**Description**: Dedicated form objects for validation, data binding, and submission.

```php
<?php

declare(strict_types=1);

namespace App\Livewire\Forms;

use Livewire\Attributes\Validate;
use Livewire\Form;

final class ContactForm extends Form
{
    #[Validate('required|string|max:100')]
    public string $name = '';

    #[Validate('required|email|max:255')]
    public string $email = '';

    #[Validate('required|string|in:general,support,billing')]
    public string $subject = 'general';

    #[Validate('required|string|min:20|max:2000')]
    public string $message = '';
}
```

```php
<?php

declare(strict_types=1);

namespace App\Livewire;

use App\Livewire\Forms\ContactForm;
use App\Models\ContactMessage;
use Illuminate\Contracts\View\View;
use Livewire\Component;

final class ContactPage extends Component
{
    public ContactForm $form;

    public bool $submitted = false;

    public function submit(): void
    {
        $validated = $this->form->validate();

        ContactMessage::create($validated);

        $this->form->reset();
        $this->submitted = true;

        $this->dispatch('notify', message: 'Message sent successfully.');
    }

    public function render(): View
    {
        return view('livewire.contact-page');
    }
}
```

```blade
{{-- resources/views/livewire/contact-page.blade.php --}}
<div>
    @if($submitted)
        <div class="alert alert-success">Thank you for your message!</div>
    @else
        <form wire:submit="submit">
            <div>
                <label>Name</label>
                <input type="text" wire:model="form.name" />
                @error('form.name') <span class="error">{{ $message }}</span> @enderror
            </div>

            <div>
                <label>Email</label>
                <input type="email" wire:model="form.email" />
                @error('form.email') <span class="error">{{ $message }}</span> @enderror
            </div>

            <div>
                <label>Subject</label>
                <select wire:model="form.subject">
                    <option value="general">General</option>
                    <option value="support">Support</option>
                    <option value="billing">Billing</option>
                </select>
                @error('form.subject') <span class="error">{{ $message }}</span> @enderror
            </div>

            <div>
                <label>Message</label>
                <textarea wire:model="form.message" rows="5"></textarea>
                @error('form.message') <span class="error">{{ $message }}</span> @enderror
            </div>

            <button type="submit" wire:loading.attr="disabled">
                <span wire:loading.remove>Send</span>
                <span wire:loading>Sending...</span>
            </button>
        </form>
    @endif
</div>
```

**Key Points**:
- Form objects encapsulate validation rules with `#[Validate]` attributes
- `$this->form->validate()` returns validated data array
- `$this->form->reset()` clears all form fields after successful submission
- `wire:loading` provides built-in loading state during server roundtrips
- Error messages accessible via `@error('form.field')` directive

---

### Pattern 371.4: Inertia.js Setup

**Category**: SPA Bridge
**Description**: Configure Inertia.js for SPA-like Laravel applications with Vue/React.

```bash
# Installation
composer require inertiajs/inertia-laravel
npm install @inertiajs/vue3
```

```php
<?php

// bootstrap/app.php — Inertia middleware
declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
    })
    ->create();
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

final class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => fn () => [
                'user' => $request->user()?->only('id', 'name', 'email'),
            ],
            'flash' => fn () => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Products/Index', [
            'products' => Product::query()
                ->when($request->input('search'), fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
                ->paginate(20)
                ->withQueryString(),
            'filters' => $request->only('search'),
        ]);
    }

    public function show(Product $product): Response
    {
        return Inertia::render('Products/Show', [
            'product' => $product->load('category', 'reviews'),
        ]);
    }
}
```

**Key Points**:
- Inertia bridges Laravel backend with Vue/React/Svelte frontend — no API needed
- `Inertia::render()` replaces `view()` — sends page component name and props
- `HandleInertiaRequests` middleware shares global data (auth, flash messages)
- `withQueryString()` preserves search/filter params in pagination links
- Inertia handles page navigation without full reloads — SPA experience from a monolith

---

### Pattern 371.5: Inertia Shared Data

**Category**: Data Sharing
**Description**: Share application-wide data with all Inertia pages efficiently.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

final class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            // Authentication state
            'auth' => fn () => [
                'user' => $request->user()?->only('id', 'name', 'email', 'avatar_url'),
                'permissions' => $request->user()?->getAllPermissions()->pluck('name'),
            ],

            // Flash messages
            'flash' => fn () => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'info' => $request->session()->get('info'),
            ],

            // Feature flags
            'features' => fn () => [
                'new_dashboard' => $request->user()
                    ? \Laravel\Pennant\Feature::for($request->user())->active('new-dashboard')
                    : false,
            ],

            // Application config (safe subset)
            'app' => [
                'name' => config('app.name'),
                'locale' => app()->getLocale(),
                'timezone' => config('app.timezone'),
            ],

            // Navigation (lazy-loaded — only evaluated when accessed)
            'navigation' => Inertia::lazy(fn () => [
                'unread_notifications' => $request->user()?->unreadNotifications()->count() ?? 0,
            ]),
        ]);
    }
}
```

**Key Points**:
- Closures in `share()` are lazily evaluated — no database queries if data isn't used
- `Inertia::lazy()` data is only sent when explicitly requested from the frontend
- Share only safe data — never expose secrets, internal IDs, or sensitive permissions
- Feature flags in shared data enable frontend conditional rendering
- Version tracking enables automatic asset cache busting on deployments

---

### Pattern 371.6: Hybrid API (Livewire + REST)

**Category**: Architecture Pattern
**Description**: Combine Livewire components for interactive UI with REST API for mobile/third-party.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class ProductService
{
    /**
     * Shared business logic — used by both Livewire and REST controllers.
     */
    public function search(
        ?string $query = null,
        ?string $category = null,
        string $sortBy = 'created_at',
        string $sortDirection = 'desc',
        int $perPage = 20,
    ): LengthAwarePaginator {
        return Product::query()
            ->when($query, fn ($q) => $q->where('name', 'like', "%{$query}%"))
            ->when($category, fn ($q) => $q->where('category_id', $category))
            ->with(['category'])
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage);
    }
}
```

```php
<?php

declare(strict_types=1);

// Livewire component — web UI
namespace App\Livewire;

use App\Services\ProductService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

final class ProductSearch extends Component
{
    public string $search = '';
    public string $category = '';

    public function render(): View
    {
        $products = app(ProductService::class)->search(
            query: $this->search ?: null,
            category: $this->category ?: null,
        );

        return view('livewire.product-search', compact('products'));
    }
}
```

```php
<?php

declare(strict_types=1);

// REST controller — API
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ProductApiController extends Controller
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $products = $this->productService->search(
            query: $request->input('q'),
            category: $request->input('category'),
            sortBy: $request->input('sort', 'created_at'),
            sortDirection: $request->input('direction', 'desc'),
            perPage: (int) $request->input('per_page', 20),
        );

        return response()->json($products);
    }
}
```

**Key Points**:
- Extract business logic into services — shared between Livewire and REST controllers
- Livewire for interactive web UI; REST API for mobile apps and third-party integrations
- Both entry points use the same service — consistent behavior and rules
- Thin controllers/components — only handle request/response concerns
- This pattern supports gradual migration from Livewire to SPA or vice versa

---

## Best Practices

- **Keep components small** — one component per UI concern; compose complex UIs from nested components
- **Use Form objects** — `Livewire\Form` encapsulates validation and data for reusability
- **Lock sensitive properties** — `#[Locked]` prevents client-side manipulation of IDs and state
- **Extract shared logic to services** — avoid duplicating business rules in Livewire and API controllers
- **Use `wire:key` in loops** — required for correct DOM diffing in Livewire lists
- **Debounce search inputs** — `wire:model.live.debounce.300ms` prevents excessive server requests
- **Share auth/flash in Inertia middleware** — centralize common data instead of passing per-page
- **Test both Livewire and API** — `Livewire::test()` for components; HTTP tests for API

---

## Abnormal Case Patterns

1. **Missing `wire:key` in loops** — causes re-ordering bugs and stale DOM state. Fix: always add `wire:key="{{ $item->id }}"` on loop root elements.

2. **Unlocked ID property** — user can modify `orderId` via DevTools to access other records. Fix: use `#[Locked]` attribute on all ID and security-sensitive properties.

3. **N+1 in Livewire render** — `render()` method triggers N+1 queries on every re-render. Fix: use `#[Computed]` with eager loading; cache expensive queries.

4. **Inertia page flicker on navigation** — full page reload instead of SPA transition. Fix: verify `<Link>` component is used instead of `<a>` tags for internal navigation.

5. **Stale shared data in Inertia** — `share()` closures capture stale request state. Fix: use `$request->user()` inside closures, not a variable captured in middleware constructor.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (371.1–371.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Livewire & Inertia.js Specialist — Livewire | EPS v3.2*

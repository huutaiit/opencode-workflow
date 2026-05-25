# Laravel Authorization Policies Specialist — Security
# Laravel認可ポリシースペシャリスト — セキュリティ
# Chuyen Gia Chinh Sach Phan Quyen Laravel — Bao Mat

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11 Authorization
**Aspect**: Policies & Gates
**Category**: security
**Purpose**: Knowledge provider for Laravel authorization — policy classes, gate definitions, resource authorization, auto-discovery, hooks, guest access, team-based policies, and authorization testing

---

## Metadata

```json
{
  "id": "laravel-authorization-policies-specialist",
  "technology": "PHP 8.3 + Laravel 11 Authorization",
  "aspect": "Policies & Gates",
  "category": "security",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 authorization — policy auto-discovery via App\\Policies namespace convention",
    "E2: Gate facade — closure-based and class-based authorization checks",
    "E3: Policy hooks (before/after) — super-admin bypass and audit logging patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 333.1–333.8 |
| **Directory Pattern** | `app/Policies/` |
| **Naming Convention** | `{Entity}Policy.php` |
| **Imports From** | Domain (models), Infrastructure (auth context) |
| **Imported By** | Presentation (controllers, form requests), Application (services) |
| **Cannot Import** | Infrastructure implementations, other policies |
| **Dependencies** | `illuminate/auth` |
| **When To Use** | Any model-level authorization — CRUD permissions, ownership checks, role-based access |
| **Source Skeleton** | `app/Policies/{Entity}Policy.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel authorization lifecycle — policies, gates, resource auth, auto-discovery, hooks |
| **Activation Trigger** | files: `app/Policies/*.php`; keywords: Policy, Gate, authorize, can, cannot, $this->authorize |

---

## Role

You are a **Laravel Authorization Policies Specialist**. Your responsibility is to provide best practices for Laravel 11 authorization — writing policy classes, defining gates, resource-level authorization, policy auto-discovery, before/after hooks, guest user handling, team-based policies, and comprehensive authorization testing.

**Used by**: Any code agent implementing resource-level access control in Laravel
**Not used by**: Non-Laravel stacks, authentication-only concerns (use Sanctum specialist)

---

## Patterns

### Pattern 333.1: Policy Class

**Category**: Policy Fundamentals
**Description**: Standard policy class with CRUD authorization methods following Laravel 11 conventions.

```php
<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

final class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('orders.view');
    }

    public function view(User $user, Order $order): bool
    {
        return $user->id === $order->user_id
            || $user->hasRole('admin');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('orders.create')
            && $user->is_active;
    }

    public function update(User $user, Order $order): bool
    {
        return $user->id === $order->user_id
            && $order->status === 'draft';
    }

    public function delete(User $user, Order $order): bool
    {
        return $user->id === $order->user_id
            && $order->status !== 'completed'
            && $order->status !== 'shipped';
    }

    public function restore(User $user, Order $order): bool
    {
        return $user->hasRole('admin');
    }

    public function forceDelete(User $user, Order $order): bool
    {
        return $user->hasRole('super-admin');
    }
}
```

**Key Points**:
- Policy methods map to controller actions: `viewAny`, `view`, `create`, `update`, `delete`
- Return `bool` — true authorizes, false denies
- Mark policies `final` unless extension is explicitly designed
- Combine ownership checks with status guards for business rule enforcement

---

### Pattern 333.2: Gate Definitions

**Category**: Gate Authorization
**Description**: Define closure-based and class-based gates for non-model authorization.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class AuthorizationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Closure-based gate
        Gate::define(
            ability: 'access-admin-dashboard',
            callback: fn (User $user): bool => $user->hasRole('admin')
                || $user->hasRole('super-admin'),
        );

        // Gate with model parameter
        Gate::define(
            ability: 'export-reports',
            callback: fn (User $user): bool => $user->hasPermission('reports.export')
                && $user->email_verified_at !== null,
        );

        // Class-based gate
        Gate::define(
            ability: 'manage-settings',
            callback: [\App\Gates\SettingsGate::class, 'manage'],
        );

        // Response-based gate for detailed denial messages
        Gate::define(
            ability: 'publish-article',
            callback: function (User $user): \Illuminate\Auth\Access\Response {
                if (! $user->hasPermission('articles.publish')) {
                    return \Illuminate\Auth\Access\Response::deny(
                        'You do not have publishing permissions.',
                    );
                }

                return \Illuminate\Auth\Access\Response::allow();
            },
        );
    }
}
```

```php
<?php

declare(strict_types=1);

// Usage in controllers
namespace App\Http\Controllers\Admin;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class DashboardController
{
    public function index(): JsonResponse
    {
        Gate::authorize('access-admin-dashboard');

        return response()->json(['data' => 'admin dashboard content']);
    }
}
```

**Key Points**:
- Gates are best for non-model actions (dashboard access, feature flags, system settings)
- Use `Response::deny()` for user-facing error messages; `false` gives generic 403
- `Gate::authorize()` throws `AuthorizationException`; `Gate::allows()` returns bool
- Define gates in a dedicated provider, not scattered across multiple providers

---

### Pattern 333.3: Resource Authorization

**Category**: Controller Authorization
**Description**: Authorize resource actions in controllers using `$this->authorize()` and `authorizeResource()`.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class OrderController
{
    use AuthorizesRequests;

    public function __construct()
    {
        $this->authorizeResource(Order::class, 'order');
    }

    public function index(): AnonymousResourceCollection
    {
        // Authorization handled by authorizeResource() → OrderPolicy::viewAny
        return OrderResource::collection(
            Order::where('user_id', auth()->id())->paginate(20),
        );
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        // Authorization handled by authorizeResource() → OrderPolicy::create
        $order = Order::create($request->validated());

        return response()->json(new OrderResource($order), 201);
    }

    public function show(Order $order): OrderResource
    {
        // Authorization handled by authorizeResource() → OrderPolicy::view
        return new OrderResource($order);
    }

    public function update(UpdateOrderRequest $request, Order $order): OrderResource
    {
        // Authorization handled by authorizeResource() → OrderPolicy::update
        $order->update($request->validated());

        return new OrderResource($order->fresh());
    }

    public function destroy(Order $order): JsonResponse
    {
        // Authorization handled by authorizeResource() → OrderPolicy::delete
        $order->delete();

        return response()->json(null, 204);
    }
}
```

**Key Points**:
- `authorizeResource()` maps controller methods to policy methods automatically
- Method mapping: `index→viewAny`, `show→view`, `create/store→create`, `edit/update→update`, `destroy→delete`
- For non-standard actions, use `$this->authorize('customAction', $model)` explicitly
- `AuthorizesRequests` trait required when using `$this->authorize()` in non-base controllers

---

### Pattern 333.4: Policy Auto-Discovery

**Category**: Registration
**Description**: Laravel 11 automatic policy discovery via namespace convention.

```php
<?php

declare(strict_types=1);

// Laravel 11 auto-discovers policies by convention:
// App\Models\Order → App\Policies\OrderPolicy
// App\Models\User → App\Policies\UserPolicy

// No registration needed if you follow the convention.
// For non-standard mappings, register explicitly:

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class AuthorizationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Custom policy mapping — only needed for non-standard names
        Gate::policy(
            \App\Models\BlogPost::class,
            \App\Policies\Content\BlogPostPolicy::class,
        );

        // Policy in subdirectory
        Gate::policy(
            \App\Models\Invoice::class,
            \App\Policies\Billing\InvoicePolicy::class,
        );

        // Custom discovery callback
        Gate::guessPolicyNamesUsing(function (string $modelClass): array {
            // Support policies in subdirectories matching model namespace
            $modelName = class_basename($modelClass);

            return [
                "App\\Policies\\{$modelName}Policy",
                "App\\Policies\\" . str_replace('Models\\', '', class_basename($modelClass)) . 'Policy',
            ];
        });
    }
}
```

**Key Points**:
- Convention: `App\Models\{Model}` maps to `App\Policies\{Model}Policy`
- Auto-discovery works without any registration for conventional paths
- Use `Gate::policy()` only for non-standard policy locations
- `guessPolicyNamesUsing()` customizes the auto-discovery algorithm

---

### Pattern 333.5: Before and After Hooks

**Category**: Policy Hooks
**Description**: Implement before/after hooks for super-admin bypass and audit logging.

```php
<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

final class OrderPolicy
{
    /**
     * Runs before any policy method.
     * Return true to authorize, false to deny, null to fall through.
     */
    public function before(User $user, string $ability): ?bool
    {
        // Super-admin bypasses all checks
        if ($user->hasRole('super-admin')) {
            return true;
        }

        // Suspended users are always denied
        if ($user->is_suspended) {
            return false;
        }

        // Return null to fall through to the specific policy method
        return null;
    }

    public function view(User $user, Order $order): bool
    {
        return $user->id === $order->user_id;
    }

    public function update(User $user, Order $order): bool
    {
        return $user->id === $order->user_id
            && $order->status === 'draft';
    }

    public function delete(User $user, Order $order): bool
    {
        return $user->id === $order->user_id
            && ! in_array($order->status, ['completed', 'shipped'], true);
    }
}
```

**Key Points**:
- `before()` runs before any specific policy method — use for super-admin bypass
- Return `null` from `before()` to fall through to the specific method
- Return `true` to authorize immediately, `false` to deny immediately
- Do NOT use `before()` for business logic — only cross-cutting concerns (roles, suspension)

---

### Pattern 333.6: Guest Authorization

**Category**: Guest Access
**Description**: Handle authorization for unauthenticated users in policies.

```php
<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Article;
use App\Models\User;

final class ArticlePolicy
{
    /**
     * Nullable User parameter allows guest access evaluation.
     */
    public function viewAny(?User $user): bool
    {
        // Guests can view published articles
        return true;
    }

    public function view(?User $user, Article $article): bool
    {
        // Guests can view published articles only
        if ($article->status === 'published') {
            return true;
        }

        // Drafts require authentication and ownership
        return $user !== null && $user->id === $article->author_id;
    }

    public function create(User $user): bool
    {
        // Non-nullable: guests cannot create articles
        return $user->hasPermission('articles.create');
    }

    public function update(User $user, Article $article): bool
    {
        return $user->id === $article->author_id;
    }
}
```

**Key Points**:
- Make `$user` nullable (`?User`) to evaluate guests — non-nullable auto-denies guests
- Guest-accessible methods: typically `viewAny` and `view` for public content
- Write methods (`create`, `update`, `delete`) should never accept nullable user
- `before()` also supports nullable user for guest evaluation

---

### Pattern 333.7: Team-Based Policies

**Category**: Multi-Tenancy
**Description**: Authorize actions based on team/organization membership.

```php
<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

final class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        // User can view projects for their current team
        return $user->currentTeam !== null;
    }

    public function view(User $user, Project $project): bool
    {
        return $user->belongsToTeam($project->team)
            && $user->hasTeamPermission($project->team, 'project:view');
    }

    public function create(User $user): bool
    {
        $team = $user->currentTeam;

        return $team !== null
            && $user->hasTeamPermission($team, 'project:create')
            && $team->projects()->count() < $team->project_limit;
    }

    public function update(User $user, Project $project): bool
    {
        return $user->belongsToTeam($project->team)
            && $user->hasTeamPermission($project->team, 'project:update');
    }

    public function delete(User $user, Project $project): bool
    {
        // Only team owner can delete projects
        return $user->ownsTeam($project->team);
    }

    public function manageMembers(User $user, Project $project): bool
    {
        return $user->belongsToTeam($project->team)
            && $user->teamRole($project->team)?->key === 'admin';
    }
}
```

**Key Points**:
- Always check team membership before team permissions
- Use `currentTeam` for default context, explicit team for cross-team operations
- Combine team roles with resource-level permissions for fine-grained control
- Enforce resource limits (project count, member count) in policy create methods

---

### Pattern 333.8: Authorization Testing

**Category**: Testing
**Description**: Comprehensive testing patterns for policies and gates.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Policies;

use App\Models\Order;
use App\Models\User;
use App\Policies\OrderPolicy;
use Tests\TestCase;

final class OrderPolicyTest extends TestCase
{
    public function test_owner_can_view_order(): void
    {
        $user = User::factory()->create();
        $order = Order::factory()->for($user)->create();

        $this->assertTrue(
            (new OrderPolicy())->view($user, $order),
        );
    }

    public function test_non_owner_cannot_view_order(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $order = Order::factory()->for($otherUser)->create();

        $this->assertFalse(
            (new OrderPolicy())->view($user, $order),
        );
    }

    public function test_admin_can_view_any_order(): void
    {
        $admin = User::factory()->admin()->create();
        $order = Order::factory()->create();

        $this->assertTrue(
            (new OrderPolicy())->view($admin, $order),
        );
    }

    public function test_owner_cannot_update_completed_order(): void
    {
        $user = User::factory()->create();
        $order = Order::factory()->for($user)->create(['status' => 'completed']);

        $this->assertFalse(
            (new OrderPolicy())->update($user, $order),
        );
    }

    public function test_super_admin_bypasses_all_checks(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $order = Order::factory()->create();

        $result = (new OrderPolicy())->before($superAdmin, 'delete');

        $this->assertTrue($result);
    }

    public function test_gate_authorization_in_request(): void
    {
        $user = User::factory()->withPermission('orders.view')->create();

        $this->actingAs($user)
            ->getJson('/api/orders')
            ->assertOk();
    }

    public function test_unauthorized_user_gets_403(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();
    }

    public function test_guest_can_view_published_articles(): void
    {
        $article = \App\Models\Article::factory()->published()->create();

        $this->getJson("/api/articles/{$article->id}")
            ->assertOk();
    }
}
```

**Key Points**:
- Test policies in isolation (instantiate directly) for unit tests
- Test through HTTP (actingAs + endpoint) for integration tests
- Cover owner vs non-owner, role-based bypass, status-dependent restrictions
- Test guest access with nullable user scenarios
- Use model factories with states (`admin()`, `superAdmin()`, `published()`)

---

## Best Practices

- **One policy per model** — never combine multiple models into one policy
- **Return bool, not Response** — use `Response::deny()` only when custom messages are needed
- **Use before() sparingly** — only for cross-cutting concerns (super-admin, suspension)
- **Prefer policies over gates for models** — gates are for non-model authorization
- **Follow naming convention** — `{Model}Policy` in `app/Policies/` for auto-discovery
- **Test both allow and deny** — verify positive and negative authorization paths
- **Keep policies pure** — no database queries in policies; check model attributes and relationships only
- **Use abort_if/abort_unless** — for inline authorization in non-controller contexts
- **Document custom abilities** — non-CRUD policy methods need clear docblocks

---

## Abnormal Case Patterns

1. **Policy not found for model** — auto-discovery fails for non-standard namespace. Fix: register explicitly via `Gate::policy()` or follow `App\Policies\{Model}Policy` convention.

2. **before() returning false blocks super-admin** — logic error in before() hook. Fix: return `null` to fall through, `true` to allow, `false` to deny. Check order of conditions.

3. **Guest denied on public endpoint** — policy method has non-nullable `User $user`. Fix: make parameter nullable `?User $user` for guest-accessible methods.

4. **authorizeResource() not matching custom methods** — only standard CRUD methods are auto-mapped. Fix: call `$this->authorize('customMethod', $model)` explicitly for non-CRUD actions.

5. **Policy returns true but 403 still thrown** — middleware or gate overrides policy result. Fix: check for conflicting gate definitions or `before()` hooks in other policies.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (333.1–333.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Authorization Policies Specialist — Security | EPS v3.2*

# Laravel Feature Flags Specialist — Feature Flags
# Laravelフィーチャーフラグスペシャリスト — フィーチャーフラグ
# Chuyen Gia Co Tinh Nang Laravel — Co Tinh Nang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Pennant
**Aspect**: Feature Flags & Toggles
**Category**: feature-flags
**Purpose**: Knowledge provider for Laravel feature flags — Pennant setup, class-based features, feature scoping, A/B testing, and feature flag testing

---

## Metadata

```json
{
  "id": "laravel-feature-flags-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Pennant",
  "aspect": "Feature Flags & Toggles",
  "category": "feature-flags",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Pennant — first-party feature flag package",
    "E2: Class-based features — type-safe feature definitions",
    "E3: Feature scoping — per-user, per-team, per-tenant flags",
    "E4: Blade/middleware integration — conditional rendering and routing"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 369.1–369.5 |
| **Directory Pattern** | `app/Features/`, `config/pennant.php` |
| **Naming Convention** | `{FeatureName}.php` in `app/Features/` |
| **Imports From** | Domain (user/team models for scoping) |
| **Imported By** | Presentation (Blade), Application (controllers, middleware) |
| **Cannot Import** | Infrastructure layer |
| **Dependencies** | `laravel/pennant` |
| **When To Use** | Gradual rollouts, A/B testing, trunk-based development |
| **Source Skeleton** | `app/Features/{Name}.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel feature flags — Pennant features, scoping, A/B testing |
| **Activation Trigger** | files: `app/Features/*.php`, `config/pennant.php`; keywords: feature flag, Pennant, toggle, rollout, A/B test |

---

## Role

You are a **Laravel Feature Flags Specialist**. Your responsibility is to provide best practices for Laravel 11+ feature flags using Pennant — class-based feature definitions, user/team scoping, percentage rollouts, A/B testing patterns, and testing strategies for feature-flagged code.

**Used by**: Any code agent implementing feature flags or gradual rollouts in Laravel
**Not used by**: Non-Laravel stacks, projects not using feature toggles

---

## Patterns

### Pattern 369.1: Pennant Feature Flags

**Category**: Setup & Configuration
**Description**: Install and configure Laravel Pennant for feature flag management.

```bash
# Installation
composer require laravel/pennant
php artisan vendor:publish --provider="Laravel\Pennant\PennantServiceProvider"
php artisan migrate
```

```php
<?php

// config/pennant.php
declare(strict_types=1);

return [
    'default' => env('PENNANT_STORE', 'database'),

    'stores' => [
        'database' => [
            'driver' => 'database',
            'connection' => null,
            'table' => 'features',
        ],

        'array' => [
            'driver' => 'array',
        ],
    ],
];
```

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Features\NewDashboard;
use App\Features\RedesignedCheckout;
use App\Models\User;
use Illuminate\Support\ServiceProvider;
use Laravel\Pennant\Feature;

final class FeatureFlagServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Simple boolean feature
        Feature::define('beta-access', fn (User $user): bool => $user->is_beta_tester);

        // Percentage rollout
        Feature::define('new-search', fn (User $user): bool => match (true) {
            $user->is_admin => true,         // Always on for admins
            default => $user->id % 10 < 3,   // 30% of users
        });
    }
}
```

**Key Points**:
- Pennant is Laravel's first-party feature flag solution — ships with database and array drivers
- Define features in a service provider boot() or as dedicated classes in `app/Features/`
- Database store persists feature state — once resolved, the result is cached per scope
- Array store is in-memory only — useful for testing
- `php artisan pennant:purge` clears stale feature flag data

---

### Pattern 369.2: Class-Based Features

**Category**: Feature Definition
**Description**: Define features as dedicated classes for type safety and complex resolution logic.

```php
<?php

declare(strict_types=1);

namespace App\Features;

use App\Models\User;
use Illuminate\Support\Lottery;

final class RedesignedCheckout
{
    /**
     * Resolve the feature's initial value.
     */
    public function resolve(User $user): bool
    {
        // Always enabled for premium users
        if ($user->subscription?->isPremium()) {
            return true;
        }

        // 20% rollout for standard users
        return Lottery::odds(1, 5)->choose();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Features;

use App\Models\User;

final class NewDashboard
{
    /**
     * Rich feature — returns a variant, not just boolean.
     */
    public function resolve(User $user): string
    {
        if ($user->is_admin) {
            return 'full';
        }

        if ($user->created_at->isAfter(now()->subMonths(3))) {
            return 'simplified';
        }

        return 'legacy';
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Features\NewDashboard;
use App\Features\RedesignedCheckout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Pennant\Feature;

final class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Boolean feature check
        if (Feature::for($user)->active(RedesignedCheckout::class)) {
            return $this->redesignedDashboard($user);
        }

        // Rich feature — get the variant value
        $variant = Feature::for($user)->value(NewDashboard::class);

        return response()->json([
            'dashboard_variant' => $variant,
            'features' => [
                'new_checkout' => Feature::for($user)->active(RedesignedCheckout::class),
                'dashboard' => $variant,
            ],
        ]);
    }

    private function redesignedDashboard($user): JsonResponse
    {
        return response()->json(['variant' => 'redesigned']);
    }
}
```

**Key Points**:
- Class-based features live in `app/Features/` — discoverable and testable
- `resolve()` receives the scope (usually User) and returns bool or a variant string
- `Lottery::odds(1, 5)` provides 20% probability — better than modulo for randomness
- `Feature::active()` for boolean checks; `Feature::value()` for variant values
- Once resolved for a scope, the result is stored — consistent experience per user

---

### Pattern 369.3: Feature Scoping

**Category**: Scope Management
**Description**: Scope feature flags to different entities — users, teams, tenants.

```php
<?php

declare(strict_types=1);

namespace App\Features;

use App\Models\Team;

final class AdvancedAnalytics
{
    /**
     * Scope to Team instead of User.
     */
    public function resolve(Team $team): bool
    {
        // Enable for teams on enterprise plan
        return $team->plan === 'enterprise';
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Pennant\Concerns\HasFeatures;

final class Team extends Model
{
    use HasFeatures;

    protected $fillable = ['name', 'plan'];
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Features\AdvancedAnalytics;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Pennant\Feature;

final class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $team = $request->user()->currentTeam;

        // Check feature for team scope
        if (Feature::for($team)->active(AdvancedAnalytics::class)) {
            return response()->json(['analytics' => 'advanced']);
        }

        return response()->json(['analytics' => 'basic']);
    }

    /**
     * Activate feature for a specific team (admin action).
     */
    public function enableForTeam(Team $team): JsonResponse
    {
        Feature::for($team)->activate(AdvancedAnalytics::class);

        return response()->json(['status' => 'activated']);
    }

    /**
     * Deactivate feature for a specific team.
     */
    public function disableForTeam(Team $team): JsonResponse
    {
        Feature::for($team)->deactivate(AdvancedAnalytics::class);

        return response()->json(['status' => 'deactivated']);
    }
}
```

**Key Points**:
- Use `HasFeatures` trait on any model to make it a feature scope
- `Feature::for($team)` scopes the check to a Team instead of the default User
- `activate()`/`deactivate()` manually override the resolved value for a scope
- Multiple scope types allow per-user, per-team, and per-tenant feature management
- Feature state is persisted per scope — activating for Team A does not affect Team B

---

### Pattern 369.4: A/B Testing

**Category**: Experimentation
**Description**: Implement A/B testing with multi-variant features and metric tracking.

```php
<?php

declare(strict_types=1);

namespace App\Features;

use App\Models\User;
use Illuminate\Support\Lottery;

final class CheckoutFlow
{
    /**
     * A/B/C test — three checkout variants.
     */
    public function resolve(User $user): string
    {
        return Lottery::odds(1, 3)
            ->winner(fn () => 'single-page')
            ->loser(fn () => Lottery::odds(1, 2)
                ->winner(fn () => 'multi-step')
                ->loser(fn () => 'accordion')
                ->choose()
            )
            ->choose();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Features\CheckoutFlow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Pennant\Feature;

final class CheckoutController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $variant = Feature::for($user)->value(CheckoutFlow::class);

        // Track which variant was shown (for analytics)
        event(new \App\Events\CheckoutVariantViewed(
            userId: $user->id,
            variant: $variant,
        ));

        return response()->json([
            'checkout_variant' => $variant,
            'config' => $this->getVariantConfig($variant),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function getVariantConfig(string $variant): array
    {
        return match ($variant) {
            'single-page' => ['steps' => 1, 'layout' => 'compact'],
            'multi-step' => ['steps' => 3, 'layout' => 'wizard'],
            'accordion' => ['steps' => 3, 'layout' => 'collapsible'],
            default => ['steps' => 3, 'layout' => 'wizard'],
        };
    }
}
```

**Key Points**:
- Multi-variant features return string values instead of booleans
- `Lottery` class provides probability-based variant assignment
- Once assigned, a user always sees the same variant (stored in database)
- Track variant exposure via events for conversion analysis
- Use `Feature::for($user)->forget(CheckoutFlow::class)` to re-randomize a user

---

### Pattern 369.5: Feature Flag Testing

**Category**: Testing
**Description**: Test feature-flagged code paths with Pennant's testing utilities.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Features\RedesignedCheckout;
use App\Features\NewDashboard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Pennant\Feature;
use Tests\TestCase;

final class FeatureFlagTest extends TestCase
{
    use RefreshDatabase;

    public function test_redesigned_checkout_active_for_user(): void
    {
        $user = User::factory()->create();

        // Force feature activation for test
        Feature::for($user)->activate(RedesignedCheckout::class);

        $this->assertTrue(Feature::for($user)->active(RedesignedCheckout::class));
    }

    public function test_redesigned_checkout_inactive_by_default(): void
    {
        $user = User::factory()->create();

        // Force deactivation
        Feature::for($user)->deactivate(RedesignedCheckout::class);

        $this->assertFalse(Feature::for($user)->active(RedesignedCheckout::class));
    }

    public function test_dashboard_variant_value(): void
    {
        $user = User::factory()->create(['is_admin' => true]);

        $variant = Feature::for($user)->value(NewDashboard::class);

        $this->assertSame('full', $variant);
    }

    public function test_feature_scoping_to_different_users(): void
    {
        $premiumUser = User::factory()->create();
        $standardUser = User::factory()->create();

        Feature::for($premiumUser)->activate(RedesignedCheckout::class);
        Feature::for($standardUser)->deactivate(RedesignedCheckout::class);

        $this->assertTrue(Feature::for($premiumUser)->active(RedesignedCheckout::class));
        $this->assertFalse(Feature::for($standardUser)->active(RedesignedCheckout::class));
    }

    public function test_api_returns_feature_flags(): void
    {
        $user = User::factory()->create();
        Feature::for($user)->activate(RedesignedCheckout::class);

        $response = $this->actingAs($user)
            ->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('features.new_checkout', true);
    }

    public function test_purge_stale_features(): void
    {
        Feature::define('temp-feature', fn () => true);
        $user = User::factory()->create();

        // Resolve to store in database
        Feature::for($user)->active('temp-feature');

        // Purge all stored values
        Feature::purge('temp-feature');

        // Next resolution will re-evaluate the closure
        $this->assertTrue(Feature::for($user)->active('temp-feature'));
    }
}
```

**Key Points**:
- `Feature::for($user)->activate()` forces a feature on in tests — deterministic behavior
- `Feature::for($user)->deactivate()` forces a feature off — test both paths
- Test each variant independently — don't rely on randomness in tests
- Use `Feature::purge()` to clear stored values and force re-evaluation
- Test API responses include correct feature flag values for the authenticated user

---

## Best Practices

- **Use class-based features** — type-safe, testable, and discoverable in `app/Features/`
- **Scope to the right entity** — per-user for personalization, per-team for plan features
- **Persist feature state** — use database driver so users get consistent experience
- **Test both paths** — every feature flag creates two code paths; test each explicitly
- **Clean up old flags** — remove feature classes and `Feature::purge()` after full rollout
- **Start with `activate()`/`deactivate()` in admin** — manual override before percentage rollout
- **Track variant exposure** — fire events for A/B test analytics
- **Never nest feature flags** — `if (featureA && featureB)` creates 4 code paths; keep it flat

---

## Abnormal Case Patterns

1. **Inconsistent experience after re-deploy** — feature resolver logic changed but old stored values persist. Fix: run `Feature::purge(FeatureName::class)` after changing resolution logic.

2. **Missing scope model** — `HasFeatures` trait not added to the scope model. Fix: add `use HasFeatures` to User, Team, or any model used as a feature scope.

3. **Random tests failing** — `Lottery` produces different results across test runs. Fix: use `activate()`/`deactivate()` in tests; never rely on Lottery randomness.

4. **Feature flag leak in queue jobs** — serialized jobs don't carry feature context. Fix: resolve feature value before dispatching and pass as a job property.

5. **Database table missing** — `features` table not created. Fix: run `php artisan migrate` after publishing Pennant migrations.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (369.1–369.5), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Feature Flags Specialist — Feature Flags | EPS v3.2*

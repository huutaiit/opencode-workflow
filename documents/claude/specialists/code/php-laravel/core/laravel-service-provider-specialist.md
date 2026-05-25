# Laravel Service Provider Specialist — Core
# Laravelサービスプロバイダスペシャリスト — コア
# Chuyen Gia Service Provider Laravel — Loi

**Version**: 1.0.0
**Technology**: Laravel 11+ Service Providers
**Aspect**: Service Providers
**Category**: core
**Purpose**: Knowledge provider for Laravel service provider lifecycle — registration, booting, deferred loading, package discovery, and provider testing

---

## Metadata

```json
{
  "id": "laravel-service-provider-specialist",
  "technology": "Laravel 11+ Service Providers",
  "aspect": "Service Providers",
  "category": "core",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 service provider architecture — register/boot lifecycle",
    "E2: Package discovery — composer.json extra.laravel section",
    "E3: Deferred providers — performance optimization via lazy loading"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (structural — providers wire every layer) |
| **Variant** | ALL |
| **Pattern Numbers** | 301.1–301.8 |
| **Directory Pattern** | `app/Providers/` |
| **Naming Convention** | `{Name}ServiceProvider.php` |
| **Imports From** | Domain (interfaces), Infrastructure (implementations) |
| **Imported By** | ALL (providers bootstrap the entire application) |
| **Cannot Import** | N/A (providers are structural wiring) |
| **Dependencies** | `illuminate/support` |
| **When To Use** | Every Laravel project — core framework bootstrapping |
| **Source Skeleton** | `app/Providers/{Name}ServiceProvider.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel service provider lifecycle — bindings, boot logic, deferred loading, package wiring |
| **Activation Trigger** | files: `app/Providers/*.php`; keywords: ServiceProvider, register, boot, bindings, $defer |

---

## Role

You are a **Laravel Service Provider Specialist**. Your responsibility is to provide best practices for Laravel 11+ service provider architecture — the register/boot lifecycle, deferred providers for performance, package discovery, and provider testing strategies.

**Used by**: Any code agent working with Laravel application bootstrapping and service wiring
**Not used by**: Non-Laravel stacks, projects not using service container

---

## Patterns

### Pattern 301.1: Service Provider Basics

**Category**: Provider Fundamentals
**Description**: Basic service provider structure with register() and boot() methods following Laravel 11 conventions.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\OrderRepositoryInterface;
use App\Repositories\EloquentOrderRepository;
use Illuminate\Support\ServiceProvider;

final class OrderServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            abstract: OrderRepositoryInterface::class,
            concrete: EloquentOrderRepository::class,
        );
    }

    public function boot(): void
    {
        // Boot logic: event listeners, route loading, view composers
    }
}
```

**Key Points**:
- `register()` — only bind things into the container; never access other services here
- `boot()` — all other bootstrapping (events, routes, views, macros)
- Mark providers `final` unless extension is explicitly designed
- Laravel 11 registers providers in `bootstrap/providers.php`, not `config/app.php`

---

### Pattern 301.2: Deferred Service Providers

**Category**: Performance
**Description**: Defer provider loading until a bound service is actually requested — reduces bootstrap overhead.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\ReportGeneratorInterface;
use App\Services\PdfReportGenerator;
use Illuminate\Contracts\Support\DeferrableProvider;
use Illuminate\Support\ServiceProvider;

final class ReportServiceProvider extends ServiceProvider implements DeferrableProvider
{
    public function register(): void
    {
        $this->app->singleton(
            abstract: ReportGeneratorInterface::class,
            concrete: fn () => new PdfReportGenerator(
                storagePath: storage_path('reports'),
                config: $this->app->make('config')->get('reports'),
            ),
        );
    }

    /**
     * @return array<int, string>
     */
    public function provides(): array
    {
        return [ReportGeneratorInterface::class];
    }
}
```

**Key Points**:
- Implement `DeferrableProvider` interface and `provides()` method
- Provider is only loaded when one of the returned classes/interfaces is resolved
- Use for heavy services (PDF generation, external API clients, report builders)
- `provides()` must return every abstract this provider binds

---

### Pattern 301.3: Package Service Provider with Discovery

**Category**: Package Development
**Description**: Package providers with auto-discovery via composer.json configuration.

```php
<?php

declare(strict_types=1);

namespace Acme\Analytics\Providers;

use Illuminate\Support\ServiceProvider;

final class AnalyticsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(
            path: __DIR__ . '/../../config/analytics.php',
            key: 'analytics',
        );
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes(
                paths: [__DIR__ . '/../../config/analytics.php' => config_path('analytics.php')],
                groups: 'analytics-config',
            );

            $this->publishes(
                paths: [__DIR__ . '/../../database/migrations/' => database_path('migrations')],
                groups: 'analytics-migrations',
            );
        }

        $this->loadRoutesFrom(__DIR__ . '/../../routes/analytics.php');
        $this->loadViewsFrom(__DIR__ . '/../../resources/views', 'analytics');
    }
}
```

```json
// composer.json — package auto-discovery
{
    "extra": {
        "laravel": {
            "providers": [
                "Acme\\Analytics\\Providers\\AnalyticsServiceProvider"
            ]
        }
    }
}
```

**Key Points**:
- `mergeConfigFrom()` in register() — allows app to override package defaults
- Guard console-only publishes with `runningInConsole()`
- Use publish groups for selective publishing (config, migrations, views)
- Auto-discovery via composer.json `extra.laravel.providers`

---

### Pattern 301.4: Boot vs Register Discipline

**Category**: Lifecycle
**Description**: Strict separation between register() (bindings only) and boot() (everything else).

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\PaymentGatewayInterface;
use App\Gateways\StripePaymentGateway;
use App\Models\Order;
use App\Observers\OrderObserver;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class PaymentServiceProvider extends ServiceProvider
{
    // REGISTER: only container bindings — no service resolution
    public function register(): void
    {
        $this->app->singleton(
            abstract: PaymentGatewayInterface::class,
            concrete: fn () => new StripePaymentGateway(
                apiKey: config('services.stripe.secret'),
                webhookSecret: config('services.stripe.webhook_secret'),
            ),
        );
    }

    // BOOT: event listeners, observers, gates, macros
    public function boot(): void
    {
        Order::observe(OrderObserver::class);

        Gate::define(
            ability: 'process-refund',
            callback: fn ($user, $order) => $user->id === $order->user_id
                || $user->hasRole('admin'),
        );
    }
}
```

**Key Points**:
- **register()**: bind/singleton/scoped — never resolve other services
- **boot()**: observers, gates, event listeners, route model binding, view composers
- Violating this causes "target not instantiable" errors when providers load out of order
- `config()` helper is safe in register() closures (resolved lazily)

---

### Pattern 301.5: Bindings in Register — Contextual and Tagged

**Category**: Advanced Registration
**Description**: Complex binding strategies within register() — contextual bindings, tags, and extend.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\NotificationChannelInterface;
use App\Notifications\Channels\EmailChannel;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\Channels\PushChannel;
use App\Services\OrderNotificationService;
use App\Services\UserNotificationService;
use Illuminate\Support\ServiceProvider;

final class NotificationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Tagged bindings — group related implementations
        $this->app->bind(EmailChannel::class);
        $this->app->bind(SmsChannel::class);
        $this->app->bind(PushChannel::class);
        $this->app->tag(
            abstracts: [EmailChannel::class, SmsChannel::class, PushChannel::class],
            tags: ['notification.channels'],
        );

        // Contextual binding — different impl per consumer
        $this->app->when(OrderNotificationService::class)
            ->needs(NotificationChannelInterface::class)
            ->give(EmailChannel::class);

        $this->app->when(UserNotificationService::class)
            ->needs(NotificationChannelInterface::class)
            ->give(SmsChannel::class);
    }
}
```

**Key Points**:
- `tag()` groups related bindings for batch resolution via `tagged()`
- Contextual binding: same interface, different concrete per consumer class
- Prefer contextual bindings over multiple interfaces for the same contract
- Tags are useful for plugin systems and composite patterns

---

### Pattern 301.6: Event and Route Service Providers

**Category**: Framework Providers
**Description**: Laravel 11 simplified event and route registration — no dedicated EventServiceProvider or RouteServiceProvider classes needed.

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — Laravel 11 approach
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \App\Http\Middleware\ForceJsonResponse::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Exception handling configured here
    })
    ->create();
```

```php
<?php

declare(strict_types=1);

// When you DO need a custom EventServiceProvider (complex event mapping)
namespace App\Providers;

use App\Events\OrderPlaced;
use App\Listeners\SendOrderConfirmation;
use App\Listeners\UpdateInventory;
use Illuminate\Support\ServiceProvider;

final class EventServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Event::listen(OrderPlaced::class, SendOrderConfirmation::class);
        Event::listen(OrderPlaced::class, UpdateInventory::class);
    }
}
```

**Key Points**:
- Laravel 11 eliminates default `EventServiceProvider` and `RouteServiceProvider`
- Routing configured in `bootstrap/app.php` via `withRouting()`
- Events can be discovered automatically or registered manually in a provider boot()
- Only create dedicated providers when event/route logic is complex

---

### Pattern 301.7: Provider Testing

**Category**: Testing
**Description**: Verify provider bindings and boot logic in isolation.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Providers;

use App\Contracts\PaymentGatewayInterface;
use App\Gateways\StripePaymentGateway;
use App\Providers\PaymentServiceProvider;
use Tests\TestCase;

final class PaymentServiceProviderTest extends TestCase
{
    public function test_binds_payment_gateway_interface(): void
    {
        $resolved = $this->app->make(PaymentGatewayInterface::class);

        $this->assertInstanceOf(StripePaymentGateway::class, $resolved);
    }

    public function test_payment_gateway_is_singleton(): void
    {
        $instance1 = $this->app->make(PaymentGatewayInterface::class);
        $instance2 = $this->app->make(PaymentGatewayInterface::class);

        $this->assertSame($instance1, $instance2);
    }

    public function test_deferred_provider_declares_provides(): void
    {
        $provider = new PaymentServiceProvider($this->app);

        if ($provider instanceof \Illuminate\Contracts\Support\DeferrableProvider) {
            $this->assertContains(
                PaymentGatewayInterface::class,
                $provider->provides(),
            );
        }
    }
}
```

**Key Points**:
- Test bindings resolve to expected concrete classes
- Test singleton vs transient behavior with `assertSame()` vs `assertNotSame()`
- Test deferred providers declare all their bindings in `provides()`
- Use `$this->app->make()` — the real container, not mocks

---

### Pattern 301.8: Conditional Provider Registration

**Category**: Advanced Registration
**Description**: Register bindings conditionally based on environment, config, or installed packages.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\CacheDriverInterface;
use App\Cache\RedisCacheDriver;
use App\Cache\ArrayCacheDriver;
use App\Contracts\SearchEngineInterface;
use Illuminate\Support\ServiceProvider;

final class InfrastructureServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Environment-based binding
        $this->app->singleton(
            abstract: CacheDriverInterface::class,
            concrete: match ($this->app->environment()) {
                'testing' => ArrayCacheDriver::class,
                default => RedisCacheDriver::class,
            },
        );

        // Package-availability binding
        if (class_exists(\Algolia\AlgoliaSearch\SearchClient::class)) {
            $this->app->singleton(
                abstract: SearchEngineInterface::class,
                concrete: \App\Search\AlgoliaSearchEngine::class,
            );
        } else {
            $this->app->singleton(
                abstract: SearchEngineInterface::class,
                concrete: \App\Search\DatabaseSearchEngine::class,
            );
        }
    }

    public function boot(): void
    {
        // Config-based conditional boot
        if (config('telescope.enabled', false)) {
            $this->app->register(\Laravel\Telescope\TelescopeServiceProvider::class);
        }
    }
}
```

**Key Points**:
- Use `match` expression for environment-based binding selection
- Check `class_exists()` for optional package dependencies
- Conditional registration in boot() for dev-only packages (Telescope, Debugbar)
- Never silently fail — provide fallback implementations

---

## Best Practices

- **register() is for bindings only** — never resolve services, access DB, or dispatch events in register()
- **Defer heavy providers** — implement `DeferrableProvider` for services not used on every request
- **One domain, one provider** — group bindings by bounded context, not by technical layer
- **Use named arguments** — PHP 8.3 named args improve readability in bind/singleton calls
- **Mark providers final** — prevent unintended inheritance chains
- **Guard console operations** — wrap `publishes()` and `commands()` with `runningInConsole()`
- **Prefer closures for singletons** — lazy instantiation avoids boot-order issues
- **Test provider bindings** — verify interface-to-concrete resolution in unit tests
- **Keep providers lean** — a provider with 50+ bindings needs splitting

---

## Abnormal Case Patterns

1. **Resolving services in register()** — causes "target not instantiable" when dependency providers haven't registered yet. Fix: move resolution to boot() or use closure-based bindings.

2. **Missing provides() on deferred provider** — provider implements `DeferrableProvider` but returns empty array. Fix: return all bound abstracts from `provides()`.

3. **Boot-order dependency** — Provider A's boot() depends on Provider B's bindings, but B loads after A. Fix: use closures in register() for lazy resolution, or reorder providers in `bootstrap/providers.php`.

4. **Duplicate bindings across providers** — two providers bind the same interface with different concretes. Fix: consolidate into one provider per domain; last registration wins silently.

5. **Config access in register() without closure** — `config('key')` returns null during register() because config isn't loaded yet. Fix: wrap in closure `fn () => new Service(config('key'))`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (301.1–301.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Service Provider Specialist — Core | EPS v3.2*

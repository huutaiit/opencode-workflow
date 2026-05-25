# Laravel Package Development Specialist — Packages
# Laravelパッケージ開発スペシャリスト — パッケージ
# Chuyen Gia Phat Trien Goi Laravel — Goi

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Package Development
**Aspect**: Package Scaffolding & Distribution
**Category**: packages
**Purpose**: Knowledge provider for Laravel package development — scaffolding, service provider registration, publishable assets, package testing, auto-discovery, and Composer structure

---

## Metadata

```json
{
  "id": "laravel-package-development-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Package Development",
  "aspect": "Package Scaffolding & Distribution",
  "category": "packages",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel package service providers — registration and boot lifecycle",
    "E2: Package auto-discovery — composer.json extra.laravel configuration",
    "E3: Publishable assets — config, migrations, views, translations",
    "E4: Orchestra Testbench — Laravel package testing framework"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 375.1–375.6 |
| **Directory Pattern** | `packages/{vendor}/{name}/src/`, `packages/{vendor}/{name}/config/` |
| **Naming Convention** | `{PackageName}ServiceProvider.php`, `{PackageName}Facade.php` |
| **Imports From** | Laravel framework (illuminate/* packages) |
| **Imported By** | Host application via composer |
| **Cannot Import** | Host application code directly |
| **Dependencies** | `illuminate/support`, `orchestra/testbench` (dev) |
| **When To Use** | Reusable Laravel components, open-source packages, internal shared libraries |
| **Source Skeleton** | `src/{Name}ServiceProvider.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel package development — scaffolding, providers, publishing, testing, discovery |
| **Activation Trigger** | keywords: package, Composer, service provider, publishable, Testbench, package development |

---

## Role

You are a **Laravel Package Development Specialist**. Your responsibility is to provide best practices for Laravel 11+ package development — package scaffolding, service provider registration, publishable configuration and assets, package testing with Orchestra Testbench, auto-discovery via Composer, and proper package structure.

**Used by**: Any code agent creating reusable Laravel packages
**Not used by**: Application-only developers not building packages, non-Laravel stacks

---

## Patterns

### Pattern 375.1: Package Scaffolding

**Category**: Project Structure
**Description**: Set up a Laravel package with proper directory structure and Composer configuration.

```
my-package/
├── config/
│   └── my-package.php
├── database/
│   └── migrations/
│       └── create_widgets_table.php.stub
├── resources/
│   ├── views/
│   │   └── components/
│   └── lang/
│       └── en/
│           └── messages.php
├── routes/
│   └── web.php
├── src/
│   ├── Commands/
│   │   └── InstallCommand.php
│   ├── Contracts/
│   │   └── WidgetRepositoryInterface.php
│   ├── Facades/
│   │   └── MyPackage.php
│   ├── Models/
│   │   └── Widget.php
│   ├── MyPackageServiceProvider.php
│   └── MyPackage.php
├── tests/
│   ├── Feature/
│   ├── Unit/
│   └── TestCase.php
├── .gitignore
├── composer.json
├── LICENSE.md
├── phpunit.xml
└── README.md
```

```json
{
    "name": "acme/my-package",
    "description": "A Laravel package for widget management",
    "keywords": ["laravel", "widgets"],
    "license": "MIT",
    "require": {
        "php": "^8.3",
        "illuminate/contracts": "^11.0",
        "illuminate/support": "^11.0"
    },
    "require-dev": {
        "orchestra/testbench": "^9.0",
        "phpunit/phpunit": "^11.0"
    },
    "autoload": {
        "psr-4": {
            "Acme\\MyPackage\\": "src/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "Acme\\MyPackage\\Tests\\": "tests/"
        }
    },
    "extra": {
        "laravel": {
            "providers": [
                "Acme\\MyPackage\\MyPackageServiceProvider"
            ],
            "aliases": {
                "MyPackage": "Acme\\MyPackage\\Facades\\MyPackage"
            }
        }
    },
    "minimum-stability": "dev",
    "prefer-stable": true
}
```

**Key Points**:
- Follow PSR-4 autoloading — `src/` for source, `tests/` for tests
- Depend on `illuminate/*` contracts, not `laravel/framework` — allows broader compatibility
- `extra.laravel` section enables auto-discovery — no manual provider registration needed
- Use `.stub` extension for migration files — published with dynamic timestamps
- Keep `minimum-stability: dev` with `prefer-stable: true` for development flexibility

---

### Pattern 375.2: Service Provider Registration

**Category**: Bootstrap
**Description**: Build a package service provider with proper register/boot separation.

```php
<?php

declare(strict_types=1);

namespace Acme\MyPackage;

use Acme\MyPackage\Commands\InstallCommand;
use Acme\MyPackage\Contracts\WidgetRepositoryInterface;
use Acme\MyPackage\Repositories\EloquentWidgetRepository;
use Illuminate\Support\ServiceProvider;

final class MyPackageServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Merge package config with app config
        $this->mergeConfigFrom(
            path: __DIR__ . '/../config/my-package.php',
            key: 'my-package',
        );

        // Bind package services
        $this->app->bind(
            abstract: WidgetRepositoryInterface::class,
            concrete: EloquentWidgetRepository::class,
        );

        // Register the main package class as singleton
        $this->app->singleton('my-package', function ($app): MyPackage {
            return new MyPackage(
                config: $app['config']->get('my-package'),
            );
        });
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->registerPublishing();
            $this->registerCommands();
        }

        $this->registerRoutes();
        $this->registerViews();
        $this->registerTranslations();
    }

    private function registerPublishing(): void
    {
        // Config
        $this->publishes([
            __DIR__ . '/../config/my-package.php' => config_path('my-package.php'),
        ], 'my-package-config');

        // Migrations
        $this->publishes([
            __DIR__ . '/../database/migrations/' => database_path('migrations'),
        ], 'my-package-migrations');

        // Views
        $this->publishes([
            __DIR__ . '/../resources/views' => resource_path('views/vendor/my-package'),
        ], 'my-package-views');
    }

    private function registerCommands(): void
    {
        $this->commands([
            InstallCommand::class,
        ]);
    }

    private function registerRoutes(): void
    {
        if (config('my-package.routes_enabled', true)) {
            $this->loadRoutesFrom(__DIR__ . '/../routes/web.php');
        }
    }

    private function registerViews(): void
    {
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'my-package');
    }

    private function registerTranslations(): void
    {
        $this->loadTranslationsFrom(__DIR__ . '/../resources/lang', 'my-package');
    }
}
```

**Key Points**:
- `mergeConfigFrom()` in register() — app config overrides package defaults
- Guard all publishing and command registration with `runningInConsole()`
- Use publish groups (`my-package-config`, `my-package-migrations`) for selective publishing
- Config-driven route loading — allow host app to disable package routes
- View namespacing (`my-package`) enables `@include('my-package::component')`

---

### Pattern 375.3: Publishable Assets

**Category**: Configuration & Assets
**Description**: Define publishable configuration, migrations, views, and translations.

```php
<?php

// config/my-package.php
declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Widget Configuration
    |--------------------------------------------------------------------------
    */

    'enabled' => env('MY_PACKAGE_ENABLED', true),

    'routes_enabled' => env('MY_PACKAGE_ROUTES', true),

    'route_prefix' => env('MY_PACKAGE_ROUTE_PREFIX', 'widgets'),

    'middleware' => ['web', 'auth'],

    'table_name' => 'widgets',

    'max_widgets_per_user' => 50,

    'cache' => [
        'enabled' => true,
        'ttl' => 3600, // seconds
        'prefix' => 'my_package_',
    ],
];
```

```php
<?php

// database/migrations/create_widgets_table.php.stub
declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(config('my-package.table_name', 'widgets'), function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(config('my-package.table_name', 'widgets'));
    }
};
```

```php
<?php

declare(strict_types=1);

namespace Acme\MyPackage\Commands;

use Illuminate\Console\Command;

final class InstallCommand extends Command
{
    protected $signature = 'my-package:install';
    protected $description = 'Install the MyPackage package';

    public function handle(): int
    {
        $this->info('Installing MyPackage...');

        // Publish config
        $this->call('vendor:publish', [
            '--tag' => 'my-package-config',
            '--force' => false,
        ]);

        // Publish and run migrations
        $this->call('vendor:publish', [
            '--tag' => 'my-package-migrations',
            '--force' => false,
        ]);

        if ($this->confirm('Run migrations now?', true)) {
            $this->call('migrate');
        }

        $this->info('MyPackage installed successfully.');
        return self::SUCCESS;
    }
}
```

**Key Points**:
- Config file uses `env()` for environment-specific overrides
- Migration stubs use `.php.stub` extension — published with current timestamp
- Config-driven table names allow host app customization
- Install command provides guided setup — publish + migrate in one step
- `--force => false` prevents overwriting existing published files

---

### Pattern 375.4: Package Testing

**Category**: Testing
**Description**: Test Laravel packages using Orchestra Testbench for isolated package testing.

```php
<?php

declare(strict_types=1);

namespace Acme\MyPackage\Tests;

use Acme\MyPackage\MyPackageServiceProvider;
use Orchestra\Testbench\TestCase as OrchestraTestCase;

abstract class TestCase extends OrchestraTestCase
{
    /**
     * @param \Illuminate\Foundation\Application $app
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            MyPackageServiceProvider::class,
        ];
    }

    /**
     * @param \Illuminate\Foundation\Application $app
     * @return array<string, class-string>
     */
    protected function getPackageAliases($app): array
    {
        return [
            'MyPackage' => \Acme\MyPackage\Facades\MyPackage::class,
        ];
    }

    /**
     * @param \Illuminate\Foundation\Application $app
     */
    protected function getEnvironmentSetUp($app): void
    {
        // Use SQLite in-memory for tests
        $app['config']->set('database.default', 'testing');
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]);

        // Package-specific config overrides
        $app['config']->set('my-package.enabled', true);
        $app['config']->set('my-package.max_widgets_per_user', 5);
    }

    protected function defineDatabaseMigrations(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../database/migrations');
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Acme\MyPackage\Tests\Feature;

use Acme\MyPackage\Models\Widget;
use Acme\MyPackage\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class WidgetTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_widget(): void
    {
        $user = $this->createUser();

        $widget = Widget::create([
            'user_id' => $user->id,
            'name' => 'Test Widget',
            'description' => 'A test widget',
        ]);

        $this->assertDatabaseHas('widgets', [
            'name' => 'Test Widget',
            'user_id' => $user->id,
        ]);
    }

    public function test_config_is_loaded(): void
    {
        $this->assertTrue(config('my-package.enabled'));
        $this->assertSame(5, config('my-package.max_widgets_per_user'));
    }

    public function test_service_provider_bindings(): void
    {
        $resolved = $this->app->make(\Acme\MyPackage\Contracts\WidgetRepositoryInterface::class);

        $this->assertInstanceOf(
            \Acme\MyPackage\Repositories\EloquentWidgetRepository::class,
            $resolved,
        );
    }

    public function test_widget_api_route(): void
    {
        $user = $this->createUser();
        Widget::factory()->count(3)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->getJson('/widgets');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    private function createUser(): \Illuminate\Foundation\Auth\User
    {
        return \Illuminate\Foundation\Auth\User::forceCreate([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);
    }
}
```

```xml
<!-- phpunit.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<phpunit
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
    bootstrap="vendor/autoload.php"
    colors="true"
>
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <source>
        <include>
            <directory>src</directory>
        </include>
    </source>
</phpunit>
```

**Key Points**:
- Orchestra Testbench provides a full Laravel application for package testing
- `getPackageProviders()` registers the package provider — simulates auto-discovery
- `getEnvironmentSetUp()` configures test environment — SQLite in-memory for speed
- `defineDatabaseMigrations()` loads package migrations for database tests
- Test config loading, service bindings, routes, and models independently

---

### Pattern 375.5: Package Discovery

**Category**: Auto-Discovery
**Description**: Configure automatic package discovery and optional manual registration.

```json
{
    "extra": {
        "laravel": {
            "providers": [
                "Acme\\MyPackage\\MyPackageServiceProvider"
            ],
            "aliases": {
                "MyPackage": "Acme\\MyPackage\\Facades\\MyPackage"
            },
            "dont-discover": []
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Acme\MyPackage\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static \Acme\MyPackage\Models\Widget create(array $data)
 * @method static \Illuminate\Support\Collection all()
 * @method static bool isEnabled()
 *
 * @see \Acme\MyPackage\MyPackage
 */
final class MyPackage extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'my-package';
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Acme\MyPackage;

final class MyPackage
{
    /**
     * @param array<string, mixed> $config
     */
    public function __construct(
        private readonly array $config,
    ) {}

    public function isEnabled(): bool
    {
        return $this->config['enabled'] ?? true;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): Models\Widget
    {
        return Models\Widget::create($data);
    }

    /**
     * @return \Illuminate\Support\Collection<int, Models\Widget>
     */
    public function all(): \Illuminate\Support\Collection
    {
        return Models\Widget::all();
    }
}
```

**Key Points**:
- Auto-discovery reads `extra.laravel` from composer.json during `composer install`
- Facade provides static-like API backed by container-resolved instance
- PHPDoc `@method` annotations on facades enable IDE autocompletion
- Host apps can disable discovery with `dont-discover` in their own composer.json
- The facade accessor string must match the container binding key in the service provider

---

### Pattern 375.6: Composer Package Structure

**Category**: Distribution
**Description**: Prepare a package for distribution via Packagist or private repository.

```json
{
    "name": "acme/laravel-widgets",
    "description": "Widget management for Laravel applications",
    "type": "library",
    "keywords": ["laravel", "widgets", "components"],
    "homepage": "https://github.com/acme/laravel-widgets",
    "license": "MIT",
    "authors": [
        {
            "name": "Acme Team",
            "email": "dev@acme.com"
        }
    ],
    "require": {
        "php": "^8.3",
        "illuminate/contracts": "^11.0",
        "illuminate/database": "^11.0",
        "illuminate/support": "^11.0"
    },
    "require-dev": {
        "orchestra/testbench": "^9.0",
        "phpunit/phpunit": "^11.0",
        "phpstan/phpstan": "^2.0",
        "laravel/pint": "^1.0"
    },
    "autoload": {
        "psr-4": {
            "Acme\\LaravelWidgets\\": "src/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "Acme\\LaravelWidgets\\Tests\\": "tests/"
        }
    },
    "scripts": {
        "test": "phpunit",
        "analyse": "phpstan analyse",
        "format": "pint"
    },
    "extra": {
        "laravel": {
            "providers": [
                "Acme\\LaravelWidgets\\WidgetsServiceProvider"
            ]
        }
    },
    "config": {
        "sort-packages": true
    }
}
```

```gitignore
# .gitignore
/vendor/
/node_modules/
.phpunit.result.cache
.phpunit.cache/
phpstan.neon
.env
composer.lock
```

```yaml
# .github/workflows/tests.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        php: ['8.3', '8.4']
        laravel: ['11.*']

    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          extensions: dom, curl, mbstring, zip, pdo, sqlite, pdo_sqlite
      - run: composer require "laravel/framework:${{ matrix.laravel }}" --no-update
      - run: composer install --prefer-dist --no-progress
      - run: vendor/bin/phpunit
```

**Key Points**:
- Use `illuminate/*` dependencies, not `laravel/framework` — lighter dependency tree
- Include `composer.lock` in `.gitignore` for libraries — host app manages lock file
- CI matrix tests across PHP versions and Laravel versions for compatibility
- Composer scripts provide consistent commands: `composer test`, `composer analyse`
- `type: library` is the correct Composer package type for Laravel packages
- Tag releases with semver — Packagist auto-discovers tags as versions

---

## Best Practices

- **Depend on illuminate contracts** — not `laravel/framework`; enables wider compatibility
- **Use auto-discovery** — eliminate manual provider registration in host apps
- **Provide install command** — `php artisan my-package:install` for guided setup
- **Test with Orchestra Testbench** — isolated testing without a full Laravel application
- **Publish selectively** — separate groups for config, migrations, views, and translations
- **Config-driven behavior** — allow host apps to customize table names, routes, middleware
- **Version your package** — follow semver; document breaking changes in CHANGELOG
- **CI across PHP/Laravel versions** — ensure compatibility matrix is tested

---

## Abnormal Case Patterns

1. **Auto-discovery not working** — composer.json `extra.laravel` section missing or has typos. Fix: verify class paths match PSR-4 autoload; run `composer dump-autoload`.

2. **Config not merged** — host app config overrides entire array instead of merging. Fix: `mergeConfigFrom()` does shallow merge; document that host apps should only override specific keys.

3. **Migration collision** — package migration timestamp conflicts with host app migration. Fix: use `.php.stub` with dynamic timestamps; provide install command that publishes with current time.

4. **View override not working** — published views not picked up by Laravel. Fix: verify views are published to `resources/views/vendor/{package-name}/`; check view namespace.

5. **Test database not migrated** — Testbench tests fail with "table not found". Fix: implement `defineDatabaseMigrations()` in TestCase; ensure migration path is correct.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (375.1–375.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Package Development Specialist — Packages | EPS v3.2*

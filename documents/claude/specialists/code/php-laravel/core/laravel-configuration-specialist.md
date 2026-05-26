# Laravel Configuration Specialist — Core
# Laravel設定管理スペシャリスト — コア
# Chuyen Gia Cau Hinh Laravel — Loi

**Version**: 1.0.0
**Technology**: Laravel 11+ Configuration
**Aspect**: Configuration Management
**Category**: core
**Purpose**: Knowledge provider for Laravel configuration — config files, environment variables, config caching, feature flags, secrets management, and dynamic configuration

---

## Metadata

```json
{
  "id": "laravel-configuration-specialist",
  "technology": "Laravel 11+ Configuration",
  "aspect": "Configuration Management",
  "category": "core",
  "subcategory": "php-laravel",
  "lines": 430,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 config system — file-based config with env() integration",
    "E2: Config caching — artisan config:cache for production optimization",
    "E3: Secrets management — environment-based sensitive value handling"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 304.1–304.8 |
| **Directory Pattern** | `config/` |
| **Naming Convention** | `{feature}.php` |
| **Imports From** | N/A (configuration is a root concern) |
| **Imported By** | ALL (every layer reads configuration) |
| **Cannot Import** | Domain, Application (config must not depend on business logic) |
| **Dependencies** | `illuminate/config`, `vlucas/phpdotenv` |
| **When To Use** | Every Laravel project — configuration is fundamental |
| **Source Skeleton** | `config/{feature}.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel configuration management — env vars, caching, secrets, feature flags |
| **Activation Trigger** | files: `config/*.php`, `.env*`; keywords: config, env, environment, feature flag |

---

## Role

You are a **Laravel Configuration Specialist**. Your responsibility is to provide best practices for Laravel 11+ configuration management — config files, environment variables, config caching, per-environment configuration, feature flags, secrets management, and config validation.

**Used by**: Any code agent working with Laravel application configuration
**Not used by**: Non-Laravel stacks, projects not using file-based config

---

## Patterns

### Pattern 304.1: Config File Structure

**Category**: Configuration Basics
**Description**: Standard config file structure with typed returns and env() defaults.

```php
<?php

declare(strict_types=1);

// config/payment.php
return [
    'default_gateway' => env('PAYMENT_GATEWAY', 'stripe'),

    'gateways' => [
        'stripe' => [
            'key' => env('STRIPE_KEY'),
            'secret' => env('STRIPE_SECRET'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
            'currency' => env('STRIPE_CURRENCY', 'usd'),
            'retry_attempts' => (int) env('STRIPE_RETRY_ATTEMPTS', 3),
        ],
        'paypal' => [
            'client_id' => env('PAYPAL_CLIENT_ID'),
            'secret' => env('PAYPAL_SECRET'),
            'mode' => env('PAYPAL_MODE', 'sandbox'),
        ],
    ],

    'limits' => [
        'min_amount' => (int) env('PAYMENT_MIN_AMOUNT', 100), // cents
        'max_amount' => (int) env('PAYMENT_MAX_AMOUNT', 1_000_000),
        'daily_limit' => (int) env('PAYMENT_DAILY_LIMIT', 10_000_00),
    ],

    'webhooks' => [
        'tolerance_seconds' => (int) env('WEBHOOK_TOLERANCE', 300),
        'verify_signature' => (bool) env('WEBHOOK_VERIFY_SIGNATURE', true),
    ],
];
```

**Key Points**:
- Always provide sensible defaults in `env()` second parameter
- Cast env values explicitly — `(int)`, `(bool)` — env() always returns strings
- Group related config under nested arrays by concern
- Use underscored numeric literals for large numbers (`1_000_000`)
- Never put business logic in config files — data only

---

### Pattern 304.2: Environment Variables

**Category**: Configuration Basics
**Description**: .env file management with type safety and validation patterns.

```php
# .env — environment-specific values
APP_NAME="My Application"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://myapp.com

DB_CONNECTION=pgsql
DB_HOST=db.internal
DB_PORT=5432
DB_DATABASE=myapp_prod
DB_USERNAME=myapp
DB_PASSWORD="${DB_PASSWORD_SECRET}"

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

PAYMENT_GATEWAY=stripe
STRIPE_KEY=pk_live_...
STRIPE_SECRET=sk_live_...
```

```php
<?php

declare(strict_types=1);

// Accessing config values — always use config(), never env() outside config files
namespace App\Services;

final readonly class PaymentService
{
    private string $gateway;
    private int $maxAmount;

    public function __construct()
    {
        // CORRECT: config() reads from cached config
        $this->gateway = config('payment.default_gateway');
        $this->maxAmount = config('payment.limits.max_amount');
    }
}

// WRONG: env() in application code — breaks with config:cache
// $gateway = env('PAYMENT_GATEWAY'); // Returns NULL after config:cache!
```

**Key Points**:
- **Never use `env()` outside config files** — `env()` returns NULL after `config:cache`
- Use `config()` helper everywhere in application code
- `.env` is not committed to VCS — use `.env.example` as template
- Cast types in config files, not at point of use
- Use `${VAR}` syntax for variable interpolation in `.env`

---

### Pattern 304.3: Config Caching

**Category**: Performance
**Description**: Config caching for production — merges all config files into a single cached file.

```php
# Production deployment — cache config for performance
php artisan config:cache    # Generates bootstrap/cache/config.php
php artisan config:clear    # Removes cached config

# In deployment scripts (e.g., Envoy, Deployer)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

```php
<?php

declare(strict_types=1);

// config/app.php — values must be serializable for caching
return [
    'name' => env('APP_NAME', 'Laravel'),

    // CORRECT: primitive values — cacheable
    'timezone' => env('APP_TIMEZONE', 'UTC'),
    'locale' => env('APP_LOCALE', 'en'),

    // WRONG: closures/objects — NOT cacheable, breaks config:cache
    // 'formatter' => fn ($value) => strtoupper($value),
    // 'client' => new \GuzzleHttp\Client(),
];
```

**Key Points**:
- `config:cache` merges all config/*.php into one file — massive performance gain
- After caching, `env()` returns NULL — only `config()` works
- Config values must be serializable — no closures, objects, or resources
- Always run `config:cache` in production deployment pipeline
- Run `config:clear` during development to avoid stale values

---

### Pattern 304.4: Per-Environment Configuration

**Category**: Environment Management
**Description**: Environment-specific config using .env files and conditional logic.

```php
<?php

declare(strict_types=1);

// config/logging.php — environment-aware configuration
return [
    'default' => env('LOG_CHANNEL', 'stack'),

    'channels' => [
        'stack' => [
            'driver' => 'stack',
            'channels' => match (env('APP_ENV')) {
                'production' => ['daily', 'sentry'],
                'staging' => ['daily', 'slack'],
                default => ['single'],
            },
            'ignore_exceptions' => false,
        ],

        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'info'),
            'days' => (int) env('LOG_RETENTION_DAYS', 14),
            'permission' => 0644,
        ],

        'sentry' => [
            'driver' => 'sentry',
            'level' => 'error',
            'bubble' => true,
        ],
    ],
];
```

```php
<?php

declare(strict_types=1);

// .env.testing — PHPUnit overrides (auto-loaded by Laravel test runner)
APP_ENV=testing
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
CACHE_STORE=array
QUEUE_CONNECTION=sync
MAIL_MAILER=array
BROADCAST_CONNECTION=null
```

**Key Points**:
- Use `.env.testing` for PHPUnit-specific overrides — auto-loaded by Laravel
- `match()` expression in config files for environment-dependent values
- Never use `if (app()->isProduction())` in config files — use env() instead
- `.env.staging`, `.env.production` managed on servers, never in VCS
- `APP_ENV` determines which .env file supplements the base .env

---

### Pattern 304.5: Feature Flags via Config

**Category**: Feature Management
**Description**: Simple feature flag system using config and env vars.

```php
<?php

declare(strict_types=1);

// config/features.php
return [
    'new_checkout' => (bool) env('FEATURE_NEW_CHECKOUT', false),
    'ai_recommendations' => (bool) env('FEATURE_AI_RECOMMENDATIONS', false),
    'dark_mode' => (bool) env('FEATURE_DARK_MODE', true),
    'beta_api_v2' => (bool) env('FEATURE_BETA_API_V2', false),

    // Percentage-based rollout
    'gradual_rollout' => [
        'enabled' => (bool) env('FEATURE_GRADUAL_ROLLOUT', false),
        'percentage' => (int) env('FEATURE_GRADUAL_ROLLOUT_PCT', 0),
    ],
];
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

final readonly class FeatureFlag
{
    public static function isEnabled(string $feature): bool
    {
        return (bool) config("features.{$feature}", false);
    }

    public static function isEnabledForUser(string $feature, int $userId): bool
    {
        $config = config("features.{$feature}");

        if (is_bool($config)) {
            return $config;
        }

        if (is_array($config) && isset($config['percentage'])) {
            return $config['enabled'] && ($userId % 100) < $config['percentage'];
        }

        return false;
    }
}

// Usage in controller
if (FeatureFlag::isEnabled('new_checkout')) {
    return $this->newCheckoutFlow($request);
}
return $this->legacyCheckoutFlow($request);
```

**Key Points**:
- Simple boolean flags via env vars — no external service needed
- Cast to `(bool)` in config file — env returns strings
- Percentage-based rollout using user ID modulo
- Feature flags are config — can be cached with `config:cache`
- For complex feature management, use dedicated packages (Laravel Pennant)

---

### Pattern 304.6: Secrets Management

**Category**: Security
**Description**: Secure handling of sensitive configuration values — encryption, vaults, rotation.

```php
<?php

declare(strict_types=1);

// config/services.php — secrets from env vars, never hardcoded
return [
    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'aws' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],
];
```

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;

final class SecretsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Load secrets from external vault in production
        if ($this->app->isProduction()) {
            $this->loadFromVault();
        }
    }

    private function loadFromVault(): void
    {
        $vaultClient = $this->app->make(VaultClientInterface::class);

        $secrets = $vaultClient->getSecrets(path: 'myapp/production');

        Config::set('database.connections.pgsql.password', $secrets['db_password']);
        Config::set('services.stripe.secret', $secrets['stripe_secret']);
        Config::set('mail.mailers.smtp.password', $secrets['smtp_password']);
    }
}
```

**Key Points**:
- Never hardcode secrets in config files or source code
- Use env vars for development, vault integration for production
- `Config::set()` can override cached values at runtime for vault-loaded secrets
- Rotate secrets without redeployment using vault integration
- `.env` file permissions should be `0600` (owner read/write only)

---

### Pattern 304.7: Config Validation

**Category**: Safety
**Description**: Validate required config values at application boot to fail fast on misconfiguration.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use RuntimeException;

final class ConfigValidationProvider extends ServiceProvider
{
    /** @var array<string, string> */
    private const REQUIRED_CONFIG = [
        'app.key' => 'Application key must be set (php artisan key:generate)',
        'database.connections.pgsql.host' => 'Database host is required',
        'services.stripe.secret' => 'Stripe secret key is required for payment processing',
    ];

    /** @var array<string, string> */
    private const REQUIRED_IN_PRODUCTION = [
        'mail.mailers.smtp.host' => 'SMTP host required in production',
        'services.sentry.dsn' => 'Sentry DSN required in production for error tracking',
    ];

    public function boot(): void
    {
        $this->validateRequired(self::REQUIRED_CONFIG);

        if ($this->app->isProduction()) {
            $this->validateRequired(self::REQUIRED_IN_PRODUCTION);
        }
    }

    /**
     * @param array<string, string> $rules
     */
    private function validateRequired(array $rules): void
    {
        $missing = [];

        foreach ($rules as $key => $message) {
            if (blank(config($key))) {
                $missing[] = "{$key}: {$message}";
            }
        }

        if ($missing !== []) {
            throw new RuntimeException(
                'Missing required configuration:' . PHP_EOL .
                implode(PHP_EOL, $missing)
            );
        }
    }
}
```

**Key Points**:
- Fail fast on missing required config — don't let the app start in a broken state
- Separate always-required from production-only requirements
- Provide actionable error messages with fix instructions
- Run validation in `boot()` — all config is loaded by then
- Use `blank()` helper — catches null, empty string, and empty arrays

---

### Pattern 304.8: Dynamic Configuration

**Category**: Advanced Configuration
**Description**: Runtime-modifiable configuration stored in database for admin-adjustable settings.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Setting;
use Illuminate\Cache\Repository as CacheRepository;

final readonly class DynamicConfig
{
    private const CACHE_KEY = 'app.dynamic_config';
    private const CACHE_TTL = 3600; // 1 hour

    public function __construct(
        private CacheRepository $cache,
    ) {}

    public function get(string $key, mixed $default = null): mixed
    {
        $settings = $this->cache->remember(
            key: self::CACHE_KEY,
            ttl: self::CACHE_TTL,
            callback: fn () => Setting::pluck('value', 'key')->toArray(),
        );

        return $settings[$key] ?? $default;
    }

    public function set(string $key, mixed $value): void
    {
        Setting::updateOrCreate(
            attributes: ['key' => $key],
            values: ['value' => $value, 'updated_by' => auth()->id()],
        );

        $this->cache->forget(self::CACHE_KEY);
    }

    public function getTyped(string $key, string $type, mixed $default = null): mixed
    {
        $value = $this->get($key, $default);

        if ($value === null) {
            return $default;
        }

        return match ($type) {
            'int' => (int) $value,
            'float' => (float) $value,
            'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($value, associative: true, flags: JSON_THROW_ON_ERROR),
            default => $value,
        };
    }
}
```

```php
<?php

declare(strict_types=1);

// Migration for settings table
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group')->default('general')->index();
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }
};
```

**Key Points**:
- Cache database-stored config to avoid per-request queries
- Invalidate cache on write — consistency over eventual consistency
- Use `match` expression for type casting dynamic values
- Keep static config in files, dynamic config (admin-adjustable) in database
- Audit trail via `updated_by` column for compliance

---

## Best Practices

- **Never use `env()` outside config files** — breaks when config is cached
- **Cast env values in config files** — `(int)`, `(bool)` for type safety
- **Always provide defaults** — `env('KEY', 'default')` prevents null surprises
- **Cache config in production** — `config:cache` in every deployment pipeline
- **Validate at boot** — fail fast on missing required configuration
- **No closures in config** — breaks `config:cache` serialization
- **Separate static from dynamic** — files for deployment-time, database for runtime
- **Use `.env.example`** — document all required env vars for onboarding
- **Group config by feature** — `config/payment.php`, `config/notification.php`
- **Secrets never in VCS** — use env vars, vault, or encrypted secrets

---

## Abnormal Case Patterns

1. **`env()` returns NULL in production** — used `env()` in application code after `config:cache`. Fix: only use `env()` in config files; use `config()` everywhere else.

2. **Config cache stale after deploy** — new config keys not available. Fix: run `config:cache` in deployment pipeline after code is deployed.

3. **Closure in config file** — `config:cache` throws serialization error. Fix: replace closures with static values or move logic to service providers.

4. **Type mismatch** — env value is string "false" but code checks `=== false`. Fix: cast to `(bool)` in config file.

5. **Dynamic config overload** — every setting in database, cache thrashing on writes. Fix: only admin-adjustable settings in database; deployment config stays in files.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (304.1–304.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Configuration Specialist — Core | EPS v3.2*

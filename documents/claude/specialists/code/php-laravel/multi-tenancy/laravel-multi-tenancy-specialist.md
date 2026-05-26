# Laravel Multi-Tenancy Specialist — Multi-Tenancy
# Laravelマルチテナンシースペシャリスト — マルチテナンシー
# Chuyen Gia Da Thue Bao Laravel — Da Thue Bao

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Multi-Tenancy
**Aspect**: Multi-Tenancy Architecture
**Category**: multi-tenancy
**Purpose**: Knowledge provider for Laravel multi-tenancy — database-per-tenant, schema-per-tenant, single-database with tenant column, tenant identification, tenant-aware models, and tenant-specific config

---

## Metadata

```json
{
  "id": "laravel-multi-tenancy-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Multi-Tenancy",
  "aspect": "Multi-Tenancy Architecture",
  "category": "multi-tenancy",
  "subcategory": "php-laravel",
  "lines": 490,
  "token_cost": 3300,
  "version": "1.0.0",
  "evidence": [
    "E1: Database-per-tenant — complete data isolation via dynamic connections",
    "E2: Single-database tenancy — tenant_id column with global scopes",
    "E3: Tenant identification — subdomain, header, path-based resolution",
    "E4: spatie/laravel-multitenancy — optional package for structured tenancy"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 368.1–368.6 |
| **Directory Pattern** | `app/Models/`, `app/Http/Middleware/`, `config/` |
| **Naming Convention** | `Tenant.php`, `BelongsToTenant` trait, `TenantMiddleware.php` |
| **Imports From** | ALL layers |
| **Imported By** | ALL layers |
| **Cannot Import** | N/A |
| **Dependencies** | `illuminate/database`, `spatie/laravel-multitenancy` (optional) |
| **When To Use** | SaaS applications serving multiple organizations from a single codebase |
| **Source Skeleton** | `app/Models/Tenant.php`, `app/Traits/BelongsToTenant.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel multi-tenancy — isolation strategies, identification, tenant-aware models |
| **Activation Trigger** | keywords: tenant, multi-tenant, SaaS, organization isolation, tenant_id |

---

## Role

You are a **Laravel Multi-Tenancy Specialist**. Your responsibility is to provide best practices for Laravel 11+ multi-tenancy — choosing between database-per-tenant, schema-per-tenant, and single-database approaches, implementing tenant identification middleware, building tenant-aware models, and managing tenant-specific configuration.

**Used by**: Any code agent building SaaS or multi-organization Laravel applications
**Not used by**: Single-tenant applications, non-Laravel stacks

---

## Patterns

### Pattern 368.1: Database Per Tenant

**Category**: Isolation Strategy
**Description**: Complete data isolation by dynamically switching database connections per tenant.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class Tenant extends Model
{
    protected $connection = 'landlord'; // Central database for tenant registry

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'database_name',
        'database_host',
        'database_port',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Configure tenant-specific database connection at runtime.
     */
    public function configureDatabaseConnection(): void
    {
        config([
            'database.connections.tenant' => [
                'driver' => 'mysql',
                'host' => $this->database_host ?? config('database.connections.mysql.host'),
                'port' => $this->database_port ?? config('database.connections.mysql.port'),
                'database' => $this->database_name,
                'username' => config('database.connections.mysql.username'),
                'password' => config('database.connections.mysql.password'),
                'charset' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
                'prefix' => '',
                'strict' => true,
            ],
        ]);

        // Purge and reconnect
        \Illuminate\Support\Facades\DB::purge('tenant');
        \Illuminate\Support\Facades\DB::reconnect('tenant');
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Tenant;

final class TenantManager
{
    private ?Tenant $currentTenant = null;

    public function setTenant(Tenant $tenant): void
    {
        $this->currentTenant = $tenant;
        $tenant->configureDatabaseConnection();

        // Set default connection for tenant models
        config(['database.default' => 'tenant']);
    }

    public function getCurrentTenant(): ?Tenant
    {
        return $this->currentTenant;
    }

    public function isInitialized(): bool
    {
        return $this->currentTenant !== null;
    }

    public function runForTenant(Tenant $tenant, callable $callback): mixed
    {
        $previousTenant = $this->currentTenant;

        try {
            $this->setTenant($tenant);
            return $callback($tenant);
        } finally {
            if ($previousTenant) {
                $this->setTenant($previousTenant);
            } else {
                config(['database.default' => 'landlord']);
                $this->currentTenant = null;
            }
        }
    }
}
```

**Key Points**:
- Landlord database stores tenant registry; tenant databases store business data
- `DB::purge()` and `DB::reconnect()` ensure clean connection switching
- `runForTenant()` enables cross-tenant operations with automatic cleanup
- Database-per-tenant provides strongest isolation but highest operational complexity
- Migrations must run per tenant: `php artisan migrate --database=tenant`

---

### Pattern 368.2: Schema Per Tenant

**Category**: Isolation Strategy
**Description**: Use PostgreSQL schemas for tenant isolation within a single database instance.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;

final class SchemaManager
{
    /**
     * Create a new schema for a tenant.
     */
    public function createSchema(string $schemaName): void
    {
        DB::statement("CREATE SCHEMA IF NOT EXISTS \"{$schemaName}\"");
    }

    /**
     * Switch to tenant schema.
     */
    public function switchToSchema(string $schemaName): void
    {
        DB::statement("SET search_path TO \"{$schemaName}\", public");
    }

    /**
     * Switch back to public schema.
     */
    public function switchToPublic(): void
    {
        DB::statement("SET search_path TO public");
    }

    /**
     * Run migrations for a specific schema.
     */
    public function migrateSchema(string $schemaName): void
    {
        $this->switchToSchema($schemaName);

        \Illuminate\Support\Facades\Artisan::call('migrate', [
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);

        $this->switchToPublic();
    }

    /**
     * Drop tenant schema and all its data.
     */
    public function dropSchema(string $schemaName): void
    {
        DB::statement("DROP SCHEMA IF EXISTS \"{$schemaName}\" CASCADE");
    }
}
```

**Key Points**:
- PostgreSQL-only approach — `SET search_path` switches active schema
- Shared database means simpler backups and connection management
- Schema name typically matches tenant slug: `tenant_acme_corp`
- Separate migration path for tenant schemas vs public/landlord tables
- Good balance between isolation and operational simplicity

---

### Pattern 368.3: Single Database with Tenant Column

**Category**: Isolation Strategy
**Description**: Use a `tenant_id` column with global scopes for soft isolation in a shared database.

```php
<?php

declare(strict_types=1);

namespace App\Traits;

use App\Models\Scopes\TenantScope;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @mixin Model
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function (Model $model): void {
            $tenantId = app(\App\Services\TenantManager::class)->getCurrentTenant()?->id;

            if ($tenantId && ! $model->tenant_id) {
                $model->tenant_id = $tenantId;
            }
        });
    }

    /** @return BelongsTo<Tenant, static> */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

final class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenant = app(\App\Services\TenantManager::class)->getCurrentTenant();

        if ($tenant) {
            $builder->where("{$model->getTable()}.tenant_id", $tenant->id);
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

final class Order extends Model
{
    use BelongsToTenant;

    protected $fillable = ['user_id', 'total', 'status'];
}
```

**Key Points**:
- Global scope automatically filters all queries by `tenant_id`
- `creating` event auto-assigns `tenant_id` — developers never forget it
- Simplest approach but weakest isolation — a bug can leak data across tenants
- Always include table prefix in scope: `{$model->getTable()}.tenant_id` for JOINs
- Add database index on `tenant_id` (or composite indexes starting with `tenant_id`)

---

### Pattern 368.4: Tenant Identification Middleware

**Category**: Request Handling
**Description**: Identify the current tenant from the HTTP request — subdomain, header, or path-based.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class IdentifyTenant
{
    public function __construct(
        private readonly TenantManager $tenantManager,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->resolveTenant($request);

        if (! $tenant || ! $tenant->is_active) {
            abort(404, 'Tenant not found or inactive.');
        }

        $this->tenantManager->setTenant($tenant);

        // Bind tenant to container for dependency injection
        app()->instance(Tenant::class, $tenant);

        return $next($request);
    }

    private function resolveTenant(Request $request): ?Tenant
    {
        // Strategy 1: Subdomain (acme.app.com)
        $host = $request->getHost();
        $subdomain = explode('.', $host)[0] ?? null;

        if ($subdomain && $subdomain !== 'www' && $subdomain !== 'app') {
            return Tenant::where('slug', $subdomain)->first();
        }

        // Strategy 2: Header (X-Tenant-ID)
        $tenantHeader = $request->header('X-Tenant-ID');
        if ($tenantHeader) {
            return Tenant::where('slug', $tenantHeader)->first();
        }

        // Strategy 3: Path prefix (/tenant/acme/...)
        $tenantSlug = $request->segment(2); // /api/tenant/{slug}/...
        if ($tenantSlug) {
            return Tenant::where('slug', $tenantSlug)->first();
        }

        return null;
    }
}
```

```php
<?php

// bootstrap/app.php — register tenant middleware
declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        web: __DIR__ . '/../routes/web.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \App\Http\Middleware\IdentifyTenant::class,
        ]);
    })
    ->create();
```

**Key Points**:
- Middleware runs early to establish tenant context before controllers execute
- Support multiple identification strategies with fallback chain
- Cache tenant lookup to avoid database query on every request
- Inactive tenants receive 404 — no information leakage about tenant existence
- Bind resolved tenant to the container for dependency injection throughout the request

---

### Pattern 368.5: Tenant-Aware Models

**Category**: Data Layer
**Description**: Build models that automatically scope queries and relationships to the current tenant.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Project extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = ['name', 'description', 'status'];

    /** @return HasMany<Task> */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Collection;

final class ProjectService
{
    /**
     * All queries automatically scoped to current tenant.
     *
     * @return Collection<int, Project>
     */
    public function listProjects(): Collection
    {
        // TenantScope ensures only current tenant's projects are returned
        return Project::with('tasks')
            ->orderByDesc('updated_at')
            ->get();
    }

    /**
     * Create project — tenant_id auto-assigned via BelongsToTenant trait.
     */
    public function createProject(string $name, string $description): Project
    {
        return Project::create([
            'name' => $name,
            'description' => $description,
            'status' => 'active',
            // tenant_id is automatically set by the trait
        ]);
    }

    /**
     * Cross-tenant operation — bypass scope when needed (admin only).
     */
    public function getProjectCountAllTenants(): int
    {
        return Project::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)
            ->count();
    }
}
```

**Key Points**:
- `BelongsToTenant` trait makes models tenant-aware transparently
- Developers write normal Eloquent queries — tenant filtering is automatic
- `withoutGlobalScope()` bypasses tenant filter for admin/reporting use cases
- Test tenant isolation: verify queries include `WHERE tenant_id = ?`
- Relationships between tenant-aware models are automatically scoped

---

### Pattern 368.6: Tenant-Specific Config

**Category**: Configuration
**Description**: Override application configuration per tenant for customization.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Config;

final class TenantConfigService
{
    /**
     * Apply tenant-specific configuration overrides.
     */
    public function applyConfig(Tenant $tenant): void
    {
        $settings = $tenant->settings ?? [];

        // Mail configuration per tenant
        if (isset($settings['mail'])) {
            Config::set('mail.mailers.smtp.host', $settings['mail']['host'] ?? config('mail.mailers.smtp.host'));
            Config::set('mail.mailers.smtp.port', $settings['mail']['port'] ?? config('mail.mailers.smtp.port'));
            Config::set('mail.from.name', $settings['mail']['from_name'] ?? $tenant->name);
            Config::set('mail.from.address', $settings['mail']['from_address'] ?? "noreply@{$tenant->domain}");
        }

        // Storage path per tenant
        Config::set('filesystems.disks.tenant', [
            'driver' => 's3',
            'key' => config('filesystems.disks.s3.key'),
            'secret' => config('filesystems.disks.s3.secret'),
            'region' => config('filesystems.disks.s3.region'),
            'bucket' => config('filesystems.disks.s3.bucket'),
            'root' => "tenants/{$tenant->slug}",
        ]);

        // Feature flags per tenant
        if (isset($settings['features'])) {
            foreach ($settings['features'] as $feature => $enabled) {
                Config::set("features.{$feature}", $enabled);
            }
        }
    }
}
```

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->json('settings')->nullable()->after('is_active');
            // settings: { "mail": {...}, "features": {...}, "branding": {...} }
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->dropColumn('settings');
        });
    }
};
```

**Key Points**:
- Store tenant settings as JSON in the tenants table — flexible schema
- Apply config overrides in middleware after tenant identification
- Scope storage paths per tenant: `tenants/{slug}/` prevents cross-tenant file access
- Tenant-specific mail config enables white-label email sending
- Cache tenant settings to avoid database reads on every request

---

## Best Practices

- **Choose isolation level early** — database-per-tenant for compliance-heavy, single-database for simplicity
- **Always auto-assign `tenant_id`** — never rely on developers to set it manually
- **Test cross-tenant isolation** — verify that Tenant A cannot see Tenant B's data
- **Cache tenant resolution** — subdomain-to-tenant lookups should hit cache, not database
- **Use global scopes, not manual WHERE** — prevents accidental data leaks from forgotten filters
- **Separate landlord and tenant concerns** — landlord models use `$connection = 'landlord'`
- **Index `tenant_id` columns** — every tenant-scoped table needs `tenant_id` in its indexes
- **Plan tenant provisioning** — automate database/schema creation for new tenant signup

---

## Abnormal Case Patterns

1. **Data leak across tenants** — query missing `tenant_id` filter due to bypassed global scope. Fix: use `BelongsToTenant` trait on all tenant models; audit `withoutGlobalScope()` usage.

2. **Tenant connection leak in queues** — queue worker retains previous tenant's database connection. Fix: reset tenant context in job `handle()` method; use `$this->tenantId` property.

3. **Migration fails on tenant databases** — running migration on wrong connection. Fix: always specify `--database=tenant` and iterate over all tenant databases in deployment.

4. **N+1 tenant lookups** — resolving tenant on every request without caching. Fix: cache tenant by domain/slug with 5-minute TTL.

5. **Orphaned tenant data** — tenant deactivated but data remains accessible via direct database queries. Fix: implement `is_active` check in middleware and global scope.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (368.1–368.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Multi-Tenancy Specialist — Multi-Tenancy | EPS v3.2*

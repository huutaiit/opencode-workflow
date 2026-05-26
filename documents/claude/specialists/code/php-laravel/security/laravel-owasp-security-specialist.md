# Laravel OWASP Security Specialist — Security
# Laravel OWASPセキュリティスペシャリスト — セキュリティ
# Chuyen Gia Bao Mat OWASP Laravel — Bao Mat

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11 Security
**Aspect**: OWASP Top 10 Prevention
**Category**: security
**Purpose**: Knowledge provider for OWASP security in Laravel — SQL injection prevention, XSS protection, CSRF defense, mass assignment guarding, rate limiting, file upload validation, and encryption/hashing best practices

---

## Metadata

```json
{
  "id": "laravel-owasp-security-specialist",
  "technology": "PHP 8.3 + Laravel 11 Security",
  "aspect": "OWASP Top 10 Prevention",
  "category": "security",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: OWASP Top 10 2021 — injection, broken access control, cryptographic failures",
    "E2: Laravel 11 security — Eloquent parameterized queries, Blade auto-escaping, CSRF middleware",
    "E3: PHP 8.3 security — Sodium extension, password_hash with Argon2id, readonly properties"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 335.1–335.7 |
| **Directory Pattern** | Cross-cutting — affects all directories |
| **Naming Convention** | N/A — security patterns apply across the codebase |
| **Imports From** | Infrastructure (encryption, hashing), Presentation (middleware, validation) |
| **Imported By** | ALL layers — security is a cross-cutting concern |
| **Cannot Import** | N/A — security applies everywhere |
| **Dependencies** | `illuminate/encryption`, `illuminate/hashing`, `illuminate/validation` |
| **When To Use** | Every Laravel project — mandatory security baseline |
| **Source Skeleton** | N/A — patterns applied across existing files |
| **Specialist Type** | code |
| **Purpose** | OWASP security patterns — injection prevention, XSS, CSRF, mass assignment, rate limiting, upload validation, crypto |
| **Activation Trigger** | keywords: security, injection, XSS, CSRF, mass assignment, rate limit, encryption, hash, upload, vulnerability |

---

## Role

You are a **Laravel OWASP Security Specialist**. Your responsibility is to provide best practices for preventing OWASP Top 10 vulnerabilities in Laravel 11 applications — SQL injection, XSS, CSRF, mass assignment, brute force attacks, file upload exploits, and cryptographic failures.

**Used by**: Every code agent working with Laravel — security is a mandatory cross-cutting concern
**Not used by**: Non-Laravel stacks (OWASP principles apply, but patterns are Laravel-specific)

---

## Patterns

### Pattern 335.1: SQL Injection Prevention

**Category**: Injection Prevention
**Description**: Prevent SQL injection using Eloquent ORM, parameterized queries, and safe raw expressions.

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

final class OrderRepository
{
    // SAFE: Eloquent builder — automatically parameterized
    public function findByStatus(string $status): Collection
    {
        return Order::where('status', $status)
            ->where('created_at', '>=', now()->subDays(30))
            ->get();
    }

    // SAFE: Parameterized raw query when Eloquent is insufficient
    public function findByComplexCriteria(string $search, int $minAmount): Collection
    {
        return Order::whereRaw(
            'LOWER(description) LIKE ? AND total_amount >= ?',
            ['%' . mb_strtolower($search) . '%', $minAmount],
        )->get();
    }

    // SAFE: DB::select with bindings
    public function getAggregatedStats(int $userId): array
    {
        return DB::select(
            'SELECT status, COUNT(*) as count, SUM(total_amount) as total
             FROM orders
             WHERE user_id = ? AND deleted_at IS NULL
             GROUP BY status',
            [$userId],
        );
    }

    // DANGEROUS — NEVER do this:
    // Order::whereRaw("status = '$status'")  // Direct interpolation
    // DB::select("SELECT * FROM orders WHERE id = $id")  // No binding
}
```

```php
<?php

declare(strict_types=1);

// SAFE: Dynamic column ordering with whitelist
namespace App\Http\Controllers\Api;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ProductController
{
    private const ALLOWED_SORT_COLUMNS = [
        'name', 'price', 'created_at', 'stock_quantity',
    ];

    private const ALLOWED_SORT_DIRECTIONS = ['asc', 'desc'];

    public function index(Request $request): JsonResponse
    {
        $sortBy = in_array($request->query('sort_by'), self::ALLOWED_SORT_COLUMNS, true)
            ? $request->query('sort_by')
            : 'created_at';

        $sortDir = in_array($request->query('sort_dir'), self::ALLOWED_SORT_DIRECTIONS, true)
            ? $request->query('sort_dir')
            : 'desc';

        $products = Product::orderBy($sortBy, $sortDir)->paginate(20);

        return response()->json($products);
    }
}
```

**Key Points**:
- Eloquent builder methods are always parameterized — use them as the default
- When using `whereRaw()` or `DB::select()`, always pass bindings as the second argument
- Never interpolate user input into SQL strings — even for column names or ORDER BY
- Whitelist allowed column names for dynamic sorting/filtering

---

### Pattern 335.2: XSS Prevention (Blade Escaping)

**Category**: Cross-Site Scripting
**Description**: Prevent XSS attacks using Blade auto-escaping, Content Security Policy headers, and input sanitization.

```php
<?php

declare(strict_types=1);

// Blade templates — auto-escaping

// SAFE: {{ }} auto-escapes HTML entities
// {{ $user->name }}  →  &lt;script&gt;alert(1)&lt;/script&gt;

// DANGEROUS: {!! !!} outputs raw HTML — use only for trusted content
// {!! $article->body !!}  →  only when body is sanitized server-side
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use HTMLPurifier;
use HTMLPurifier_Config;

final class HtmlSanitizer
{
    private readonly HTMLPurifier $purifier;

    public function __construct()
    {
        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,b,i,u,a[href],ul,ol,li,br,h2,h3,h4,blockquote');
        $config->set('HTML.TargetBlank', true);
        $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true]);
        $config->set('Attr.AllowedFrameTargets', ['_blank']);

        $this->purifier = new HTMLPurifier($config);
    }

    public function sanitize(string $html): string
    {
        return $this->purifier->purify($html);
    }
}
```

```php
<?php

declare(strict_types=1);

// Request validation — strip tags and sanitize input
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreCommentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
            'author_name' => ['required', 'string', 'max:100'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'body' => strip_tags($this->input('body', ''), '<b><i><u><a><br>'),
            'author_name' => strip_tags($this->input('author_name', '')),
        ]);
    }
}
```

**Key Points**:
- Blade `{{ }}` auto-escapes — always use this for user-generated content
- Never use `{!! !!}` unless content is sanitized server-side with HTMLPurifier or equivalent
- Sanitize in `prepareForValidation()` before validation rules run
- JSON responses are inherently XSS-safe when `Content-Type: application/json` is set

---

### Pattern 335.3: CSRF Protection

**Category**: Cross-Site Request Forgery
**Description**: Configure CSRF protection for web routes and exclude API/webhook endpoints.

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — CSRF exclusions in Laravel 11
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'webhooks/*',
            'stripe/webhook',
            'api/*', // API routes use Sanctum/Passport tokens, not CSRF
        ]);
    })
    ->create();
```

```php
<?php

declare(strict_types=1);

// Webhook controller with signature verification (replaces CSRF)
namespace App\Http\Controllers\Webhook;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

final class StripeWebhookController
{
    public function handle(Request $request): JsonResponse
    {
        $signature = $request->header('Stripe-Signature');
        $payload = $request->getContent();
        $secret = config('services.stripe.webhook_secret');

        try {
            $event = \Stripe\Webhook::constructEvent(
                payload: $payload,
                sigHeader: $signature,
                secret: $secret,
            );
        } catch (\Stripe\Exception\SignatureVerificationException) {
            throw new AccessDeniedHttpException('Invalid webhook signature.');
        }

        // Process verified event
        return match ($event->type) {
            'payment_intent.succeeded' => $this->handlePaymentSuccess($event),
            'invoice.payment_failed' => $this->handlePaymentFailure($event),
            default => response()->json(['status' => 'ignored']),
        };
    }

    private function handlePaymentSuccess(\Stripe\Event $event): JsonResponse
    {
        // Process payment...
        return response()->json(['status' => 'processed']);
    }

    private function handlePaymentFailure(\Stripe\Event $event): JsonResponse
    {
        // Handle failure...
        return response()->json(['status' => 'processed']);
    }
}
```

**Key Points**:
- Laravel 11 configures CSRF exclusions in `bootstrap/app.php`, not middleware
- Exclude webhook endpoints but verify signatures instead (vendor-specific verification)
- API routes using token auth (Sanctum/Passport) do not need CSRF
- SPA cookie auth DOES need CSRF — Sanctum handles this via `/sanctum/csrf-cookie`

---

### Pattern 335.4: Mass Assignment Protection

**Category**: Broken Access Control
**Description**: Prevent mass assignment vulnerabilities using `$fillable`, `$guarded`, and strict validation.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class User extends Model
{
    use HasFactory;

    // SAFE: Explicit whitelist of mass-assignable attributes
    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar_url',
    ];

    // NEVER mass-assignable — sensitive fields
    // is_admin, role, email_verified_at, balance

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

// SAFE: Validated data passed to create/update
namespace App\Http\Controllers\Api;

use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

final class UserController
{
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        // Only validated fields are passed — not $request->all()
        $user->update($request->validated());

        return response()->json($user);
    }
}
```

```php
<?php

declare(strict_types=1);

// Form Request with strict field validation
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,' . $this->route('user')->id],
            'avatar_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            // is_admin, role, balance — intentionally excluded
        ];
    }
}
```

**Key Points**:
- Always use `$fillable` (whitelist) over `$guarded` (blacklist) — safer by default
- Never use `$request->all()` with `create()` or `update()` — always `$request->validated()`
- Sensitive fields (`is_admin`, `role`, `balance`) must never appear in `$fillable`
- Use Form Requests to validate and whitelist fields before model operations
- PHP 8.3 `readonly` properties add an extra guard against post-construction mutation

---

### Pattern 335.5: Rate Limiting for Brute Force Prevention

**Category**: Security Misconfiguration
**Description**: Configure rate limiting to prevent brute force attacks on login, API, and sensitive endpoints.

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — rate limiter configuration in Laravel 11
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

// Define rate limiters in AppServiceProvider::boot() or bootstrap/app.php
RateLimiter::for('login', function (Request $request): Limit {
    $key = $request->ip() . '|' . mb_strtolower($request->input('email', ''));

    return Limit::perMinute(5)
        ->by($key)
        ->response(function (Request $request, array $headers) {
            return response()->json([
                'message' => 'Too many login attempts. Please try again later.',
                'retry_after' => $headers['Retry-After'] ?? 60,
            ], 429);
        });
});

RateLimiter::for('api', function (Request $request): array {
    return $request->user()
        ? [
            Limit::perMinute(120)->by($request->user()->id),
            Limit::perDay(10000)->by($request->user()->id),
        ]
        : [
            Limit::perMinute(30)->by($request->ip()),
        ];
});

RateLimiter::for('sensitive', function (Request $request): Limit {
    return Limit::perHour(10)
        ->by($request->user()?->id ?: $request->ip())
        ->response(fn () => response()->json([
            'message' => 'Rate limit exceeded for sensitive operations.',
        ], 429));
});
```

```php
<?php

declare(strict_types=1);

// routes/api.php — applying rate limiters
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:login')->group(function (): void {
    Route::post('/login', [\App\Http\Controllers\Auth\LoginController::class, 'store']);
    Route::post('/forgot-password', [\App\Http\Controllers\Auth\ForgotPasswordController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function (): void {
    Route::apiResource('orders', \App\Http\Controllers\Api\OrderController::class);
});

Route::middleware(['auth:sanctum', 'throttle:sensitive'])->group(function (): void {
    Route::post('/change-password', [\App\Http\Controllers\Auth\PasswordController::class, 'update']);
    Route::post('/two-factor/enable', [\App\Http\Controllers\Auth\TwoFactorController::class, 'enable']);
});
```

**Key Points**:
- Rate limit login by IP + email combination to prevent credential stuffing
- Authenticated users get higher limits than anonymous users
- Sensitive operations (password change, 2FA setup) get stricter per-hour limits
- Return `429` with `Retry-After` header for client-side backoff
- Use array of limits for tiered rate limiting (per-minute + per-day)

---

### Pattern 335.6: File Upload Validation

**Category**: Input Validation
**Description**: Validate and secure file uploads to prevent path traversal, MIME spoofing, and malicious file execution.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UploadDocumentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'document' => [
                'required',
                'file',
                'max:10240', // 10MB max
                'mimes:pdf,doc,docx,xlsx,csv',
                'mimetypes:application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
            ],
            'avatar' => [
                'sometimes',
                'file',
                'max:2048', // 2MB max
                'image',
                'dimensions:max_width=2000,max_height=2000',
            ],
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class FileUploadService
{
    public function store(UploadedFile $file, string $directory): string
    {
        // Generate unique filename — never use original filename
        $filename = Str::ulid()->toString() . '.' . $file->getClientOriginalExtension();

        // Store outside web root — use private disk
        $path = $file->storeAs(
            path: $directory,
            name: $filename,
            options: ['disk' => 'private'],
        );

        if ($path === false) {
            throw new \RuntimeException('Failed to store uploaded file.');
        }

        return $path;
    }

    public function getSecureUrl(string $path): string
    {
        // Generate temporary signed URL for private files
        return Storage::disk('private')->temporaryUrl(
            path: $path,
            expiration: now()->addMinutes(30),
        );
    }

    public function delete(string $path): bool
    {
        return Storage::disk('private')->delete($path);
    }
}
```

```php
<?php

declare(strict_types=1);

// config/filesystems.php — private disk configuration
return [
    'disks' => [
        'private' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'visibility' => 'private',
            'throw' => true,
        ],

        's3-private' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'visibility' => 'private',
        ],
    ],
];
```

**Key Points**:
- Validate both `mimes` (extension) and `mimetypes` (actual content type) — prevents MIME spoofing
- Never use original filenames — generate ULIDs or UUIDs to prevent path traversal
- Store uploads outside web root (private disk) — serve via signed URLs or controller
- Set file size limits appropriate to the use case — never allow unlimited uploads
- For images, validate `dimensions` to prevent zip-bomb style decompression attacks

---

### Pattern 335.7: Encryption and Hashing

**Category**: Cryptographic Failures
**Description**: Properly encrypt sensitive data and hash passwords using Laravel's built-in facilities.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

final class UserProfile extends Model
{
    protected $fillable = [
        'user_id',
        'social_security_number',
        'phone_number',
        'date_of_birth',
    ];

    // Laravel 11 attribute encryption via cast
    protected function casts(): array
    {
        return [
            'social_security_number' => 'encrypted',
            'phone_number' => 'encrypted',
            'date_of_birth' => 'encrypted:date',
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;

final class SecurityService
{
    /**
     * Encrypt data at rest — reversible encryption for data that must be read back.
     */
    public function encryptSensitiveData(string $plaintext): string
    {
        return Crypt::encryptString($plaintext);
    }

    public function decryptSensitiveData(string $ciphertext): string
    {
        try {
            return Crypt::decryptString($ciphertext);
        } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
            throw new \RuntimeException('Failed to decrypt data — possible key rotation issue.', 0, $e);
        }
    }

    /**
     * Hash passwords — one-way, cannot be reversed.
     */
    public function hashPassword(string $password): string
    {
        return Hash::make($password, [
            'memory' => 65536,  // 64MB for Argon2id
            'time' => 4,
            'threads' => 1,
        ]);
    }

    public function verifyPassword(string $password, string $hash): bool
    {
        return Hash::check($password, $hash);
    }

    /**
     * HMAC for data integrity — verify data hasn't been tampered with.
     */
    public function generateHmac(string $data): string
    {
        return hash_hmac('sha256', $data, config('app.key'));
    }

    public function verifyHmac(string $data, string $expectedHmac): bool
    {
        return hash_equals($expectedHmac, $this->generateHmac($data));
    }

    /**
     * Generate cryptographically secure tokens.
     */
    public function generateSecureToken(int $length = 64): string
    {
        return bin2hex(random_bytes($length / 2));
    }
}
```

**Key Points**:
- Use `encrypted` cast for automatic model attribute encryption/decryption
- `Crypt::encryptString()` for reversible encryption — use for data you need to read back (SSN, phone)
- `Hash::make()` for irreversible hashing — use for passwords only
- Use `hash_equals()` for timing-safe string comparison — prevents timing attacks
- Argon2id is the default and recommended algorithm for password hashing in PHP 8.3
- Never roll your own crypto — use Laravel/PHP built-in facilities
- `APP_KEY` must be 32 bytes (256-bit) — generate with `php artisan key:generate`

---

## Best Practices

- **Defense in depth** — apply security at every layer (validation, middleware, model, database)
- **Parameterize everything** — never interpolate user input into SQL, shell commands, or file paths
- **Whitelist over blacklist** — `$fillable` over `$guarded`, allowed columns over blocked columns
- **Validate server-side** — client-side validation is UX, not security
- **Encrypt at rest** — use `encrypted` cast for PII (SSN, phone, DOB)
- **Hash passwords with Argon2id** — never MD5, SHA1, or bcrypt with low rounds
- **Rate limit aggressively** — login, password reset, 2FA verification, API endpoints
- **Log security events** — failed logins, authorization failures, rate limit hits
- **Rotate keys** — APP_KEY, API keys, encryption keys on a schedule

---

## Abnormal Case Patterns

1. **SQL injection via dynamic column name** — `orderBy($request->input('sort'))` passes unsanitized column. Fix: whitelist allowed column names with `in_array()` strict check.

2. **XSS via `{!! !!}` on user content** — raw Blade output used for user-generated HTML. Fix: sanitize with HTMLPurifier before storage, or use `{{ }}` auto-escaping.

3. **Mass assignment escalation** — `User::create($request->all())` includes `is_admin` field. Fix: use `$request->validated()` with strict Form Request rules; never use `$request->all()`.

4. **File upload execution** — uploaded `.php` file stored in public directory. Fix: store outside web root, generate random filenames, validate MIME types.

5. **DecryptException after key rotation** — data encrypted with old key cannot be decrypted. Fix: implement key rotation strategy — decrypt with old key, re-encrypt with new key during migration.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (335.1–335.7), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel OWASP Security Specialist — Security | EPS v3.2*

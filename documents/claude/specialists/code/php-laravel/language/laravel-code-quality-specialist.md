# Laravel Code Quality Specialist — Language
# Laravelコード品質スペシャリスト — 言語
# Chuyen Gia Chat Luong Code Laravel — Ngon Ngu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x
**Aspect**: Code Quality
**Category**: language
**Purpose**: Knowledge provider for Laravel code quality tooling — static analysis (PHPStan/Larastan), code style (Pint), automated refactoring (Rector), strict types, coverage metrics, and architectural testing (Pest Arch)

---

## Metadata

```json
{
  "id": "laravel-code-quality-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Code Quality",
  "category": "language",
  "subcategory": "php-laravel",
  "lines": 430,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: PHPStan level 9 — strictest static analysis with Larastan extension for Laravel",
    "E2: Laravel Pint — opinionated code style fixer built on PHP-CS-Fixer",
    "E3: Rector — automated refactoring and PHP version migration"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 356.1–356.6 |
| **Directory Pattern** | project root (`phpstan.neon`, `pint.json`, `rector.php`) |
| **Naming Convention** | Tool-specific config files |
| **Imports From** | N/A (tooling layer) |
| **Imported By** | CI/CD pipelines, pre-commit hooks |
| **Cannot Import** | N/A |
| **Dependencies** | `phpstan/phpstan`, `larastan/larastan`, `laravel/pint`, `rector/rector` |
| **When To Use** | Every Laravel project — enforced quality baseline |
| **Source Skeleton** | `phpstan.neon`, `pint.json`, `rector.php` |
| **Specialist Type** | code |
| **Purpose** | Static analysis, code style, automated refactoring, strict types, coverage, architectural testing |
| **Activation Trigger** | files: `phpstan.neon`, `pint.json`, `rector.php`; keywords: PHPStan, Pint, Rector, code quality, static analysis |
| **Anti-Patterns** | Ignoring PHPStan errors with baselines instead of fixing, disabled strict_types |
| **Related Specialists** | laravel-php-fundamentals-specialist, laravel-design-patterns-specialist |

---

## Role

You are a **Laravel Code Quality Specialist**. Your responsibility is to provide best practices for code quality tooling in Laravel 11+ projects — PHPStan at level 9 with Larastan, Laravel Pint for consistent style, Rector for automated upgrades, strict types enforcement, code coverage strategies, and Pest architectural testing.

**Used by**: Any code agent setting up or maintaining code quality in a Laravel project
**Not used by**: Projects without automated quality gates

---

## Patterns

### Pattern 356.1: PHPStan Level 9 with Larastan

**Category**: Static Analysis
**Description**: Configure PHPStan at maximum strictness with Larastan extension for Laravel-aware analysis.

```neon
# phpstan.neon
includes:
    - vendor/larastan/larastan/extension.neon

parameters:
    level: 9

    paths:
        - app/
        - database/
        - tests/

    excludePaths:
        - app/Console/Kernel.php

    checkMissingIterableValueType: true
    checkGenericClassInNonGenericObjectType: false

    ignoreErrors: []

    tmpDir: storage/phpstan

    reportUnmatchedIgnoredErrors: true
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

final class UserService
{
    /**
     * PHPStan level 9 requires precise generic types.
     *
     * @return Collection<int, User>
     */
    public function getActiveUsers(): Collection
    {
        /** @var Collection<int, User> */
        return User::query()
            ->where('is_active', true)
            ->get();
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateProfile(User $user, array $data): User
    {
        $user->update($data);

        return $user->refresh();
    }
}
```

**Key Points**:
- Level 9 is the strictest — catches mixed types, missing returns, dead code
- Larastan adds Laravel-specific knowledge (Eloquent, facades, config, collections)
- Use `@var` annotations for Eloquent return types PHPStan cannot infer
- Store tmp cache in `storage/phpstan` — add to `.gitignore`
- Run in CI: `vendor/bin/phpstan analyse --memory-limit=512M`
- Avoid baseline files — fix errors instead of suppressing

---

### Pattern 356.2: Laravel Pint Code Style

**Category**: Code Style
**Description**: Configure Laravel Pint for consistent, opinionated code formatting across the project.

```json
// pint.json
{
    "preset": "laravel",
    "rules": {
        "declare_strict_types": true,
        "final_class": true,
        "global_namespace_import": {
            "import_classes": true,
            "import_constants": true,
            "import_functions": true
        },
        "ordered_imports": {
            "sort_algorithm": "alpha",
            "imports_order": [
                "class",
                "function",
                "const"
            ]
        },
        "trailing_comma_in_multiline": {
            "elements": [
                "arguments",
                "arrays",
                "match",
                "parameters"
            ]
        },
        "native_function_invocation": {
            "include": ["@all"],
            "scope": "all",
            "strict": true
        },
        "no_unused_imports": true,
        "single_line_empty_body": true
    },
    "exclude": [
        "bootstrap/cache",
        "storage",
        "vendor"
    ]
}
```

```bash
# Run Pint — auto-fix all files
vendor/bin/pint

# Dry run — show what would change
vendor/bin/pint --test

# Fix specific directory
vendor/bin/pint app/Services/

# Format on pre-commit hook
vendor/bin/pint --dirty
```

**Key Points**:
- `laravel` preset as base — override specific rules as needed
- `declare_strict_types` — ensures every file has strict types declaration
- `final_class` — prevents unintended inheritance (override per-class as needed)
- `trailing_comma_in_multiline` — cleaner git diffs on multi-line constructs
- Run `pint --dirty` in pre-commit hooks — only format changed files
- Integrate in CI as a check: `pint --test` fails if any file needs formatting

---

### Pattern 356.3: Rector Automated Refactoring

**Category**: Automated Refactoring
**Description**: Configure Rector for PHP version upgrades and automated code modernization.

```php
<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\SetList;
use Rector\Laravel\Set\LaravelSetList;
use Rector\TypeDeclaration\Rector\ClassMethod\AddVoidReturnTypeWhereNoReturnRector;
use Rector\DeadCode\Rector\ClassMethod\RemoveUselessParamTagRector;
use Rector\CodingStyle\Rector\Closure\StaticClosureRector;

return RectorConfig::configure()
    ->withPaths([
        __DIR__ . '/app',
        __DIR__ . '/database',
        __DIR__ . '/tests',
    ])
    ->withSkip([
        __DIR__ . '/app/Console/Kernel.php',
    ])
    ->withSets([
        SetList::PHP_83,
        SetList::DEAD_CODE,
        SetList::CODE_QUALITY,
        SetList::TYPE_DECLARATION,
        LaravelSetList::LARAVEL_110,
    ])
    ->withRules([
        AddVoidReturnTypeWhereNoReturnRector::class,
        RemoveUselessParamTagRector::class,
        StaticClosureRector::class,
    ]);
```

```bash
# Preview changes (dry run)
vendor/bin/rector process --dry-run

# Apply refactoring
vendor/bin/rector process

# Process specific file
vendor/bin/rector process app/Services/OrderService.php
```

**Key Points**:
- `SetList::PHP_83` — applies all PHP 8.3 modernization rules (readonly, typed constants)
- `LaravelSetList::LARAVEL_110` — Laravel-specific upgrades (deprecated method replacements)
- `DEAD_CODE` — removes unused methods, parameters, variables
- `TYPE_DECLARATION` — adds return types, property types automatically
- Always run `--dry-run` first, review changes, then apply
- Run Rector before PHPStan — Rector fixes many issues PHPStan would flag

---

### Pattern 356.4: Strict Types Enforcement

**Category**: Type Safety
**Description**: Enforce `declare(strict_types=1)` project-wide with automated verification.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\InvalidAmountException;

final class PricingService
{
    /**
     * Strict types prevent silent type coercion.
     * Without strict_types, passing "100" (string) would silently work.
     * With strict_types, it throws TypeError at runtime.
     */
    public function calculateDiscount(int $priceCents, float $discountRate): int
    {
        if ($discountRate < 0.0 || $discountRate > 1.0) {
            throw new InvalidAmountException(
                "Discount rate must be between 0 and 1, got: {$discountRate}",
            );
        }

        return (int) round($priceCents * (1.0 - $discountRate));
    }

    /**
     * @param array<int, int> $itemPrices
     */
    public function calculateTotal(array $itemPrices, int $taxRateBps = 1000): int
    {
        $subtotal = array_sum($itemPrices);
        $tax = (int) round($subtotal * $taxRateBps / 10_000);

        return $subtotal + $tax;
    }
}
```

```php
<?php

declare(strict_types=1);

// tests/Unit/StrictTypesVerificationTest.php
namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Finder\Finder;

final class StrictTypesVerificationTest extends TestCase
{
    public function test_all_php_files_declare_strict_types(): void
    {
        $finder = (new Finder())
            ->files()
            ->name('*.php')
            ->in([
                base_path('app'),
                base_path('database'),
                base_path('tests'),
            ])
            ->notPath('vendor');

        foreach ($finder as $file) {
            $contents = $file->getContents();
            $this->assertStringContainsString(
                'declare(strict_types=1)',
                $contents,
                "Missing strict_types in: {$file->getRelativePathname()}",
            );
        }
    }
}
```

**Key Points**:
- `declare(strict_types=1)` must be the first statement after `<?php`
- Strict types affect the calling file, not the called function's file
- Prevents silent string-to-int coercion — catches bugs early
- Enforce via Pint rule (`declare_strict_types`), Rector rule, and a verification test
- Exception: some Laravel generated files (migrations, seeders) may omit strict types

---

### Pattern 356.5: Code Coverage Strategy

**Category**: Testing Metrics
**Description**: Configure code coverage thresholds and reporting for meaningful quality metrics.

```xml
<!-- phpunit.xml — coverage configuration -->
<phpunit>
    <source>
        <include>
            <directory>app</directory>
        </include>
        <exclude>
            <directory>app/Console</directory>
            <directory>app/Exceptions</directory>
            <directory>app/Http/Middleware</directory>
            <file>app/Providers/AppServiceProvider.php</file>
        </exclude>
    </source>

    <coverage>
        <report>
            <html outputDirectory="storage/coverage/html"/>
            <clover outputFile="storage/coverage/clover.xml"/>
            <text outputFile="php://stdout" showOnlySummary="true"/>
        </report>
    </coverage>
</phpunit>
```

```bash
# Generate coverage report
XDEBUG_MODE=coverage php artisan test --coverage --min=80

# Coverage with specific test suite
XDEBUG_MODE=coverage vendor/bin/phpunit --testsuite=Unit --coverage-html=storage/coverage

# CI pipeline — fail if coverage drops below threshold
XDEBUG_MODE=coverage vendor/bin/phpunit --coverage-clover=storage/coverage/clover.xml
```

```php
<?php

declare(strict_types=1);

// pest.php — Pest coverage configuration
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

pest()
    ->extend(Tests\TestCase::class)
    ->use(LazilyRefreshDatabase::class)
    ->in('Feature');

// Coverage minimum thresholds
pest()->coverage()
    ->min(80)
    ->processUncoveredFiles();
```

**Key Points**:
- Target 80% minimum coverage — diminishing returns above 90%
- Exclude framework boilerplate (Console/Kernel, generated middleware) from coverage
- Focus coverage on domain logic (Services, Actions, ValueObjects) not framework glue
- Use `LazilyRefreshDatabase` in Pest for faster feature tests
- CI should fail on coverage regression — track trends, not just thresholds
- Use `--min=80` flag for hard enforcement in CI pipelines

---

### Pattern 356.6: Architectural Testing with Pest Arch

**Category**: Architectural Testing
**Description**: Enforce architectural rules as automated tests using Pest's `arch()` testing API.

```php
<?php

declare(strict_types=1);

// tests/Architecture/ArchitectureTest.php

arch('controllers should not have public methods except actions')
    ->expect('App\Http\Controllers')
    ->toBeClasses()
    ->toBeFinal()
    ->toExtendNothing();

arch('models should extend Eloquent Model')
    ->expect('App\Models')
    ->toExtend('Illuminate\Database\Eloquent\Model');

arch('services should be final and readonly')
    ->expect('App\Services')
    ->toBeFinal();

arch('value objects should be readonly')
    ->expect('App\ValueObjects')
    ->toBeReadonly();

arch('contracts should be interfaces')
    ->expect('App\Contracts')
    ->toBeInterfaces();

arch('no env() calls outside config files')
    ->expect('env')
    ->not->toBeUsedIn('App');

arch('domain should not depend on infrastructure')
    ->expect('App\Domain')
    ->not->toBeUsedIn('App\Infrastructure');

arch('DTOs should be readonly and final')
    ->expect('App\DTOs')
    ->toBeFinal()
    ->toBeReadonly();

arch('enums should be backed with string or int')
    ->expect('App\Enums')
    ->toBeEnums();

arch('actions should have single __invoke method')
    ->expect('App\Actions')
    ->toBeFinal()
    ->toHaveMethod('__invoke');

arch('no dd or dump calls in production code')
    ->expect(['dd', 'dump', 'ray'])
    ->not->toBeUsed();

arch('strict types declared everywhere')
    ->expect('App')
    ->toUseStrictTypes();
```

**Key Points**:
- Pest `arch()` tests enforce architectural decisions as automated checks
- Run in CI — architectural violations fail the build
- Test layer dependencies: domain cannot depend on infrastructure
- Enforce class modifiers: final, readonly, abstract as required by convention
- Ban debug functions (`dd`, `dump`, `ray`) from production code
- `toUseStrictTypes()` — verifies `declare(strict_types=1)` in all files

---

## Best Practices

- **PHPStan level 9 from day one** — retrofitting is harder than starting strict
- **Pint on every commit** — automate via pre-commit hook, never debate formatting
- **Rector before major upgrades** — run PHP version sets to automate migration
- **Coverage as a trend** — track direction, not just a number; 80% is a good baseline
- **Arch tests for team contracts** — codify architectural decisions as executable tests
- **CI pipeline order** — Pint (format) → PHPStan (analyze) → Rector (check) → Tests (verify)
- **Fix, don't suppress** — avoid PHPStan baselines and `@phpstan-ignore` unless truly unavoidable
- **Type everything** — properties, parameters, return types, generics for collections

---

## Abnormal Case Patterns

1. **PHPStan false positives with Eloquent** — dynamic properties and magic methods confuse PHPStan. Fix: install Larastan extension, use `@var` annotations for complex queries.

2. **Pint conflicts with team IDE settings** — IDE auto-format fights with Pint rules. Fix: share `.editorconfig` and disable IDE formatting for PHP files; let Pint be the single source.

3. **Rector breaks working code** — automated refactoring introduces runtime errors. Fix: always `--dry-run` first, review diffs, run full test suite after applying changes.

4. **Coverage gaming** — writing tests that touch code without asserting behavior. Fix: enforce mutation testing (Infection PHP) alongside coverage to verify test quality.

5. **Arch test false sense of security** — architectural tests pass but design is poor. Fix: arch tests enforce structure, not quality; combine with code review and design patterns.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (356.1–356.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Code Quality Specialist — Language | EPS v3.2*

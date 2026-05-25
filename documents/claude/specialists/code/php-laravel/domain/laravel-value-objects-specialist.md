# Laravel Value Objects Specialist — Domain
# Laravel値オブジェクトスペシャリスト — ドメイン
# Chuyen Gia Value Object Laravel — Domain

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Value Objects
**Aspect**: Value Objects
**Category**: domain
**Purpose**: Knowledge provider for immutable value objects — readonly classes, Money/Email/Address patterns, equality semantics, immutable collections, and Eloquent cast integration

---

## Metadata

```json
{
  "id": "laravel-value-objects-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Value Objects",
  "aspect": "Value Objects",
  "category": "domain",
  "subcategory": "php-laravel",
  "lines": 460,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: DDD value object semantics — equality by value, immutability, side-effect free (Evans 2003)",
    "E2: PHP 8.2+ readonly classes — language-level immutability guarantee",
    "E3: Laravel Eloquent custom casts — CastsAttributes interface for VO persistence"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Variant** | ALL |
| **Pattern Numbers** | 325.1–325.6 |
| **Directory Pattern** | `app/Domain/{Feature}/ValueObjects/` |
| **Naming Convention** | `{Name}.php` (e.g., Money.php, EmailAddress.php) |
| **Imports From** | none (pure domain — no framework dependencies) |
| **Imported By** | Domain (entities), Infrastructure (casts, mappers) |
| **Cannot Import** | Eloquent, Illuminate, any framework package |
| **Dependencies** | none (pure PHP) |
| **When To Use** | Any domain concept defined by its attributes rather than identity |
| **Source Skeleton** | `app/Domain/{Feature}/ValueObjects/{Name}.php` |
| **Specialist Type** | code |
| **Purpose** | Immutable value objects — money, email, address, equality by value, Eloquent cast bridge |
| **Activation Trigger** | files: `app/Domain/*/ValueObjects/*.php`; keywords: ValueObject, readonly class, Money, EmailAddress, immutable |

---

## Role

You are a **Laravel Value Objects Specialist**. Your responsibility is to provide best practices for immutable value objects in PHP 8.3 domain layers — readonly classes, self-validating construction, equality by value, Money and email/address patterns, immutable collections, and bridging value objects to Eloquent via custom casts.

**Used by**: Any code agent building domain value objects in Laravel applications
**Not used by**: CRUD apps without explicit domain layer, projects using raw primitives for domain concepts

---

## Patterns

### Pattern 325.1: Value Object with Readonly Class

**Category**: VO Fundamentals
**Description**: Base value object pattern using PHP 8.3 readonly class with self-validation and equality.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shared\ValueObjects;

abstract readonly class ValueObject
{
    abstract public function equals(self $other): bool;

    abstract public function toString(): string;

    public function __toString(): string
    {
        return $this->toString();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Domain\Product\ValueObjects;

final readonly class ProductName
{
    public const int MIN_LENGTH = 2;
    public const int MAX_LENGTH = 255;

    public function __construct(
        private string $value,
    ) {
        $trimmed = trim($value);

        if (mb_strlen($trimmed) < self::MIN_LENGTH) {
            throw new \InvalidArgumentException(
                "Product name must be at least " . self::MIN_LENGTH . " characters.",
            );
        }

        if (mb_strlen($trimmed) > self::MAX_LENGTH) {
            throw new \InvalidArgumentException(
                "Product name must not exceed " . self::MAX_LENGTH . " characters.",
            );
        }

        $this->value = $trimmed;
    }

    public function value(): string
    {
        return $this->value;
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function toString(): string
    {
        return $this->value;
    }
}
```

**Key Points**:
- `readonly class` guarantees all properties are immutable after construction
- Constructor validates and normalizes input — object is always in a valid state
- `equals()` compares by value, not by reference (`===` on primitives, not `==` on objects)
- PHP 8.3 typed class constants (`const int`) for validation boundaries

---

### Pattern 325.2: Money Value Object

**Category**: Financial Domain
**Description**: Money value object storing amount in smallest currency unit (cents) to avoid floating-point errors.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shared\ValueObjects;

final readonly class Money
{
    public function __construct(
        private int $amountInCents,
        private string $currency,
    ) {
        if (mb_strlen($currency) !== 3) {
            throw new \InvalidArgumentException(
                "Currency must be a 3-letter ISO 4217 code, got: {$currency}.",
            );
        }
    }

    public static function of(int $amountInCents, string $currency): self
    {
        return new self($amountInCents, strtoupper($currency));
    }

    public static function zero(string $currency): self
    {
        return new self(0, strtoupper($currency));
    }

    public static function fromDecimal(float $amount, string $currency): self
    {
        return new self(
            amountInCents: (int) round($amount * 100),
            currency: strtoupper($currency),
        );
    }

    public function add(self $other): self
    {
        $this->guardSameCurrency($other);

        return new self($this->amountInCents + $other->amountInCents, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->guardSameCurrency($other);

        return new self($this->amountInCents - $other->amountInCents, $this->currency);
    }

    public function multiply(int $factor): self
    {
        return new self($this->amountInCents * $factor, $this->currency);
    }

    public function greaterThan(self $other): bool
    {
        $this->guardSameCurrency($other);

        return $this->amountInCents > $other->amountInCents;
    }

    public function isNegative(): bool
    {
        return $this->amountInCents < 0;
    }

    public function amountInCents(): int
    {
        return $this->amountInCents;
    }

    public function currency(): string
    {
        return $this->currency;
    }

    public function toDecimal(): float
    {
        return $this->amountInCents / 100;
    }

    public function equals(self $other): bool
    {
        return $this->amountInCents === $other->amountInCents
            && $this->currency === $other->currency;
    }

    public function toString(): string
    {
        return sprintf('%s %.2f', $this->currency, $this->toDecimal());
    }

    private function guardSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new \DomainException(
                "Cannot operate on different currencies: {$this->currency} vs {$other->currency}.",
            );
        }
    }
}
```

**Key Points**:
- Store amount as integer cents — never use `float` for money arithmetic
- Currency guard prevents accidental cross-currency operations
- All arithmetic returns new instances — original is never mutated
- `fromDecimal()` rounds properly for user-facing input; `amountInCents()` for storage

---

### Pattern 325.3: Email and Address Value Objects

**Category**: Contact Domain
**Description**: Self-validating email and address value objects with normalization.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Customer\ValueObjects;

final readonly class EmailAddress
{
    public function __construct(
        private string $value,
    ) {
        $normalized = mb_strtolower(trim($value));

        if (!filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException(
                "Invalid email address: {$value}.",
            );
        }

        $this->value = $normalized;
    }

    public static function fromString(string $email): self
    {
        return new self($email);
    }

    public function value(): string
    {
        return $this->value;
    }

    public function domain(): string
    {
        return mb_substr($this->value, mb_strpos($this->value, '@') + 1);
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function toString(): string
    {
        return $this->value;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shipping\ValueObjects;

final readonly class Address
{
    public function __construct(
        private string $street,
        private string $city,
        private string $state,
        private string $postalCode,
        private string $countryCode,
    ) {
        if (mb_strlen($countryCode) !== 2) {
            throw new \InvalidArgumentException(
                "Country code must be ISO 3166-1 alpha-2, got: {$countryCode}.",
            );
        }

        foreach (['street', 'city', 'postalCode'] as $field) {
            if (trim($this->$field) === '') {
                throw new \InvalidArgumentException("{$field} cannot be empty.");
            }
        }
    }

    public function street(): string
    {
        return $this->street;
    }

    public function city(): string
    {
        return $this->city;
    }

    public function fullAddress(): string
    {
        return implode(', ', [
            $this->street,
            $this->city,
            $this->state,
            $this->postalCode,
            $this->countryCode,
        ]);
    }

    public function equals(self $other): bool
    {
        return $this->street === $other->street
            && $this->city === $other->city
            && $this->state === $other->state
            && $this->postalCode === $other->postalCode
            && $this->countryCode === $other->countryCode;
    }

    /**
     * @return array{street: string, city: string, state: string, postalCode: string, countryCode: string}
     */
    public function toArray(): array
    {
        return [
            'street' => $this->street,
            'city' => $this->city,
            'state' => $this->state,
            'postalCode' => $this->postalCode,
            'countryCode' => $this->countryCode,
        ];
    }
}
```

**Key Points**:
- EmailAddress normalizes to lowercase on construction — consistent equality checks
- Address validates all required fields in constructor — never partially valid
- `equals()` compares all constituent fields, not object reference
- `toArray()` supports serialization without exposing internal state via public properties

---

### Pattern 325.4: Value Object Equality

**Category**: Equality Semantics
**Description**: Equality comparison patterns for value objects — same type, same values.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shared\ValueObjects;

final readonly class DateRange
{
    public function __construct(
        private \DateTimeImmutable $start,
        private \DateTimeImmutable $end,
    ) {
        if ($end <= $start) {
            throw new \InvalidArgumentException(
                'End date must be after start date.',
            );
        }
    }

    public function start(): \DateTimeImmutable
    {
        return $this->start;
    }

    public function end(): \DateTimeImmutable
    {
        return $this->end;
    }

    public function contains(\DateTimeImmutable $date): bool
    {
        return $date >= $this->start && $date <= $this->end;
    }

    public function overlaps(self $other): bool
    {
        return $this->start < $other->end && $other->start < $this->end;
    }

    public function durationInDays(): int
    {
        return (int) $this->start->diff($this->end)->days;
    }

    public function equals(self $other): bool
    {
        return $this->start->getTimestamp() === $other->start->getTimestamp()
            && $this->end->getTimestamp() === $other->end->getTimestamp();
    }

    public function toString(): string
    {
        return sprintf(
            '%s to %s',
            $this->start->format('Y-m-d'),
            $this->end->format('Y-m-d'),
        );
    }
}
```

**Key Points**:
- Equality compares timestamps, not object references — two ranges with same dates are equal
- `overlaps()` is domain behavior that belongs on the VO, not in a service
- `DateTimeImmutable` ensures immutability — `DateTime` would allow external mutation
- Constructor invariant: end must be after start — enforced at creation time

---

### Pattern 325.5: Immutable Collections

**Category**: Collection Patterns
**Description**: Type-safe immutable collections wrapping arrays of value objects.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Order\ValueObjects;

use App\Domain\Order\Entities\OrderLineItem;

final readonly class LineItemCollection
{
    /** @var array<int, OrderLineItem> */
    private array $items;

    /**
     * @param array<int, OrderLineItem> $items
     */
    private function __construct(array $items)
    {
        $this->items = array_values($items);
    }

    public static function empty(): self
    {
        return new self([]);
    }

    /**
     * @param array<int, OrderLineItem> $items
     */
    public static function fromArray(array $items): self
    {
        return new self($items);
    }

    public function add(OrderLineItem $item): self
    {
        return new self([...$this->items, $item]);
    }

    public function remove(int $index): self
    {
        $filtered = array_filter(
            $this->items,
            fn (int $key): bool => $key !== $index,
            ARRAY_FILTER_USE_KEY,
        );

        return new self($filtered);
    }

    public function count(): int
    {
        return count($this->items);
    }

    public function isEmpty(): bool
    {
        return $this->items === [];
    }

    public function totalAmount(): Money
    {
        return array_reduce(
            $this->items,
            fn (Money $carry, OrderLineItem $item): Money => $carry->add($item->subtotal()),
            Money::zero('USD'),
        );
    }

    /**
     * @return array<int, OrderLineItem>
     */
    public function toArray(): array
    {
        return $this->items;
    }

    /**
     * @param callable(OrderLineItem): bool $predicate
     */
    public function filter(callable $predicate): self
    {
        return new self(array_filter($this->items, $predicate));
    }
}
```

**Key Points**:
- `add()` and `remove()` return new collection instances — original unchanged
- Private constructor + static factories enforce controlled creation
- `readonly class` prevents reassignment of the internal array property
- Domain-specific methods (`totalAmount()`) encode business logic on the collection itself

---

### Pattern 325.6: Eloquent Casts for Value Objects

**Category**: Infrastructure Bridge
**Description**: Custom Eloquent casts that bridge domain value objects to database columns. NOTE: Cast classes live in Infrastructure, not Domain.

```php
<?php

declare(strict_types=1);

// Infrastructure layer — NOT in app/Domain/
namespace App\Infrastructure\Eloquent\Casts;

use App\Domain\Shared\ValueObjects\Money;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * @implements CastsAttributes<Money, Money>
 */
final class MoneyCast implements CastsAttributes
{
    public function __construct(
        private readonly string $currency = 'USD',
    ) {}

    /**
     * @param Model $model
     * @param string $key
     * @param mixed $value
     * @param array<string, mixed> $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?Money
    {
        if ($value === null) {
            return null;
        }

        return Money::of(
            amountInCents: (int) $value,
            currency: $attributes["{$key}_currency"] ?? $this->currency,
        );
    }

    /**
     * @param Model $model
     * @param string $key
     * @param Money|null $value
     * @param array<string, mixed> $attributes
     * @return array<string, mixed>
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): array
    {
        if ($value === null) {
            return [$key => null];
        }

        if (!$value instanceof Money) {
            throw new \InvalidArgumentException("Value must be an instance of Money.");
        }

        return [
            $key => $value->amountInCents(),
            "{$key}_currency" => $value->currency(),
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Casts;

use App\Domain\Customer\ValueObjects\EmailAddress;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * @implements CastsAttributes<EmailAddress, EmailAddress>
 */
final class EmailAddressCast implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?EmailAddress
    {
        return $value !== null ? EmailAddress::fromString($value) : null;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        if (!$value instanceof EmailAddress) {
            throw new \InvalidArgumentException("Value must be an instance of EmailAddress.");
        }

        return $value->value();
    }
}
```

```php
<?php

// Usage in Eloquent model (Infrastructure layer)
namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Casts\MoneyCast;
use App\Infrastructure\Eloquent\Casts\EmailAddressCast;
use Illuminate\Database\Eloquent\Model;

final class OrderModel extends Model
{
    protected $table = 'orders';

    protected function casts(): array
    {
        return [
            'total_amount' => MoneyCast::class . ':USD',
            'customer_email' => EmailAddressCast::class,
        ];
    }
}
```

**Key Points**:
- Cast classes live in `App\Infrastructure\Eloquent\Casts\`, NOT in the domain layer
- Domain value objects remain framework-free; casts are the bridge
- `get()` hydrates VO from database; `set()` dehydrates VO to database columns
- Multi-column casts (Money with currency) return arrays from `set()`

---

## Best Practices

- **Immutability is non-negotiable** — use `readonly class` (PHP 8.2+) for all value objects
- **Validate in constructor** — value objects must reject invalid data at creation time
- **Equality by value** — implement `equals()` comparing all constituent fields
- **No identity** — value objects have no ID; two Money(100, 'USD') are the same thing
- **Operations return new instances** — `$money->add($other)` returns a new Money, never mutates
- **Store in smallest unit** — Money in cents, weight in grams — avoid floating-point arithmetic
- **Casts in Infrastructure** — Eloquent casts bridge VO to database; domain layer stays pure
- **Named constructors for clarity** — `Money::fromDecimal(19.99, 'USD')` over `new Money(1999, 'USD')`
- **Keep VOs small** — 1-5 properties; if larger, it might be an entity

---

## Abnormal Case Patterns

1. **Mutable value object** — properties without `readonly`, setters present. Fix: use `readonly class` and return new instances from operations.

2. **Float-based money** — `$amount = 19.99` causes rounding errors in arithmetic. Fix: store as integer cents; use `Money::fromDecimal()` only for input conversion.

3. **Equality by reference** — `$a === $b` on value objects returns false even with same values. Fix: implement `equals()` method; never use `===` for VO comparison.

4. **Cast in domain namespace** — `App\Domain\Order\Casts\MoneyCast` imports Eloquent. Fix: move to `App\Infrastructure\Eloquent\Casts\` — domain must not depend on framework.

5. **Missing validation** — `new EmailAddress('')` creates invalid VO. Fix: validate in constructor, throw `InvalidArgumentException` for invalid input.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (325.1–325.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Value Objects Specialist — Domain | EPS v3.2*

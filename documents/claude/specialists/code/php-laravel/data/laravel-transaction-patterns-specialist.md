# Laravel Transaction Patterns Specialist — Data
# Laravel トランザクションパターンスペシャリスト — データ
# Chuyen Gia Transaction Patterns Laravel — Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Database Transactions
**Aspect**: Transaction Management
**Category**: data
**Purpose**: Knowledge provider for Laravel transaction architecture — closure transactions, manual transactions, savepoints, distributed transactions, deadlock retry, and optimistic locking

---

## Metadata

```json
{
  "id": "laravel-transaction-patterns-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Database Transactions",
  "aspect": "Transaction Management",
  "category": "data",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel DB::transaction closure — automatic commit/rollback with retry support",
    "E2: Savepoints — nested transaction support via incrementing transaction level",
    "E3: Optimistic locking — version-based concurrency control without DB locks"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 321.1–321.6 |
| **Directory Pattern** | `app/Services/`, `app/Repositories/` |
| **Naming Convention** | `{Domain}Service.php`, `{Entity}Repository.php` |
| **Imports From** | Domain (models, exceptions), Infrastructure (DB facade) |
| **Imported By** | Application (controllers, commands, jobs) |
| **Cannot Import** | Controllers, Requests |
| **Dependencies** | `illuminate/database` |
| **When To Use** | Multi-step operations requiring atomicity, concurrent data access, financial operations |
| **Source Skeleton** | `app/Services/{Domain}Service.php` |
| **Specialist Type** | code |
| **Purpose** | Transaction patterns — closure, manual, savepoints, distributed, deadlock retry, optimistic locking |
| **Activation Trigger** | files: `app/Services/*.php`, `app/Repositories/*.php`; keywords: transaction, DB::transaction, beginTransaction, savepoint, deadlock, optimistic lock |

---

## Role

You are a **Laravel Transaction Patterns Specialist**. Your responsibility is to provide best practices for PHP 8.3 + Laravel 11 transaction management — DB::transaction closure pattern, manual transaction control, nested transactions with savepoints, distributed transactions across connections, deadlock retry strategies, and optimistic locking for concurrency control.

**Used by**: Any code agent working with multi-step database operations requiring atomicity
**Not used by**: Non-Laravel stacks, read-only applications, single-query operations

---

## Patterns

### Pattern 321.1: DB::transaction Closure

**Category**: Atomic Operations
**Description**: Closure-based transaction with automatic commit on success and rollback on exception.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

final readonly class OrderService
{
    /**
     * Create order with items — all-or-nothing.
     *
     * @param array<int, array{product_id: int, quantity: int}> $items
     */
    public function placeOrder(int $userId, array $items): Order
    {
        return DB::transaction(function () use ($userId, $items): Order {
            $order = Order::create([
                'user_id' => $userId,
                'status' => 'pending',
                'total_amount' => 0,
            ]);

            $totalAmount = 0;

            foreach ($items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                if ($product->stock_quantity < $item['quantity']) {
                    throw new \DomainException(
                        "Insufficient stock for product {$product->name}.",
                    );
                }

                $product->decrement('stock_quantity', $item['quantity']);

                $lineTotal = $product->price * $item['quantity'];

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->price,
                    'line_total' => $lineTotal,
                ]);

                $totalAmount += $lineTotal;
            }

            $order->update(['total_amount' => $totalAmount]);

            return $order;
        });
    }
}
```

**Key Points**:
- `DB::transaction()` auto-commits on successful return, auto-rollbacks on exception
- `lockForUpdate()` acquires row-level lock — prevents concurrent stock modification
- Throw exceptions inside closure to trigger rollback — never catch and swallow
- Return value from closure is returned by `DB::transaction()`
- Closure captures variables via `use` — keep the closure focused on DB operations

---

### Pattern 321.2: Manual Transactions

**Category**: Explicit Control
**Description**: Manual transaction control for complex flows with conditional commit/rollback.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Payment;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final readonly class PaymentService
{
    public function __construct(
        private \App\Contracts\PaymentGatewayInterface $gateway,
    ) {}

    /**
     * Process payment with external gateway — manual transaction for control.
     */
    public function processPayment(Order $order): Payment
    {
        DB::beginTransaction();

        try {
            $payment = Payment::create([
                'order_id' => $order->id,
                'amount' => $order->total_amount,
                'status' => 'processing',
            ]);

            $order->update(['status' => 'payment_processing']);

            // External API call — may fail after DB writes
            $gatewayResult = $this->gateway->charge(
                amount: $order->total_amount,
                currency: $order->currency,
                reference: $payment->id,
            );

            $payment->update([
                'status' => 'completed',
                'gateway_transaction_id' => $gatewayResult->transactionId,
            ]);

            $order->update(['status' => 'paid']);

            DB::commit();

            return $payment;
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('Payment failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
```

**Key Points**:
- `DB::beginTransaction()` / `DB::commit()` / `DB::rollBack()` for explicit control
- Use manual transactions when external API calls are interleaved with DB writes
- Always wrap in try/catch — rollback on any exception, then re-throw
- Log context before re-throwing for debugging failed transactions
- Prefer `DB::transaction()` closure for simpler flows — manual for complex ones

---

### Pattern 321.3: Nested Transactions — Savepoints

**Category**: Composability
**Description**: Nested transactions using database savepoints for partial rollback within a larger transaction.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final readonly class OrderFulfillmentService
{
    public function __construct(
        private \App\Services\InventoryService $inventory,
        private \App\Services\ShippingService $shipping,
    ) {}

    /**
     * Fulfill order — nested transactions for partial failure handling.
     */
    public function fulfill(Order $order): void
    {
        DB::transaction(function () use ($order): void {
            // Outer transaction: order status update
            $order->update(['status' => 'fulfilling']);

            // Nested transaction (savepoint): inventory reservation
            DB::transaction(function () use ($order): void {
                $this->inventory->reserve($order);
            });

            // Nested transaction (savepoint): shipping label
            try {
                DB::transaction(function () use ($order): void {
                    $this->shipping->createLabel($order);
                });
            } catch (\App\Exceptions\ShippingUnavailableException $e) {
                // Shipping savepoint rolled back — but outer transaction continues
                Log::warning('Shipping label deferred', [
                    'order_id' => $order->id,
                    'reason' => $e->getMessage(),
                ]);
                $order->update(['shipping_status' => 'label_pending']);
            }

            $order->update(['status' => 'fulfilled']);
        });
    }
}
```

**Key Points**:
- Laravel uses savepoints for nested `DB::transaction()` calls — not real nested transactions
- Inner transaction rollback only undoes the savepoint — outer transaction continues
- `DB::transactionLevel()` returns current nesting depth (0 = no transaction)
- Catch specific exceptions from inner transactions for partial failure handling
- Each `DB::transaction()` call increments `SAVEPOINT trans_N`

---

### Pattern 321.4: Distributed Transactions

**Category**: Multi-Database
**Description**: Coordinated transactions across multiple database connections.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final readonly class CrossDatabaseTransferService
{
    /**
     * Transfer data between two databases — coordinated commit.
     * Note: This is best-effort, not true 2PC (two-phase commit).
     */
    public function transferOrder(int $orderId): void
    {
        $primaryDb = DB::connection('mysql');
        $archiveDb = DB::connection('mysql_archive');

        $primaryDb->beginTransaction();
        $archiveDb->beginTransaction();

        try {
            // Read from primary
            $order = $primaryDb->table('orders')->where('id', $orderId)->first();

            if (! $order) {
                throw new \RuntimeException("Order {$orderId} not found.");
            }

            // Write to archive
            $archiveDb->table('archived_orders')->insert((array) $order);

            // Delete from primary
            $primaryDb->table('orders')->where('id', $orderId)->delete();

            // Commit both — archive first (safer: duplicate > loss)
            $archiveDb->commit();
            $primaryDb->commit();
        } catch (\Throwable $e) {
            $archiveDb->rollBack();
            $primaryDb->rollBack();

            Log::error('Cross-database transfer failed', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
```

**Key Points**:
- Laravel does not support true 2PC — this is a best-effort coordinated commit
- Commit the "receiving" database first — on failure, you have a duplicate (recoverable) not data loss
- Rollback both connections on any exception
- For true distributed transactions, use a message queue + saga pattern instead
- Each connection manages its own transaction independently

---

### Pattern 321.5: Deadlock Retry

**Category**: Concurrency
**Description**: Automatic retry on deadlock detection with configurable attempts.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Account;
use Illuminate\Support\Facades\DB;

final readonly class AccountTransferService
{
    /**
     * Transfer funds between accounts — with deadlock retry.
     * DB::transaction accepts $attempts parameter for automatic retry.
     */
    public function transfer(int $fromId, int $toId, float $amount): void
    {
        DB::transaction(function () use ($fromId, $toId, $amount): void {
            // Lock in consistent order to minimize deadlock probability
            $ids = [$fromId, $toId];
            sort($ids);

            $accounts = Account::query()
                ->whereIn('id', $ids)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $from = $accounts->get($fromId);
            $to = $accounts->get($toId);

            if (! $from || ! $to) {
                throw new \DomainException('One or both accounts not found.');
            }

            if ($from->balance < $amount) {
                throw new \DomainException(
                    "Insufficient balance: {$from->balance} < {$amount}",
                );
            }

            $from->decrement('balance', $amount);
            $to->increment('balance', $amount);
        }, attempts: 3); // Retry up to 3 times on deadlock
    }
}
```

**Key Points**:
- `DB::transaction($callback, attempts: 3)` retries on deadlock up to N times
- Lock rows in consistent order (sorted IDs) to reduce deadlock probability
- Laravel detects deadlock via MySQL error 1213 / PostgreSQL error 40P01
- Each retry re-executes the entire closure — ensure closure is idempotent
- The `attempts` parameter only handles deadlocks — other exceptions are thrown immediately

---

### Pattern 321.6: Optimistic Locking

**Category**: Concurrency
**Description**: Version-based concurrency control without database locks — detect and reject stale updates.

```php
<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait HasOptimisticLocking
{
    public function initializeHasOptimisticLocking(): void
    {
        $this->fillable[] = 'version';
    }

    /**
     * Override save to enforce version check.
     */
    public function saveWithVersion(array $options = []): bool
    {
        if (! $this->exists) {
            $this->version = 1;
            return $this->save($options);
        }

        $currentVersion = $this->version;
        $this->version = $currentVersion + 1;

        $affected = static::query()
            ->where('id', $this->id)
            ->where('version', $currentVersion)
            ->update($this->getDirty());

        if ($affected === 0) {
            throw new \App\Exceptions\StaleModelException(
                "Model " . static::class . " #{$this->id} was modified by another process.",
            );
        }

        $this->syncOriginal();
        return true;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\StaleModelException;
use App\Models\Product;

final readonly class ProductUpdateService
{
    /**
     * Update product with optimistic locking — retry on conflict.
     */
    public function updatePrice(int $productId, float $newPrice, int $maxRetries = 3): Product
    {
        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            $product = Product::findOrFail($productId);
            $product->price = $newPrice;

            try {
                $product->saveWithVersion();
                return $product;
            } catch (StaleModelException $e) {
                if ($attempt === $maxRetries) {
                    throw $e;
                }
                // Re-fetch and retry
                continue;
            }
        }

        throw new \RuntimeException('Unreachable');
    }
}
```

**Key Points**:
- Optimistic locking uses a `version` column — no database row locks held
- `WHERE version = N` ensures only one writer succeeds — losers get 0 affected rows
- Better performance than pessimistic locks for low-contention scenarios
- Retry loop re-fetches fresh data on each attempt
- Add `$table->unsignedInteger('version')->default(1)` to migration

---

## Best Practices

- **Prefer closure transactions** — `DB::transaction()` is safer than manual begin/commit
- **Lock in consistent order** — sort row IDs before `lockForUpdate()` to prevent deadlocks
- **Set retry attempts** — `DB::transaction($fn, attempts: 3)` for deadlock-prone operations
- **Keep transactions short** — exclude external API calls, file I/O, and long computations
- **Optimistic for low contention** — use version-based locking when conflicts are rare
- **Pessimistic for high contention** — use `lockForUpdate()` when conflicts are frequent
- **Log transaction failures** — include order IDs, amounts, and error context for debugging
- **Test concurrency** — use parallel PHPUnit processes or concurrent artisan commands

---

## Abnormal Case Patterns

1. **Transaction timeout** — long-running transaction holds locks, blocking other queries. Fix: keep transactions under 5 seconds; move heavy computation outside the transaction.

2. **Swallowed exception in transaction** — catch block prevents rollback by not re-throwing. Fix: always re-throw after logging, or use `DB::transaction()` closure which auto-rollbacks.

3. **External API inside transaction** — API timeout causes transaction to hold locks for seconds. Fix: move API call outside transaction, or use saga pattern with compensating actions.

4. **Savepoint confusion** — developer assumes nested `DB::transaction()` is independent; inner rollback releases savepoint but outer transaction continues with partial state. Fix: understand savepoint semantics; test nested scenarios explicitly.

5. **Optimistic lock race window** — time between SELECT and UPDATE allows another write. Fix: minimize the window; consider `lockForUpdate()` for truly critical sections.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (321.1–321.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Transaction Patterns Specialist — Data | EPS v3.2*

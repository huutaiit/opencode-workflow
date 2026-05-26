# Test Plan Specialist — Laravel Financial Integrity Testing
# テストプランスペシャリスト — Laravel金融整合性テスト
# Chuyen Gia Ke Hoach Test — Test Tinh Toan Tai Chinh Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Financial Integrity Testing
**Category**: test-plan
**Purpose**: Test plan for financial calculations testing — Money value object, rounding, currency conversion, audit trails, ledger consistency

---

## Metadata

```json
{
  "id": "tps-laravel-financial-integrity",
  "technology": "Laravel 11+ Testing",
  "aspect": "Financial Integrity Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 340,
  "token_cost": 2300,
  "version": "1.0.0",
  "evidence": [
    "E1: Money pattern — integer cents, never float for currency",
    "E2: Currency conversion — rounding rules per ISO 4217",
    "E3: Double-entry bookkeeping — debits must equal credits"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-FINANCIAL-INTEGRITY |
| **Directory Pattern** | `tests/Unit/Domain/Financial/`, `tests/Feature/Financial/` |
| **Naming Convention** | `{Concern}FinancialTest.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Financial calculations tests — Money VO, rounding, currency, audit trails |
| **Activation Trigger** | keywords: money, financial, currency, rounding, audit trail, ledger, payment, balance |

---

## Why This TPS Exists

Financial bugs are **catastrophic**: `0.1 + 0.2 !== 0.3` in PHP, rounding errors compound across millions of transactions, missing audit trails make discrepancies unresolvable. This TPS ensures all operations use **integer cents**, proper rounding, and complete audit trails.

---

## Test Cases

### TC-1: Money Value Object — Integer Cents, Never Float
**Priority**: HIGH
**Type**: Unit
**Description**: Verify Money VO stores amounts as integer cents and never uses float.

```php
it('stores amount as integer cents', function () {
    $money = Money::USD(1050); // $10.50

    expect($money->amount())->toBe(1050)
        ->and($money->amount())->toBeInt()
        ->and($money->currency())->toBe('USD')
        ->and($money->formatted())->toBe('$10.50');
});

it('rejects float amounts', function () {
    Money::USD(10.50); // MUST reject float
})->throws(InvalidArgumentException::class, 'Amount must be integer cents');

it('handles zero amount', function () {
    $money = Money::USD(0);

    expect($money->amount())->toBe(0)
        ->and($money->isZero())->toBeTrue();
});

it('handles negative amounts for refunds', function () {
    $refund = Money::USD(-500); // -$5.00 refund

    expect($refund->amount())->toBe(-500)
        ->and($refund->isNegative())->toBeTrue();
});
```

### TC-2: Money Arithmetic — No Rounding Errors
**Priority**: HIGH
**Type**: Unit
**Description**: Verify arithmetic operations maintain precision.

```php
it('adds money without float precision loss', function () {
    // Classic float bug: 0.1 + 0.2 = 0.30000000000000004
    $a = Money::USD(10); // $0.10
    $b = Money::USD(20); // $0.20

    expect($a->add($b)->amount())->toBe(30); // exactly $0.30
});

it('multiplies money with proper rounding', function () {
    $price = Money::USD(1999); // $19.99
    $quantity = 3;

    $total = $price->multiply($quantity);

    expect($total->amount())->toBe(5997); // $59.97 — exact
});

it('divides money with banker rounding', function () {
    $total = Money::USD(1000); // $10.00
    $split = $total->divide(3); // $3.33333...

    expect($split->amount())->toBe(333); // $3.33 — rounded down
    // Remainder tracked separately
    $remainder = $total->amount() - ($split->amount() * 3); // 1 cent
    expect($remainder)->toBe(1);
});

it('prevents currency mismatch in arithmetic', function () {
    $usd = Money::USD(1000);
    $jpy = Money::JPY(1000);

    $usd->add($jpy);
})->throws(CurrencyMismatchException::class);

it('distributes amount fairly with no money lost', function () {
    $total = Money::USD(10000); // $100.00
    $parts = $total->allocate([1, 1, 1]); // split 3 ways

    expect($parts[0]->amount())->toBe(3334) // $33.34 (gets extra cent)
        ->and($parts[1]->amount())->toBe(3333) // $33.33
        ->and($parts[2]->amount())->toBe(3333) // $33.33
        ->and($parts[0]->amount() + $parts[1]->amount() + $parts[2]->amount())->toBe(10000); // NO money lost
});
```

### TC-3: Currency Conversion — Rounding Rules
**Priority**: HIGH
**Type**: Unit
**Description**: Verify currency conversion applies correct rounding per ISO 4217.

```php
it('converts USD to JPY with zero decimal rounding', function () {
    $usd = Money::USD(1050); // $10.50
    $rate = 149.50;

    $jpy = $usd->convertTo('JPY', $rate);

    // $10.50 * 149.50 = 1569.75 → round to 1570 (JPY has 0 decimals)
    expect($jpy->amount())->toBe(1570)
        ->and($jpy->currency())->toBe('JPY');
});

it('converts JPY to USD with 2 decimal rounding', function () {
    $jpy = Money::JPY(1570);
    $rate = 1 / 149.50;

    $usd = $jpy->convertTo('USD', $rate);

    // 1570 / 149.50 = 10.5017... → 1050 cents (round to nearest cent)
    expect($usd->amount())->toBe(1050)
        ->and($usd->currency())->toBe('USD');
});

it('round-trip conversion does not create money', function () {
    $original = Money::USD(10000); // $100.00
    $rate = 149.50;

    $jpy = $original->convertTo('JPY', $rate);
    $backToUsd = $jpy->convertTo('USD', 1 / $rate);

    // Round-trip may lose cents due to rounding, but NEVER gain
    expect($backToUsd->amount())->toBeLessThanOrEqual($original->amount());
});
```

### TC-4: Order Total Calculation — Tax and Discount
**Priority**: HIGH
**Type**: Unit
**Description**: Verify order total with tax and discount calculates correctly.

```php
it('calculates order total with tax correctly', function () {
    $subtotal = Money::USD(9999); // $99.99
    $taxRate = 0.10; // 10%

    $tax = $subtotal->multiply($taxRate); // 999.9 → 1000 (banker's rounding)
    $total = $subtotal->add($tax);

    expect($tax->amount())->toBe(1000) // $10.00
        ->and($total->amount())->toBe(10999); // $109.99
});

it('applies percentage discount without rounding leak', function () {
    $subtotal = Money::USD(3333); // $33.33
    $discountRate = 0.15; // 15%

    $discount = $subtotal->multiply($discountRate); // 499.95 → 500
    $total = $subtotal->subtract($discount);

    expect($discount->amount())->toBe(500) // $5.00
        ->and($total->amount())->toBe(2833); // $28.33
});

it('computes multi-item order total without accumulated rounding error', function () {
    $items = [
        ['price' => Money::USD(1999), 'quantity' => 3],  // $59.97
        ['price' => Money::USD(499), 'quantity' => 5],    // $24.95
        ['price' => Money::USD(7500), 'quantity' => 1],   // $75.00
    ];

    $total = Money::USD(0);
    foreach ($items as $item) {
        $lineTotal = $item['price']->multiply($item['quantity']);
        $total = $total->add($lineTotal);
    }

    expect($total->amount())->toBe(15992); // $159.92 — exact
});
```

### TC-5: Ledger Consistency — Debits Equal Credits
**Priority**: HIGH
**Type**: Integration
**Description**: Verify double-entry bookkeeping balance after transactions.

```php
it('maintains debit-credit balance after transfer', function () {
    $fromAccount = AccountModel::factory()->create(['balance' => 100000]);
    $toAccount = AccountModel::factory()->create(['balance' => 50000]);

    app(TransferAction::class)->execute(
        fromId: $fromAccount->id,
        toId: $toAccount->id,
        amount: 25000,
    );

    // Verify individual balances
    expect($fromAccount->fresh()->balance)->toBe(75000)
        ->and($toAccount->fresh()->balance)->toBe(75000);

    // Verify ledger entries
    $debits = LedgerEntry::where('type', 'debit')->sum('amount');
    $credits = LedgerEntry::where('type', 'credit')->sum('amount');
    expect($debits)->toBe($credits); // MUST be equal
});

it('maintains total system balance after 100 random transactions', function () {
    $accounts = AccountModel::factory()->count(10)->create(['balance' => 100000]);
    $initialTotal = AccountModel::sum('balance');

    for ($i = 0; $i < 100; $i++) {
        $from = $accounts->random();
        $to = $accounts->except($from->id)->random();
        $amount = rand(100, 10000);

        rescue(fn () => app(TransferAction::class)->execute(
            fromId: $from->id,
            toId: $to->id,
            amount: $amount,
        ));
    }

    $finalTotal = AccountModel::sum('balance');
    expect($finalTotal)->toBe($initialTotal); // total unchanged — no money created/destroyed
});
```

### TC-6: Audit Trail Completeness
**Priority**: HIGH
**Type**: Integration
**Description**: Verify every financial operation creates an audit trail entry.

```php
it('creates audit entry for every payment', function () {
    $order = OrderModel::factory()->create(['total_amount' => 10000]);

    app(ProcessPaymentAction::class)->execute(orderId: $order->id);

    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => 'payment',
        'event' => 'created',
        'old_values' => null,
    ]);

    $audit = AuditLog::where('event', 'created')->latest()->first();
    expect($audit->new_values)->toHaveKey('amount')
        ->and($audit->new_values['amount'])->toBe(10000)
        ->and($audit->user_id)->not->toBeNull()
        ->and($audit->ip_address)->not->toBeNull();
});

it('records before and after values on balance change', function () {
    $account = AccountModel::factory()->create(['balance' => 50000]);

    app(WithdrawAction::class)->execute(accountId: $account->id, amount: 10000);

    $audit = AuditLog::where('auditable_id', $account->id)->latest()->first();
    expect($audit->old_values['balance'])->toBe(50000)
        ->and($audit->new_values['balance'])->toBe(40000);
});

it('audit trail cannot be modified after creation', function () {
    $audit = AuditLog::factory()->create();

    $audit->event = 'tampered';
    $audit->save();
})->throws(\Exception::class); // read-only model or DB trigger prevents update
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Money VO arithmetic | 100% of operations | Precision integrity |
| Currency conversion | All supported currency pairs | Rounding correctness |
| Tax/discount calculation | All calculation paths | Financial accuracy |
| Ledger balance | 100% of debit-credit operations | Double-entry integrity |
| Audit trail | 100% of financial operations | Regulatory compliance |
| Float rejection | All money input points | Prevents precision bugs |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Use float for money | `0.1 + 0.2 !== 0.3` | Integer cents via Money VO |
| 2 | Store money as DECIMAL without VO | Easy to accidentally use float | Money VO wrapping integer column |
| 3 | Round at display time only | Accumulated rounding throughout pipeline | Round at each arithmetic step |
| 4 | Skip allocation remainder handling | Money disappears (1 cent per 3-way split) | Allocate with remainder to first recipient |
| 5 | No audit trail for financial operations | Regulatory violation, debugging impossible | Audit every financial state change |
| 6 | Test with round numbers only | Rounding bugs only appear with odd amounts | Test with 1999, 3333, 10001 |

---

## Quality Checklist

- [ ] **Q1**: Money VO tests use integer cents, never floats?
- [ ] **Q2**: Allocation tests verify no money lost (sum equals original)?
- [ ] **Q3**: Currency conversion tests verify rounding per ISO 4217?
- [ ] **Q4**: Ledger tests verify debits equal credits after N transactions?
- [ ] **Q5**: Audit trail tests verify completeness and immutability?

---

*Test Plan Specialist — Laravel Financial Integrity Testing v1.0 | EPS v3.2*

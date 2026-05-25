# Test Plan Specialist — Laravel Queue/Event Integration Testing
# テストプランスペシャリスト — Laravelキュー・イベント統合テスト
# Chuyen Gia Ke Hoach Test — Integration Test Queue/Event Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Queue and Event Integration Testing
**Category**: test-plan
**Purpose**: Test plan for queue/event integration — jobs, listeners, notifications, broadcasting, event chains

---

## Metadata

```json
{
  "id": "tps-laravel-integration-messaging",
  "technology": "Laravel 11+ Testing",
  "aspect": "Queue and Event Integration Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 300,
  "token_cost": 2000,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Queue::fake() — assert job dispatch without execution",
    "E2: Laravel Event::fake() — assert event emission without listeners",
    "E3: Laravel Notification::fake() — assert notification delivery channels"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-INTEGRATION-MESSAGING |
| **Directory Pattern** | `tests/Feature/Jobs/`, `tests/Feature/Events/` |
| **Naming Convention** | `{Job}Test.php`, `{Listener}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Queue/event integration tests — jobs, listeners, notifications, broadcasting |
| **Activation Trigger** | keywords: job test, queue test, event test, listener test, notification test, broadcast test |

---

## Test Strategy

Messaging tests verify dispatch, execution, retry, failure handling, and event chains. Use `Queue::fake()` for dispatch assertions and sync queue driver for execution tests. Test notifications via `Notification::fake()`. Target **100% of dispatchable jobs and event types**.

---

## Test Cases

### TC-1: Job Dispatch Verification
**Priority**: HIGH
**Type**: Integration
**Description**: Verify jobs are dispatched with correct payload after business operations.

```php
it('dispatches ProcessPaymentJob after order confirmation', function () {
    Queue::fake();

    $order = OrderModel::factory()->create(['status' => 'pending']);

    $this->actingAs($user)
        ->putJson("/api/v1/orders/{$order->id}/confirm");

    Queue::assertPushed(ProcessPaymentJob::class, function ($job) use ($order) {
        return $job->orderId === $order->id
            && $job->amount === $order->total_amount;
    });
});

it('dispatches job on correct queue', function () {
    Queue::fake();

    $this->actingAs($user)
        ->putJson("/api/v1/orders/{$order->id}/confirm");

    Queue::assertPushedOn('payments', ProcessPaymentJob::class);
});

it('does NOT dispatch payment job when order is already cancelled', function () {
    Queue::fake();

    $order = OrderModel::factory()->create(['status' => 'cancelled']);

    $this->actingAs($user)
        ->putJson("/api/v1/orders/{$order->id}/confirm");

    Queue::assertNotPushed(ProcessPaymentJob::class);
});
```

### TC-2: Job Execution with Sync Driver
**Priority**: HIGH
**Type**: Integration
**Description**: Verify job handle() logic executes correctly.

```php
it('processes payment successfully via job handle()', function () {
    Http::fake([
        'payment-gateway.com/*' => Http::response(['status' => 'success', 'transaction_id' => 'txn-001'], 200),
    ]);

    $order = OrderModel::factory()->create(['status' => 'confirmed']);
    $job = new ProcessPaymentJob(orderId: $order->id, amount: $order->total_amount);
    $job->handle(app(PaymentGatewayInterface::class));

    $this->assertDatabaseHas('payments', [
        'order_id' => $order->id,
        'transaction_id' => 'txn-001',
        'status' => 'success',
    ]);
});

it('marks payment as failed on gateway error', function () {
    Http::fake([
        'payment-gateway.com/*' => Http::response(['error' => 'declined'], 402),
    ]);

    $order = OrderModel::factory()->create(['status' => 'confirmed']);
    $job = new ProcessPaymentJob(orderId: $order->id, amount: $order->total_amount);
    $job->handle(app(PaymentGatewayInterface::class));

    $this->assertDatabaseHas('payments', [
        'order_id' => $order->id,
        'status' => 'failed',
    ]);
});
```

### TC-3: Job Retry and Failure Handling
**Priority**: HIGH
**Type**: Integration
**Description**: Verify job retry logic and failed() callback.

```php
it('retries job up to maxTries on transient failure', function () {
    $job = new ProcessPaymentJob(orderId: 'order-001', amount: 5000);

    expect($job->tries)->toBe(3)
        ->and($job->backoff())->toBe([10, 30, 60]); // exponential
});

it('calls failed() callback after all retries exhausted', function () {
    Notification::fake();

    $job = new ProcessPaymentJob(orderId: 'order-001', amount: 5000);
    $job->failed(new RuntimeException('Gateway timeout'));

    Notification::assertSentTo(
        $adminUser,
        PaymentFailedNotification::class,
    );

    $this->assertDatabaseHas('failed_payments', [
        'order_id' => 'order-001',
        'error' => 'Gateway timeout',
    ]);
});
```

### TC-4: Event and Listener Chain
**Priority**: HIGH
**Type**: Integration
**Description**: Verify events trigger correct listeners in the expected order.

```php
it('fires OrderConfirmed event with correct payload', function () {
    Event::fake([OrderConfirmed::class]);

    $order = OrderModel::factory()->create(['status' => 'pending']);
    $this->actingAs($user)
        ->putJson("/api/v1/orders/{$order->id}/confirm");

    Event::assertDispatched(OrderConfirmed::class, function ($event) use ($order) {
        return $event->orderId === $order->id;
    });
});

it('listener updates inventory on OrderConfirmed', function () {
    $order = OrderModel::factory()
        ->has(OrderItemModel::factory()->state(['product_id' => 'prod-1', 'quantity' => 3]), 'items')
        ->create();

    $product = ProductModel::factory()->create(['id' => 'prod-1', 'stock' => 10]);

    $listener = new UpdateInventoryListener();
    $listener->handle(new OrderConfirmed(orderId: $order->id));

    expect($product->fresh()->stock)->toBe(7); // 10 - 3
});
```

### TC-5: Notification Delivery
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify notifications sent via correct channels with correct content.

```php
it('sends order confirmation email notification', function () {
    Notification::fake();

    $user = User::factory()->create();
    $order = OrderModel::factory()->create(['customer_id' => $user->id]);

    $user->notify(new OrderConfirmationNotification($order));

    Notification::assertSentTo($user, OrderConfirmationNotification::class, function ($notification, $channels) {
        return in_array('mail', $channels);
    });
});

it('sends SMS notification for high-value orders', function () {
    Notification::fake();

    $user = User::factory()->create(['phone' => '+81901234567']);
    $order = OrderModel::factory()->create([
        'customer_id' => $user->id,
        'total_amount' => 100000, // high value
    ]);

    $user->notify(new OrderConfirmationNotification($order));

    Notification::assertSentTo($user, OrderConfirmationNotification::class, function ($notification, $channels) {
        return in_array('vonage', $channels); // SMS for high-value
    });
});
```

### TC-6: Job Chaining and Batching
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify job chains and batches execute in correct order.

```php
it('dispatches job chain in correct order', function () {
    Bus::fake();

    $this->actingAs($user)
        ->postJson('/api/v1/orders/batch-process', ['order_ids' => $orderIds]);

    Bus::assertChained([
        ValidateOrdersJob::class,
        ProcessPaymentsJob::class,
        SendConfirmationsJob::class,
    ]);
});

it('handles batch with allowFailures', function () {
    Bus::fake();

    $batch = Bus::batch([
        new ProcessPaymentJob('order-1', 1000),
        new ProcessPaymentJob('order-2', 2000),
    ])->allowFailures()->dispatch();

    expect($batch)->not->toBeNull();
    Bus::assertBatched(fn ($batch) => $batch->jobs->count() === 2);
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Job dispatch | 100% of dispatchable jobs | Verify all async work is triggered |
| Job execution | 100% of handle() methods | Business logic correctness |
| Retry/failure | 100% of jobs with retry | Resilience verification |
| Events | 100% of dispatched event types | Event contract |
| Listeners | 100% of listener handles | Side-effect correctness |
| Notifications | 100% of notification classes | Delivery channel accuracy |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test dispatch without payload assertion | Dispatch exists but payload wrong | Assert job properties |
| 2 | Skip failed() callback testing | Silent failures in production | Test failure notification/logging |
| 3 | Use real queue driver in test | Slow, external dependency | Queue::fake() or sync |
| 4 | Test listener without event payload | Listener works but event data wrong | Test full event->listener chain |
| 5 | Skip notification channel assertions | Email sent when SMS expected | Assert channels array |

---

## Quality Checklist

- [ ] **Q1**: All dispatchable jobs tested for dispatch + execution?
- [ ] **Q2**: Job retry and failure callbacks tested?
- [ ] **Q3**: Event -> listener chains verified?
- [ ] **Q4**: Notifications tested for correct channels and content?

---

*Test Plan Specialist — Laravel Queue/Event Integration Testing v1.0 | EPS v3.2*

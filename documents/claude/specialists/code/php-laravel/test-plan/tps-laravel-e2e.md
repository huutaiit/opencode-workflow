# Test Plan Specialist — Laravel End-to-End Testing
# テストプランスペシャリスト — Laravelエンドツーエンドテスト
# Chuyen Gia Ke Hoach Test — E2E Test Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: End-to-End Testing
**Category**: test-plan
**Purpose**: Test plan for end-to-end testing — Dusk browser tests, full workflow validation, multi-step user journeys

---

## Metadata

```json
{
  "id": "tps-laravel-e2e",
  "technology": "Laravel 11+ Testing",
  "aspect": "End-to-End Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 280,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Dusk — browser automation with ChromeDriver",
    "E2: Full workflow testing — multi-step user journeys",
    "E3: API E2E — complete request cycle without mocks"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-E2E |
| **Directory Pattern** | `tests/Browser/`, `tests/Feature/E2E/` |
| **Naming Convention** | `{Workflow}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | E2E tests — Dusk browser tests, full workflow validation |
| **Activation Trigger** | keywords: e2e test, browser test, dusk, end to end, workflow test |

---

## Test Strategy

E2E tests validate complete user journeys through the full application stack — no mocks. Browser tests use Laravel Dusk with ChromeDriver. API E2E tests use the HTTP test client with real database. Run E2E tests separately from unit/feature tests in CI.

---

## Test Cases

### TC-1: Dusk Browser — Complete Order Flow
**Priority**: HIGH
**Type**: E2E
**Description**: Verify the complete order flow from browsing to confirmation.

```php
it('completes full order flow from product page to confirmation', function () {
    $this->browse(function (Browser $browser) {
        $user = User::factory()->create();
        $product = ProductModel::factory()->create(['name' => 'Widget', 'price' => 2500]);

        $browser->loginAs($user)
            ->visit('/products')
            ->assertSee('Widget')
            ->click("@add-to-cart-{$product->id}")
            ->waitForText('Added to cart')
            ->visit('/cart')
            ->assertSee('Widget')
            ->assertSee('$25.00')
            ->press('Proceed to Checkout')
            ->waitForRoute('checkout')
            ->type('shipping_address', '123 Main St, Tokyo')
            ->press('Place Order')
            ->waitForText('Order Confirmed')
            ->assertSee('Order #')
            ->assertPathBeginsWith('/orders/');
    });

    // Verify side effects
    $this->assertDatabaseHas('orders', ['status' => 'confirmed']);
});
```

### TC-2: Dusk Browser — Authentication Flow
**Priority**: HIGH
**Type**: E2E
**Description**: Verify login, logout, and session persistence.

```php
it('logs in and accesses protected pages', function () {
    $this->browse(function (Browser $browser) {
        $user = User::factory()->create(['email' => 'test@example.com']);

        $browser->visit('/login')
            ->type('email', 'test@example.com')
            ->type('password', 'password')
            ->press('Login')
            ->waitForRoute('dashboard')
            ->assertAuthenticatedAs($user)
            ->visit('/orders')
            ->assertDontSee('Please login');
    });
});

it('redirects unauthenticated users to login', function () {
    $this->browse(function (Browser $browser) {
        $browser->visit('/orders')
            ->assertPathIs('/login');
    });
});

it('maintains session across page navigation', function () {
    $this->browse(function (Browser $browser) {
        $user = User::factory()->create();

        $browser->loginAs($user)
            ->visit('/dashboard')
            ->assertAuthenticated()
            ->visit('/orders')
            ->assertAuthenticated()
            ->visit('/profile')
            ->assertAuthenticated();
    });
});
```

### TC-3: API E2E — Full Request Cycle
**Priority**: HIGH
**Type**: E2E
**Description**: Test complete API workflow without any mocks or fakes.

```php
it('completes full order lifecycle via API', function () {
    $user = User::factory()->create();
    $product = ProductModel::factory()->create(['stock' => 10]);

    // Step 1: Create order
    $createResponse = $this->actingAs($user)
        ->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_price' => $product->price]],
        ]);
    $createResponse->assertStatus(201);
    $orderId = $createResponse->json('data.id');

    // Step 2: Confirm order
    $confirmResponse = $this->actingAs($user)
        ->putJson("/api/v1/orders/{$orderId}/confirm");
    $confirmResponse->assertStatus(200)
        ->assertJsonPath('data.status', 'confirmed');

    // Step 3: Verify side effects
    $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'confirmed']);
    expect($product->fresh()->stock)->toBe(8); // 10 - 2
});
```

### TC-4: Multi-Step Workflow with Error Recovery
**Priority**: HIGH
**Type**: E2E
**Description**: Verify workflow handles errors and allows retry.

```php
it('handles payment failure and allows retry', function () {
    $this->browse(function (Browser $browser) {
        $user = User::factory()->create();

        $browser->loginAs($user)
            ->visit('/checkout')
            ->type('card_number', '4000000000000002') // test decline card
            ->press('Pay Now')
            ->waitForText('Payment declined')
            ->assertSee('Try again')
            ->type('card_number', '4242424242424242') // valid test card
            ->press('Pay Now')
            ->waitForText('Payment successful')
            ->assertPathBeginsWith('/orders/');
    });
});
```

### TC-5: Dusk — JavaScript-Heavy Interactions
**Priority**: MEDIUM
**Type**: E2E
**Description**: Verify interactions requiring JavaScript execution.

```php
it('filters products in real-time with search input', function () {
    $this->browse(function (Browser $browser) {
        ProductModel::factory()->create(['name' => 'Red Widget']);
        ProductModel::factory()->create(['name' => 'Blue Gadget']);

        $browser->loginAs($user)
            ->visit('/products')
            ->assertSee('Red Widget')
            ->assertSee('Blue Gadget')
            ->type('@search-input', 'Widget')
            ->waitUntilMissing('@product-Blue Gadget')
            ->assertSee('Red Widget')
            ->assertDontSee('Blue Gadget');
    });
});

it('handles modal confirmation dialog', function () {
    $this->browse(function (Browser $browser) {
        $order = OrderModel::factory()->create();

        $browser->loginAs($user)
            ->visit("/orders/{$order->id}")
            ->press('Cancel Order')
            ->waitFor('@confirmation-modal')
            ->assertSee('Are you sure?')
            ->press('Confirm Cancel')
            ->waitForText('Order cancelled')
            ->assertPathIs('/orders');
    });
});
```

### TC-6: Performance Baseline in E2E
**Priority**: LOW
**Type**: E2E
**Description**: Verify critical pages load within acceptable time.

```php
it('loads dashboard within 2 seconds', function () {
    $this->browse(function (Browser $browser) {
        $user = User::factory()->create();

        $start = microtime(true);
        $browser->loginAs($user)
            ->visit('/dashboard')
            ->waitForText('Welcome');
        $elapsed = microtime(true) - $start;

        expect($elapsed)->toBeLessThan(2.0);
    });
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Critical user journeys | 100% of primary workflows | Business-critical paths |
| Authentication flows | login, logout, session, remember me | Security |
| Error recovery | All user-facing error scenarios | User experience |
| Multi-step workflows | All multi-page flows | State persistence |
| JS interactions | All AJAX/dynamic UI features | Frontend integration |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Use mocks in E2E tests | Defeats E2E purpose | Real database, real services |
| 2 | Hard-coded sleep() for async waits | Flaky, slow | waitForText(), waitFor() |
| 3 | Test every edge case in E2E | Slow, expensive | Edge cases in unit tests |
| 4 | Share browser session between tests | State leaks | Fresh browser per test |
| 5 | Run E2E in same CI job as unit tests | Blocks fast feedback | Separate CI pipeline |

---

## Quality Checklist

- [ ] **Q1**: All critical user journeys covered?
- [ ] **Q2**: Browser tests use waitFor() instead of sleep()?
- [ ] **Q3**: E2E tests isolated (fresh DB, fresh session)?
- [ ] **Q4**: E2E tests run in separate CI pipeline?

---

*Test Plan Specialist — Laravel End-to-End Testing v1.0 | EPS v3.2*

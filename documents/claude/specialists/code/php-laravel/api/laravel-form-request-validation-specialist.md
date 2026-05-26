# Laravel Form Request & Validation Specialist — API
# Laravelフォームリクエスト＆バリデーションスペシャリスト — API
# Chuyen Gia Form Request va Validation Laravel — API

**Version**: 1.0.0
**Technology**: Laravel 11+ Form Requests & Validation
**Aspect**: Form Requests & Validation
**Category**: api
**Purpose**: Knowledge provider for Laravel 11+ form request architecture — custom validation rules, conditional validation, array validation, authorization, after-validation hooks, and complex cross-table validation

---

## Metadata

```json
{
  "id": "laravel-form-request-validation-specialist",
  "technology": "Laravel 11+ Form Requests & Validation",
  "aspect": "Form Requests & Validation",
  "category": "api",
  "subcategory": "php-laravel",
  "lines": 450,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 Form Request — authorize(), rules(), messages(), prepareForValidation()",
    "E2: Custom validation rules — Rule objects replacing closure rules",
    "E3: Array and nested validation — wildcard *.field syntax"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 308.1–308.8 |
| **Directory Pattern** | `app/Http/Requests/` |
| **Naming Convention** | `{Action}{Entity}Request.php` (e.g., `StoreOrderRequest.php`, `UpdateUserRequest.php`) |
| **Imports From** | Domain (models for unique/exists rules) |
| **Imported By** | Controllers (type-hinted in action methods) |
| **Cannot Import** | Infrastructure (repositories), Application (services) |
| **Dependencies** | `laravel/framework` |
| **When To Use** | Every controller action that accepts user input |
| **Source Skeleton** | `app/Http/Requests/{Action}{Entity}Request.php` |
| **Specialist Type** | code |
| **Purpose** | Input validation, authorization, request preparation, custom rules |
| **Activation Trigger** | files: `app/Http/Requests/*.php`; keywords: FormRequest, rules, validate, validation |

---

## Role

You are a **Laravel Form Request & Validation Specialist**. Your responsibility is to provide best practices for Laravel 11+ form request validation — custom rule objects, conditional and array validation, after-validation hooks, request authorization, and complex cross-table uniqueness/existence checks.

**Used by**: Any code agent implementing input validation in Laravel controllers
**Not used by**: Non-Laravel stacks, Livewire-only validation, console command input

---

## Patterns

### Pattern 308.1: Form Request Basics

**Category**: Validation Fundamentals
**Description**: Standard form request with rules, messages, authorization, and preparation hooks.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Product::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('products')],
            'price' => ['required', 'integer', 'min:0'],
            'category_id' => ['required', Rule::exists('categories', 'id')],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['boolean'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Product name is required.',
            'slug.unique' => 'This slug is already taken.',
            'price.min' => 'Price cannot be negative.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'slug' => str($this->input('name'))->slug()->toString(),
            'is_active' => $this->boolean('is_active'),
        ]);
    }
}
```

**Key Points**:
- `authorize()` — return `true` to skip auth, or check policies
- `prepareForValidation()` — normalize data before rules run (slug generation, boolean cast)
- Return typed arrays with `@return` docblock for static analysis
- Use `Rule::` fluent methods instead of string rules for type safety

---

### Pattern 308.2: Custom Validation Rules

**Category**: Rule Objects
**Description**: Reusable validation rules as invocable classes replacing closure rules.

```php
<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final readonly class StrongPassword implements ValidationRule
{
    public function __construct(
        private int $minLength = 12,
        private bool $requireSpecialChar = true,
    ) {}

    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail,
    ): void {
        if (mb_strlen($value) < $this->minLength) {
            $fail("The :attribute must be at least {$this->minLength} characters.");
            return;
        }

        if (!preg_match('/[A-Z]/', $value)) {
            $fail('The :attribute must contain at least one uppercase letter.');
        }

        if (!preg_match('/[0-9]/', $value)) {
            $fail('The :attribute must contain at least one number.');
        }

        if ($this->requireSpecialChar && !preg_match('/[!@#$%^&*(),.?":{}|<>]/', $value)) {
            $fail('The :attribute must contain at least one special character.');
        }
    }
}
```

```php
// Usage in Form Request
public function rules(): array
{
    return [
        'password' => [
            'required',
            'string',
            new StrongPassword(minLength: 16, requireSpecialChar: true),
            'confirmed',
        ],
    ];
}
```

**Key Points**:
- Implement `ValidationRule` interface with `validate()` method
- Use `readonly` class with constructor promotion for configuration
- Call `$fail()` closure with error message — supports multiple failures
- Reusable across Form Requests; testable in isolation

---

### Pattern 308.3: Conditional Validation

**Category**: Dynamic Rules
**Description**: Apply validation rules conditionally based on other input values or request state.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_method' => ['required', Rule::in(['credit_card', 'bank_transfer', 'paypal'])],

            // Credit card fields — required only when method is credit_card
            'card_number' => [
                Rule::requiredIf($this->input('payment_method') === 'credit_card'),
                'nullable',
                'string',
                'digits:16',
            ],
            'card_expiry' => [
                Rule::requiredIf($this->input('payment_method') === 'credit_card'),
                'nullable',
                'date_format:m/y',
                'after:today',
            ],
            'card_cvv' => [
                Rule::requiredIf($this->input('payment_method') === 'credit_card'),
                'nullable',
                'digits_between:3,4',
            ],

            // Bank transfer fields
            'bank_account' => [
                Rule::requiredIf($this->input('payment_method') === 'bank_transfer'),
                'nullable',
                'string',
                'max:34',
            ],

            // PayPal fields
            'paypal_email' => [
                Rule::requiredIf($this->input('payment_method') === 'paypal'),
                'nullable',
                'email',
            ],

            'amount' => ['required', 'integer', 'min:100'],
            'currency' => ['required', 'string', 'size:3', Rule::in(['USD', 'EUR', 'JPY'])],
        ];
    }
}
```

**Key Points**:
- `Rule::requiredIf()` accepts boolean or closure for dynamic conditions
- Combine with `nullable` to avoid errors when field is absent
- `Rule::when()` for conditionally adding any rule, not just required
- `Rule::excludeIf()` removes the field from validated data when condition met

---

### Pattern 308.4: Array Validation

**Category**: Complex Structures
**Description**: Validate arrays, nested objects, and collections of items using wildcard syntax.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            // Array of order items
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where('is_active', true),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'items.*.options' => ['nullable', 'array'],
            'items.*.options.color' => ['nullable', 'string', Rule::in(['red', 'blue', 'green'])],
            'items.*.options.size' => ['nullable', 'string', Rule::in(['S', 'M', 'L', 'XL'])],

            // Nested shipping address object
            'shipping_address' => ['required', 'array'],
            'shipping_address.line1' => ['required', 'string', 'max:255'],
            'shipping_address.line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required', 'string', 'max:100'],
            'shipping_address.state' => ['required', 'string', 'max:100'],
            'shipping_address.postal_code' => ['required', 'string', 'max:20'],
            'shipping_address.country' => ['required', 'string', 'size:2'],

            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.*.product_id.exists' => 'Product #:position is not available.',
            'items.min' => 'At least one item is required.',
        ];
    }
}
```

**Key Points**:
- `items.*` validates each element; `items.*.field` validates nested fields
- `Rule::exists()->where()` adds additional constraints to existence checks
- Use `:position` placeholder in messages for array index (1-based)
- Validate array itself (`required|array|min:1`) AND its contents

---

### Pattern 308.5: Custom Error Messages & Attributes

**Category**: Error Formatting
**Description**: Customize error messages, attribute names, and error response format for API consumers.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

final class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'unique:users,email,' . $this->user()->id],
            'phone' => ['nullable', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'first name',
            'last_name' => 'last name',
            'date_of_birth' => 'date of birth',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json(
                data: [
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()->toArray(),
                ],
                status: 422,
            ),
        );
    }
}
```

**Key Points**:
- `attributes()` maps field names to human-readable labels used in error messages
- Override `failedValidation()` for custom error response shape
- Default Laravel response already returns 422 with `{message, errors}` — override only when needed
- Use `$validator->errors()->toArray()` for structured error output

---

### Pattern 308.6: After Validation Hooks

**Category**: Post-Validation Logic
**Description**: Execute logic after validation passes using `after()` hooks and `passedValidation()`.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class StoreCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $product = Product::find($this->validated('product_id'));

                if ($product && $product->stock < $this->validated('quantity')) {
                    $validator->errors()->add(
                        key: 'quantity',
                        message: "Only {$product->stock} units available in stock.",
                    );
                }

                if ($product?->is_discontinued) {
                    $validator->errors()->add(
                        key: 'product_id',
                        message: 'This product has been discontinued.',
                    );
                }
            },
        ];
    }

    protected function passedValidation(): void
    {
        // Runs AFTER all validation (including after hooks) passes
        $this->merge([
            'unit_price' => Product::find($this->validated('product_id'))->price,
        ]);
    }
}
```

**Key Points**:
- `after()` returns array of closures that run after basic rules pass
- After hooks can add custom errors — request still fails if errors are added
- `passedValidation()` runs only when ALL validation passes — good for data enrichment
- Use after hooks for cross-field business logic (stock check, pricing validation)

---

### Pattern 308.7: Authorization in Form Request

**Category**: Request Authorization
**Description**: Authorize requests using policies, gates, and custom logic within the Form Request.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Order $order */
        $order = $this->route('order');

        // Combine multiple authorization checks
        return $this->user()->can('update', $order)
            && $order->status->isEditable()
            && !$order->is_locked;
    }

    public function rules(): array
    {
        /** @var Order $order */
        $order = $this->route('order');

        return [
            'status' => [
                'sometimes',
                'string',
                Rule::in($order->status->allowedTransitions()),
            ],
            'shipping_method' => [
                'sometimes',
                'string',
                Rule::in(['standard', 'express', 'overnight']),
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    protected function failedAuthorization(): void
    {
        throw new \Illuminate\Auth\Access\AuthorizationException(
            'You cannot modify this order in its current state.',
        );
    }
}
```

**Key Points**:
- `authorize()` runs BEFORE rules — return `false` to abort with 403
- Access route parameters via `$this->route('paramName')` for contextual auth
- Combine policy checks with business state checks (order editable, not locked)
- Override `failedAuthorization()` for custom error messages

---

### Pattern 308.8: Complex Validation — Unique with Soft Deletes, Cross-Table Exists

**Category**: Advanced Rules
**Description**: Complex uniqueness checks with soft deletes, cross-table existence validation, and composite unique rules.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage-employees');
    }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email',
                // Unique excluding soft-deleted records
                Rule::unique('employees', 'email')
                    ->whereNull('deleted_at'),
            ],
            'employee_code' => [
                'required',
                'string',
                // Unique within the same department (composite unique)
                Rule::unique('employees', 'employee_code')
                    ->where('department_id', $this->input('department_id'))
                    ->whereNull('deleted_at'),
            ],
            'department_id' => [
                'required',
                // Exists in departments AND the department is active
                Rule::exists('departments', 'id')
                    ->where('is_active', true)
                    ->whereNull('deleted_at'),
            ],
            'manager_id' => [
                'nullable',
                // Manager must exist in the SAME department
                Rule::exists('employees', 'id')
                    ->where('department_id', $this->input('department_id'))
                    ->where('is_manager', true),
            ],
            'role_ids' => ['required', 'array', 'min:1'],
            'role_ids.*' => [
                'integer',
                Rule::exists('roles', 'id')
                    ->where('is_assignable', true),
            ],
        ];
    }
}
```

```php
// Update variant — ignore current record
final class UpdateEmployeeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email',
                Rule::unique('employees', 'email')
                    ->ignore($this->route('employee'))
                    ->whereNull('deleted_at'),
            ],
        ];
    }
}
```

**Key Points**:
- `->whereNull('deleted_at')` ensures unique check excludes soft-deleted records
- `->where()` adds composite unique constraints (unique within department)
- `->ignore()` accepts model instance or ID for update scenarios
- Cross-table exists with `->where()` validates referential integrity with business rules
- Stack multiple `where` clauses for complex constraints

---

## Best Practices

- **One Form Request per action** — `StoreProductRequest`, `UpdateProductRequest` as separate classes
- **Never validate inline** — avoid `$request->validate()` in controllers; always use Form Requests
- **Use Rule objects** — `Rule::unique()`, `Rule::exists()`, `Rule::in()` over string-based rules
- **Prepare input** — use `prepareForValidation()` for slug generation, boolean casting, trimming
- **Authorize in Form Request** — move `$this->authorize()` logic to the request, not the controller
- **Type-hint rules array** — `@return array<string, array<int, mixed>>` for static analysis
- **Test validation rules** — assert 422 responses with specific error keys
- **Use after hooks** — complex business validation (stock checks, pricing) goes in `after()`
- **Custom Rule classes** — reusable, testable, configurable via constructor

---

## Abnormal Case Patterns

1. **Validating in controller** — `$request->validate(['name' => 'required'])` inline in every method. Fix: create dedicated Form Request classes for each action.

2. **authorize() always true** — every Form Request returns `true` without checking policies. Fix: implement proper authorization or use `$this->authorize()` in controller.

3. **String-based rules** — `'email|unique:users,email'` string rules are error-prone and untyped. Fix: use `['email', Rule::unique('users', 'email')]` array syntax with Rule objects.

4. **Missing unique ignore on update** — `Rule::unique('users', 'email')` without `->ignore()` on update requests fails for current record. Fix: always add `->ignore($this->route('user'))` on update.

5. **After hook accessing unvalidated data** — using `$this->input()` in after hooks instead of `$this->validated()`. Fix: use `$this->validated('field')` to ensure data passed basic rules first.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (308.1–308.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Form Request & Validation Specialist — API | EPS v3.2*

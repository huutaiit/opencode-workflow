# Laravel Workflow Specialist — Workflow
# Laravelワークフロースペシャリスト — ワークフロー
# Chuyen Gia Luong Cong Viec Laravel — Luong Cong Viec

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Workflows
**Aspect**: Multi-Step Workflows
**Category**: workflow
**Purpose**: Knowledge provider for Laravel workflow patterns — multi-step workflows, state persistence, rollback/compensation, approval workflows, pipeline-based workflows, and workflow monitoring

---

## Metadata

```json
{
  "id": "laravel-workflow-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Workflows",
  "aspect": "Multi-Step Workflows",
  "category": "workflow",
  "subcategory": "php-laravel",
  "lines": 490,
  "token_cost": 3300,
  "version": "1.0.0",
  "evidence": [
    "E1: State machine pattern — explicit state transitions with validation",
    "E2: Pipeline pattern — Laravel Pipeline for sequential step execution",
    "E3: Saga pattern — compensating transactions for distributed operations",
    "E4: Event-driven workflows — decoupled step execution via events"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 370.1–370.6 |
| **Directory Pattern** | `app/Workflows/`, `app/Services/`, `app/States/` |
| **Naming Convention** | `{Domain}Workflow.php`, `{Domain}State.php` |
| **Imports From** | Domain (models, repositories), Infrastructure (external services) |
| **Imported By** | Presentation (controllers), Infrastructure (queue jobs) |
| **Cannot Import** | Presentation layer |
| **Dependencies** | `illuminate/pipeline`, `illuminate/events` |
| **When To Use** | Order processing, onboarding, approval chains, multi-step business processes |
| **Source Skeleton** | `app/Workflows/{Domain}Workflow.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel workflow patterns — state machines, pipelines, sagas, approvals |
| **Activation Trigger** | keywords: workflow, state machine, approval, multi-step, saga, compensation, pipeline |

---

## Role

You are a **Laravel Workflow Specialist**. Your responsibility is to provide best practices for Laravel 11+ workflow implementation — multi-step business processes, state machine patterns, step rollback and compensation (saga pattern), approval workflows, pipeline-based workflows, and workflow monitoring.

**Used by**: Any code agent implementing business process workflows in Laravel
**Not used by**: Non-Laravel stacks, simple CRUD applications without multi-step processes

---

## Patterns

### Pattern 370.1: Multi-Step Workflows

**Category**: Workflow Definition
**Description**: Define multi-step workflows with explicit state transitions and step execution.

```php
<?php

declare(strict_types=1);

namespace App\Workflows;

use App\Models\Order;
use App\Workflows\Steps\ValidateOrderStep;
use App\Workflows\Steps\ProcessPaymentStep;
use App\Workflows\Steps\AllocateInventoryStep;
use App\Workflows\Steps\SendConfirmationStep;

final class OrderFulfillmentWorkflow
{
    /** @var array<int, class-string<WorkflowStepInterface>> */
    private const array STEPS = [
        ValidateOrderStep::class,
        ProcessPaymentStep::class,
        AllocateInventoryStep::class,
        SendConfirmationStep::class,
    ];

    public function __construct(
        private readonly \Illuminate\Contracts\Container\Container $container,
    ) {}

    public function execute(Order $order): WorkflowResult
    {
        $context = new WorkflowContext(order: $order);

        foreach (self::STEPS as $stepClass) {
            /** @var WorkflowStepInterface $step */
            $step = $this->container->make($stepClass);

            try {
                $step->execute($context);
                $context->recordStep($stepClass, 'completed');
            } catch (\Throwable $e) {
                $context->recordStep($stepClass, 'failed', $e->getMessage());
                return WorkflowResult::failed($context, $e);
            }
        }

        return WorkflowResult::success($context);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Workflows;

interface WorkflowStepInterface
{
    public function execute(WorkflowContext $context): void;
    public function compensate(WorkflowContext $context): void;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Workflows;

use App\Models\Order;

final class WorkflowContext
{
    /** @var array<int, array{step: string, status: string, error?: string}> */
    private array $stepResults = [];

    /** @var array<string, mixed> */
    private array $data = [];

    public function __construct(
        public readonly Order $order,
    ) {}

    public function recordStep(string $step, string $status, ?string $error = null): void
    {
        $this->stepResults[] = array_filter([
            'step' => $step,
            'status' => $status,
            'error' => $error,
        ]);
    }

    public function set(string $key, mixed $value): void
    {
        $this->data[$key] = $value;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->data[$key] ?? $default;
    }

    /** @return array<int, array{step: string, status: string, error?: string}> */
    public function getStepResults(): array
    {
        return $this->stepResults;
    }
}
```

**Key Points**:
- Steps are defined as ordered class references — explicit execution sequence
- `WorkflowContext` carries shared state between steps — avoids step coupling
- Each step is resolved from the container — supports dependency injection
- Steps record their status for monitoring and debugging
- The workflow fails fast on the first step error

---

### Pattern 370.2: Workflow State Persistence

**Category**: State Management
**Description**: Persist workflow state to survive process restarts and enable resume-from-failure.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class WorkflowExecution extends Model
{
    protected $fillable = [
        'workflow_type',
        'entity_type',
        'entity_id',
        'status',
        'current_step',
        'step_results',
        'context_data',
        'started_at',
        'completed_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'step_results' => 'array',
            'context_data' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function isResumable(): bool
    {
        return $this->status === 'failed' && $this->current_step !== null;
    }

    public function markStepCompleted(string $step): void
    {
        $results = $this->step_results ?? [];
        $results[] = ['step' => $step, 'status' => 'completed', 'at' => now()->toISOString()];

        $this->update([
            'step_results' => $results,
            'current_step' => $step,
        ]);
    }

    public function markCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    public function markFailed(string $step, string $error): void
    {
        $this->update([
            'status' => 'failed',
            'current_step' => $step,
            'error_message' => $error,
        ]);
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
        Schema::create('workflow_executions', function (Blueprint $table): void {
            $table->id();
            $table->string('workflow_type');
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->string('status')->default('pending'); // pending, running, completed, failed
            $table->string('current_step')->nullable();
            $table->json('step_results')->nullable();
            $table->json('context_data')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index(['workflow_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_executions');
    }
};
```

**Key Points**:
- Persist workflow execution to database — survives process crashes and deployments
- Track `current_step` to enable resume-from-failure
- JSON columns store step results and context data — flexible schema
- `isResumable()` identifies workflows that can be retried from the failed step
- Index by entity and workflow type for efficient querying

---

### Pattern 370.3: Step Rollback/Compensation

**Category**: Saga Pattern
**Description**: Compensating transactions to undo completed steps when a later step fails.

```php
<?php

declare(strict_types=1);

namespace App\Workflows;

use App\Models\Order;

final class SagaOrchestrator
{
    /** @var array<int, WorkflowStepInterface> */
    private array $completedSteps = [];

    /**
     * @param array<int, class-string<WorkflowStepInterface>> $steps
     */
    public function execute(array $steps, WorkflowContext $context): WorkflowResult
    {
        foreach ($steps as $stepClass) {
            $step = app($stepClass);

            try {
                $step->execute($context);
                $this->completedSteps[] = $step;
                $context->recordStep($stepClass, 'completed');
            } catch (\Throwable $e) {
                $context->recordStep($stepClass, 'failed', $e->getMessage());
                $this->compensate($context);
                return WorkflowResult::failed($context, $e);
            }
        }

        return WorkflowResult::success($context);
    }

    /**
     * Compensate in reverse order — undo completed steps.
     */
    private function compensate(WorkflowContext $context): void
    {
        foreach (array_reverse($this->completedSteps) as $step) {
            try {
                $step->compensate($context);
                $context->recordStep($step::class, 'compensated');
            } catch (\Throwable $e) {
                // Log compensation failure — manual intervention required
                \Illuminate\Support\Facades\Log::critical(
                    'Compensation failed',
                    ['step' => $step::class, 'error' => $e->getMessage()],
                );
                $context->recordStep($step::class, 'compensation_failed', $e->getMessage());
            }
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Workflows\Steps;

use App\Workflows\WorkflowContext;
use App\Workflows\WorkflowStepInterface;

final class ProcessPaymentStep implements WorkflowStepInterface
{
    public function __construct(
        private readonly \App\Services\PaymentGateway $gateway,
    ) {}

    public function execute(WorkflowContext $context): void
    {
        $charge = $this->gateway->charge(
            amount: $context->order->total,
            paymentMethod: $context->get('payment_method_id'),
        );

        $context->set('charge_id', $charge->id);
        $context->order->update(['transaction_id' => $charge->id]);
    }

    public function compensate(WorkflowContext $context): void
    {
        $chargeId = $context->get('charge_id');

        if ($chargeId) {
            $this->gateway->refund($chargeId);
            $context->order->update(['transaction_id' => null, 'status' => 'refunded']);
        }
    }
}
```

**Key Points**:
- Saga pattern: each step defines both `execute()` and `compensate()`
- Compensation runs in reverse order — last completed step compensated first
- Compensation failures are logged as critical — require manual intervention
- Store intermediate results (charge_id) in context for compensation use
- Idempotent compensation — calling compensate() twice should be safe

---

### Pattern 370.4: Approval Workflows

**Category**: Business Process
**Description**: Multi-level approval chains with role-based authorization and timeout handling.

```php
<?php

declare(strict_types=1);

namespace App\Workflows;

use App\Models\ApprovalRequest;
use App\Models\User;

final class ApprovalWorkflow
{
    /**
     * @param array<int, array{role: string, required: bool}> $approvalChain
     */
    public function initiate(
        string $entityType,
        int $entityId,
        array $approvalChain,
        User $requestor,
    ): ApprovalRequest {
        return ApprovalRequest::create([
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'requestor_id' => $requestor->id,
            'approval_chain' => $approvalChain,
            'current_level' => 0,
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);
    }

    public function approve(ApprovalRequest $request, User $approver): void
    {
        $chain = $request->approval_chain;
        $currentLevel = $request->current_level;

        // Validate approver has required role
        $requiredRole = $chain[$currentLevel]['role'] ?? null;
        if (! $approver->hasRole($requiredRole)) {
            throw new \DomainException("User lacks required role: {$requiredRole}");
        }

        // Record approval
        $approvals = $request->approvals ?? [];
        $approvals[] = [
            'level' => $currentLevel,
            'user_id' => $approver->id,
            'action' => 'approved',
            'at' => now()->toISOString(),
        ];

        $nextLevel = $currentLevel + 1;

        if ($nextLevel >= count($chain)) {
            // All levels approved — workflow complete
            $request->update([
                'approvals' => $approvals,
                'current_level' => $nextLevel,
                'status' => 'approved',
                'completed_at' => now(),
            ]);

            event(new \App\Events\ApprovalCompleted($request));
        } else {
            // Move to next approval level
            $request->update([
                'approvals' => $approvals,
                'current_level' => $nextLevel,
            ]);

            event(new \App\Events\ApprovalLevelCompleted($request, $nextLevel));
        }
    }

    public function reject(ApprovalRequest $request, User $rejector, string $reason): void
    {
        $approvals = $request->approvals ?? [];
        $approvals[] = [
            'level' => $request->current_level,
            'user_id' => $rejector->id,
            'action' => 'rejected',
            'reason' => $reason,
            'at' => now()->toISOString(),
        ];

        $request->update([
            'approvals' => $approvals,
            'status' => 'rejected',
            'completed_at' => now(),
        ]);

        event(new \App\Events\ApprovalRejected($request, $reason));
    }
}
```

**Key Points**:
- Approval chain defined as ordered array of role requirements
- `current_level` tracks which approval step is active
- Each approval/rejection is recorded with timestamp and user for audit trail
- Events fire on level completion and final approval/rejection
- `expires_at` prevents stale approval requests from blocking workflows

---

### Pattern 370.5: Pipeline-Based Workflows

**Category**: Laravel Pipeline
**Description**: Use Laravel's Pipeline for sequential step processing with shared passable context.

```php
<?php

declare(strict_types=1);

namespace App\Workflows;

use App\Workflows\Pipes\ValidateCustomerData;
use App\Workflows\Pipes\CreateAccount;
use App\Workflows\Pipes\SetupBilling;
use App\Workflows\Pipes\SendWelcomeEmail;
use App\Workflows\Pipes\ActivateSubscription;
use Illuminate\Pipeline\Pipeline;

final class OnboardingWorkflow
{
    public function __construct(
        private readonly Pipeline $pipeline,
    ) {}

    public function execute(OnboardingData $data): OnboardingData
    {
        return $this->pipeline
            ->send($data)
            ->through([
                ValidateCustomerData::class,
                CreateAccount::class,
                SetupBilling::class,
                ActivateSubscription::class,
                SendWelcomeEmail::class,
            ])
            ->thenReturn();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Workflows;

final class OnboardingData
{
    public ?int $userId = null;
    public ?string $subscriptionId = null;

    /** @var array<string, string> */
    public array $errors = [];

    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $plan,
    ) {}

    public function hasFailed(): bool
    {
        return ! empty($this->errors);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Workflows\Pipes;

use App\Models\User;
use App\Workflows\OnboardingData;
use Closure;

final class CreateAccount
{
    public function handle(OnboardingData $data, Closure $next): mixed
    {
        if ($data->hasFailed()) {
            return $next($data); // Skip if previous step failed
        }

        try {
            $user = User::create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => bcrypt(\Illuminate\Support\Str::random(32)),
            ]);

            $data->userId = $user->id;
        } catch (\Throwable $e) {
            $data->errors['create_account'] = $e->getMessage();
        }

        return $next($data);
    }
}
```

**Key Points**:
- Laravel `Pipeline` sends a passable object through an array of pipes
- Each pipe receives the data and a `$next` closure — middleware pattern
- Pipes can short-circuit by not calling `$next()` or skip on previous failures
- `thenReturn()` returns the final passable object for inspection
- Pipeline is simpler than Saga for workflows that don't need compensation

---

### Pattern 370.6: Workflow Monitoring

**Category**: Observability
**Description**: Monitor workflow execution with logging, metrics, and alerting.

```php
<?php

declare(strict_types=1);

namespace App\Workflows;

use Illuminate\Support\Facades\Log;

final class WorkflowMonitor
{
    /**
     * Log workflow lifecycle events.
     */
    public function onWorkflowStarted(string $workflowType, int $entityId): void
    {
        Log::channel('workflow')->info('Workflow started', [
            'workflow' => $workflowType,
            'entity_id' => $entityId,
            'started_at' => now()->toISOString(),
        ]);
    }

    public function onStepCompleted(string $workflowType, string $step, float $durationMs): void
    {
        Log::channel('workflow')->info('Step completed', [
            'workflow' => $workflowType,
            'step' => $step,
            'duration_ms' => $durationMs,
        ]);
    }

    public function onStepFailed(string $workflowType, string $step, \Throwable $error): void
    {
        Log::channel('workflow')->error('Step failed', [
            'workflow' => $workflowType,
            'step' => $step,
            'error' => $error->getMessage(),
            'trace' => $error->getTraceAsString(),
        ]);
    }

    public function onWorkflowCompleted(string $workflowType, int $entityId, float $totalDurationMs): void
    {
        Log::channel('workflow')->info('Workflow completed', [
            'workflow' => $workflowType,
            'entity_id' => $entityId,
            'total_duration_ms' => $totalDurationMs,
        ]);
    }

    /**
     * Get stuck workflow executions for alerting.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, \App\Models\WorkflowExecution>
     */
    public function getStuckWorkflows(int $stuckMinutes = 60): \Illuminate\Database\Eloquent\Collection
    {
        return \App\Models\WorkflowExecution::where('status', 'running')
            ->where('updated_at', '<', now()->subMinutes($stuckMinutes))
            ->get();
    }

    /**
     * Dashboard statistics.
     *
     * @return array<string, mixed>
     */
    public function getStatistics(): array
    {
        $base = \App\Models\WorkflowExecution::query();

        return [
            'total' => (clone $base)->count(),
            'running' => (clone $base)->where('status', 'running')->count(),
            'completed' => (clone $base)->where('status', 'completed')->count(),
            'failed' => (clone $base)->where('status', 'failed')->count(),
            'avg_duration_seconds' => (clone $base)
                ->where('status', 'completed')
                ->whereNotNull('completed_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) as avg_duration')
                ->value('avg_duration'),
        ];
    }
}
```

**Key Points**:
- Dedicated `workflow` log channel separates workflow logs from application logs
- Track step duration for performance bottleneck identification
- Detect stuck workflows — `running` status older than threshold indicates hung process
- Dashboard statistics provide operational visibility into workflow health
- Alert on step failures and compensation failures — critical for business processes

---

## Best Practices

- **Define explicit states** — `pending`, `running`, `completed`, `failed` — no ambiguous intermediates
- **Idempotent steps** — design steps to be safely re-executable for retry scenarios
- **Persist before executing** — save workflow state to database before each step
- **Compensate in reverse order** — last completed step compensated first (saga pattern)
- **Log every transition** — workflow debugging requires complete execution trail
- **Set timeouts on approvals** — prevent infinite pending states with `expires_at`
- **Use events for side effects** — email, notifications, metrics should be event-driven, not inline
- **Test the unhappy path** — failure and compensation paths are harder to test but more critical

---

## Abnormal Case Patterns

1. **Compensation failure** — compensating step fails, leaving inconsistent state. Fix: log as critical alert; implement manual intervention endpoint; design compensations to be idempotent.

2. **Workflow stuck in running state** — step hangs due to external service timeout. Fix: set step-level timeouts; schedule `workflow:detect-stuck` command to alert on hung workflows.

3. **Duplicate workflow execution** — same entity triggers workflow twice simultaneously. Fix: use database unique constraint on `(workflow_type, entity_type, entity_id, status)` or cache locks.

4. **Step order dependency violation** — step assumes previous step's context data but it's missing. Fix: validate required context keys at the start of each step.

5. **Approval chain bypass** — developer calls `approve()` without verifying role. Fix: enforce role check inside `ApprovalWorkflow::approve()`; never expose direct status update.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (370.1–370.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Workflow Specialist — Workflow | EPS v3.2*

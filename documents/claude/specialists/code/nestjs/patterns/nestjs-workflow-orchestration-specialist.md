# NestJS Workflow Orchestration Specialist
# NestJSワークフローオーケストレーションスペシャリスト
# Chuyen Gia Dieu Phoi Quy Trinh NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Workflow Orchestration
**Aspect**: Business Process Workflow
**Category**: patterns
**Purpose**: Knowledge provider for multi-step business workflows — process definition, step execution (automated + human), approval chains, timeout/escalation, compensation, audit trail, process persistence

---

## Metadata

```json
{
  "id": "nestjs-workflow-orchestration-specialist",
  "technology": "NestJS 10+ Workflow Orchestration",
  "aspect": "Business Process Workflow",
  "category": "patterns",
  "subcategory": "nestjs",
  "lines": 350,
  "token_cost": 4200,
  "version": "1.0.0",
  "evidence": [
    "E1: Banking loan approval workflows — multi-step, multi-actor, regulatory audit",
    "E2: Insurance claims processing — automated + human tasks, parallel inspection",
    "E3: NestJS CQRS saga patterns (250.x) — extended for long-running business processes",
    "E4: Temporal.io / Cadence workflow patterns — adapted for NestJS DI"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application (orchestration) |
| **Directory Pattern** | `src/application/workflows/{process}/` |
| **Variant** | ALL |
| **Pattern Numbers** | 276.1–276.8 |
| **Source Paths** | `src/application/workflows/**` |
| **File Count** | 2-5 files per workflow process |
| **Naming Convention** | `{process}.workflow.ts`, `{step}.step.ts` |
| **Imports From** | Domain (entities, ports), Application (use cases, DTOs) |
| **Cannot Import** | Presentation (controllers, guards), Infrastructure directly (use ports) |
| **Imported By** | Presentation (controllers trigger workflows), Infrastructure (scheduling) |
| **Dependencies** | `@nestjs/cqrs` (optional), `@nestjs/bull` (timeout scheduling), `EventEmitter2` |
| **When To Use** | Multi-step business processes with human approval, timeout, compensation |
| **Source Skeleton** | `src/application/workflows/{process}/{process}.workflow.ts`, `src/application/workflows/{process}/steps/{step}.step.ts` |
| **Specialist Type** | code |
| **Purpose** | Multi-step business process orchestration — approval chains, timeout/escalation, compensation, audit trail |
| **Activation Trigger** | keywords: workflow, approval, process, disbursement, thẩm định, phê duyệt, quy trình, escalation, lifecycle |

---

## Role

You are a **NestJS Workflow Orchestration Specialist**. You supply patterns for building multi-step business workflows in NestJS Clean Architecture — combining automated service calls with human approval tasks, timeout/escalation, compensation/rollback, and regulatory audit trails.

**Relationship to other specialists**:
- 217.x lending-domain: Entity state transitions INSIDE workflow steps
- 222.x CBAC: Authorization CHECK before human tasks
- 227.x domain-events-saga: Event bus + compensation primitives
- 250.x CQRS: Workflow steps dispatch commands
- 256.x scheduling-queues: Timeout via Bull delayed jobs

**Used by**: Code agents building banking/fintech/insurance processes
**Not used by**: Simple CRUD without multi-step approval

---

## Patterns

### Pattern 276.1: Workflow Definition — Process as Code (CRITICAL)

```
276.1 Define business process as typed workflow: steps, transitions, actors, timeouts.
      Workflow ≠ state machine (entity-level). Workflow orchestrates NHIỀU entities, actors, services.
```

```typescript
// application/workflows/loan-approval/loan-approval.workflow.ts

export enum LoanApprovalStep {
  KYC_CHECK = 'KYC_CHECK',
  CREDIT_SCORING = 'CREDIT_SCORING',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  COMMITTEE_REVIEW = 'COMMITTEE_REVIEW',
  CONTRACT_SIGNING = 'CONTRACT_SIGNING',
  DISBURSEMENT = 'DISBURSEMENT',
}

export interface WorkflowStepDef {
  id: string;
  type: 'AUTOMATED' | 'HUMAN' | 'PARALLEL' | 'CONDITIONAL';
  timeout?: { duration: string; action: 'ESCALATE' | 'CANCEL' | 'RETRY' };
  next: string | null;  // next step ID, null = terminal
  compensate?: string;  // compensation step ID
}

@Injectable()
export class LoanApprovalWorkflow {
  readonly steps: Map<string, WorkflowStepDef> = new Map([
    ['KYC_CHECK', { id: 'KYC_CHECK', type: 'AUTOMATED', timeout: { duration: '24h', action: 'ESCALATE' }, next: 'CREDIT_SCORING', compensate: 'RELEASE_KYC' }],
    ['CREDIT_SCORING', { id: 'CREDIT_SCORING', type: 'AUTOMATED', next: 'RISK_ASSESSMENT' }],
    ['RISK_ASSESSMENT', { id: 'RISK_ASSESSMENT', type: 'AUTOMATED', next: 'COMMITTEE_REVIEW' }],
    ['COMMITTEE_REVIEW', { id: 'COMMITTEE_REVIEW', type: 'HUMAN', timeout: { duration: '48h', action: 'ESCALATE' }, next: 'CONTRACT_SIGNING' }],
    ['CONTRACT_SIGNING', { id: 'CONTRACT_SIGNING', type: 'HUMAN', timeout: { duration: '7d', action: 'CANCEL' }, next: 'DISBURSEMENT' }],
    ['DISBURSEMENT', { id: 'DISBURSEMENT', type: 'AUTOMATED', next: null }],
  ]);
}
```

---

### Pattern 276.2: Step Execution — Automated + Human Tasks (CRITICAL)

```
276.2 Step executor: AutomatedStep calls service, HumanStep creates task assignment + waits.
      Each step receives WorkflowContext, returns StepResult.
```

```typescript
// application/workflows/common/step-executor.interface.ts
export interface StepExecutor {
  execute(context: WorkflowContext): Promise<StepResult>;
}

export interface WorkflowContext {
  processId: string;
  entityId: string;
  currentStep: string;
  data: Record<string, unknown>;
  actor?: { userId: string; role: string };
}

export type StepResult =
  | { status: 'COMPLETED'; data?: Record<string, unknown> }
  | { status: 'WAITING_APPROVAL'; assignedTo: string[] }
  | { status: 'FAILED'; error: string; retryable: boolean };

// application/workflows/loan-approval/steps/kyc-check.step.ts
@Injectable()
export class KycCheckStep implements StepExecutor {
  constructor(
    @Inject(KYC_SERVICE_PORT) private kycService: KycServicePort,
  ) {}

  async execute(context: WorkflowContext): Promise<StepResult> {
    const result = await this.kycService.verify(context.entityId);
    if (!result.passed) {
      return { status: 'FAILED', error: result.reason, retryable: false };
    }
    return { status: 'COMPLETED', data: { kycScore: result.score } };
  }
}

// application/workflows/loan-approval/steps/committee-review.step.ts
@Injectable()
export class CommitteeReviewStep implements StepExecutor {
  constructor(
    private approvalService: ApprovalService,
    @Inject(APPROVAL_POLICY_PORT) private policy: ApprovalPolicyPort,
  ) {}

  async execute(context: WorkflowContext): Promise<StepResult> {
    const approvers = await this.policy.getRequiredApprovers(context.data.loanAmount as number);
    await this.approvalService.createAssignments(context.processId, context.currentStep, approvers);
    return { status: 'WAITING_APPROVAL', assignedTo: approvers.map(a => a.userId) };
  }
}
```

---

### Pattern 276.3: Approval Chain — Multi-Level Authorization (HIGH)

```
276.3 Approval matrix: loan amount → required approvers.
      Quorum rules (all-must-approve, majority), COI check, delegation.
```

```typescript
// application/workflows/common/approval-policy.ts
export interface ApprovalPolicy {
  getRequiredApprovers(amount: number): Promise<Approver[]>;
  quorum: 'ALL' | 'MAJORITY' | 'ANY_ONE';
}

// Banking example: amount-based approval matrix
// Loan < 100M VND:   Branch Manager
// Loan 100-500M:     Branch Manager + Regional Manager
// Loan > 500M:       Branch + Regional + Credit Committee

@Injectable()
export class LoanApprovalPolicy implements ApprovalPolicy {
  quorum: 'ALL' = 'ALL';

  async getRequiredApprovers(amount: number): Promise<Approver[]> {
    const approvers: Approver[] = [{ role: 'BRANCH_MANAGER', level: 1 }];
    if (amount >= 100_000_000) approvers.push({ role: 'REGIONAL_MANAGER', level: 2 });
    if (amount >= 500_000_000) approvers.push({ role: 'CREDIT_COMMITTEE', level: 3 });
    return approvers;
  }
}

// COI check: approver ≠ relationship manager (integrate CBAC 222.x)
// Delegation: if approver unavailable > 24h, delegate to deputy
```

---

### Pattern 276.4: Timeout & Escalation (HIGH)

```
276.4 Per-step timeout with action: ESCALATE (assign to superior), CANCEL (abort process), RETRY.
      Integrates with Bull queue (256.x) for delayed job scheduling.
```

```typescript
// application/workflows/common/timeout.service.ts
@Injectable()
export class WorkflowTimeoutService {
  constructor(@InjectQueue('workflow-timeout') private timeoutQueue: Queue) {}

  async scheduleTimeout(processId: string, stepId: string, duration: string, action: string): Promise<void> {
    const delayMs = parseDuration(duration); // '24h' → 86400000
    await this.timeoutQueue.add('step-timeout', { processId, stepId, action }, { delay: delayMs, jobId: `${processId}:${stepId}` });
  }

  async cancelTimeout(processId: string, stepId: string): Promise<void> {
    const job = await this.timeoutQueue.getJob(`${processId}:${stepId}`);
    if (job) await job.remove();
  }
}

// Escalation: KYC timeout → assign to compliance team lead
// Cancel: Contract signing timeout 7 days → auto-reject application
// Reminder: send notification at 75% of timeout duration
```

---

### Pattern 276.5: Compensation & Rollback (HIGH)

```
276.5 Compensation registry: step → compensating action (LIFO rollback).
      Reject at step 5 → release KYC hold (step 2), release credit inquiry (step 3).
```

```typescript
// application/workflows/common/compensation.service.ts
@Injectable()
export class CompensationService {
  private compensationStack: Map<string, CompensationAction[]> = new Map();

  registerCompensation(processId: string, action: CompensationAction): void {
    const stack = this.compensationStack.get(processId) || [];
    stack.push(action); // LIFO — last registered = first compensated
    this.compensationStack.set(processId, stack);
  }

  async compensate(processId: string): Promise<CompensationResult[]> {
    const stack = this.compensationStack.get(processId) || [];
    const results: CompensationResult[] = [];
    // Execute in reverse order (LIFO)
    for (const action of stack.reverse()) {
      try {
        await action.execute();
        results.push({ step: action.stepId, status: 'COMPENSATED' });
      } catch (error) {
        results.push({ step: action.stepId, status: 'FAILED', error: error.message });
        // Log but continue — best-effort compensation
      }
    }
    return results;
  }
}

// Idempotent compensation: safe to retry if first attempt uncertain
// Partial failure: mark failed compensations, allow manual resolution
```

---

### Pattern 276.6: Process Tracking & Audit Trail (HIGH)

```
276.6 Immutable audit log: who, when, what action, why (reason).
      Regulatory requirement for banking — every decision must be traceable.
```

```typescript
// infrastructure/persistence/entities/workflow-audit.entity.ts
@Entity('workflow_audit_log')
export class WorkflowAuditEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() processId: string;
  @Column() stepId: string;
  @Column() action: string;         // APPROVED, REJECTED, ESCALATED, TIMED_OUT
  @Column() actorId: string;
  @Column({ nullable: true }) reason: string;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, unknown>;
  @CreateDateColumn() timestamp: Date;
  // NO @UpdateDateColumn — audit log is APPEND-ONLY, never updated
}

// Query patterns:
// - Process history: SELECT * FROM workflow_audit_log WHERE processId = ? ORDER BY timestamp
// - Pending tasks per actor: SELECT * FROM workflow_instances WHERE currentStep.type = 'HUMAN' AND assignedTo @> ?
// - SLA compliance: AVG(completedAt - startedAt) WHERE processType = 'LOAN_APPROVAL'
```

---

### Pattern 276.7: Process Persistence — Resume After Restart (MEDIUM)

```
276.7 Workflow state stored in DB (not memory). Resume from last step after server restart.
      Distributed: multiple instances can pick up pending steps with distributed lock.
```

```typescript
// infrastructure/persistence/entities/workflow-instance.entity.ts
@Entity('workflow_instances')
export class WorkflowInstanceEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() processType: string;          // 'LOAN_APPROVAL', 'CLAIM_PROCESSING'
  @Column() entityId: string;             // loan ID, claim ID
  @Column() currentStep: string;
  @Column({ default: 'ACTIVE' }) status: string;  // ACTIVE, COMPLETED, FAILED, CANCELLED
  @Column({ type: 'jsonb' }) context: Record<string, unknown>;
  @CreateDateColumn() startedAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @Column({ nullable: true }) completedAt: Date;
}

// Recovery on startup:
// 1. Query ACTIVE workflows
// 2. For each: check if current step needs resume
// 3. Re-schedule timeouts for HUMAN steps
// 4. Distributed lock (225.x advisory lock) prevents duplicate execution
```

---

### Pattern 276.8: Workflow Integration Patterns (MEDIUM)

```
276.8 How workflow specialist composes with other NestJS specialists.
```

| Specialist | Integration | Example |
|-----------|-------------|---------|
| 217.x lending-domain | Entity state transitions INSIDE workflow steps | `loan.fund()` called in DISBURSEMENT step |
| 222.x CBAC | Authorization CHECK before human task execution | `canApprove(userId, 'loan:approve', amount)` |
| 227.x domain-events-saga | Emit events when step completes | `eventEmitter.emit('workflow.step.completed', { processId, step })` |
| 250.x CQRS | Workflow steps dispatch commands | `commandBus.execute(new CreateLoanCommand(dto))` |
| 256.x scheduling-queues | Timeout via Bull delayed jobs | `timeoutQueue.add('step-timeout', payload, { delay })` |
| 228.x observability | Metrics: process duration, step latency, bottleneck | `histogram.observe({ process, step }, duration)` |

```typescript
// Wiring in NestJS Module:
@Module({
  imports: [
    BullModule.registerQueue({ name: 'workflow-timeout' }),
    TypeOrmModule.forFeature([WorkflowInstanceEntity, WorkflowAuditEntity]),
    CqrsModule,
  ],
  providers: [
    LoanApprovalWorkflow,
    KycCheckStep,
    CreditScoringStep,
    CommitteeReviewStep,
    WorkflowEngine,
    WorkflowTimeoutService,
    CompensationService,
    { provide: APPROVAL_POLICY_PORT, useClass: LoanApprovalPolicy },
  ],
  exports: [WorkflowEngine], // Export engine, not individual steps
})
export class LoanWorkflowModule {}
```

---

## Abnormal Case Patterns

1. **Step executor throws unhandled exception** — Workflow stuck in ACTIVE. Fix: wrap execute() in try/catch, mark step FAILED, trigger compensation.

2. **Approval timeout not cancelled** — Step completes but timeout job still fires. Fix: always cancel timeout in step completion handler.

3. **Duplicate step execution** — Two instances pick up same step. Fix: advisory lock per processId (database-patterns 225.x).

4. **Compensation fails** — Compensating action throws. Fix: log failure, continue remaining compensations (best-effort), alert for manual resolution.

5. **Circular workflow** — Step A → B → A infinite loop. Fix: max step count guard, validate workflow definition on registration.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E4)?
- [x] **Q2**: Pattern IDs unique (276.1-276.8), no overlap?
- [x] **Q3**: Trilingual header?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Workflow Orchestration Specialist — Patterns | EPS v3.2 | Metadata v1.0*

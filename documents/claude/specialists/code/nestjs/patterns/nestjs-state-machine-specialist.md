# NestJS State Machine Specialist
# NestJS ステートマシンスペシャリスト
# Chuyen Gia May Trang Thai NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ State Machine
**Aspect**: State Machine
**Category**: patterns
**Purpose**: State machine patterns for NestJS — XState integration, state persistence, transition guards, history tracking, workflow integration

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application (state machine logic) + Infrastructure (persistence) |
| **Variant** | ALL |
| **Pattern Numbers** | 287.1–287.5 |
| **Directory Pattern** | `src/application/state-machines/` |
| **Naming Convention** | `{entity}-state-machine.ts`, `{entity}.states.ts` |
| **Imports From** | Domain (entities, events) |
| **Imported By** | Application (use cases trigger transitions) |
| **Cannot Import** | Presentation (state logic is application concern) |
| **Dependencies** | xstate or @xstate/fsm |
| **When To Use** | Entities with complex lifecycle — orders, loans, claims, approvals |
| **Source Skeleton** | `apps/{service}/src/application/state-machines/` |
| **Specialist Type** | code |
| **Purpose** | State machine patterns for NestJS — XState integration, state persistence, transition guards, history tracking, workflow integration |
| **Activation Trigger** | files: **/state-machines/**; keywords: stateMachine, xstate, transition, guard, lifecycle, fsm |

---

## SCOPE

### What You Handle
- XState/@xstate/fsm integration with NestJS
- State persistence to database
- Transition guards (role-based, business rule)
- State history tracking (audit trail)
- Integration with workflow orchestration (276.x)

### What You DON'T Handle
- Workflow multi-step processes → `nestjs-workflow-orchestration-specialist` (276.x)
- Domain events from transitions → `nestjs-domain-events-saga-specialist` (227.x)
- CQRS command/query → `nestjs-cqrs-specialist` (250.x)

---

## Role

You are a **NestJS State Machine Specialist**. You supply patterns for implementing finite state machines for entity lifecycle management in NestJS.

---

## APPROVED PATTERNS

### Pattern 287.1: XState Integration

```typescript
import { createMachine, interpret } from 'xstate';

// Define loan lifecycle state machine
const loanMachine = createMachine({
  id: 'loan',
  initial: 'draft',
  states: {
    draft: { on: { SUBMIT: 'pending_review' } },
    pending_review: { on: { APPROVE: 'approved', REJECT: 'rejected', REQUEST_INFO: 'draft' } },
    approved: { on: { DISBURSE: 'disbursed' } },
    disbursed: { on: { REPAY: 'repaid', DEFAULT: 'defaulted' } },
    repaid: { type: 'final' },
    rejected: { type: 'final' },
    defaulted: { on: { RECOVER: 'recovered', WRITE_OFF: 'written_off' } },
    recovered: { type: 'final' },
    written_off: { type: 'final' },
  },
});

@Injectable()
export class LoanStateMachineService {
  transition(currentState: string, event: string): string {
    const nextState = loanMachine.transition(currentState, event);
    if (nextState.value === currentState && !nextState.changed) {
      throw new InvalidTransitionException(currentState, event);
    }
    return nextState.value as string;
  }

  getAvailableEvents(currentState: string): string[] {
    const stateNode = loanMachine.states[currentState];
    return stateNode ? Object.keys(stateNode.on || {}) : [];
  }
}
```

---

### Pattern 287.2: State Persistence

```typescript
// Store state in entity column — restore on load
@Entity()
export class LoanOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 50 }) status: string; // FSM state
  @Column('jsonb', { nullable: true }) stateContext: Record<string, any>; // XState context
  @UpdateDateColumn() updatedAt: Date;
}

// UseCase: transition + persist atomically
@Injectable()
export class TransitionLoanUseCase {
  constructor(
    private fsm: LoanStateMachineService,
    @Inject(LOAN_REPO) private loanRepo: LoanRepositoryPort,
  ) {}

  async execute(loanId: string, event: string, actor: string): Promise<LoanResponseDto> {
    const loan = await this.loanRepo.findById(loanId);
    const newState = this.fsm.transition(loan.status, event);

    loan.status = newState;
    loan.addTransitionHistory({ from: loan.status, to: newState, event, actor, at: new Date() });

    return LoanMapper.toResponse(await this.loanRepo.save(loan));
  }
}
```

---

### Pattern 287.3: Transition Guards

```typescript
// XState guards — role-based + business rule
const loanMachine = createMachine({
  id: 'loan',
  initial: 'pending_review',
  states: {
    pending_review: {
      on: {
        APPROVE: {
          target: 'approved',
          cond: 'canApprove', // guard function
        },
        REJECT: {
          target: 'rejected',
          cond: 'canReject',
        },
      },
    },
    // ...
  },
}, {
  guards: {
    canApprove: (context, event) => {
      return context.reviewerRole === 'SENIOR_OFFICER' && context.creditScore >= 650;
    },
    canReject: (context, event) => {
      return ['OFFICER', 'SENIOR_OFFICER'].includes(context.reviewerRole);
    },
  },
});
```

---

### Pattern 287.4: History Tracking

```typescript
// Audit trail of all state transitions
@Entity('state_transitions')
export class StateTransition {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() entityType: string;    // 'Loan', 'Order'
  @Column() entityId: string;
  @Column() fromState: string;
  @Column() toState: string;
  @Column() event: string;         // 'APPROVE', 'DISBURSE'
  @Column() actor: string;         // userId
  @Column('jsonb', { nullable: true }) metadata: Record<string, any>; // reason, comments
  @CreateDateColumn() timestamp: Date;
}

// Query: full lifecycle of an entity
async getLifecycle(entityId: string): Promise<StateTransition[]> {
  return this.repo.find({ where: { entityId }, order: { timestamp: 'ASC' } });
}
```

---

### Pattern 287.5: Workflow Integration

```typescript
// State machine as step executor within workflow (276.x)
// Workflow defines sequence, FSM defines valid transitions within each step

@Injectable()
export class LoanDisbursementWorkflow {
  constructor(
    private fsm: LoanStateMachineService,
    private paymentService: PaymentService,
  ) {}

  async execute(loanId: string): Promise<void> {
    // Step 1: Transition to disbursing (FSM validates)
    await this.transitionLoan(loanId, 'START_DISBURSEMENT');

    // Step 2: Process payment
    try {
      await this.paymentService.transfer(loanId);
      await this.transitionLoan(loanId, 'DISBURSEMENT_SUCCESS');
    } catch (err) {
      await this.transitionLoan(loanId, 'DISBURSEMENT_FAILED');
      throw err;
    }
  }
}
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | String-based if/else for state transitions | No validation, no guard support, no history | XState or custom FSM (287.1) |
| 2 | State stored only in memory | Lost on restart, inconsistent across instances | Persist to database (287.2) |
| 3 | Direct status column update without validation | Invalid transitions possible | FSM validates before save |

---

## Abnormal Case Patterns

1. **Invalid transition attempted** — UI sends APPROVE for already-approved loan. Fix: FSM throws InvalidTransitionException.
2. **Concurrent transitions** — Two approvers click simultaneously. Fix: Optimistic locking on status column (279.5).
3. **State machine definition drift** — Code updated but existing DB records have old states. Fix: Migration to map old→new states.
4. **Guard depends on external service** — Guard checks credit score via API (slow). Fix: Pre-fetch data before transition, pass in context.
5. **Circular transition loop** — draft→review→draft→review infinite loop. Fix: Add max-retry counter in context.

---

## Quality Checklist

- [ ] **Q1**: XState integration, persistence, guards, history covered?
- [ ] **Q2**: Pattern IDs unique (287.1–287.5)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Clean Architecture boundary respected (FSM in application layer)?

---

*NestJS State Machine Specialist — Pattern 287.x | EPS v10.0*

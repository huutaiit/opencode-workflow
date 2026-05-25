# React XState Specialist
# React XStateスペシャリスト
# Chuyen Gia XState React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Features (state machines in feature model layer for complex workflows) |
| **Directory Pattern** | `src/features/{name}/model/machine.ts`, `src/features/{name}/model/{flow}Machine.ts` |
| **Variant** | enterprise |
| **Pattern Numbers** | 19.1–19.12 |
| **Source Paths** | `**/model/machine.ts`, `**/model/*Machine.ts` |
| **File Count** | 2–8 machine files per project (1 per complex workflow) |
| **Naming Convention** | `{flow}Machine.ts` (e.g., `orderMachine.ts`, `wizardMachine.ts`) |
| **Imports From** | Shared (types, API services), Entities (entity types for machine context) |
| **Cannot Import** | Presentation/UI (machines are logic-only) |
| **Imported By** | Features (useMachine in components), Widgets (complex multi-feature flows) |
| **Dependencies** | `xstate:5.x`, `@xstate/react:4.x` |
| **When To Use** | Multi-step wizard forms, order/approval workflows, complex UI state with guards, parallel processes |
| **Source Skeleton** | `src/features/{name}/model/{flow}Machine.ts`, `src/features/{name}/model/__tests__/{flow}Machine.test.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate XState v5 state machines — typed states/events/context, guards, actions, services, parallel states, AntD Steps integration |
| **Activation Trigger** | files: **/model/machine.ts, **/model/*Machine.ts; keywords: xstate, stateMachine, wizard, workflow, finiteState |

---

## Evidence Sources

- E1: XState v5 official documentation (statelyai/xstate)
- E2: @xstate/react v4 — useMachine, useActor hooks
- E3: AntD Steps component integration with state machines
- E4: Statechart theory — David Harel formalism

---

## Role

You are a **React XState Specialist** for enterprise FSD projects. Your responsibility is to define state machine patterns using XState v5 for complex UI workflows. State machines prevent impossible states and make transitions explicit. Use when `useState` + `if/else` becomes unmaintainable.

**Used by**: Multi-step forms, order workflows, approval chains, complex modals
**Not used by**: Simple toggle/counter state (use useState), CRUD lists (use Zustand)

---

## Patterns

### Pattern 19.1: Machine Creation (CRITICAL)

XState v5 setup with TypeScript-first approach.

```typescript
// src/features/order/model/orderMachine.ts
import { setup, assign } from 'xstate';

interface OrderContext {
  orderId: string | null;
  items: CartItem[];
  shippingAddress: ShippingAddress | null;
  paymentMethod: PaymentMethod | null;
  error: string | null;
}

type OrderEvent =
  | { type: 'ADD_ITEMS'; items: CartItem[] }
  | { type: 'SET_SHIPPING'; address: ShippingAddress }
  | { type: 'SET_PAYMENT'; method: PaymentMethod }
  | { type: 'SUBMIT' }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL' }
  | { type: 'RETRY' };

export const orderMachine = setup({
  types: {
    context: {} as OrderContext,
    events: {} as OrderEvent,
  },
  guards: {
    hasItems: ({ context }) => context.items.length > 0,
    hasShipping: ({ context }) => context.shippingAddress !== null,
    hasPayment: ({ context }) => context.paymentMethod !== null,
    isValid: ({ context }) =>
      context.items.length > 0 &&
      context.shippingAddress !== null &&
      context.paymentMethod !== null,
  },
  actions: {
    setItems: assign({ items: (_, event) => event.items }),
    setShipping: assign({ shippingAddress: (_, event) => event.address }),
    setPayment: assign({ paymentMethod: (_, event) => event.method }),
    setError: assign({ error: (_, event) => event.data?.message ?? 'Unknown error' }),
    clearError: assign({ error: null }),
  },
}).createMachine({
  id: 'order',
  initial: 'cart',
  context: {
    orderId: null,
    items: [],
    shippingAddress: null,
    paymentMethod: null,
    error: null,
  },
  states: {
    cart: {
      on: {
        ADD_ITEMS: { actions: 'setItems' },
        SUBMIT: { target: 'shipping', guard: 'hasItems' },
      },
    },
    shipping: {
      on: {
        SET_SHIPPING: { actions: 'setShipping' },
        SUBMIT: { target: 'payment', guard: 'hasShipping' },
        CANCEL: 'cart',
      },
    },
    payment: {
      on: {
        SET_PAYMENT: { actions: 'setPayment' },
        SUBMIT: { target: 'review', guard: 'hasPayment' },
        CANCEL: 'shipping',
      },
    },
    review: {
      on: {
        CONFIRM: { target: 'submitting', guard: 'isValid' },
        CANCEL: 'payment',
      },
    },
    submitting: {
      invoke: {
        src: 'submitOrder',
        onDone: { target: 'success', actions: assign({ orderId: (_, event) => event.output.id }) },
        onError: { target: 'review', actions: 'setError' },
      },
    },
    success: { type: 'final' },
  },
});
```

---

### Pattern 19.2: Typed States + Events (CRITICAL)

XState v5 uses `setup()` for type-safe state/event/context definitions.

```typescript
// Type-safe state checking
const orderMachine = setup({
  types: {
    context: {} as OrderContext,
    events: {} as OrderEvent,
  },
}).createMachine({ /* ... */ });

// In component — state matching is type-safe
function OrderFlow() {
  const [state, send] = useMachine(orderMachine);

  if (state.matches('cart')) return <CartStep onNext={() => send({ type: 'SUBMIT' })} />;
  if (state.matches('shipping')) return <ShippingStep />;
  if (state.matches('submitting')) return <Spin tip="Submitting order..." />;
  if (state.matches('success')) return <Result status="success" title="Order placed!" />;
}
```

---

### Pattern 19.3: Guards (HIGH)

Conditional transitions — prevent invalid state changes.

```typescript
guards: {
  hasItems: ({ context }) => context.items.length > 0,
  isEmailValid: ({ context }) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(context.email),
  canProceed: ({ context }) => !context.error && context.isValid,
  isAdmin: ({ context }) => context.userRole === 'admin',
},

// Usage in transitions
on: {
  SUBMIT: [
    { target: 'adminReview', guard: 'isAdmin' },    // Admin → skip to review
    { target: 'shipping', guard: 'hasItems' },       // Normal → shipping
    // No transition if no guard matches
  ],
}
```

---

### Pattern 19.4: Actions + Side Effects (HIGH)

```typescript
actions: {
  logTransition: ({ context, event }) => {
    console.log(`Order ${context.orderId}: ${event.type}`);
  },
  notifySuccess: () => {
    message.success('Order submitted successfully!');
  },
  clearForm: assign({
    items: [],
    shippingAddress: null,
    paymentMethod: null,
    error: null,
  }),
},

// Entry/exit actions on states
states: {
  submitting: {
    entry: 'clearError',
    exit: 'logTransition',
    // ...
  },
  success: {
    entry: 'notifySuccess',
    type: 'final',
  },
}
```

---

### Pattern 19.5: Services (Invoke) (HIGH)

Async operations invoked by states.

```typescript
import { fromPromise } from 'xstate';

const orderMachine = setup({
  actors: {
    submitOrder: fromPromise(async ({ input }: { input: OrderContext }) => {
      const response = await orderService.create({
        items: input.items,
        shippingAddress: input.shippingAddress!,
        paymentMethod: input.paymentMethod!,
      });
      return response;
    }),
    validatePayment: fromPromise(async ({ input }: { input: { method: PaymentMethod } }) => {
      return await paymentService.validate(input.method);
    }),
  },
}).createMachine({
  states: {
    submitting: {
      invoke: {
        src: 'submitOrder',
        input: ({ context }) => context,
        onDone: { target: 'success', actions: assign({ orderId: ({ event }) => event.output.id }) },
        onError: { target: 'review', actions: assign({ error: ({ event }) => event.error.message }) },
      },
    },
  },
});
```

---

### Pattern 19.6: useMachine Hook (HIGH)

```typescript
import { useMachine } from '@xstate/react';

function CheckoutWizard() {
  const [state, send, actorRef] = useMachine(orderMachine);

  return (
    <div>
      {/* AntD Steps showing current state */}
      <Steps current={getStepIndex(state.value)} items={stepItems} />

      {/* Render active step */}
      {state.matches('cart') && (
        <CartForm
          items={state.context.items}
          onSubmit={(items) => {
            send({ type: 'ADD_ITEMS', items });
            send({ type: 'SUBMIT' });
          }}
        />
      )}

      {state.matches('shipping') && (
        <ShippingForm
          onSubmit={(address) => {
            send({ type: 'SET_SHIPPING', address });
            send({ type: 'SUBMIT' });
          }}
          onBack={() => send({ type: 'CANCEL' })}
        />
      )}

      {state.matches('submitting') && <Spin size="large" tip="Processing..." />}

      {state.context.error && (
        <Alert type="error" message={state.context.error} />
      )}
    </div>
  );
}
```

---

### Pattern 19.7: Parallel States (MEDIUM-HIGH)

Multiple active states simultaneously.

```typescript
const formMachine = setup({ /* ... */ }).createMachine({
  type: 'parallel',
  states: {
    validation: {
      initial: 'idle',
      states: {
        idle: { on: { VALIDATE: 'validating' } },
        validating: { invoke: { src: 'validateForm', onDone: 'valid', onError: 'invalid' } },
        valid: {},
        invalid: {},
      },
    },
    autosave: {
      initial: 'idle',
      states: {
        idle: { after: { 5000: 'saving' } },
        saving: { invoke: { src: 'saveDraft', onDone: 'idle' } },
      },
    },
  },
});
// Both validation and autosave run independently
```

---

### Pattern 19.8: Hierarchical States (MEDIUM-HIGH)

Nested sub-states for complex flows.

```typescript
states: {
  authenticated: {
    initial: 'dashboard',
    states: {
      dashboard: { on: { GO_SETTINGS: 'settings' } },
      settings: {
        initial: 'profile',
        states: {
          profile: { on: { GO_SECURITY: 'security' } },
          security: { on: { GO_PROFILE: 'profile' } },
        },
        on: { GO_DASHBOARD: 'dashboard' },
      },
    },
  },
  unauthenticated: {
    on: { LOGIN: 'authenticated' },
  },
}
```

---

### Pattern 19.9: AntD Steps Integration (HIGH)

Map machine states to AntD Steps component.

```typescript
const STEP_MAP: Record<string, number> = {
  cart: 0,
  shipping: 1,
  payment: 2,
  review: 3,
  submitting: 3,
  success: 4,
};

function getStepStatus(currentState: string, stepState: string): 'wait' | 'process' | 'finish' | 'error' {
  const current = STEP_MAP[currentState] ?? 0;
  const step = STEP_MAP[stepState] ?? 0;
  if (step < current) return 'finish';
  if (step === current) return currentState === 'submitting' ? 'process' : 'process';
  return 'wait';
}

function OrderSteps({ currentState }: { currentState: string }) {
  return (
    <Steps
      current={STEP_MAP[currentState] ?? 0}
      items={[
        { title: 'Cart', status: getStepStatus(currentState, 'cart') },
        { title: 'Shipping', status: getStepStatus(currentState, 'shipping') },
        { title: 'Payment', status: getStepStatus(currentState, 'payment') },
        { title: 'Review', status: getStepStatus(currentState, 'review') },
        { title: 'Complete', status: getStepStatus(currentState, 'success') },
      ]}
    />
  );
}
```

---

### Pattern 19.10: AntD Form + XState Wizard (MEDIUM-HIGH)

Each machine state = one form step, transitions = validation.

```typescript
function WizardForm() {
  const [state, send] = useMachine(wizardMachine);
  const [form] = Form.useForm();

  const handleNext = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      send({ type: 'SET_DATA', data: values });
      send({ type: 'NEXT' });
    } catch {
      // Validation failed — stay on current step
    }
  };

  return (
    <Form form={form} layout="vertical">
      {state.matches('step1') && <PersonalInfoFields />}
      {state.matches('step2') && <AddressFields />}
      {state.matches('step3') && <ReviewStep data={state.context} />}

      <Space>
        {!state.matches('step1') && (
          <Button onClick={() => send({ type: 'PREV' })}>Back</Button>
        )}
        <Button type="primary" onClick={handleNext}>
          {state.matches('step3') ? 'Submit' : 'Next'}
        </Button>
      </Space>
    </Form>
  );
}
```

---

### Pattern 19.11: Testing State Machines (MEDIUM)

```typescript
import { createActor } from 'xstate';

describe('orderMachine', () => {
  it('transitions from cart to shipping when items exist', () => {
    const actor = createActor(orderMachine, {
      input: { items: [{ id: '1', name: 'Widget', price: 10 }] },
    });
    actor.start();

    actor.send({ type: 'ADD_ITEMS', items: [mockItem] });
    actor.send({ type: 'SUBMIT' });

    expect(actor.getSnapshot().value).toBe('shipping');
  });

  it('blocks transition to shipping without items', () => {
    const actor = createActor(orderMachine);
    actor.start();

    actor.send({ type: 'SUBMIT' });

    expect(actor.getSnapshot().value).toBe('cart'); // Guard blocked
  });
});
```

---

### Pattern 19.12: Anti-patterns (MEDIUM)

**1. Over-engineering simple flows** — State machine for a toggle or modal open/close.
```
// FIX: useState for simple boolean state. XState for 4+ states with guards.
```

**2. God machine** — Single machine managing entire app state.
```
// FIX: One machine per workflow. Compose via parallel or spawn.
```

**3. Missing error states** — Machine hangs on API failure.
```
// FIX: Always add onError transitions in invoke blocks.
```

**4. Business logic in components** — Guards/actions defined inline in components.
```
// FIX: All logic in machine definition. Components only send events.
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (19.1–19.12)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React XState Specialist | EPS v3.2 | Metadata v2.1*

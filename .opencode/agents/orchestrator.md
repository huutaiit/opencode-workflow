# Orchestrator Agent

The orchestrator agent is responsible for managing the workflow state and triggering the appropriate commands based on the current state.

## Responsibilities

1. Initialize workflow state for new features
2. Track progress through workflow stages
3. Auto-chain commands based on state transitions
4. Enforce quality gates and approval checkpoints
5. Handle workflow resumption after interruptions

## Workflow States

The orchestrator manages the following states:

- `INITIAL`: Workflow not started
- `RESEARCHED`: Knowledge base built
- `INNOVATE_SRS`: SRS decisions pending (Part 1)
- `SRS_CREATED`: SRS document created
- `INNOVATE_TECHNICAL`: Technical decisions pending (Part 2)
- `BD_DD_CREATED`: Basic and Detail Design created
- `PLAN_CREATED`: Plan generated
- `PLAN_REVIEWED`: Plan reviewed and approved
- `EXECUTED`: Implementation completed
- `VALIDATED`: Implementation validated
- `TESTED`: Tests passed (workflow complete)

## Auto-Chain Logic

The orchestrator automatically transitions between states based on command completion:

```
/research → /innovate (Part 1) → /innovate (Part 2) → 
/design --srs → /design --basic → /design --detail → 
/design-review → /plan → /plan-review → 
/plan-optimize (if needed) → /execute → 
/validate → /test
```

## Usage

The orchestrator is typically invoked implicitly through the workflow commands. 
Users interact with the workflow by running `/research` and `/plan`, 
and the orchestrator handles the rest.

## State Persistence

Workflow state is persisted in `.opencode/workflow-state.json` 
to enable resumption after interruptions.

## Quality Gate Enforcement

The orchestrator enforces quality gates at key transitions:
- Before `/plan`: Design completeness check (D4)
- Before `/execute`: Plan quality check (Plan Review ≥95%)
- Before `/test`: Validation check (Validation score ≥90%)

## Error Handling

If a command fails or a quality gate is not met, 
the orchestrator will halt the workflow and request user intervention.
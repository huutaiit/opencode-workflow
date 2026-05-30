# Save and Display Micro-command

## Purpose
Save the generated plan, update the workflow state, and automatically trigger the plan-review step.

## Steps
1. Save the plan file (`{feature}-BASE-plan.md`) to the disk.
2. Update the workflow state to `PLAN_CREATED` using the state manager.
3. Automatically trigger the next step in the workflow: `/plan-review`.
   - This is done by returning a signal to the orchestrator (or by the orchestrator checking the state and deciding the next command).

## Output
- The plan file is saved.
- The workflow state is updated to `PLAN_CREATED`.
- The orchestrator will then run `/plan-review` (auto-chained).

## Enforcement
- This micro-command must be the last in the chain for the `/plan` command.
- It ensures that the plan is saved and the state is updated before moving to review.

## Usage
This micro-command is called automatically by the `/plan` command after the generation micro-command (for new/feature and enhancement) or after the bugfix/enhancement micro-command (for those types).
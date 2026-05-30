# Finalize Micro-command

## Purpose
Finalize the execution: provide feedback, verify all steps are done, and update the state to EXECUTED.

## Steps
1. Check that all steps in the plan have been executed (currentStep >= total steps).
2. If not, loop back to step-runner (this should not happen if the loop is correct).
3. Perform a final verification:
   - Ensure that all files in allowedFiles that were supposed to be modified have been touched (if the plan specified modifications).
   - Ensure that no files outside allowedFiles were modified (by checking the execution state or design checkpoint?).
   - This step can be lightweight; the detailed validation happens in the validate phase.
4. Update the execution-state.json to mark the execution as complete.
5. Update the design-checkpoint to mark all design elements as implemented.
6. Update the workflow state to `EXECUTED` using the state manager.
7. Return a signal to the orchestrator to auto-chain to `/validate`.

## Output
- Updated execution-state.json and design-checkpoint.
- Workflow state updated to `EXECUTED`.
- The orchestrator will then run `/validate` (auto-chained).

## Enforcement
- This micro-command must be the last in the execute chain.
- It ensures that the execution is complete and the state is updated before moving to validation.

## Usage
This micro-command is called automatically by the `/execute` command after the step-runner completes all steps.
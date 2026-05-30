# Plan Loading Micro-command

## Purpose
Load the plan, boundaries, and restore checkpoint (if resuming).

## Steps
1. Load the plan file (`{feature}-BASE-plan.md`).
2. Extract the following from the plan:
   - allowedFiles: List of files that are allowed to be modified.
   - boundaries: Architectural or layer boundaries (e.g., no direct database access from frontend).
   - checkpoints: List of checkpoints (e.g., after each file, after each component).
   - implementation steps: The ordered list of steps to execute.
3. Check for an existing execution-state.json and design-checkpoint to resume if interrupted.
   - If they exist, load them to determine the last completed step.
   - If they don't exist, initialize them (starting at step 0).
4. Set up the execution context with the loaded plan, boundaries, and checkpoint state.

## Output
- No direct file output, but sets up the execution context for the step-runner.
- The execution context includes:
   - plan: The loaded plan object.
   - boundaries: The boundaries object.
   - allowedFiles: The set of allowed files.
   - currentStep: The index of the next step to execute (from checkpoint).
   - executionState: The execution state object (to be updated by step-runner).
   - designCheckpoint: The design checkpoint object (to be updated by step-runner).

## Enforcement
- This micro-command must run after pre-gates and before step-runner.
- It ensures that the executor has the plan and boundaries, and can resume from a checkpoint.

## Usage
This micro-command is called automatically by the `/execute` command.
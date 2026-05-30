# Pre-gates Micro-command

## Purpose
Perform checks before execution: load the technology stack, validate the state, check confidence (G0), and ensure no blockers.

## Steps
1. Load the technology stack from `.opencode/config/project-config.json` to set up the environment (e.g., Node.js, Java, etc.).
2. Validate the current workflow state is `PLAN_REVIEWED` (or `PLAN_CREATED` if we are allowing direct execute after plan, but typically we require review).
   - If not, halt and request user to run the plan-review step.
3. Check the confidence threshold (G0): 
   - The plan should have a confidence score (if calculated) or we assume high confidence if the plan review passed.
   - In this simplified version, we assume that passing plan-review means confidence >=95% (or we can read a confidence value from the plan).
   - If confidence < 90%, halt and request clarification or plan optimization.
4. Ensure that the design checkpoint exists (if resuming) or initialize it.
5. Ensure that the execution-state.json exists (if resuming) or initialize it.

## Output
- No direct file output, but sets up the environment and validates prerequisites.
- If any check fails, the micro-command returns an error and halts the execute phase.

## Enforcement
- This micro-command must run first in the execute chain.
- It enforces the G0 gate (confidence >=90%) and ensures the plan is ready for execution.

## Usage
This micro-command is called automatically by the `/execute` command.
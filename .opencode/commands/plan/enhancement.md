# Enhancement Plan Micro-command

## Purpose
Generate a plan for enhancement tasks by analyzing the delta between current state and desired state.

## Steps
1. Load the evidence from the research phase (impact analysis)
2. Identify the existing functionality that needs to be modified or extended
3. Determine the changes required to implement the enhancement
4. Identify any breaking changes or compatibility issues
5. Outline the steps to implement the enhancement while maintaining backward compatibility where required
6. Estimate the effort required for the implementation and testing

## Output
- A plan file (`{feature}-BASE-plan.md`) that includes:
  - allowedFiles: List of files that are allowed to be modified
  - boundaries: Any architectural or layer boundaries that must not be crossed
  - checkpoints: Points at which to verify the enhancement (e.g., after each file change)
  - implementation steps: Step-by-step instructions for implementing the enhancement
  - test steps: Steps to verify the enhancement and ensure no regressions in existing functionality

## Enforcement
- The plan must be based solely on the evidence collected during the research phase.
- The plan must clearly delineate what is being changed vs. what is being kept the same.
- The plan must include a regression test strategy for existing functionality.

## Usage
This micro-command is called automatically by the `/plan` command when the task type is `enhancement`.
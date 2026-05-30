# Bugfix Plan Micro-command

## Purpose
Generate a plan for bugfix tasks based on evidence-based analysis.

## Steps
1. Load the evidence from the research phase (root cause analysis)
2. Identify the exact location of the bug (file, method, line)
3. Determine the fix approach (minimal change to resolve the issue)
4. Identify any tests that need to be added or modified to prevent regression
5. Outline the steps to reproduce the bug and verify the fix
6. Estimate the effort required for the fix and testing

## Output
- A plan file (`{feature}-BASE-plan.md`) that includes:
  - allowedFiles: List of files that are allowed to be modified
  - boundaries: Any architectural or layer boundaries that must not be crossed
  - checkpoints: Points at which to verify the fix (e.g., after each file change)
  - implementation steps: Step-by-step instructions for implementing the fix
  - test steps: Steps to verify the fix and ensure no regressions

## Enforcement
- The plan must be based solely on the evidence collected during the research phase.
- No enhancements or additional changes beyond the bug fix are allowed.
- The plan must include a regression test strategy.

## Usage
This micro-command is called automatically by the `/plan` command when the task type is `bugfix`.
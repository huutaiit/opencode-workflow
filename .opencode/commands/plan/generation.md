# Plan Generation Micro-command

## Purpose
Generate the implementation plan based on the loaded context and design documents.
This step creates the actual plan file that will guide the execution phase.

## Steps
1. Combine the context from context-loading and document-loading micro-commands.
2. Based on the task type (new, enhancement, bugfix) and the loaded context, generate a detailed plan.
3. The plan should include:
   - allowedFiles: List of files that are allowed to be modified (derived from design documents and impact analysis)
   - boundaries: Architectural or layer boundaries that must not be crossed (e.g., no direct DB access from frontend)
   - checkpoints: Points at which to verify the implementation (e.g., after each file change, after each component)
   - implementation steps: Step-by-step instructions for implementing the feature, bugfix, or enhancement.
   - test steps: Steps to verify the implementation and ensure no regressions.
   - effort estimate: Estimated time or story points for each step.
4. For new features, the plan may be auto-split into sub-plans if the feature is large (based on subfeatures.json or similar).
5. Write the plan to `{feature}-BASE-plan.md`.

## Output
- `{feature}-BASE-plan.md`: The plan file that will be used by the execute phase.
- Updates the workflow state to `PLAN_CREATED` (handled by save-and-display micro-command).

## Enforcement
- The plan must be based solely on the evidence and design documents; no improvisation or bonus improvements.
- The plan must respect the boundaries and allowedFiles.
- The plan must be detailed enough that a developer (or the execute engine) can follow it step by step.

## Usage
This micro-command is called automatically by the `/plan` command for new/feature and enhancement task types.
For bugfix, the bugfix micro-command generates the plan directly (simpler).
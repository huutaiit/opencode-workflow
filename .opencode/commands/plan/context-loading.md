# Context Loading Micro-command

## Purpose
Load relevant context for planning, including RAG (Retrieval-Augmented Generation), patterns, evidence, specialists, and architecture.

## Steps
1. Load the project configuration (tech stack, etc.) from `.opencode/config/project-config.json`
2. Load evidence from the research phase (`evidence.md`)
3. Load relevant code patterns based on the tech stack
4. Load specialist files (if any) that are relevant to the feature
5. Load architecture documents (if any) that are relevant to the feature
6. Combine all context into a single context window for the planning phase

## Output
- No direct file output; prepares a rich context for the generation micro-command.
- The context is passed to the next micro-command (document-loading) via the agent's state or temporary storage.

## Enforcement
- This micro-command must run after the feature-workflow micro-command (for new/features) or the bugfix/enhancement micro-command.
- It ensures that the planner has all necessary context to generate a high-quality plan.

## Usage
This micro-command is called automatically by the `/plan` command for new/feature and enhancement task types.
# Document Loading Micro-command

## Purpose
Load the design documents (SRS, Basic Design, Detail Design, API Contracts) that are relevant to the feature.

## Steps
1. Load the SRS document (`{feature}-BASE-srs.md`)
2. Load the Basic Design document (`{feature}-BASE-basic-design.md`)
3. Load the Frontend Detail Design document (`{feature}-BASE-frontend-detail-design.md`)
4. Load the Backend Detail Design document (`{feature}-BASE-backend-detail-design.md`)
5. Load the API Contracts document (`{feature}-BASE-api-contracts.md`)
6. Extract key information from each document that is relevant to implementation:
   - From SRS: Functional and non-functional requirements
   - From Basic Design: Architectural decisions, technology choices, high-level components
   - From Detail Design: Detailed component specifications, data models, API contracts
   - From API Contracts: Exact API endpoints, request/response structures
7. Combine this information into a structured format for the generation micro-command.

## Output
- No direct file output; prepares the design context for the generation micro-command.
- The design context is passed to the next micro-command (generation) via the agent's state or temporary storage.

## Enforcement
- This micro-command must run after the context-loading micro-command.
- It ensures that the plan generator has access to the approved design documents.

## Usage
This micro-command is called automatically by the `/plan` command for new/feature and enhancement task types.
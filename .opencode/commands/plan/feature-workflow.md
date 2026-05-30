# Feature Workflow Micro-command

## Purpose
Validate state and check Quality Gate D4 (design completeness) before planning.

## Steps
1. Check current state is `BD_DD_CREATED`
2. Verify that all required design documents exist:
   - SRS: `{feature}-BASE-srs.md`
   - Basic Design: `{feature}-BASE-basic-design.md`
   - Frontend Detail Design: `{feature}-BASE-frontend-detail-design.md`
   - Backend Detail Design: `{feature}-BASE-backend-detail-design.md`
   - API Contracts: `{feature}-BASE-api-contracts.md`
3. If any document is missing, halt and request user to run the appropriate design command.
4. If all documents exist, proceed to load context.

## Output
- Updates state to `PLAN_CREATED` upon successful validation (later in the chain)
- No direct file output; prepares context for next micro-command.

## Enforcement
- This micro-command must run before any plan generation.
- It enforces Quality Gate D4: All required design documents exist and are validated.
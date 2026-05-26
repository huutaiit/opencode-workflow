---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.java"
  - "**/*.py"
alwaysApply: false
---
# Quality Baseline Rules

These rules are enforced by the Quality Guard system (PostToolUse hook).
Violations of CRITICAL rules will block code generation until fixed.

## CRITICAL (Binary REJECT)

1. **Zero `any` types** — Use `unknown`, generics, or explicit types instead. Every `any` bypasses TypeScript's type system and compounds technical debt.

2. **1 centralized API client per stack** — Do NOT create multiple axios/fetch instances. Use the shared API client in `shared/api/` (React FSD) or `infrastructure/api/` (Clean Architecture). If no shared client exists, create one FIRST.

3. **i18n keys from day 1** — Do NOT hardcode user-facing strings. Use `t('key')` or equivalent i18n function. Set up i18n config in the first sub-plan if not already present.

4. **No hardcoded IPs, credentials, or environment-specific values** — Use environment variables, config files, or Docker DNS names. Never commit `192.168.x.x`, API keys, or database URLs directly in source code.

5. **Coverage config present from first SP** — Include test runner configuration (vitest.config, jest.config, or equivalent) with coverage reporting enabled from the start.

6. **No empty directories or architecture layers** — If a layer (domain/, infrastructure/) has no files, do not create it. Apply architecture patterns only when justified by actual complexity.

7. **eslint/linter zero warnings policy** — `eslint --max-warnings 0` must pass. Fix all warnings, do not suppress without justification.

## WARNING (Logged to debt tracker)

- Naming convention violations (file/variable naming)
- Import ordering inconsistencies
- Comment style deviations
- Missing JSDoc for exported functions

## How This Works

- The PostToolUse hook (`guards/hooks/quality-check.js`) runs automatically after Edit/Write operations
- CRITICAL violations block the operation (exit code 2) — Claude must fix before proceeding
- WARNING violations are logged to `quality-debt.log` for periodic consolidation
- After 3 failed fix attempts, critical violations downgrade to debt entries
- When debt exceeds threshold, consolidation skill is recommended

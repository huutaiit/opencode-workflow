# Consolidation Skill — L5 SKILL

## Purpose

Clean up accumulated technical debt from EPS code generation. This skill is triggered when `quality-debt.log` warning count exceeds the configured threshold, or manually via `/consolidate`.

## Trigger Conditions

1. **Adaptive threshold**: `quality-debt.log` open warnings > `qualityGuard.consolidation.threshold` (default: 10)
2. **Manual**: User runs `/consolidate` command
3. **End of project**: Always trigger after final sub-plan completes

## Input

- Read `{context_dir}/quality-debt.log` — list of open violations
- Read project source code in files referenced by debt entries

## Operations (Execute in Order)

### Step 1: Parse & Analyze

Read `quality-debt.log` and group entries by rule:

```
const debtTracker = require('core/quality/debt-tracker.js');
const entries = debtTracker.readAll().filter(e => e.status === 'open');

// Group by rule
const byRule = {};
for (const entry of entries) {
  if (!byRule[entry.rule]) byRule[entry.rule] = [];
  byRule[entry.rule].push(entry);
}
```

Display summary: "Found {N} open violations across {M} rules."

### Step 2: Merge Duplicate Patterns

For `no-duplicate-api` violations:
- Find all API client instances across the codebase
- Create 1 centralized API client if missing (in `shared/api/` or `infrastructure/api/`)
- Refactor all usages to import from centralized client
- Delete duplicate instances

### Step 3: Remove Dead Code

For each violation file:
- Remove unused imports (`eslint --fix` with `no-unused-imports` rule)
- Delete empty files and directories
- Remove commented-out code blocks (> 5 lines)

### Step 4: Reduce `any` Count

For `no-any` violations:
- Replace `any` with `unknown` where type is truly unknown
- Replace `any` with proper generics where type can be inferred
- Replace `any` with explicit interface/type where structure is known
- Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` ONLY for unavoidable cases (3rd party lib typing gaps)

### Step 5: DRY Audit

Find duplicate code blocks > 10 lines:
- Extract to shared utility functions
- Replace all occurrences with calls to shared function
- Ensure extracted function has proper types and documentation

### Step 6: Update Debt Log

Mark all resolved entries:

```
const debtTracker = require('core/quality/debt-tracker.js');

// Mark entries that were fixed in this consolidation
debtTracker.markConsolidated({ sp: currentSP });
```

## Output

- Modified source files (duplicates merged, dead code removed, types fixed)
- Updated `quality-debt.log` — resolved entries marked as `status: "consolidated"`, `fixedBy: "consolidation"`
- Summary: "Consolidated {N} violations. Remaining: {M} open."

## Acceptance Criteria

- All `no-duplicate-api` violations resolved (1 centralized client)
- `any` count reduced by >= 50%
- No empty directories remain
- Debt log updated with consolidated status

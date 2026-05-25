---
description: Enter REVIEW mode to validate implementation
---

╔══════════════════════════════════════════════════════════════════╗
║ EXECUTION CONSTRAINTS (MANDATORY — NO EXCEPTIONS)               ║
╠══════════════════════════════════════════════════════════════════╣
║ 1. SEQUENTIAL ONLY — Validate ONE file/dimension at a time.     ║
║    NO parallel validation agents.                                ║
║ 2. FOUR-PASS SEQUENTIAL — Pass 1 (per-file) → Pass 2            ║
║    (per-dimension) → Pass 3 (code review) → Pass 4 (coherence). ║
║ 3. CHECKPOINT REQUIRED — Each file/dimension checkpointed        ║
║    before proceeding to next.                                    ║
╚══════════════════════════════════════════════════════════════════╝

---

## Step 0.5: Stack Context Loading v5.4

```bash
node core/cli/ops.js stack-load
```

Parse `cache/ops-result.json` → extract `stackKey`, `variantId`, `language`, `framework`.

---

## Step 0.6: Workflow State Validation

Invoke the **workflow-state-validator** skill:
- Expected state: EXECUTED
- If FAIL: STOP — execution must be complete before validation
- If PASS: Continue

```pseudo
design-checkpoint --action skill-gate --skill workflow-state-validator --command validate --result {PASS|FAIL}
```

---

## Step 0.7: Quality Gate G3

Run tests before validation:

```bash
# Backend tests (Java/Spring Boot)
if [ -f "pom.xml" ]; then
  echo "Running backend tests..."
  mvn test -q || echo "❌ BACKEND TESTS FAILED"
fi

# Frontend tests (Next.js)
if [ -f "package.json" ]; then
  echo "Running frontend tests..."
  npm test -- --passWithNoTests || echo "❌ FRONTEND TESTS FAILED"
fi
```

```pseudo
design-checkpoint --action skill-gate --skill quality-gate-G3 --command validate --result {PASS|FAIL}
```

If any check fails, output failure details and STOP.

---

## Step 1: Load Plan + Implementation Context

```pseudo
CONTEXT_DIR = findActiveContext()
PLAN_FILE = ls -t $CONTEXT_DIR/plans/*-implementation-plan.md | head -1
EXEC_STATE_FILE = $CONTEXT_DIR/execution-checkpoints/execution-state.json

# Extract changed files from execution-state.json
changedFiles = []
for step in execState.steps:
  if step.status === 'completed' AND step.files:
    changedFiles.push(...step.files)
changedFiles = deduplicate(changedFiles)

# Fallback: git diff if execution-state lacks files field
if changedFiles.length === 0:
  changedFiles = git diff --name-only HEAD~N HEAD -- '*.java' '*.ts' '*.tsx' '*.js'
```

---

## Step 1.5: RAG Context for Validation

```pseudo
# HippoRAG integration — replaces dead CodeIndexer
HippoRAGService.getInstance('validate', 'dev')
rag.getArchitectureViolations() → known violations

# Non-blocking on failure
```

---

## Step 2: Initialize Enforcement

```pseudo
design-checkpoint --action reset --type validate
design-checkpoint --action skill-reset --command validate

TodoWrite([
  # One entry per changedFile for Pass 1
  # + 2 entries for Pass 2 (Architecture, PlanCompliance)
  # + 1 entry for Pass 3 (Code Review)
  # + 1 entry for Aggregate & Report
])
```

---

## PASS 1: Per-File Validation (D4 — per-file specialist check)

For EACH changed file, validate against specialist patterns and architecture rules:

```pseudo
perFileScores = []

for fileIndex = 0 to changedFiles.length - 1:
  file = changedFiles[fileIndex]

  # ─────────────────────────────────────────────────────
  # 1.A: Verify checkpoint
  # ─────────────────────────────────────────────────────
  checkResult = design-checkpoint --action verify --section fileIndex --type validate
  if already completed → skip

  # ─────────────────────────────────────────────────────
  # 1.B: Load specialist
  # ─────────────────────────────────────────────────────
  specialistResult = specialist-load --type code --source-path file \
    --parse-metadata --filter-variant
  specialist = specialistResult.specialists[0] || null
  metadata = specialist?.metadata || null

  # ─────────────────────────────────────────────────────
  # 1.C: Load graph context
  # ─────────────────────────────────────────────────────
  contextResult = design-context --section 0 --type validate --module file
  graphContext = { expectedPatterns, violations }

  # ─────────────────────────────────────────────────────
  # 1.D: Validate against 4 criteria
  # ─────────────────────────────────────────────────────
  fileContent = readFile(file)

  score = {
    naming: 0,       # 20% weight — naming conventions from metadata
    patterns: 0,     # 30% weight — specialist pattern compliance
    architecture: 0, # 25% weight — import rules from metadata
    planCompliance: 0 # 25% weight — file in allowedFiles
  }

  # D.1: Naming Convention (20%)
  if metadata AND metadata.namingConvention:
    score.naming = (actualName matches convention) ? 100 : 50
  else:
    score.naming = 80  # No specialist → partial score

  # D.2: Pattern Compliance (30%)
  if specialist:
    score.patterns = evaluatePatternCompliance(fileContent, specialist.content)
  else:
    score.patterns = 70  # Generic check

  # D.3: Architecture Rules (25%)
  if metadata:
    actualImports = extractImports(fileContent)
    forbiddenImports = metadata.cannotImport || []
    importViolations = actualImports.filter(imp → forbidden)
    score.architecture = violations === 0 ? 100 : max(0, 100 - violations * 25)
  else:
    score.architecture = 80

  # D.4: Plan Compliance (25%)
  score.planCompliance = boundaries.allowedFiles.includes(file) ? 100 : 0

  # ─────────────────────────────────────────────────────
  # Weighted total
  # ─────────────────────────────────────────────────────
  fileScore = round(
    score.naming * 0.20 + score.patterns * 0.30 +
    score.architecture * 0.25 + score.planCompliance * 0.25
  )

  # Variant warning penalty
  if specialist?.variantWarning:
    fileScore = max(fileScore - 10, 0)

  perFileScores.push({ file, fileScore, details: score })

  # ─────────────────────────────────────────────────────
  # Checkpoint complete
  # ─────────────────────────────────────────────────────
  design-checkpoint --action complete --section fileIndex --type validate --file file
  TodoWrite.update(fileIndex, "completed")
```

---

## PASS 2: Per-Dimension Quality Gates (D4 — 1 run per gate)

Pass 2 runs ONCE for the entire suite. It starts ONLY after Pass 1 completes.

```pseudo
dimensionScores = {}

# ─────────────────────────────────────────────────────
# 2.A: Architecture Analyzer (invoke skill)
# ─────────────────────────────────────────────────────
# skill: architecture-analyzer
# Cross-file: dependency direction, layer violations, circular deps
archResult = invoke architecture-analyzer
dimensionScores.architecture = archResult.complianceScore || 0
TodoWrite.update("Architecture", "completed")

# ─────────────────────────────────────────────────────
# 2.B: Plan Compliance Gate (replaces T-COV/T-QUAL)
# ─────────────────────────────────────────────────────
# CHECK 1: Tất cả files trong Plan Section 0.1 đã được tạo/sửa chưa?
plannedFiles = extractFilesFromPlan(planContent, "Section 0.1")
implementedFiles = changedFiles  # từ execution-state.json hoặc git diff
missingFiles = plannedFiles.filter(f => !implementedFiles.includes(f))
fileCompleteness = (plannedFiles.length - missingFiles.length) / plannedFiles.length * 100

# CHECK 2: Tất cả methods trong Plan Section 0.2 đã implement chưa?
plannedMethods = extractMethodsFromPlan(planContent, "Section 0.2")
# Source 1: execution-state.json (steps[].summary tracks completed methods per step)
completedSteps = execState.steps.filter(s => s.status == "completed")
implementedMethods = completedSteps.flatMap(s => s.methods || [])
# Source 2 (fallback): Claude text-search trong file content
if implementedMethods.length == 0:
  for file in implementedFiles:
    fileContent = readFile(file)
    for method in plannedMethods:
      if fileContent contains method.name:
        implementedMethods.push(method.name)
missingMethods = plannedMethods.filter(m => !implementedMethods.includes(m.name))
methodCompleteness = (plannedMethods.length - missingMethods.length) / plannedMethods.length * 100

# CHECK 3: Test files từ Plan Section 3.3 đã được tạo chưa?
plannedTestFiles = extractFilesFromPlan(planContent, "Section 3.3")
existingTestFiles = plannedTestFiles.filter(f => fileExists(f))
testCompleteness = plannedTestFiles.length > 0
  ? existingTestFiles.length / plannedTestFiles.length * 100
  : 100  # Nếu plan không có test files → 100%

# SCORING: files 40% + methods 40% + test files 20%
dimensionScores.planCompliance = round(
  fileCompleteness * 0.40 +
  methodCompleteness * 0.40 +
  testCompleteness * 0.20
)

# REPORT missing items
if missingFiles.length > 0:
  log("⚠️ Missing files: " + missingFiles.join(", "))
if missingMethods.length > 0:
  log("⚠️ Missing methods: " + missingMethods.join(", "))
if plannedTestFiles.length > existingTestFiles.length:
  missingTestFiles = plannedTestFiles.filter(f => !existingTestFiles.includes(f))
  log("⚠️ Missing test files: " + missingTestFiles.join(", "))

TodoWrite.update("PlanCompliance", "completed")

# ─────────────────────────────────────────────────────
# Checkpoint complete Pass 2
# ─────────────────────────────────────────────────────
design-checkpoint --action complete --section pass2 --type validate
```

---

## PASS 3: Code Review (Logic Review — R1-R5)

Pass 3 runs AFTER Pass 2 completes. It dispatches to the code-review micro-command
for logic review against design documents and specialist patterns.

### Pre-dispatch: Initialize fallback state

```pseudo
# Default: Pass 3 disabled (overridden if micro-command succeeds)
pass3Enabled = false
pass3Score = null
pass3Findings = []
pass3DimensionScores = {}
pass3SummaryTable = []
```

### Dispatch to code-review micro-command

Use the **Read tool** to load `commands/validate/code-review.md` and follow its
instructions completely until it returns control here.

The micro-command will use `changedFiles` and `CONTEXT_DIR`
from conversation context (computed in Step 1 above).

After code-review.md completes, the following variables will be available in
conversation context: `pass3Score`, `pass3Findings`, `pass3DimensionScores`,
`pass3SummaryTable`, `pass3Enabled`.

**If code-review.md cannot be loaded** (file missing or Read fails):
Log warning and continue with Pass 1+2 scoring only (fallback weights 60%/20%/20%).

### Post-dispatch: Checkpoint

```pseudo
# Verify Pass 3 completed
if NOT pass3Enabled:
  log("Pass 3 Code Review skipped — using Pass 1+2 scoring (60%/20%/20% weights)")

design-checkpoint --action complete --section pass3 --type validate
```

---

## Step 4.5: Pass 4 — Feature Coherence (Cross-Component Analysis)

Pass 4 runs AFTER Pass 3 completes. It dispatches to the feature-coherence micro-command
for cross-component dependency graph analysis and coherence scoring.

### Pre-dispatch: Initialize fallback state

```pseudo
# Default: Pass 4 disabled (overridden if micro-command succeeds)
pass4Enabled = false
pass4Score = null
pass4Findings = {}
```

### Dispatch to feature-coherence micro-command

Use the **Read tool** to load `commands/validate/feature-coherence.md` and follow its
instructions completely until it returns control here.

After feature-coherence.md completes, the following variables will be available in
conversation context: `pass4Score`, `pass4Findings`, `pass4Enabled`.

**If feature-coherence.md cannot be loaded** (file missing or Read fails):
Log warning and continue with Pass 1+2+3 scoring only.

### Post-dispatch: Checkpoint

```pseudo
if NOT pass4Enabled:
  log("Pass 4 Feature Coherence skipped — using Pass 1+2+3 scoring")

design-checkpoint --action complete --section pass4 --type validate
```

---

## Step 5: Aggregate Scoring + Report

Combine per-file, per-dimension, code review, and coherence scores with weighted aggregate:

```pseudo
# ═══════════════════════════════════════════════════════════════
# Weighted aggregate (4-pass): 35% per-file + 15% per-dimension + 35% code review + 15% coherence
# Fallback (3-pass): 40% per-file + 20% per-dimension + 40% code review (when Pass 4 unavailable)
# Fallback (2-pass): 60% per-file + 40% per-dimension (when Pass 3+4 unavailable)
# ═══════════════════════════════════════════════════════════════
avgFileScore = avg(perFileScores.map(s → s.fileScore))
avgDimensionScore = round(
  (dimensionScores.architecture + dimensionScores.planCompliance) / 2
)

if pass3Enabled AND pass4Enabled:
  # 4-pass: 35% per-file + 15% per-dimension + 35% code review + 15% coherence
  aggregateScore = round(
    avgFileScore * 0.35 +
    dimensionScores.architecture * 0.075 +
    dimensionScores.planCompliance * 0.075 +
    pass3Score * 0.35 +
    pass4Score * 0.15
  )
elif pass3Enabled:
  # 3-pass fallback (Pass 4 unavailable)
  aggregateScore = round(
    avgFileScore * 0.40 +
    dimensionScores.architecture * 0.10 +
    dimensionScores.planCompliance * 0.10 +
    pass3Score * 0.40
  )
else:
  # 2-pass fallback (Pass 3+4 unavailable)
  aggregateScore = round(
    avgFileScore * 0.60 +
    dimensionScores.architecture * 0.20 +
    dimensionScores.planCompliance * 0.20
  )

# ═══════════════════════════════════════════════════════════════
# Generate validation report as markdown (inline — no external reporter)
# ═══════════════════════════════════════════════════════════════
timestamp = new Date().toISOString()
reportLines = []
reportLines.push("# Validation Report")
reportLines.push("")
reportLines.push("| Property | Value |")
reportLines.push("|----------|-------|")
reportLines.push("| Feature | " + feature + " |")
reportLines.push("| Date | " + timestamp + " |")
reportLines.push("| Aggregate Score | " + aggregateScore + "% |")
reportLines.push("| Result | " + (aggregateScore >= 90 ? "PASS ✅" : "FAIL ❌") + " |")
reportLines.push("")

# Pass 1: Per-File Scores
reportLines.push("## Pass 1: Per-File Validation (weight: " + (pass3Enabled ? "40%" : "60%") + ")")
reportLines.push("")
reportLines.push("| File | Score | Naming | Patterns | Architecture | Plan |")
reportLines.push("|------|-------|--------|----------|-------------|------|")
for each fs in perFileScores:
  d = fs.details
  reportLines.push("| " + fs.file + " | " + fs.fileScore + "% | " + d.naming + " | " + d.patterns + " | " + d.architecture + " | " + d.planCompliance + " |")
reportLines.push("")
reportLines.push("**Average**: " + avgFileScore + "%")
reportLines.push("")

# Pass 2: Dimension Scores
reportLines.push("## Pass 2: Dimension Quality Gates (weight: " + (pass3Enabled ? "20%" : "40%") + ")")
reportLines.push("")
reportLines.push("| Dimension | Score |")
reportLines.push("|-----------|-------|")
reportLines.push("| Architecture | " + dimensionScores.architecture + "% |")
reportLines.push("| Plan Compliance | " + dimensionScores.planCompliance + "% |")
reportLines.push("")
reportLines.push("**Average**: " + avgDimensionScore + "%")
reportLines.push("")

# Pass 3: Code Review (if enabled)
if pass3Enabled:
  reportLines.push("## Pass 3: Code Review (weight: 40%)")
  reportLines.push("")
  reportLines.push("| Dimension | Score | Findings | Status |")
  reportLines.push("|-----------|-------|----------|--------|")
  for each row in pass3SummaryTable:
    reportLines.push("| " + row.dim + " | " + row.score + " | " + row.findings + " | " + row.status + " |")
  reportLines.push("")
  reportLines.push("**Pass 3 Score**: " + pass3Score + "%")
  reportLines.push("")

  if pass3Findings.length > 0:
    reportLines.push("### Findings")
    reportLines.push("")
    for each finding in pass3Findings:
      reportLines.push("#### [" + finding.dimension + "] " + finding.severity + " — " + finding.title)
      reportLines.push("**File**: " + finding.file)
      reportLines.push("**Source**: " + finding.source)
      reportLines.push("**Issue**: " + finding.issue)
      reportLines.push("**Expected**: " + finding.expected)
      reportLines.push("**Fix**: " + finding.fix)
      reportLines.push("")
else:
  reportLines.push("## Pass 3: Code Review — SKIPPED")
  reportLines.push("")

# Aggregate formula
reportLines.push("## Aggregate")
reportLines.push("")
if pass3Enabled:
  reportLines.push("Formula: 40% Pass1 + 20% Pass2 + 40% Pass3")
else:
  reportLines.push("Formula: 60% Pass1 + 40% Pass2")
reportLines.push("**Score**: " + aggregateScore + "%")

report = reportLines.join("\n")
reportPath = CONTEXT_DIR + "/validation-report.md"
writeFile(reportPath, report)

# Display summary
log("═══════════════════════════════════════════════════════════════")
log("📊 Validation Report")
log("═══════════════════════════════════════════════════════════════")
if pass3Enabled:
  log("  Per-file (Pass 1):    " + avgFileScore + "% (weight: 40%)")
  log("  Dimensions (Pass 2):  " + avgDimensionScore + "% (weight: 20%)")
  log("  Code Review (Pass 3): " + pass3Score + "% (weight: 40%)")
  log("    R1 Business Logic:  " + (pass3DimensionScores.R1 || "SKIP"))
  log("    R2 API Contract:    " + (pass3DimensionScores.R2 || "SKIP"))
  log("    R3 Edge Cases:      " + (pass3DimensionScores.R3 || "SKIP"))
  log("    R4 Abnormal Cases:  " + (pass3DimensionScores.R4 || "SKIP"))
  log("    R5 Specialist:      " + pass3DimensionScores.R5)
  log("    Findings:           " + pass3Findings.length)
else:
  log("  Per-file (Pass 1):    " + avgFileScore + "% (weight: 60%)")
  log("  Dimensions (Pass 2):  " + avgDimensionScore + "% (weight: 40%)")
  log("  Code Review (Pass 3): SKIPPED")
log("  ─────────────────────────────────────────────")
log("  Aggregate score:      " + aggregateScore + "%")
log("  Result: " + (aggregateScore >= 90 ? "PASS ✅" : "FAIL ❌"))
log("═══════════════════════════════════════════════════════════════")
```

---

## Step 6: Feedback Integration

Emit validation events via the feedback module (correct paths):

```javascript
// FIX [V3]: .claude/utils/feedback → core/feedback
const { EventLogger, getEventBus } = require('./core/feedback/index.js');

const eventBus = getEventBus();
eventBus.emit('validate:complete', {
  feature, aggregateScore, passed: aggregateScore >= 90,
  perFileScores: perFileScores.length, timestamp: new Date().toISOString()
});
```

**Non-blocking**: Feedback logging failures do not interrupt validation.

---

## Step 7: State Transition

Verify all checkpoints and transition state based on aggregate score:

```pseudo
# ═══════════════════════════════════════════════════════════════
# Verify all checkpoints
# ═══════════════════════════════════════════════════════════════
design-checkpoint --action verify-all --type validate
design-checkpoint --action skill-verify --skills "architecture-analyzer,plan-compliance" --mode strict

# ═══════════════════════════════════════════════════════════════
# State transition
# ═══════════════════════════════════════════════════════════════
if aggregateScore >= 90:
  # PASS → transition to VALIDATED (state-manager.js: validate → VALIDATED)
  node core/state/state-manager.js update VALIDATED
  log("═══════════════════════════════════════════════════════════════")
  log("✅ Validation PASSED — state updated to VALIDATED")
  log("═══════════════════════════════════════════════════════════════")
  log("  Score: " + aggregateScore + "% (≥90% threshold)")
  log("  Next: Ready for /test.")
  log("═══════════════════════════════════════════════════════════════")
else:
  # FAIL → stay at EXECUTED
  log("═══════════════════════════════════════════════════════════════")
  log("❌ Validation FAILED — state remains EXECUTED")
  log("═══════════════════════════════════════════════════════════════")
  log("  Score: " + aggregateScore + "% (< 90% threshold)")
  log("  Review report: " + reportPath)
  log("  Fix issues and re-run /validate")
  log("═══════════════════════════════════════════════════════════════")
```

---

## Validation Summary

The `/validate` command performs a **three-pass validation**:

### Pass 1: Per-File Specialist Validation
- Load specialist via `specialist-load --source-path`
- Load graph context via `design-context --type validate`
- Score 4 criteria: naming (20%), patterns (30%), architecture (25%), plan compliance (25%)
- Checkpoint each file completion

### Pass 2: Per-Dimension Quality Gates
- Architecture analyzer — structural compliance check
- Plan Compliance gate — files (40%), methods (40%), test files (20%)
- Runs ONCE for entire suite

### Pass 3: Code Review (Logic Review)
- **Phase A** (per-file): Specialist depth review — pattern correctness (R5)
- **Phase B** (per-feature): Logic review against design documents (R1-R4)
  - R1 Business Logic (BD or evidence.md) — component-responsibility verification
  - R2 API Contract (DD api-contracts) — endpoint spec matching (feature tasks only)
  - R3 Edge Cases (DD pseudo or evidence) — boundary condition coverage
  - R4 Abnormal Cases (Plan Section 3.1) — error handling + test coverage
- Adapts to task type: feature (all R1-R5), enhancement/bugfix (R1+R3+R4+R5), hotfix (R5 only)
- Micro-command: `validate/code-review.md`

### Aggregate
- With Pass 3: 40% Pass 1 + 20% Pass 2 + 40% Pass 3
- Without Pass 3 (fallback): 60% Pass 1 + 40% Pass 2
- ≥90% → VALIDATED state transition
- <90% → stays EXECUTED, review report generated

---

## RETURN

Validation complete. Control returns to the calling router (if auto-chained from `/execute`).
If invoked standalone, pipeline ends here.

**DO NOT chain to /test from here.** The caller (execute.md router) handles that decision.

<!-- RETURN to execute.md — router handles auto-chain to /test -->

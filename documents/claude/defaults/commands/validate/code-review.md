---
description: Pass 3 Code Review — logic review against design documents and specialist patterns
user-invocable: false
---

# validate/code-review.md — Pass 3: Code Review

> **Purpose**: Review implementation logic against design documents (BD/DD), plan abnormal cases, and specialist patterns.
> **Scope**: Per-feature (cross-file logic review) + per-file (specialist depth).
> **Runs after**: Pass 1 (per-file structure) + Pass 2 (per-dimension gates) complete.
> **Returns**: `pass3Score` + `pass3Findings` to validate.md for aggregate scoring.

---

## Step 0: Load Design Documents (Lazy)

Detect task type from context and determine which documents are available:

```pseudo
CONTEXT_DIR = findActiveContext()
TASK_TYPE = extractTaskType(CONTEXT_DIR + "/context.md")

# Resolve document directories
PLANS_DIR = CONTEXT_DIR + "/plans"

# Design documents (BD, DD) — canonical resolution from quality-gates.js
# Checks: 1) contextPath/documents/ 2) project-config.json#documentsPath
const { findDocumentsDir } = require('./guards/gates/quality-gates.js')
FEATURE_ID = extractFeatureId(CONTEXT_DIR + "/context.md")
DOCS_DIR = findDocumentsDir(FEATURE_ID, CONTEXT_DIR)

if NOT DOCS_DIR:
  log("ℹ️ No design documents found — R1/R2/R3 will use evidence.md fallback")

# Document source mapping per task type
documentSources = {
  "new": {
    R1: "BD",           # Basic Design — component-responsibility pairs
    R2: "DD_API",       # DD api-contracts.md — endpoint specs
    R3: "DD_PSEUDO",    # DD pseudo-code — boundary conditions
    R4: "PLAN_3_1",     # Plan Section 3.1 — abnormal test cases
    R5: "SPECIALIST"    # Specialist patterns + abnormal cases
  },
  "enhancement": {
    R1: "EVIDENCE",     # evidence.md replaces BD
    R2: null,           # skip — no API contracts for enhancement
    R3: "EVIDENCE",     # evidence.md replaces DD pseudo
    R4: "PLAN_3_1",     # Plan Section 3.1
    R5: "SPECIALIST"
  },
  "bugfix": {
    R1: "EVIDENCE",
    R2: null,
    R3: "EVIDENCE",
    R4: "PLAN_3_1",
    R5: "SPECIALIST"
  },
  "hotfix": {
    R1: null,
    R2: null,
    R3: null,
    R4: null,
    R5: "SPECIALIST"    # Only specialist patterns for hotfix
  }
}

sources = documentSources[TASK_TYPE] || documentSources["enhancement"]
```

### Lazy Loading (load only when dimension needs it)

```pseudo
loadedDocs = {}  # Cache — load once, reuse across dimensions

function lazyLoad(docKey):
  if docKey in loadedDocs:
    return loadedDocs[docKey]

  content = null

  if docKey == "BD":
    bdPath = findFile(DOCS_DIR, "*-basic-design.md")
    content = bdPath ? readFile(bdPath) : null

  elif docKey == "DD_API":
    apiPath = findFile(DOCS_DIR, "*-api-contracts.md")
    content = apiPath ? readFile(apiPath) : null

  elif docKey == "DD_PSEUDO":
    pseudoPath = findFile(DOCS_DIR, "*-detail-design.pseudo") ||
                 findFile(DOCS_DIR, "*-detail-design.md")
    content = pseudoPath ? readFile(pseudoPath) : null

  elif docKey == "PLAN_3_1":
    planPath = findFile(PLANS_DIR, "*-implementation-plan.md")
    if planPath:
      planContent = readFile(planPath)
      content = extractSection(planContent, "3.1 Per-Step Test Cases")

  elif docKey == "EVIDENCE":
    evidencePath = CONTEXT_DIR + "/evidence.md"
    content = fileExists(evidencePath) ? readFile(evidencePath) : null

  loadedDocs[docKey] = content
  return content
```

---

## Phase A: Per-File Specialist Depth Review (R5)

**Scope**: Each changed file individually.
**Purpose**: Verify code FOLLOWS specialist patterns correctly (deeper than Pass 1 which checks existence).

```pseudo
phaseA_scores = []

for each file in changedFiles:
  # ─────────────────────────────────────────────────────
  # A.1: Load specialist (independent from Pass 1)
  # ─────────────────────────────────────────────────────
  specialistResult = specialist-load --type code --source-path file
  specialist = specialistResult.specialists[0] || null

  if NOT specialist:
    phaseA_scores.push({ file, score: 70, findings: [], note: "No specialist found — generic check" })
    continue

  # ─────────────────────────────────────────────────────
  # A.2: Extract specialist PATTERNS + ABNORMAL sections
  # specialist.content already loaded by specialist-load (no re-read needed)
  # ─────────────────────────────────────────────────────
  patterns = extractSection(specialist.content, "Patterns")
  abnormalCases = extractSection(specialist.content, "Abnormal Case Patterns")

  # ─────────────────────────────────────────────────────
  # A.3: Read file content
  # ─────────────────────────────────────────────────────
  fileContent = readFile(file)

  # ─────────────────────────────────────────────────────
  # A.4: Compare — pattern correctness review
  # ─────────────────────────────────────────────────────
  # Claude reads both specialist patterns and file content, then:
  # - Checks: Does code follow pattern CORRECTLY? (not just "has pattern")
  # - Checks: Does code avoid anti-patterns listed in specialist?
  # - Checks: Does code handle abnormal cases listed in specialist?
  #
  # This is SEMANTIC comparison by Claude — not regex/AST parsing.
  # Claude outputs findings in per-finding format.

  fileFindings = []
  correctCount = 0
  totalApplicable = 0

  for each pattern in patterns:
    if pattern.appliesTo(file):
      totalApplicable += 1
      if fileContent.followsPattern(pattern):
        correctCount += 1
      else:
        fileFindings.push({
          dimension: "R5",
          severity: pattern.severity == "CRITICAL" ? "CRITICAL" : "WARNING",
          title: "Pattern deviation: " + pattern.name,
          file: file,
          source: "Specialist " + specialist.name + " Pattern " + pattern.id,
          issue: "Code does not follow pattern correctly",
          expected: pattern.description,
          fix: pattern.correctExample
        })

  fileScore = totalApplicable > 0 ? round(correctCount / totalApplicable * 100) : 100
  phaseA_scores.push({ file, score: fileScore, findings: fileFindings })

phaseA_score = avg(phaseA_scores.map(s => s.score))
phaseA_findings = phaseA_scores.flatMap(s => s.findings)
```

---

## Phase B: Per-Feature Logic Review (R1-R4)

**Scope**: All changed files together (cross-file logic).
**Purpose**: Verify business logic, API contracts, edge cases, abnormal cases.

```pseudo
phaseB_scores = {}
phaseB_findings = []
```

### R1: Business Logic Review (weight: 30%)

```pseudo
if sources.R1:
  docContent = lazyLoad(sources.R1)

  if NOT docContent:
    log("⚠️ R1 source not available — skipping, redistributing weight")
    phaseB_scores.R1 = null  # Will be excluded from aggregate
  else:
    # ─────────────────────────────────────────────────────
    # R1.1: Extract component-responsibility pairs
    # ─────────────────────────────────────────────────────
    # - From BD: Parse component descriptions → extract "Component X must Y"
    # - From evidence: Parse findings/conclusions → distill into responsibilities
    #
    # Claude reads document and extracts structured pairs:
    responsibilities = extractComponentResponsibilities(docContent)
    # Example: [
    #   { component: "OrderService", responsibility: "validate stock before placing order" },
    #   { component: "AuthGuard", responsibility: "redirect unauthenticated users to login" }
    # ]

    # ─────────────────────────────────────────────────────
    # R1.2: Verify each responsibility in code
    # ─────────────────────────────────────────────────────
    verified = 0
    for each resp in responsibilities:
      # Claude searches changedFiles for implementation matching responsibility
      found = semanticSearch(changedFiles, resp.responsibility)
      if found:
        verified += 1
      else:
        phaseB_findings.push({
          dimension: "R1",
          severity: "CRITICAL",
          title: "Missing business logic: " + resp.responsibility,
          file: expectedFile(resp.component),
          source: sources.R1 + " — " + resp.component,
          issue: "Business rule not implemented in code",
          expected: resp.responsibility,
          fix: "Add " + resp.responsibility + " to " + resp.component
        })

    phaseB_scores.R1 = responsibilities.length > 0
      ? round(verified / responsibilities.length * 100)
      : 100
else:
  phaseB_scores.R1 = null
```

### R2: API Contract Review (weight: 20%) — Feature only

```pseudo
if sources.R2:
  docContent = lazyLoad(sources.R2)

  if NOT docContent:
    phaseB_scores.R2 = null
  else:
    # ─────────────────────────────────────────────────────
    # R2.1: Extract endpoint specs
    # ─────────────────────────────────────────────────────
    endpoints = extractEndpointSpecs(docContent)
    # Example: [
    #   { method: "POST", path: "/api/users", status: 201, responseType: "UserDTO" },
    #   { method: "GET", path: "/api/users/:id", status: 200, responseType: "UserDTO" }
    # ]

    # ─────────────────────────────────────────────────────
    # R2.2: Verify handler matches contract
    # ─────────────────────────────────────────────────────
    matching = 0
    for each endpoint in endpoints:
      handler = findHandler(changedFiles, endpoint.method, endpoint.path)
      if handler AND handler.matchesContract(endpoint):
        matching += 1
      else:
        phaseB_findings.push({
          dimension: "R2",
          severity: "CRITICAL",
          title: "API contract mismatch: " + endpoint.method + " " + endpoint.path,
          file: handler?.file || "NOT FOUND",
          source: "DD api-contracts.md",
          issue: "Handler does not match contract specification",
          expected: endpoint.method + " " + endpoint.path + " → " + endpoint.status + " " + endpoint.responseType,
          fix: "Update handler to match contract"
        })

    phaseB_scores.R2 = endpoints.length > 0
      ? round(matching / endpoints.length * 100)
      : 100
else:
  phaseB_scores.R2 = null
```

### R3: Edge Case Coverage (weight: 15%)

```pseudo
if sources.R3:
  docContent = lazyLoad(sources.R3)

  if NOT docContent:
    phaseB_scores.R3 = null
  else:
    # ─────────────────────────────────────────────────────
    # R3.1: Extract boundary conditions
    # ─────────────────────────────────────────────────────
    # From DD pseudo: null checks, empty arrays, overflow, timeout
    # From evidence: edge cases mentioned in research
    edgeCases = extractBoundaryConditions(docContent)
    # Example: [
    #   { condition: "items array is empty", expectedBehavior: "return empty response" },
    #   { condition: "user ID is null", expectedBehavior: "throw ValidationException" }
    # ]

    # ─────────────────────────────────────────────────────
    # R3.2: Verify code handles each condition
    # ─────────────────────────────────────────────────────
    handled = 0
    for each edge in edgeCases:
      codePath = findCodePath(changedFiles, edge.condition)
      if codePath:
        handled += 1
      else:
        phaseB_findings.push({
          dimension: "R3",
          severity: "WARNING",
          title: "Edge case not handled: " + edge.condition,
          file: likelyFile(edge),
          source: sources.R3,
          issue: "No code path handles this boundary condition",
          expected: edge.expectedBehavior,
          fix: "Add guard/check for: " + edge.condition
        })

    phaseB_scores.R3 = edgeCases.length > 0
      ? round(handled / edgeCases.length * 100)
      : 100
else:
  phaseB_scores.R3 = null
```

### R4: Abnormal Case Coverage (weight: 20%)

```pseudo
if sources.R4:
  planContent = lazyLoad(sources.R4)

  if NOT planContent:
    phaseB_scores.R4 = null
  else:
    # ─────────────────────────────────────────────────────
    # R4.1: Extract ABNORMAL test cases from Plan Section 3.1
    # ─────────────────────────────────────────────────────
    abnormalCases = extractTestCases(planContent, type="ABNORMAL")
    # Example: [
    #   { id: "T1.2", description: "duplicate email", expected: "DuplicateEmailException" },
    #   { id: "T1.3", description: "null required fields", expected: "ValidationException" }
    # ]

    if abnormalCases.length == 0:
      log("ℹ️ No abnormal test cases in plan — R4 scores 100%")
      phaseB_scores.R4 = 100
    else:
      covered = 0
      for each tc in abnormalCases:
        # ─────────────────────────────────────────────────
        # R4a: Code handles this case?
        # ─────────────────────────────────────────────────
        # Strategy: keyword match first (exception name, error code)
        # Fallback: semantic search if no keyword match
        codeHandles = keywordSearch(changedFiles, tc.expected)
        if NOT codeHandles:
          codeHandles = semanticSearch(changedFiles, tc.description)

        # ─────────────────────────────────────────────────
        # R4b: Test file covers this case?
        # ─────────────────────────────────────────────────
        testCovers = searchTestFiles(changedFiles, tc.id)
        # Searches for "T1.2" in test file names: it('T1.2: ...'), @DisplayName("T1.2: ...")

        if codeHandles AND testCovers:
          covered += 1
        elif codeHandles AND NOT testCovers:
          covered += 0.5  # Partial credit — code handles but no test
          phaseB_findings.push({
            dimension: "R4",
            severity: "WARNING",
            title: "Abnormal case " + tc.id + " handled but not tested",
            file: "test files",
            source: "Plan " + tc.id + " — " + tc.description,
            issue: "Code handles the abnormal case but no test verifies it",
            expected: "Test with ID " + tc.id + " in test file",
            fix: "Add test case: it('" + tc.id + ": " + tc.description + "', ...)"
          })
        else:
          phaseB_findings.push({
            dimension: "R4",
            severity: "CRITICAL",
            title: "Abnormal case " + tc.id + " not covered",
            file: likelyFile(tc),
            source: "Plan " + tc.id + " — " + tc.description,
            issue: "No error handling for this abnormal case in code",
            expected: tc.expected,
            fix: "Add error handling for: " + tc.description
          })

      phaseB_scores.R4 = round(covered / abnormalCases.length * 100)
else:
  phaseB_scores.R4 = null
```

---

## Step 3: Aggregate Pass 3 Score

### Weight Redistribution

```pseudo
# Base weights per task type
baseWeights = {
  "new":         { R1: 0.30, R2: 0.20, R3: 0.15, R4: 0.20, R5: 0.15 },
  "enhancement": { R1: 0.35, R3: 0.20, R4: 0.25, R5: 0.20 },
  "bugfix":      { R1: 0.35, R3: 0.20, R4: 0.25, R5: 0.20 },
  "hotfix":      { R5: 1.00 }
}

weights = baseWeights[TASK_TYPE] || baseWeights["enhancement"]

# Collect available scores
pass3DimensionScores = {
  R1: phaseB_scores.R1,   # null if skipped
  R2: phaseB_scores.R2,   # null if skipped
  R3: phaseB_scores.R3,   # null if skipped
  R4: phaseB_scores.R4,   # null if skipped
  R5: phaseA_score         # always available
}

# Redistribute weight from skipped dimensions
availableWeight = 0
skippedWeight = 0
for each dim in weights:
  if pass3DimensionScores[dim] != null:
    availableWeight += weights[dim]
  else:
    skippedWeight += weights[dim]

# Normalize weights to sum to 1.0
normalizedWeights = {}
for each dim in weights:
  if pass3DimensionScores[dim] != null:
    normalizedWeights[dim] = weights[dim] / availableWeight

# Calculate weighted average
pass3Score = 0
for each dim in normalizedWeights:
  pass3Score += pass3DimensionScores[dim] * normalizedWeights[dim]
pass3Score = round(pass3Score)
```

### Generate Findings Report

```pseudo
pass3Findings = phaseA_findings + phaseB_findings

# Sort by severity: CRITICAL first, then WARNING, then INFO
pass3Findings.sort(bySeverity)

# Format summary table
pass3SummaryTable = []
for each dim in [R1, R2, R3, R4, R5]:
  score = pass3DimensionScores[dim]
  if score == null:
    pass3SummaryTable.push({ dim, score: "SKIP", findings: 0, status: "—" })
  else:
    dimFindings = pass3Findings.filter(f => f.dimension == dim).length
    status = score >= 90 ? "✅" : score >= 70 ? "⚠️" : "❌"
    pass3SummaryTable.push({ dim, score: score + "%", findings: dimFindings, status })

# Display
log("═══════════════════════════════════════════════════════════════")
log("📊 Pass 3: Code Review Results")
log("═══════════════════════════════════════════════════════════════")
log("")
log("| Dimension | Score | Findings | Status |")
log("|-----------|-------|----------|--------|")
for each row in pass3SummaryTable:
  log("| " + row.dim + " | " + row.score + " | " + row.findings + " | " + row.status + " |")
log("")
log("Pass 3 Score: " + pass3Score + "%")
log("Total Findings: " + pass3Findings.length)
log("═══════════════════════════════════════════════════════════════")

# Output per-finding details
for each finding in pass3Findings:
  log("")
  log("### [" + finding.dimension + "] " + severityEmoji(finding.severity) + " " + finding.severity + " — " + finding.title)
  log("**File**: [" + finding.file + "](" + finding.file + ")")
  log("**Source**: " + finding.source)
  log("**Issue**: " + finding.issue)
  log("**Expected**: " + finding.expected)
  log("**Fix**: " + finding.fix)
```

---

## RETURN

Pass 3 complete. Set result variables and return control to validate.md.

```pseudo
# Set pass3Enabled flag — validate.md checks this
pass3Enabled = true

# Display summary before returning
log("═══════════════════════════════════════════════════════════════")
log("📊 Pass 3: Code Review — Complete")
log("═══════════════════════════════════════════════════════════════")
log("  Score: " + pass3Score + "%")
log("  Findings: " + pass3Findings.length)
log("═══════════════════════════════════════════════════════════════")
```

The following variables are now in conversation context for validate.md Step 5:
- `pass3Score` — weighted aggregate of R1-R5 (integer percentage)
- `pass3Findings` — array of finding objects
- `pass3DimensionScores` — object with R1-R5 scores
- `pass3SummaryTable` — array of summary rows
- `pass3Enabled` — boolean true (set above)

**Control returns to validate.md** for Step 5 (Aggregate Scoring).

<!-- RETURN to validate.md — router handles aggregate scoring + state transition -->

---

*Pass 3: Code Review | EPS Framework v5.4*
*Created: 2026-03-27 | Updated: 2026-03-29*
*Decisions: Q1(B), Q2(A), Q3(B+C), D1-D5, TD1-TD4*

# plan/relationship-matrix.md — Step 4.7: Cross-Step Relationship Analysis

> **Purpose**: Verify plan components form a connected, non-redundant graph.
> Append §6 Relationship Matrix to plan file.
> Gate: orphan files > 0 → warning before save.
>
> **Runs after**: Step 4.6 (confidence check) — plan content is finalized.
> **Input**: Plan file (monolithic) or master + sub-plans (multi-file).
> **Output**: §6 Relationship Matrix appended to plan file.
> **Skip**: If taskType == "bugfix" or "lightweight" — too few components to analyze.

---

## Step 0: Load Plan Content (monolithic OR multi-sub-plan)

```pseudo
# ═══════════════════════════════════════════════════════════════
# Handle both plan structures:
#   - Monolithic: single PLAN_PATH with all sections
#   - Multi-sub-plan: master index + SP-*.md files in plans/ dir
# ═══════════════════════════════════════════════════════════════

planContent = READ(PLAN_PATH)

IF planContent contains "planStructure: multi-sub-plan":
  PLANS_DIR = dirname(PLAN_PATH)
  subPlanFiles = GLOB(PLANS_DIR + "/SP-*.md")

  masterContent = planContent

  allStepsContent = ""
  FOR spFile IN subPlanFiles:
    allStepsContent += READ(spFile) + "\n"

  files       = parseSection(masterContent, "0.1 Files to Modify")
  methods     = parseSection(masterContent, "0.2 Methods to Change")
  stepDeps    = parseSection(masterContent, "0.3 Dependencies")
  importRules = parseSection(masterContent, "0.4 Import Rules")
  steps       = parseAllSteps(allStepsContent)
  testCases   = parseAllTestCases(allStepsContent)

  MATRIX_TARGET = PLAN_PATH  # append §6 to master plan

ELSE:
  files       = parseSection(planContent, "0.1 Files to Modify")
  methods     = parseSection(planContent, "0.2 Methods to Change")
  stepDeps    = parseSection(planContent, "0.3 Dependencies")
  importRules = parseSection(planContent, "0.4 Import Rules")
  steps       = parseAllSteps(planContent)
  testCases   = parseSection(planContent, "3.1 Per-Step Test Cases")

  MATRIX_TARGET = PLAN_PATH
```

### Parser Functions (algorithmic — no LLM)

```pseudo
# parseSection(content, heading):
#   Regex: match "## {heading}" or "### {heading}" → extract until next same-level heading.
#   Parse markdown table rows → array of objects.
#
# parseAllSteps(content):
#   Regex: match "### Step N:" → extract {index, files, methods, acceptance, specialist, description}.
#   files = lines matching "- `path/to/file`"
#   methods = lines matching "- `methodName()` - [ADD|MODIFY]"
#   acceptance = lines matching "- [ ] ..."
#
# inferType(filePath):
#   *Service*.java|.ts|.py → "service"
#   *Controller*.java|.ts → "controller"
#   *Repository*.java|.py → "repository"
#   *DTO*.java | *Schema*.py | *schema*.ts → "dto"
#   *Entity*.java | *model*.py → "entity"
#   *.config.* | *Config*.java | config.py → "config"
#   *Test*.java | *.test.ts | *_test.py → "test"
#   default → "other"
```

---

## Step 1: Build Component Graph

```pseudo
graph = { nodes: [], edges: [] }

# ═══════════════════════════════════════════════════════════════
# 1.1: Nodes = every file in §0.1
# ═══════════════════════════════════════════════════════════════
FOR entry IN files:
  graph.nodes.append({
    id: entry.file,
    layer: entry.layer,
    action: entry.action,
    type: inferType(entry.file),
    referencedBySteps: [],
    methods: methods.filter(m => m.file == entry.file)
  })

# ═══════════════════════════════════════════════════════════════
# 1.2: Edges from step dependencies (§0.3)
# ═══════════════════════════════════════════════════════════════
FOR dep IN stepDeps:
  stepXFiles = steps[dep.step].files
  stepYFiles = steps[dep.dependsOn].files
  FOR xFile IN stepXFiles:
    FOR yFile IN stepYFiles:
      graph.edges.append({
        from: xFile, to: yFile,
        type: "step-dependency",
        reason: dep.reason
      })

# ═══════════════════════════════════════════════════════════════
# 1.3: Edges from import rules (§0.4)
# ═══════════════════════════════════════════════════════════════
FOR rule IN importRules:
  FOR targetNode IN graph.nodes:
    IF matchesImportPattern(targetNode.layer, rule.canImport):
      graph.edges.append({
        from: rule.file, to: targetNode.id,
        type: "import-allowed"
      })

# ═══════════════════════════════════════════════════════════════
# 1.4: Step → File references
# ═══════════════════════════════════════════════════════════════
FOR step IN steps:
  FOR file IN step.files:
    node = graph.nodes.find(n => n.id == file)
    IF node:
      node.referencedBySteps.append(step.index)
```

---

## Step 2: Apply Connected x Shared Matrix

```pseudo
findings = []

# ═══════════════════════════════════════════════════════════════
# 2.1: ORPHAN — file in §0.1 but no step references it
# ═══════════════════════════════════════════════════════════════
FOR node IN graph.nodes:
  IF node.type == "config": CONTINUE

  IF node.referencedBySteps.length == 0:
    findings.append({
      severity: "CRITICAL",
      type: "ORPHAN",
      file: node.id,
      message: "File listed in §0.1 but no implementation step references it.",
      action: "ADD step or REMOVE from §0.1"
    })

  hasEdge = graph.edges.any(e => e.from == node.id OR e.to == node.id)
  IF NOT hasEdge AND node.referencedBySteps.length > 0 AND node.type NOT IN ["test", "config"]:
    findings.append({
      severity: "WARNING",
      type: "ISOLATED",
      file: node.id,
      message: "File has a step but no dependency on other files.",
      action: "VERIFY independence or ADD dependency to §0.3"
    })

# ═══════════════════════════════════════════════════════════════
# 2.2: DUPLICATE — two steps with overlapping responsibilities
# ═══════════════════════════════════════════════════════════════
FOR i IN range(steps.length):
  FOR j IN range(i+1, steps.length):
    stepA = steps[i]
    stepB = steps[j]

    # LLM-assisted: semantic comparison of acceptance criteria
    # Fallback: Jaccard index on word tokens if LLM unavailable
    overlapScore = compareAcceptanceCriteria(stepA.acceptance, stepB.acceptance)

    IF overlapScore > 0.7:
      findings.append({
        severity: "WARNING",
        type: "DUPLICATE",
        steps: [stepA.index, stepB.index],
        similarity: overlapScore,
        message: f"Step {stepA.index} and Step {stepB.index} have " +
                 f"{overlapScore*100:.0f}% overlapping acceptance criteria.",
        action: "EXTRACT shared logic to common step or MERGE steps"
      })

    # Algorithmic: same method name in different files
    FOR mA IN stepA.methods:
      FOR mB IN stepB.methods:
        IF mA.method == mB.method AND mA.file != mB.file:
          findings.append({
            severity: "CRITICAL",
            type: "DUPLICATE",
            methods: [f"{mA.file}::{mA.method}", f"{mB.file}::{mB.method}"],
            message: f"Same method name '{mA.method}' in different files.",
            action: "CONSOLIDATE into single source"
          })

# ═══════════════════════════════════════════════════════════════
# 2.3: MERGE — DTO/entity files with similar names across steps
# ═══════════════════════════════════════════════════════════════
dtoNodes = graph.nodes.filter(n => n.type IN ["dto", "entity"])

FOR i IN range(dtoNodes.length):
  FOR j IN range(i+1, dtoNodes.length):
    nameA = extractClassName(dtoNodes[i].id)
    nameB = extractClassName(dtoNodes[j].id)

    # Algorithmic: Levenshtein normalized
    nameSimilarity = stringSimilarity(nameA, nameB)

    IF nameSimilarity > 0.6:
      stepsA = dtoNodes[i].referencedBySteps
      stepsB = dtoNodes[j].referencedBySteps
      sharedSteps = intersection(stepsA, stepsB)

      IF sharedSteps.length == 0:
        findings.append({
          severity: "WARNING",
          type: "MERGE",
          files: [dtoNodes[i].id, dtoNodes[j].id],
          nameSimilarity: nameSimilarity,
          message: f"'{nameA}' and '{nameB}' have similar names but serve different steps.",
          action: "REVIEW: merge into single DTO or EXTRACT base class"
        })

# ═══════════════════════════════════════════════════════════════
# 2.4: UNDECLARED_DEP — step can import from another step's file
#        but §0.3 doesn't declare the dependency
# ═══════════════════════════════════════════════════════════════
FOR step IN steps:
  FOR method IN step.methods:
    otherStepFiles = []
    FOR otherStep IN steps:
      IF otherStep.index == step.index: CONTINUE
      otherStepFiles.extend(otherStep.files)

    FOR rule IN importRules:
      IF rule.file == method.file:
        FOR importTarget IN otherStepFiles:
          IF matchesImportPattern(getLayer(importTarget), rule.canImport):
            declared = stepDeps.any(d =>
              d.step == step.index AND d.dependsOn == getStepForFile(importTarget))
            IF NOT declared:
              findings.append({
                severity: "WARNING",
                type: "UNDECLARED_DEP",
                step: step.index,
                file: method.file,
                importTarget: importTarget,
                message: f"Step {step.index} can import {importTarget} " +
                         f"but §0.3 doesn't declare this dependency.",
                action: "ADD dependency to §0.3 or VERIFY it's not needed"
              })
```

---

## Step 3: Generate Matrix and Append to Plan

```pseudo
# ═══════════════════════════════════════════════════════════════
# Scoring
# ═══════════════════════════════════════════════════════════════
criticalCount = findings.filter(f => f.severity == "CRITICAL").length
warningCount = findings.filter(f => f.severity == "WARNING").length

coherenceScore = 100 - (criticalCount * 15) - (warningCount * 5)
coherenceScore = max(coherenceScore, 0)

# ═══════════════════════════════════════════════════════════════
# Build relationship table
# ═══════════════════════════════════════════════════════════════
matrixContent = """
## 6. Component Relationship Matrix

> Auto-generated by relationship-matrix.md (Step 4.7).
> Consumed by /execute (feature-context.md) and /validate (feature-coherence.md).

### 6.1 Dependency Graph

| From (File) | To (File) | Type | Reason |
|-------------|-----------|------|--------|
"""

FOR edge IN graph.edges.filter(e => e.type == "step-dependency"):
  matrixContent += f"| `{edge.from}` | `{edge.to}` | {edge.type} | {edge.reason} |\n"

matrixContent += """

### 6.2 Component Inventory

| File | Layer | Type | Steps | In | Out | Status |
|------|-------|------|-------|----|-----|--------|
"""

FOR node IN graph.nodes:
  incoming = graph.edges.filter(e => e.to == node.id).length
  outgoing = graph.edges.filter(e => e.from == node.id).length
  status = "ORPHAN" IF (incoming == 0 AND outgoing == 0 AND node.type NOT IN ["config", "test"]) ELSE "OK"
  matrixContent += f"| `{node.id}` | {node.layer} | {node.type} | {','.join(node.referencedBySteps)} | {incoming} | {outgoing} | {status} |\n"

matrixContent += f"""

### 6.3 Coherence Metrics

| Metric | Value |
|--------|-------|
| Total files | {graph.nodes.length} |
| Total relationships | {graph.edges.length} |
| Orphan files | {findings.filter(f => f.type == "ORPHAN").length} |
| Duplicate risks | {findings.filter(f => f.type == "DUPLICATE").length} |
| Merge candidates | {findings.filter(f => f.type == "MERGE").length} |
| Undeclared deps | {findings.filter(f => f.type == "UNDECLARED_DEP").length} |
| **Coherence score** | **{coherenceScore}%** |
"""

IF findings.length > 0:
  matrixContent += "\n### 6.4 Findings\n\n"
  FOR f IN findings:
    icon = "CRITICAL" IF f.severity == "CRITICAL" ELSE "WARNING"
    matrixContent += f"- **[{icon}] [{f.type}]** {f.message}\n  - Action: {f.action}\n"

# ═══════════════════════════════════════════════════════════════
# Backup + Append
# ═══════════════════════════════════════════════════════════════
COPY(MATRIX_TARGET, MATRIX_TARGET + ".pre-matrix.bak")
APPEND(MATRIX_TARGET, matrixContent)
```

---

## Step 4: Display and Gate

```pseudo
display("═══════════════════════════════════════════════════════════════")
display(f"Step 4.7: Relationship Matrix — Coherence Score: {coherenceScore}%")
display(f"  Files: {graph.nodes.length} | Edges: {graph.edges.length}")
display(f"  CRITICAL: {criticalCount} | WARNING: {warningCount}")

IF criticalCount > 0:
  display("")
  display("Findings requiring attention before /execute:")
  FOR f IN findings.filter(f => f.severity == "CRITICAL"):
    display(f"  [{f.type}] {f.message}")
    display(f"    Action: {f.action}")

IF warningCount > 0:
  display("")
  display("Warnings (non-blocking):")
  FOR f IN findings.filter(f => f.severity == "WARNING"):
    display(f"  [{f.type}] {f.message}")

display("═══════════════════════════════════════════════════════════════")

# Non-blocking: log findings, don't stop execution
# User can address findings or proceed knowing the risks
```

---

## RETURN

Step 4.7 complete. Control returns to the calling router (`generation.md`) to continue to `save-and-display.md`.

**DO NOT chain to any other command from here.**

<!-- RETURN to generation.md — router continues to save-and-display.md -->

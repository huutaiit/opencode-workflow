# validate/feature-coherence.md — Pass 4: Feature Coherence Analysis

> **Purpose**: Build dependency graph from ACTUAL CODE (imports, calls),
> compare against plan §6 predictions,
> detect: orphans, duplicates, merge candidates, missing integrations.
>
> **Runs after**: Pass 3 (code-review.md) complete.
> **Input**: All files created/modified in this feature (from executionState).
> **Output**: pass4Score + pass4Findings to validate.md for aggregate.
> **Skip**: If modified files < 3 (too few components to analyze coherence).

---

## Step 0: Collect Feature Files

```pseudo
featureFiles = executionState.modifiedFiles
# All files created or modified during /execute

IF featureFiles.length < 3:
  log("Pass 4 skipped — fewer than 3 files, coherence analysis not meaningful")
  RETURN { score: 100, findings: [], graph: null }
```

---

## Step 1: Build Actual Dependency Graph

```pseudo
graph = { nodes: [], edges: [] }

FOR file IN featureFiles:
  content = READ(file)

  node = {
    path: file,
    layer: classifyLayer(file),
    symbols: extractPublicSymbols(content),
    imports: extractImports(content),
    type: inferType(file)  # entity|service|controller|dto|repository|test
  }
  graph.nodes.append(node)

# Build edges from actual imports
FOR node IN graph.nodes:
  FOR imp IN node.imports:
    target = graph.nodes.find(n => n.symbols.any(s => s.name == imp.symbol))
    IF target:
      graph.edges.append({
        from: node.path, to: target.path,
        type: "imports", symbol: imp.symbol
      })
```

### Parser Functions (algorithmic — no LLM)

```pseudo
# extractImports(content):
#   Java:   import {pkg}.{class};  → { symbol: class, module: pkg }
#   TS:     import { X } from '{path}'  → { symbol: X, module: path }
#   Python: from {module} import {name} → { symbol: name, module: module }
#
# extractPublicSymbols(content):
#   Java:   public (class|interface|record|enum) {Name} → { name, type, signature, line }
#           public ReturnType methodName(params) → { name, type: "method", signature, line }
#   TS:     export (class|interface|type|function) {Name} → { name, type, signature, line }
#   Python: class {Name}: → { name, type: "class", signature, line }
#           def {name}( (top-level, no _ prefix) → { name, type: "method", signature, line }
#
# classifyLayer(filePath):
#   /domain/ → "domain", /service/ or /application/ → "application"
#   /infrastructure/ or /config/ → "infrastructure"
#   /rest/ or /controller/ or /presentation/ → "presentation"
#   /test/ → "test"
#
# inferType(filePath):
#   Same as relationship-matrix.md — pattern match on filename suffix
```

---

## Step 2: Compare with Plan §6 (if exists)

```pseudo
planMatrix = loadPlanSection(PLAN_PATH, "6. Component Relationship Matrix")
comparisonFindings = []

IF planMatrix:
  # Check: edges predicted in plan but missing in code
  FOR planEdge IN planMatrix.edges:
    actualEdge = graph.edges.find(e => e.from contains planEdge.from AND e.to contains planEdge.to)
    IF NOT actualEdge:
      comparisonFindings.append({
        severity: "WARNING",
        type: "PLAN_DRIFT",
        message: f"Plan §6 predicted {planEdge.from} → {planEdge.to} " +
                 f"but actual code has no such dependency.",
        action: "VERIFY: is the dependency implemented differently or missing?"
      })

  # Check: edges in code but NOT predicted in plan
  FOR codeEdge IN graph.edges:
    planEdge = planMatrix.edges.find(e => codeEdge.from contains e.from AND codeEdge.to contains e.to)
    IF NOT planEdge:
      comparisonFindings.append({
        severity: "INFO",
        type: "UNDECLARED_DEP",
        message: f"Code has {codeEdge.from} → {codeEdge.to} " +
                 f"but plan §6 didn't predict this dependency.",
        action: "VERIFY: implementation detail or scope creep?"
      })
```

---

## Step 3: Apply Connected x Shared Matrix (on actual code)

```pseudo
findings = comparisonFindings  # start with plan comparison

# ═══════════════════════════════════════════════════════════════
# 3.1: ORPHAN — file with no imports and not imported by anyone
# ═══════════════════════════════════════════════════════════════
FOR node IN graph.nodes:
  IF node.type == "test": CONTINUE
  IF node.type == "config": CONTINUE

  incoming = graph.edges.filter(e => e.to == node.path).length
  outgoing = graph.edges.filter(e => e.from == node.path).length

  IF incoming == 0 AND outgoing == 0:
    findings.append({
      severity: "CRITICAL", type: "ORPHAN",
      file: node.path,
      message: f"Component has no imports and is not imported — dead code.",
      action: "REMOVE or ADD integration"
    })

# ═══════════════════════════════════════════════════════════════
# 3.2: DUPLICATE — methods with >80% similar logic across files
# ═══════════════════════════════════════════════════════════════
MAX_BODY_LINES = 50

logicNodes = graph.nodes.filter(n => n.type IN ["service", "controller", "validator"])

FOR i IN range(logicNodes.length):
  FOR j IN range(i+1, logicNodes.length):
    methodsA = logicNodes[i].symbols.filter(s => s.type == "method")
    methodsB = logicNodes[j].symbols.filter(s => s.type == "method")

    FOR mA IN methodsA:
      # Check @suppress-coherence comment
      IF hasSuppression(logicNodes[i].path, mA.name, "DUPLICATE"): CONTINUE

      # Skip trivial methods (< 5 lines)
      bodyA = readMethodBody(logicNodes[i].path, mA.name, MAX_BODY_LINES)
      IF bodyA.lineCount < 5: CONTINUE

      FOR mB IN methodsB:
        IF hasSuppression(logicNodes[j].path, mB.name, "DUPLICATE"): CONTINUE

        bodyB = readMethodBody(logicNodes[j].path, mB.name, MAX_BODY_LINES)
        IF bodyB.lineCount < 5: CONTINUE

        # LLM-assisted: semantic logic similarity
        # Fallback: normalized line-by-line diff ratio
        similarity = compareMethodBodies(bodyA.content, bodyB.content)

        IF similarity > 0.8:
          findings.append({
            severity: "WARNING", type: "DUPLICATE",
            files: [logicNodes[i].path, logicNodes[j].path],
            methods: [mA.name, mB.name],
            similarity: similarity,
            message: f"{mA.name} and {mB.name} have {similarity*100:.0f}% similar logic.",
            action: "EXTRACT shared logic to common component"
          })

# ═══════════════════════════════════════════════════════════════
# 3.3: MERGE — DTOs with >70% field overlap
# ═══════════════════════════════════════════════════════════════
dtoNodes = graph.nodes.filter(n => n.type IN ["dto", "entity"])

FOR i IN range(dtoNodes.length):
  IF hasSuppression(dtoNodes[i].path, null, "MERGE"): CONTINUE

  FOR j IN range(i+1, dtoNodes.length):
    IF hasSuppression(dtoNodes[j].path, null, "MERGE"): CONTINUE

    fieldsA = extractFields(dtoNodes[i].path)
    fieldsB = extractFields(dtoNodes[j].path)

    # Algorithmic: set intersection on field names
    overlap = fieldOverlap(fieldsA, fieldsB)

    IF overlap > 0.7:
      connected = graph.edges.any(e =>
        (e.from == dtoNodes[i].path AND e.to == dtoNodes[j].path) OR
        (e.from == dtoNodes[j].path AND e.to == dtoNodes[i].path))

      IF NOT connected:
        findings.append({
          severity: "WARNING", type: "MERGE",
          files: [dtoNodes[i].path, dtoNodes[j].path],
          overlap: overlap,
          message: f"DTOs share {overlap*100:.0f}% fields but unrelated — merge candidate.",
          action: "MERGE or EXTRACT base class"
        })
```

### Suppression Check

```pseudo
# hasSuppression(filePath, methodName, type):
#   Search file for: @suppress-coherence: {type}
#   If methodName provided: check within method scope only
#   If methodName null: check class-level comments
#   Returns: boolean
#
# Example suppression comment:
#   // @suppress-coherence: DUPLICATE — intentionally mirrors structure
#   // @suppress-coherence: MERGE — different API contracts
```

---

## Step 4: Score and Report

```pseudo
criticalCount = findings.filter(f => f.severity == "CRITICAL").length
warningCount = findings.filter(f => f.severity == "WARNING").length

coherenceScore = 100 - (criticalCount * 15) - (warningCount * 5)
coherenceScore = max(coherenceScore, 0)

display("═══════════════════════════════════════════════════════════════")
display("Pass 4: Feature Coherence Analysis")
display(f"  Components: {graph.nodes.length} | Relationships: {graph.edges.length}")
display(f"  Coherence Score: {coherenceScore}%")

IF findings.length > 0:
  FOR f IN findings:
    icon = "!" IF f.severity == "CRITICAL" ELSE "?" IF f.severity == "WARNING" ELSE "i"
    display(f"  [{icon}] [{f.type}] {f.message}")
    display(f"       Action: {f.action}")
ELSE:
  display("  All components form a coherent feature graph")

display("═══════════════════════════════════════════════════════════════")

# Gate: coherence < 80% → log to quality-debt.log
IF coherenceScore < 80:
  log("Feature coherence below 80% — logged to quality-debt.log")
  FOR f IN findings.filter(f => f.severity IN ["CRITICAL", "WARNING"]):
    logDebt({
      rule: "coherence-" + f.type.lower(),
      severity: f.severity.lower(),
      file: f.file OR f.files[0],
      message: f.message
    })

pass4Score = coherenceScore
pass4Findings = {
  orphans: findings.filter(f => f.type == "ORPHAN"),
  duplicates: findings.filter(f => f.type == "DUPLICATE"),
  merges: findings.filter(f => f.type == "MERGE"),
  drifts: findings.filter(f => f.type == "PLAN_DRIFT"),
  graph: {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    coherenceScore: coherenceScore
  }
}
```

---

## RETURN

Pass 4 complete. Returns `pass4Score` and `pass4Findings` to validate.md for aggregate scoring.

**DO NOT chain to any other command from here.**

<!-- RETURN to validate.md — values: pass4Score, pass4Findings -->

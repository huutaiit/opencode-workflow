# execute/feature-context.md — Step 3.D3: Feature Context Injection

> **Purpose**: Before generating code for step N, collect existing feature
> code from steps 1..N-1 and inject as read-only awareness.
> Claude sees what exists → reuses instead of reimplements.
>
> **CRITICAL**: This is READ-ONLY. Never modifies previous steps' code.
>
> **Input**: executionState (completed steps), plan §6 Relationship Matrix
> **Output**: featureContext string block (or null for first step)
> **Skip**: First step (no prior code to reference)

---

## Step 0: Check Preconditions

```pseudo
completedSteps = executionState.steps.filter(s => s.status == "completed")

IF completedSteps.length == 0:
  RETURN null  # First step — no prior context needed
```

---

## Step 1: Collect Existing Feature Code Symbols

```pseudo
existingSymbols = []

FOR prevStep IN completedSteps:
  FOR file IN prevStep.files:
    IF NOT file_exists(file): CONTINUE

    content = READ(file)

    # extractPublicSymbols: regex per language
    #   Java: public (class|interface|record|enum) {Name}, public .* {methodName}(
    #   TS:   export (class|interface|type|function) {Name}
    #   Python: class {Name}:, def {name}( (top-level, no _ prefix)
    # Returns: [{ name, type (class|method|interface|type|constant), signature, line }]
    symbols = extractPublicSymbols(content)

    existingSymbols.append({
      file: file,
      step: prevStep.index,
      layer: prevStep.layer,
      symbols: symbols
    })
```

---

## Step 2: Filter Relevant Symbols

```pseudo
# Only inject symbols RELEVANT to current step
# (don't overwhelm context window with unrelated code)

MAX_SYMBOLS = 30
MAX_TOKENS = 2000

currentDescription = step.description + " " + step.acceptance.join(" ")

relevantSymbols = []
FOR fileEntry IN existingSymbols:
  FOR symbol IN fileEntry.symbols:
    # scoreRelevance: LLM-assisted (30 tokens per call)
    #   Prompt: "Score 0.0-1.0 relevance of '{symbol}' to '{description}'. Return ONLY number."
    #   Fallback (no LLM): substring match + Levenshtein on symbol name vs step keywords
    relevance = scoreRelevance(symbol.name + " " + symbol.signature, currentDescription)

    IF relevance > 0.3:  # threshold: loosely related
      relevantSymbols.append({
        symbol: symbol.name,
        type: symbol.type,
        signature: symbol.signature,
        file: fileEntry.file,
        step: fileEntry.step
      })

# Cap at MAX_SYMBOLS (sort by relevance descending, take top N)
relevantSymbols = relevantSymbols.sortBy(relevance, desc).slice(0, MAX_SYMBOLS)
```

---

## Step 3: Load Plan §6 Relationship Matrix (if exists)

```pseudo
planMatrix = loadPlanSection(PLAN_PATH, "6. Component Relationship Matrix")

relatedFiles = []
IF planMatrix:
  currentFile = step.files[0]
  relatedFiles = planMatrix.edges
    .filter(e => e.from == currentFile OR e.to == currentFile)
    .map(e => {
      file: e.from == currentFile ? e.to : e.from,
      reason: e.reason
    })
```

---

## Step 4: Format Context Block

```pseudo
featureContext = """
=== EXISTING FEATURE CODE (from completed steps) ===

The following components already exist in this feature.
REUSE them — DO NOT reimplement.

"""

IF relevantSymbols.length > 0:
  featureContext += "### Available Symbols\n\n"
  featureContext += "| Symbol | Type | Signature | File | Step |\n"
  featureContext += "|--------|------|-----------|------|------|\n"
  FOR s IN relevantSymbols:
    featureContext += f"| {s.symbol} | {s.type} | {s.signature} | {s.file} | Step {s.step} |\n"

IF relatedFiles.length > 0:
  featureContext += "\n### Related Components (from Plan §6)\n\n"
  FOR r IN relatedFiles:
    featureContext += f"- `{r.file}` — {r.reason}\n"

featureContext += """

### Reuse Directives
- IMPORT and CALL existing methods instead of recreating
- EXTEND existing interfaces if new behavior needed
- REFERENCE existing DTOs — do NOT create similar new ones
- If you need logic that overlaps with above symbols, DELEGATE to them
"""

# Verify token budget
IF estimateTokens(featureContext) > MAX_TOKENS:
  # Truncate: keep table header + top 20 symbols + directives
  featureContext = truncateToTokenBudget(featureContext, MAX_TOKENS)

RETURN featureContext
```

---

## RETURN

Step 3.D3 complete. Returns `featureContext` string (or null) to step-runner.md.

step-runner.md injects this into Step 3.E as **source #7**:

```pseudo
# In step-runner.md 3.E — Claude generates using:
# 1. Plan spec  2. BDD Reference  3. Specialist content
# 4. Specialist metadata  5. Graph context  6. Boundaries
# 7. Feature Context (from 3.D3 — this file)
```

<!-- RETURN to step-runner.md — value: featureContext string or null -->

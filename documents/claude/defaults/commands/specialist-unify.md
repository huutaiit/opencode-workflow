---
description: Unify specialists for a stack — scan, analyze, merge, validate
---

# /specialist-unify — Specialist Unification SOP

> Standard Operating Procedure for unifying specialists within a stack.
> Applicable to ALL stacks: react, nextjs, nestjs, java-springboot, csharp-dotnet, etc.
> Created from React unification experience (2026-03-26).

## When to Use

- Stack has multiple generations of specialists (V1 project-specific + V2 generic)
- Specialists missing Architecture Metadata (v2.0, 16 fields)
- Flat directory without subfolder organization
- Duplicate/overlapping specialists
- Know-how from real projects not integrated into generic specialists

## Arguments

```
/specialist-unify --stack <stack-name>     # Required: target stack
/specialist-unify --stack react --phase scan       # Run only scan phase
/specialist-unify --stack react --phase analyze    # Run only analyze phase
/specialist-unify --stack react --phase execute    # Execute from existing merge-spec
```

---

## Phase 1: SCAN — Inventory & Validate

### 1.1 Locate Specialists

```pseudo
stackDir = specialists/code/{stack}/
stackConfig = defaults/config/stacks/{stack-config}.json

# Scan all .md files (exclude _INDEX.md, specialist-metadata-full.md)
allFiles = glob(stackDir + "**/*.md", exclude: ["_INDEX.md", "specialist-metadata-full.md"])

# Also scan related directories that may contain shared specialists
relatedDirs = findRelatedDirs(stackConfig)  # e.g., _shared/{stack}/, other stacks referencing this one
```

### 1.2 Validate Each File

```bash
node core/cli/ops.js specialist-validate --batch --dir specialists/code/{stack}/
```

Classify into:

| Status | Criteria | Example |
|--------|----------|---------|
| **PASS (current gen)** | Has `## Architecture Metadata` with ≥13 fields | V2 files with metadata |
| **FAIL (legacy)** | Missing `## Architecture Metadata` entirely | V1 project-specific files |
| **PARTIAL** | Has metadata but <16 fields (pre-v2.0) | Missing Type/Purpose/Trigger |

### 1.3 Detect Generations

For each file, extract:
- **Header format**: trilingual (EN/JP/VI) or single-language
- **Metadata**: JSON block present? Architecture Metadata table present?
- **Hardcoded references**: grep for project-specific strings (C# ASP.NET, StarX4CRM, specific DB names)
- **Pattern format**: rule-lines only vs full code examples
- **Date**: file modification date → group by generation

### 1.4 Output: Scan Report

Save to `memory-bank/{branch}/{FEATURE}/scan-report.md`:

```markdown
# Scan Report: {stack} Specialists

## Summary
| Metric | Value |
|--------|-------|
| Total files | {N} |
| PASS (current gen) | {N} |
| FAIL (legacy) | {N} |
| PARTIAL (pre-v2.0) | {N} |
| Total size | {N}KB |
| Hardcoded project refs | {N} files |

## Files by Generation
### Current Generation (PASS)
| File | Range | Size | Fields |
...

### Legacy Generation (FAIL)
| File | Size | Hardcoded Refs | Date |
...
```

---

## Phase 2: ANALYZE — Pattern Mapping & Overlap Detection

### 2.1 Duplicate Detection

Compare ALL specialist files pairwise:

```pseudo
for each pair (fileA, fileB):
  overlapScore = comparePatterns(fileA, fileB)
  # Compare by: pattern names, code similarity, domain keywords
  if overlapScore > 30%:
    report as DUPLICATE_PAIR(fileA, fileB, overlapScore)
```

### 2.2 Gap Analysis — Cross-Stack Check

Check if other stacks have React-generic specialists that should be copied:

```pseudo
for each otherStack in allStacks:
  for each specialist in otherStack:
    if specialist.framework == targetFramework AND specialist.variant == "ALL":
      if specialist NOT IN targetStack:
        report as COPY_CANDIDATE(specialist, otherStack)
```

**Example**: nextjs/ has 93.x-96.x React-generic specialists → copy candidates for react/

### 2.3 Pattern-by-Pattern Mapping

For each specialist that needs merge (legacy + current overlap):

```markdown
## Specialist: {name} ({range})

### Sources
- Legacy: {file} — {N} patterns, {size}KB
- Current: {file} — {N} patterns, {size}KB

### Unified Pattern Map
| # | Unified ID | Name | Source | Action |
|---|-----------|------|--------|--------|
| 1 | {range}.1 | {name} | Legacy #{N} | KEEP code |
| 2 | {range}.2 | {name} | Current #{N} | KEEP rule + ADD code example |
| ... | ... | ... | ... | ... |
```

**Actions**:
| Action | When | What to do |
|--------|------|------------|
| **KEEP** | Pattern has full code example | Use as-is, only strip project refs |
| **KEEP + ADD code** | Pattern has rule-line but no code | Add TypeScript code example |
| **ADAPT** | Pattern is framework-specific (SignalR, Next.js) | Rewrite to generic, keep depth |
| **REWRITE** | Pattern is completely wrong framework | New code, keep same concept |
| **MERGE into** | Pattern is anti-pattern or edge case | Move to Abnormal Cases section |
| **SKIP** | Pattern is 100% project-specific (no generic value) | Don't include, document why |

### 2.4 Specialist Type Classification

For each unified specialist, determine type:

| Question | If YES → type |
|----------|---------------|
| Does it generate/modify files? | `code` |
| Does it enforce rules on existing code? | `rule-set` |
| Does it define structure/make design decisions? | `architecture` |

**Validation**: A specialist that "does everything" → SPLIT into 2.

### 2.5 Subfolder Structure Design

Group specialists by domain:

```pseudo
groups = clusterByDomain(allSpecialists)
# Heuristic: specialists sharing Source Paths patterns → same folder
# Typical: 7-10 subfolders for 15-20 specialists

for each group:
  folderName = dominantDomain(group)  # e.g., "hooks-state", "ui", "data"
  validate: each folder has 1-4 specialists (not too few, not too many)
```

### 2.6 Output: Merge Spec

Save to `memory-bank/{branch}/{FEATURE}/plans/merge-spec.md`:

```markdown
# Merge Specification: {stack}

## Directory Structure ({N} subfolders)
{tree}

## Unified Convention (Target Format)
{7-section format}

## Specialist 1: {name} ({range})
### Sources
### Unified Pattern Map
### Changes needed
### Estimated size

## Specialist 2: ...

## Summary
| # | Range | Specialist | Patterns | Size | Strategy | Type |
```

---

## Phase 3: DESIGN — Metadata & Registry

### 3.1 Create specialist-metadata-full.md

BEFORE any file creation, design all 16 fields for ALL specialists in one file:

```markdown
# Full Metadata: {N} {Stack} Specialists

> **Fixed fields**: Framework=`{framework}`, Architecture=`{arch}`, Variant=`{variant}`
> **Justification for ANY/ALL**: {why — e.g., "React supports FSD/atomic/layered/clean"}

## Specialist 1: {name}
| # | Field | Value |
|---|-------|-------|
| 1-16 | ... | ... |

## Specialist 2: ...
```

**Rule**: metadata-full is designed FIRST, then each specialist file is generated to MATCH it.

### 3.2 Create _INDEX.md

Full specialist registry with:
- Specialist Registry (grouped by domain, with subfolder paths)
- Source Path Lookup (primary specialist + secondary rule-set per path)
- Pattern Number Registry (range → domain → type)

### 3.3 Update Stack Config

Remove hacks (e.g., `shared_react`), unify specialist lists, define variant properly.

---

## Phase 4: EXECUTE — Generate Unified Files

### 4.1 Execution Order

```
1. Create subfolder structure (mkdir)
2. Create specialist-metadata-full.md
3. For each specialist (in order by range):
   a. Read ALL source files (legacy + current)
   b. Apply merge-spec: KEEP/ADAPT/REWRITE/SKIP per pattern
   c. Write unified file with convention:
      - Section 1: Header (trilingual)
      - Section 2: Metadata (JSON)
      - Section 3: Architecture Metadata (16 fields — copy from metadata-full)
      - Section 4: Role
      - Section 5: Patterns (grouped, with code examples)
      - Section 6: Abnormal Case Patterns
      - Section 7: Quality Checklist
   d. Validate: specialist-validate --file {path}
   e. Checkpoint
4. Create _INDEX.md
5. Update stack config
6. Delete legacy files (ONLY after all merges validated)
7. Final validation: specialist-validate --batch
```

### 4.2 Pattern Convention (MANDATORY for every pattern)

```markdown
### Pattern {id}: {name}
**Category**: {group name}
**Description**: {1-line description}

```typescript
// {file path hint}
{TypeScript code example — 10-40 lines}
{Real-world pattern with types, error handling}
```

**Why This Pattern**:
- ✅ {benefit 1}
- ✅ {benefit 2}
- ✅ {benefit 3}
```

**Rules**:
- EVERY pattern MUST have a code example (no rule-line-only patterns)
- Code examples MUST be TypeScript with proper types
- Code examples MUST NOT reference project-specific APIs/endpoints
- Code examples SHOULD show real-world usage (not toy examples)

### 4.3 Stripping Project-Specific References

| Pattern | Replace with |
|---------|-------------|
| `C# ASP.NET Core Backend` | (remove from header) |
| `/api/users` (C# convention) | `/api/{entities}` (generic) |
| `StarX4CRM` | (remove) |
| `SignalR` connection | Generic WebSocket / Socket.IO |
| `next/navigation` | `react-router-dom` (for React stack) |
| `middleware.ts` (Next.js) | Guard component pattern (for React stack) |
| Specific DB names | Generic database reference |
| Specific auth provider | Generic auth flow |

### 4.4 Checkpoint After Each Specialist

```bash
# After each specialist file is written and validated
node -e "..." -- "{STEP}" "completed" "{specialist-name} unified ({N} patterns, {size}KB)"
```

---

## Phase 5: VALIDATE — Final Verification

### 5.1 Batch Validation

```bash
node core/cli/ops.js specialist-validate --batch --dir specialists/code/{stack}/
```

Expected: ALL specialists PASS with 16 fields.

### 5.2 Cross-Check

| Check | Command | Expected |
|-------|---------|----------|
| All specialists in _INDEX | grep count | Match total |
| All specialists in metadata-full | grep count | Match total |
| All specialists in stack config | JSON parse | Match total |
| No orphan legacy files | ls vs _INDEX | 0 orphans |
| No project-specific refs | grep "C#\|ASP.NET\|StarX4CRM\|SignalR" | 0 matches |
| No bare N/A | grep "N/A" without justification | 0 matches |
| Pattern numbers unique | validate ranges | 0 overlaps |

### 5.3 Output: Unification Report

```markdown
# Unification Report: {stack}

| Metric | Before | After |
|--------|--------|-------|
| Total specialists | {N} (mixed generations) | {N} (unified) |
| With metadata | {N}/{total} | {N}/{N} (100%) |
| With code examples | {N}% | 100% |
| Total patterns | ~{N} | {N} (exact) |
| Total size | {N}KB | {N}KB |
| Subfolders | 0 (flat) | {N} |
| Project-specific refs | {N} | 0 |
```

---

## Lessons Learned (from React Unification)

These are codified as rules in the SOP above:

| # | Lesson | Rule |
|---|--------|------|
| 1 | V1 know-how is valuable — don't condense to 8KB | Keep ALL patterns with code examples, no size limit |
| 2 | Metadata first, execute second | Phase 3 (metadata-full) BEFORE Phase 4 (execute) |
| 3 | Don't delete legacy files — integrate them | SKIP only if 100% project-specific with no generic value |
| 4 | Cross-stack specialists exist | Phase 2.2: scan other stacks for copy candidates |
| 5 | Split large specialists (>30 patterns) | If 2 distinct domains → 2 specialists |
| 6 | 3 types: code, rule-set, architecture | Classify before metadata design |
| 7 | Architecture=ANY needs justification | Not lazy — document why multi-arch |
| 8 | Subfolder by domain, not by type | hooks-state/, ui/, data/ — not code/, rule-set/ |
| 9 | Convention must be identical across generations | No V1/V2 distinction in output |
| 10 | Pattern-by-pattern merge spec before execute | Phase 2.3 prevents missed patterns |

---

*Specialist Unification SOP v1.0 — EPS Framework*
*Created: 2026-03-26 from React unification experience*

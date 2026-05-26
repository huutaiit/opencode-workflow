# plan/generation.md — Steps 4 + 4.5: Plan Generation (INLINE) + Auto-Split

## 🚨 EXECUTION CONSTRAINTS (INHERITED FROM ROUTER)

```
╔══════════════════════════════════════════════════════════════════╗
║  ⚠️ Generate ALL plan content INLINE — NO Agent/Task tool       ║
║  ⚠️ SEQUENTIAL only — one step/sub-plan at a time               ║
║  ⚠️ Each sub-plan: generate → WRITE → validate → THEN next      ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Step 4: Generate Implementation Plan (INLINE — NO Agent Tool)

⚠️ **MANDATORY**: Generate the plan INLINE in the current conversation. DO NOT use Agent tool, Task tool, or any subagent delegation. Claude (you) directly analyzes all input documents and generates the plan.

### 4.0: Initialize Checkpoint Enforcement

```bash
# Reset checkpoints for plan type
node core/cli/ops.js design-checkpoint --action reset --type plan
node core/cli/ops.js design-checkpoint --action skill-reset --command plan

# Verify section 0 (plan uses non-sequential mode — no N-1 lock check)
node core/cli/ops.js design-checkpoint --action verify --section 0 --type plan
```

### 4.0a: Pre-generation Self-debate (bugfix/enhancement only)

IF taskType == "bugfix":
  Before generating plan content, self-debate 5 rounds:
    Round 1: Is the root cause correct? (validate against evidence, not assumptions)
    Round 2: Is the proposed fix the right approach? (consider alternatives)
    Round 3: Is the scope complete? (all affected files identified in evidence?)
    Round 4: Does the fix comply with architecture? (layer boundaries, patterns)
    Round 5: Edge cases? (concurrency, data integrity, error paths, rollback)

  Record debate summary in Section 0.5 "Self-debate Summary" (max 10 lines).
  If any round reveals a gap → flag it before proceeding (do NOT silently skip).

ELIF taskType == "enhancement":
  Before generating plan content, self-debate 3 rounds:
    Round 1: Is the approach from innovate still valid given loaded context?
    Round 2: Are boundaries correct? (no scope creep beyond evidence)
    Round 3: Architecture compliance? (patterns, layers, specialist alignment)

  Record debate summary in Section 0.5 "Self-debate Summary" (max 5 lines).

ELSE (taskType == "new"):
  Skip self-debate (DD provides validated design decisions).

---

Synthesize all loaded context into a comprehensive implementation plan:

**Input Documents**:
```
=== APPROVED SRS ===
[content from [FEATURE]-srs.md]

=== APPROVED BASIC DESIGN ===
[content from [FEATURE]-basic-design.md]

=== APPROVED DETAIL DESIGN (Traditional Pattern) - Mode: [DD_MODE] ===
[content from $FDD_PATH, $BDD_PATH, api-contracts.md]
[If pseudo-code format: parse META, TRACE_MATRIX, COMPONENTS sections]
[If human format: extract from narrative text]

=== APPROVED DETAIL DESIGN (A+B+C Pattern - if applicable) ===
[Document A: portal-fdd.md - Cross-feature workflows, API strategy]
[Document B: aggregate-fdd.md - Shared components, state architecture, error handling]
[Document C: *-screens-fdd.md - Module-specific screens per sub-feature]

=== SOURCE CODE CONTEXT (RAG - from Step 2.5) ===
[ragContext.codePatterns - existing implementation patterns found via vector search]
[ragContext.graphConstraints - REALIZES/DEFINED_IN relationships from knowledge graph]

=== EVIDENCE CONTEXT (from Step 2.7 - enriched, if available) ===
[evidenceContent - research findings + innovate decisions + design summaries]

=== ARCHITECTURE CONSTRAINTS (v5.4 - from Step 2.10) ===
Source: ${archContext.source}
Layers: ${archContext.layerBoundaries.join(' -> ')}

## Design Patterns
| Pattern | Applied To | Source |
|---------|-----------|--------|
${archContext.patterns.map(p => `| ${p.name} | ${p.appliedTo} | ${p.source} |`).join('\n')}

## Layer Boundaries
${archContext.layerBoundaries.map((layer, i) => `${i + 1}. **${layer}** Layer`).join('\n')}

## Constraints
${archContext.constraints.map(c => `- ${c}`).join('\n')}

ARCHITECTURE_COMPLIANCE:
  - Each step MUST specify which layer it operates in
  - Each step SHOULD reference applicable design pattern
  - Cross-layer calls MUST use defined interfaces
  - Validate against constraints before generating step

## File Path Enforcement (from sourceStructure — loaded in Step 2.10)
IF archContext.sourceStructure IS NOT NULL:
  - Each file path in Section 0.1 MUST match archContext.sourceStructure
    File-type → Path Mapping (Architecture: File Type Mapping) when available
  - File type placement MUST follow the specialist mapping table
  - Layer assignment in Section 0.1 MUST match specialist's layer definition
  - Any file NOT matching Architecture: File Type Mapping → flag for post-validation in Step 4.5

=== STACK-SPECIFIC PATTERNS (v5.4 - from Step 2.9) ===
Stack: ${stackContext.stackId}
Matched Specialists: ${stackContext.specialists.length}

## Specialist Patterns
${stackContext.specialists.map(s => `
### ${s.name}
Relevance: ${s.relevance}
${s.pattern}
`).join('\n')}

## RAG Patterns (if available)
${stackContext.ragPatterns.map(p => `
Source: ${p.source} (score: ${p.score.toFixed(2)})
${p.content}
`).join('\n')}

CONTEXT_PRIORITY:
  1. Approved Design Documents - PRIMARY
  2. Architecture Constraints - MUST FOLLOW (from Step 2.10)
  3. Stack-Specific Patterns - HOW to implement
  4. Evidence - research findings
  5. RAG Source Code - existing patterns

USE specialist patterns when generating implementation steps.
Each step SHOULD reference a specialist pattern if applicable.
```

**Pattern Detection**: If `[FEATURE]-portal-fdd.md` exists, use A+B+C pattern documents.

**Task**:
Create comprehensive implementation plan based on approved design documents (NOT assumptions).

**Plan Structure (v5.4 Execute-Compatible)**:
```markdown
# Implementation Plan: [Feature Name]

> **Confidence**: [X]% (≥90% required for APPROVED status)
> **Status**: APPROVED | DRAFT
> **DD Mode**: [pseudo-code | hybrid | human]
> **Token Reduction**: ~[X]%
> **Stack**: [stackContext.stackId]
> **Architecture Source**: [archContext.source]

## 0. Plan Boundaries

### 0.1 Files to Modify

IF gapAnalysis available (from Step 2.11):
  Use architecture-aligned format with sub-tables:

  #### Source Files ({N}):

  | # | File | Package | Layer | Action | Arch Ref |
  |---|------|---------|-------|--------|----------|
  | 1 | `EntityName.java` | domain.model | Domain | ADD | Entity |
  | 2 | `ExistingPort.java` (update) | application.port | Application | MODIFY | Port Interface |

  #### Config Changes ({N}):

  | # | File | Change |
  |---|------|--------|
  | 1 | `pom.xml` | Add dependency X |
  | 2 | `application.yml` | Add configuration section |

  #### Test Files ({N}):

  | # | File | Tests (est) |
  |---|------|------------|
  | 1 | `EntityNameTest.java` | ~6 |

  Rules:
  - Source Files MUST include Package and Arch Ref columns from specialist Architecture: File Type Mapping
  - Files marked Exists in gapAnalysis → Action = MODIFY
  - Files marked MISSING in gapAnalysis → Action = ADD
  - Layer MUST match specialist definition
  - Config and Test files in separate sub-tables

ELSE (no gapAnalysis — fallback to standard format):

  | # | File | Package | Layer | Action | Arch Ref |
  |---|------|---------|-------|--------|----------|
  | 1 | `path/to/file.ts` | {rootPackage}.presentation.controller | Presentation | ADD | Controller |

  Rules (fallback format):
  - Package column MUST be populated from specialist Architecture Metadata
  - IF specialist not matched → derive package from file path convention
  - Arch Ref column MUST name the component type (Entity, Repository, Controller, UseCase, etc.)
  - Layer MUST match specialist metadata or architecture layer rules

### 0.1.1 Architecture Compliance Check

IF gapAnalysis available from Step 2.11:
  Include the gap analysis table as reference for plan review:

  | Artifact | Layer | Status | Notes |
  |----------|-------|--------|-------|
  [from gapAnalysis output — Exists/MISSING per file type]

  IF contractAnalysis available from Step 2.12:
    Include contract/interface issues:

    | Contract | Issues vs SRS |
    |----------|--------------|
    [from contractAnalysis output]

ELSE:
  Omit Section 0.1.1 (no architecture analysis available).

### 0.2 Methods to Change

| # | File | Method | Action | Pattern |
|---|------|--------|--------|---------|
| 1 | `path/to/file.ts` | `methodName()` | ADD | Repository |

### 0.3 Dependencies Between Steps

| Step | Depends On | Reason |
|------|-----------|--------|
| 2 | 1 | Requires interface from Step 1 |

### 0.4 Import Rules Verification

IF archContext.sourceStructure.layerRules IS NOT NULL:

  Generate import rules for each source file in Section 0.1, based on specialist
  Architecture: Dependency Rules and specialist metadata (canImport/cannotImport).

  | File | Layer | Can Import | FORBIDDEN |
  |------|-------|-----------|-----------|
  | EntityName | Domain | java.* only | everything else (domain entity) |
  | UseCaseName | Application | domain.*, application.port.* | infrastructure.*, presentation.* |
  | GatewayImpl | Infrastructure | domain.*, application.port.*, SDK libs | presentation.* |
  | ControllerName | Presentation | domain.*, application.usecase.* | infrastructure.* |

  Rules:
  - Each source file from Section 0.1 MUST have an import rule entry
  - Can Import / FORBIDDEN derived from specialist Architecture: Dependency Rules
  - This table is a CONTRACT for /execute — import violations trigger DEVIATION_DETECTED
  - Config files and test files are EXCLUDED from this table (no layer constraints)

ELSE:
  ⚠️ WARNING: Section 0.4 Import Rules OMITTED — no layerRules from architecture specialist.
  ⚠️ This means /execute will NOT enforce import direction rules for this plan.
  ⚠️ If this stack has layer boundaries, check specialist heading format
  ⚠️ (expected: ## Architecture: Dependency Rules).
  Omit Section 0.4.

### Step Granularity Rules (MANDATORY)

```
GRANULARITY RULES:
  - Atomic unit = 1 file OR 1 aggregate group (entity + its repository)
  - NEVER batch independent services/usecases/controllers into 1 step
  - Tightly-coupled exception: files sharing an interface/contract MAY group
    (e.g., Port interface + its Gateway implementation = 1 step)
  - IF step touches > 3 files → MUST add "Grouping Reason:" justification
  - Foundation steps (migration, config, shared constants) are exempt from 1-file rule

EXAMPLES:
  ✅ "Step 3: Create IngestUseCase" (1 file)
  ✅ "Step 4: Create IngestGateway interface + IngestJdbcGateway" (2 files, port+adapter)
  ❌ "Step 3: Create all services" (8 files, no justification)
  ❌ "Step 5: Create IngestController + IngestUseCase + IngestGateway" (3 independent concerns)
```

### 0.5 Solution Context

IF taskType == "bugfix":

  **Root Cause**: [Extract from evidence.md Root Cause section — concise summary]
  **Proposed Fix**: [Extract from evidence.md Proposed Fix section — concise summary]
  **Constraint**: Fix ONLY — NO new features, NO improvements beyond fix scope
  **Self-debate Summary**:
  [5-round analysis result — see Step 4.0a Pre-generation Self-debate]

ELIF taskType == "enhancement":

  **Problem**: [Extract from evidence.md — what needs to change and why]
  **Approach**: [Extract from innovate decisions — chosen approach with rationale]
  **Self-debate Summary**:
  [3-round analysis result — see Step 4.0a Pre-generation Self-debate]

ELIF taskType == "new":
  OMIT Section 0.5 (DD provides this context)

> **Max length**: 15-30 lines. Concise summary referencing evidence, NOT copy-paste.

## 1. Implementation Steps

### Step 1: [Concise Description]

**Architecture Reference**:
- Pattern: [from archContext.patterns]
- Layer: [Presentation | Application | Domain | Infrastructure]
- Constraint: [relevant constraint from archContext.constraints]

**BDD Reference**:
IF taskType == "new":
  - Business Rules: [BR-xxx, BR-yyy] (from BDD §2)
  - Endpoints: [METHOD /api/v1/path] (from BDD §3)
  - Entities: [EntityName(field1, field2, ...)] (from BDD §4)
ELIF taskType == "enhancement":
  - Design Reference: [relevant DD section, if available]
ELIF taskType == "bugfix":
  - Fix Reference: [root cause from evidence.md]

**Specialist Pattern**: Pattern [N.M] ([Pattern Name])
From: [specialist-file-name.md]
```typescript
// Relevant code pattern snippet from specialist
[relevant code pattern snippet]
```

**Files**:
- `path/to/file.ts` (lines X-Y)

**Methods**:
- `methodName()` - [ADD | MODIFY | DELETE]

**Dependencies**:
- Depends on: [previous step or "None"]
- Required by: [subsequent step or "None"]

IF taskType IN ["bugfix", "enhancement"] (no DD — self-contained steps):

  **Architecture Check**:
    - Imports: [allowed imports for this layer] → ✓ matches dependency rule
    - Naming: [convention] → ✓ matches specialist convention
    - Package/Path: [expected path] → ✓ matches architecture specialist

  **Changes**:
    [Exact changes — one of:]
    - OLD→NEW diff format for modifications
    - Full content template for new sections/blocks
    - Must be detailed enough that /execute copies without re-interpreting

  **Performance**: [N/A | specific concern + mitigation]
  **Security**: [N/A | specific concern + mitigation]

ELSE (taskType == "new" — has DD):

  **Implementation**:
  ```typescript
  // Pseudo-code or interface definition
  // NO full implementation code
  ```

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

---

[... additional steps following same format ...]

## 2. Validation Checklist

### Architecture Compliance
- [ ] All steps operate within correct layer
- [ ] No cross-layer direct dependencies
- [ ] Design patterns correctly applied

### Execute Compatibility
- [ ] All files listed in Boundaries
- [ ] All methods listed with actions
- [ ] Dependencies clearly defined
- [ ] Each step is independently executable

### Quality Gates
- [ ] Confidence ≥90%
- [ ] No prohibited content (full implementation)
- [ ] Specialist patterns referenced

## 3. Test Plan

### 3.1 Per-Step Test Cases

#### Step [N] Tests

| # | Test Case | Type | Expected Behavior | Test File | DD §9 Ref |
|---|-----------|------|-------------------|-----------|-----------|
| T[N].1 | [tên test case] | NORMAL | [expected result] | [TestFile.java] | [TC-xxx or — (supplement)] |
| T[N].2 | [tên test case] | ABNORMAL | [expected error/behavior] | [same file] | [TC-xxx or — (supplement)] |

> IF DD §9 unavailable → omit DD §9 Ref column.
> Nếu step không cần test (config, migration): ghi "No test cases — [lý do]"

> Nếu step không cần test (config, migration): ghi "No test cases — [lý do]"

### 3.2 Test Summary

| Metric | Target |
|--------|--------|
| Total test cases | [N] |
| Normal cases | [X] ([X/N]%) |
| Abnormal cases | [Y] ([Y/N]%) |
| Abnormal ratio | ≥40% |
| Unit test coverage target | [Z]% |
| Integration test coverage target | [W]% |

### 3.3 Test File Listing

| # | Test File | Steps Covered | Level | Framework |
|---|-----------|---------------|-------|-----------|
| 1 | [path/TestFile.java] | Step 1, 3 | unit | JUnit5 + StepVerifier |
| 2 | [path/test-file.test.ts] | Step 2 | unit | Vitest + @testing-library |

## 4. Rollback Plan

IF taskType == "bugfix":

  ### 4.1 Revert Strategy
  - Git revert: `git revert [commit-hash]` for single-commit fix
  - OR manual rollback steps if fix spans multiple commits

  ### 4.2 Data Rollback (if applicable)
  - [N/A | specific data restoration steps — migrations, cache invalidation, etc.]

  ### 4.3 Verification After Rollback
  - [ ] Original bug symptom re-appears (confirms revert is clean)
  - [ ] No new side effects introduced by revert
  - [ ] Related tests pass (pre-fix state)

ELSE:
  OMIT Section 4 (rollback not applicable for enhancement/new features)

## 5. Side Effects Analysis

IF taskType IN ["bugfix", "enhancement"]:

  | # | Affected Component | Risk | Mitigation |
  |---|-------------------|------|-----------|
  | 1 | [component/module beyond direct change scope] | [LOW/MED/HIGH] | [specific mitigation] |

  **Regression Areas**: [list of areas to test beyond the changed files — user flows, API endpoints, dependent modules]

ELSE:
  OMIT Section 5 (feature plans have full test coverage from DD §9)

---

*Plan generated: [DATE]*
*EPS Framework v10.0*
```

### Section 3 Generation Rules

1. **Test Case Derivation (priority order)**:
   a. **DD §9 test specs** → IF available, EVERY test case in DD §9 MUST appear in Section 3.1.
      Map each DD §9 case to a Test ID (T[step].[seq]). These are PRIMARY — do not omit or rephrase.
   b. **Business rules BR-xxx** → For each BR-xxx referenced in step's BDD Reference,
      generate ≥1 ABNORMAL test case (rule violation scenario).
   c. **Implementation-specific** → boundary values, null inputs, concurrent access, error paths.
      These SUPPLEMENT DD §9 cases, not replace them.

   IF DD §9 unavailable (enhancement/bugfix):
   - Generate from BR-xxx + acceptance criteria from step template
   - Still enforce ≥40% abnormal ratio

2. **Specialist loading**: Trước khi generate Section 3, load test-plan specialist:
   - Detect stack từ Plan Section 0.1 file extensions (.java → java-springboot, .ts/.tsx → typescript-nextjs)
   - Load: `specialist-load --category test-plan --source-path <first-file-of-stack>`
   - Ví dụ: `tps-java-unit.md` (backend), `tps-nextjs-unit.md` (frontend)
   - Fullstack: load cả 2 specialists
3. **Abnormal ratio**: Tổng abnormal cases / total cases ≥ 40%. Nếu < 40% → Claude phải bổ sung abnormal cases
4. **Test file naming**:
   - Java: `[ClassName]Test.java` cùng package structure trong `src/test/`
   - TypeScript: `[file-name].test.ts` hoặc `[file-name].spec.ts` cùng thư mục `__tests__/`
5. **Type chỉ có 2 giá trị**: `NORMAL` hoặc `ABNORMAL`
6. **Test ID convention**: Mỗi test case có ID duy nhất `T[step].[seq]` (ví dụ: T1.1, T1.2, T2.1). Lifecycle:
   - `/plan`: Tạo ID trong Section 3.1 table (cột #)
   - `/execute`: Chèn ID vào test method — `@DisplayName("T1.2: ...")` (Java) hoặc `it('T1.2: ...')` (TypeScript)
   - `/test run`: Match test result với plan case bằng ID (tìm `T1.2` trong displayName/test name)
7. **DD §9 Traceability** (mandatory when DD §9 exists):
   Add DD §9 Ref column to Section 3.1 table:

   | # | Test Case | Type | Expected Behavior | Test File | DD §9 Ref |
   |---|-----------|------|-------------------|-----------|-----------|
   | T1.1 | Create with valid data | NORMAL | Return DTO | Test.java | TC-INGEST-001 |
   | T1.2 | Duplicate transaction | ABNORMAL | Throw exception | Test.java | TC-INGEST-002 |
   | T1.3 | Null payload | ABNORMAL | ValidationException | Test.java | — (supplement) |

   Rules:
   - Cases from DD §9 → fill DD §9 Ref with original test case ID
   - Supplementary cases → fill DD §9 Ref with "— (supplement)"
   - IF DD §9 unavailable → omit DD §9 Ref column entirely

**Ví dụ cụ thể**:

```markdown
#### Step 1 Tests (UserService.createUser)

| # | Test Case | Type | Expected Behavior | Test File |
|---|-----------|------|-------------------|-----------|
| T1.1 | Create user with valid data | NORMAL | Return UserDTO with generated ID | UserServiceTest.java |
| T1.2 | Create user with duplicate email | ABNORMAL | Throw DuplicateEmailException (ERR-001) | UserServiceTest.java |
| T1.3 | Create user with null required fields | ABNORMAL | Throw ValidationException | UserServiceTest.java |
| T1.4 | Create user when DB connection fails | ABNORMAL | Throw ServiceUnavailableException | UserServiceTest.java |
```

### 4.0b: Complete Monolithic Plan Checkpoint

After generating and writing the monolithic plan:

```bash
# Complete section 0 checkpoint (non-blocking — warn if < 40 lines)
node core/cli/ops.js design-checkpoint --action complete --section 0 --type plan --file "$PLAN_PATH"

# Verify-all (report count)
node core/cli/ops.js design-checkpoint --action verify-all --type plan
```

**IMPORTANT Instructions (INLINE Generation)**:
- ⚠️ Generate ALL plan content INLINE — DO NOT delegate to Agent/Task tool
- ✅ Base ALL steps on approved documents (reference specific sections)
- ✅ Include file paths from Basic Design
- ✅ Include API signatures from Detail Design
- ✅ Include database schema from Detail Design
- ✅ Follow coding standards (FRONTEND_CODING_STANDARDS.md, BACKEND_CODING_STANDARDS.md)
- ❌ NO assumptions or hallucinations
- ❌ NO generic placeholders
- ❌ NO Agent tool, NO Task tool, NO subagent delegation
- ❌ NO parallel execution — generate sequentially

---

## Step 4.4: Architecture Path Validation (Post-generation)

After generating the plan (Step 4 or 4.0b), validate file paths in Section 0.1 against architecture specialist sourceStructure.

```pseudo
IF archContext.sourceStructure IS NOT NULL AND archContext.sourceStructure.fileTypeMapping IS NOT NULL:

  planContent = READ(PLAN_PATH)
  section01 = extractSection(planContent, "0.1 Files to Modify")
  fileEntries = parseTable(section01)
  fixCount = 0

  FOR EACH entry IN fileEntries:
    filePath = entry.File
    fileType = inferFileTypeFromPath(filePath)
    # e.g., "CustomerService" → "Service", "UserController" → "Controller"

    expectedPattern = lookupInMapping(archContext.sourceStructure.fileTypeMapping, fileType)

    IF expectedPattern AND NOT pathMatches(filePath, expectedPattern):
      DISPLAY "⚠️ Path mismatch in Section 0.1:"
      DISPLAY "  File:     {filePath}"
      DISPLAY "  Expected: {expectedPattern}"
      DISPLAY "  Type:     {fileType}"
      DISPLAY "  Source:   specialist Architecture: File Type Mapping"
      DISPLAY ""

      # Auto-fix: replace path in plan
      REPLACE filePath WITH expectedPattern IN planContent
      fixCount += 1

  IF fixCount > 0:
    WRITE(PLAN_PATH, planContent)
    DISPLAY "✅ Architecture path validation: {fixCount} paths corrected in Section 0.1"
  ELSE:
    DISPLAY "✅ Architecture path validation: all paths match sourceStructure"

ELSE:
  DISPLAY "ℹ️ Architecture path validation skipped (no sourceStructure available)"
```

---

## Step 4.5: Auto-Split Plan Generation (Multi-File Mode — SEQUENTIAL INLINE)

⚠️ **MANDATORY**: Generate ALL sub-plans INLINE in the current conversation. SEQUENTIAL only — generate one sub-plan, WRITE it to file, then proceed to the next. DO NOT use Agent tool, Task tool, or parallel execution.

**Trigger**: Only when `designDocs.splitMode === "multi-file"` AND estimated plan size > 600 lines.
When triggered, this step replaces the monolithic plan output from Step 4 with a two-pass approach.

```javascript
const { buildSectionOrder, groupBySizeConstraint, generateMasterPlanIndex,
        estimatePlanSize, validateMasterPlan, validateSubPlan,
        SIZE_THRESHOLDS, SIZE_CONSTRAINTS
} = require('./core/plan/auto-split.js');

let subPlanMode = "disabled";

if (designDocs.bddSectionMap && designDocs.bddSectionMap.size > 0) {
  const estimated = estimatePlanSize(designDocs.bddSectionMap);
  if (estimated > SIZE_THRESHOLDS.planSplitLines) {
    subPlanMode = "auto";
    console.log(`📂 Auto-split: estimated ${estimated} lines > ${SIZE_THRESHOLDS.planSplitLines} threshold`);
  } else {
    console.log(`📄 Single plan: estimated ${estimated} lines ≤ ${SIZE_THRESHOLDS.planSplitLines} threshold`);
  }
}

if (subPlanMode === "auto") {
  // Reset checkpoints for auto-split (replaces monolithic checkpoint)
  // node core/cli/ops.js design-checkpoint --action reset --type plan

  // Build section order from document position (E22, E23)
  const boundaries = [...designDocs.bddSectionMap.entries()].map(([id], i) =>
    ({ sectionId: id, documentOrder: i }));
  const sectionOrder = buildSectionOrder(designDocs.bddSectionMap, boundaries);

  // Estimate tokens per section (read section file, count lines × 4)
  const sectionTokens = new Map();
  for (const [sectionId, filePath] of Object.entries(designDocs.bddSectionFiles)) {
    const content = fs.readFileSync(filePath, "utf8");
    sectionTokens.set(sectionId, Math.round(content.split("\n").length * 4));
  }

  const groups = groupBySizeConstraint(sectionOrder, sectionTokens, SIZE_CONSTRAINTS);

  // === PASS 1: Master Plan Index ===
  // Generate master plan using multi-model (Claude/Gemini/Hybrid) — full quality
  const sharedContext = {
    confidence: "94%",
    summary: evidenceContent ? evidenceContent.substring(0, 2000) : "",
    definitions: ""
  };
  const masterPlan = generateMasterPlanIndex(groups, sharedContext, feature, innovateSelection);

  // Save master plan
  const plansDir = path.join(contextDir, 'plans');
  if (!fs.existsSync(plansDir)) fs.mkdirSync(plansDir, { recursive: true });
  const masterPath = path.join(plansDir, `${feature}-implementation-plan.md`);
  fs.writeFileSync(masterPath, masterPlan, 'utf8');
  console.log(`✅ Master plan index: ${masterPath} (${masterPlan.split('\n').length} lines)`);

  // Validate master plan (non-blocking)
  const masterValidation = validateMasterPlan(masterPlan);
  if (masterValidation.valid) {
    console.log(`  ✅ Master validation: ${masterValidation.lineCount} lines, ${masterValidation.subPlanCount} sub-plans`);
  } else {
    console.warn(`  ⚠️ Master validation warnings: ${masterValidation.errors.join(', ')}`);
  }

  // === PASS 2: Each Sub-Plan (SEQUENTIAL INLINE — NO Agent tool) ===
  // ⚠️ CRITICAL: Generate each sub-plan INLINE in current conversation.
  // DO NOT use Agent tool, Task tool, or parallel execution.
  // Generate → Write → Validate → THEN move to next sub-plan.
  for (const group of groups) {
    let sectionContent = "";
    for (const sectionId of group.sections) {
      const filePath = designDocs.bddSectionFiles[sectionId];
      if (filePath && fs.existsSync(filePath)) {
        sectionContent += fs.readFileSync(filePath, "utf8") + "\n---\n";
      }
    }

    const spFileName = `SP-${group.spId.split('-')[1]}-${group.title.replace(/ \+ /g, '-')}.md`;
    const spPath = path.join(plansDir, spFileName);

    console.log(`  📝 Generating ${group.spId}: ${group.title} (${group.sections.length} sections)...`);

    // Checkpoint: verify (non-blocking — plan non-sequential)
    // node core/cli/ops.js design-checkpoint --action verify --section $SP_INDEX --type plan

    // Load per-sub-plan graph context
    // node core/cli/ops.js design-context --section $SP_INDEX --type plan --module "$MODULE"

    // INLINE generation: Claude directly generates sub-plan content using:
    // - masterPlan (compact index) as structural reference
    // - sectionContent (relevant DD only) as primary input
    // - matched specialists for HOW context
    // Each sub-plan follows same structure as monolithic plan but scoped to group.sections
    // This is where the 74% token savings occur (E4)

    // After generating sub-plan content INLINE:
    // 1. WRITE the sub-plan file using Write tool
    // 2. Validate (non-blocking — warn but don't stop)
    // 3. THEN proceed to next group (SEQUENTIAL)

    // Checkpoint: complete (non-blocking — warn if < 40 lines)
    // node core/cli/ops.js design-checkpoint --action complete --section $SP_INDEX --type plan --file "$SP_PATH"

    // const spValidation = validateSubPlan(spContent);
    // if (spValidation.valid) {
    //   console.log(`  ✅ ${group.spId} validation: ${spValidation.lineCount} lines`);
    // } else {
    //   console.warn(`  ⚠️ ${group.spId} validation warnings: ${spValidation.errors.join(', ')}`);
    // }
  }

  // Checkpoint: verify-all (report count — non-blocking)
  // node core/cli/ops.js design-checkpoint --action verify-all --type plan

  console.log(`✅ Auto-split: ${groups.length} sub-plans generated`);

  // AC8: Token budget estimation (informational — not enforced)
  // Context window ~200K tokens. Target: master < 5%, per SP < 15%
  const masterTokens = Math.round(masterPlan.split('\n').length * 4);
  const contextWindow = 200000;
  const masterPct = ((masterTokens / contextWindow) * 100).toFixed(1);
  console.log(`📊 Token budget (AC8):`);
  console.log(`   Master: ~${masterTokens} tokens (${masterPct}% of context) — target < 5%`);
  for (const group of groups) {
    const spTokens = group.sections.reduce((sum, sid) => sum + (sectionTokens.get(sid) || 0), 0);
    const spPct = ((spTokens / contextWindow) * 100).toFixed(1);
    console.log(`   ${group.spId}: ~${spTokens} tokens (${spPct}% of context) — target < 15%`);
  }
}
// else: monolithic plan (existing Step 4 logic — unchanged)
```

**Key Rules**:
- ⚠️ ALL generation runs INLINE — NO Agent tool, NO Task tool, NO parallel execution
- Master plan uses full multi-model generation (3 plans: Claude/Gemini/Hybrid)
- Sub-plans use single-model only (Claude) — no multi-model per sub-plan
- SEQUENTIAL sub-plan generation: generate → write → validate → next (E22)
- Each sub-plan loads ONLY its section pseudo files (74% token savings)
- `planStructure: multi-sub-plan` marker in master plan header

---

## Step 4.6: Confidence Check

After generating the plan (or all sub-plans), invoke the **confidence-check** skill:
- 5-point assessment:
  1. Duplicate check — plan doesn't recreate existing components
  2. Architecture compliance — plan respects layer boundaries
  3. Official docs verification — referenced APIs/libraries are valid
  4. OSS references — dependencies are current and maintained
  5. Root cause identification — plan addresses actual problem, not symptoms
- Minimum required: ≥90% confidence
- If < 90%: Display assessment details, ask user to address gaps before approving plan
- If ≥ 90%: Set plan status to APPROVED, continue to save

```bash
# Skill artifact enforcement
node core/cli/ops.js design-checkpoint --action skill-gate \
  --skill confidence-check --command plan --result PASS
node core/cli/ops.js design-checkpoint --action skill-verify \
  --skills "confidence-check" --mode strict
```

---

## Step 4.7: Relationship Matrix (Cross-Step Coherence)

**Skip if**: taskType == "bugfix" or taskType == "lightweight" (too few components to analyze).

**NOW**: Use the **Read tool** to load `commands/plan/relationship-matrix.md` and follow its instructions completely.

After relationship-matrix.md RETURNS, continue to save-and-display.md below.

---

**NEXT**: Use the **Read tool** to load `commands/plan/save-and-display.md` and follow its instructions completely.

<!-- Next: plan/save-and-display.md — Steps 5-7: Save, State Update, Display -->

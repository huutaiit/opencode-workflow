# /architect Phase 4: Architecture Documents

> **EXECUTION CONSTRAINTS**
>
> 1. INLINE conversation only.
> 2. Generate documents SEQUENTIALLY — each references previous ones.
> 3. Save each document after user approval.
> 4. Update architect-state.json after each document.
> 5. Final document (00-overview) generated LAST.

---

## Purpose

Generate Architecture Documents based on ADRs, Assessment, and Feature Map.
Documents are the FINAL OUTPUT of /architect — baseline for all future features.

**Input**: `architect/assessment.md`, `architect/decisions/`, `architect/feature-map.md`, `architect/catalogs/`
**Output**: `documents/architecture/NN-[title].md`

---

## Step 0: Load Context

Read using Read tool:
- `{context-dir}/architect/assessment.md`
- All `{context-dir}/architect/decisions/ADR-*.md`
- `{context-dir}/architect/feature-map.md`
- All `{context-dir}/architect/catalogs/*.md` (if any)

---

## Step 0.5: Load Architecture Specialists (MANDATORY)

**WHY**: Specialists define the AUTHORITATIVE source code structure (Pattern 0.x).
Architecture docs MUST reference specialist — NOT invent package/folder names from general knowledge.

### 0.5.1 Resolve Stack Configuration

Read `project-config.json` → extract for EACH sourceRoot:
- `stackKey`
- `variant` (variantId)
- `architecture`

### 0.5.2 Discover Architecture Specialists (Generic — ANY stack)

For EACH unique stackKey, use the existing discovery mechanism:

```
1. Resolve specialistDir:
   stacks/{stackKey}.json → variants[variantId].specialistDir → {specialistDir}

2. Scan directory:
   specialists/code/{specialistDir}/architecture/*-specialist.md

3. Parse metadata from EACH specialist file:
   → Read "## Architecture Metadata" table
   → Extract: Specialist Type, Layer, Variant, Pattern Numbers, Source Skeleton
```

### 0.5.3 Classify & Rank by Metadata

Use specialist metadata fields to classify — NOT hardcoded filenames:

| Role | Selection Criteria (from metadata) |
|------|------------------------------------|
| **Architecture master** | `Specialist Type: architecture` AND `Layer: ALL (cross-cutting)` |
| **Variant specialist** | `Variant` field matches project's variantId (not "ALL") |
| **Supplementary** | `Specialist Type: code` or `rule-set` in architecture/ dir |

Ranking (3-tier scoring — same as specialist-load.js):
- Variant match: 50pts (exact) / 25pts (ALL) / 0pts (mismatch)
- Layer match: 30pts (exact) / 15pts (ALL) / 5pts (other)
- Pattern count: min(count × 10, 20)pts
- **Primary**: score ≥ 70 | **Supplementary**: score < 70

Filter: Only include specialists where `Variant` matches project variantId OR `Variant = ALL`.

### 0.5.4 Extract Source Structure Rules

From **primary** architecture specialists, extract and cache:

| Data | Source | Metadata Field |
|------|--------|----------------|
| Complete folder tree | Pattern 0.1 section | `Source Skeleton`, `Directory Pattern` |
| File type → path mapping | Pattern 0.2 / 0.4 section | `Source Paths` |
| Layer dependency rules | Pattern 0.3 section | `Imports From`, `Cannot Import` |
| Feature completeness checklist | Pattern 0.4 section | `File Count` |
| Variant-specific rules | Pattern 0.5+ sections | `Variant`-specific patterns |

Store as `specialist-source-rules` context — available to ALL subsequent document generation steps.

> **CRITICAL**: If no specialist with `Specialist Type: architecture` found for a stackKey, HALT and ask user.
> Do NOT proceed with "general knowledge" — this is the root cause of architecture-specialist mismatch.

---

## Step 1: Propose Document List

AI analyzes project complexity to propose documents.

Standard document set (not all required — AI selects based on project):

| # | Document | When needed |
|---|----------|-------------|
| 01 | System Architecture | Always |
| 02 | Service/Component Architecture | Multi-service or modular systems |
| 03 | Frontend Architecture | Projects with UI |
| 04 | Database Design | Projects with persistent data |
| 05 | API Specifications | Projects with APIs |
| 06 | Backend Architecture | Projects with backend logic |
| 07 | Security Architecture | Projects with auth, sensitive data |
| 08 | Deployment Architecture | Production deployment needed |
| 09 | Domain-specific | Blockchain, ML, IoT — if applicable |
| 00 | Overview | Always (generated last) |

Display proposed list:

```
Proposed Architecture Documents: [N] documents

  01-system-architecture.md — [brief description]
  02-service-architecture.md — [brief description]
  ...
  00-overview.md — Generated last (summary of all)

Simple project: 4-5 documents
Complex project: 8-10 documents

Confirm this list? You can add/remove. (confirm/edit)
```

WAIT user confirm.
Update architect-state.json: `documents.docList = [...]`, `documents.totalDocs = N`.

---

## Step 2: Document Generation Loop

FOR each document in confirmed order (EXCEPT 00-overview):

### 2.1 Display Progress

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document [current/total]: [title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.2 Load Reference Context

For this document, load:
- Relevant ADR decisions (AI selects which ADRs apply)
- Relevant assessment sections
- Relevant catalogs
- ALL previously generated documents (in documents/architecture/)

### 2.3 Generate Draft

AI generates document following architecture document conventions:
- Clear section structure with headings
- Reference ADRs by ID: "Per ADR-001, we chose [X]"
- Reference previous documents: "As defined in 01-system-architecture.md"
- Include diagrams where helpful (ASCII)
- Bilingual if configured (primary language + technical English terms)

#### 2.3.1 Source Code Structure Constraint (MANDATORY)

When document contains source code structure, package layout, folder tree, or skeleton:

> **RULE**: Specialist is the SINGLE SOURCE OF TRUTH for package/folder naming.
> Architecture docs REFERENCE specialist — NEVER invent their own structure.

1. **USE** `specialist-source-rules` (loaded in Step 0.5)
2. **Folder tree** → MUST match specialist Pattern 0.1 exactly
3. **File type → path mapping** → MUST match specialist Pattern 0.2 / 0.4
4. **Layer dependencies** → MUST match specialist Pattern 0.3
5. **Naming conventions** → MUST match specialist naming rules

**FORMAT**: Include specialist reference in the document:
```markdown
> Source: {specialist-file-name} Pattern 0.x
> Stack: {stackKey} | Variant: {variant}
```

**FORBIDDEN**:
- Inventing package names not in specialist (e.g., `adapter/` when specialist says `infrastructure/adapter/`)
- Mixing architecture styles (e.g., Hexagonal terms in Clean Architecture project)
- Omitting layers defined in specialist
- Adding layers not defined in specialist

### 2.4 User Review

Display full document draft.

Ask: "Review this document. (approve / feedback / regenerate)"
WAIT user response.

- **approve** → save and continue
- **feedback** → AI revises based on feedback → display revised → WAIT again
- **regenerate** → AI generates new draft → display → WAIT again

### 2.5 Gap Detection

During generation, if AI discovers missing information:

```
Gap detected: [description]
This information was not covered in the interview.

Question: [supplementary question]
```

WAIT user answer.
Append answer to assessment.md (Section: "Supplementary — Phase 4").
Continue document generation with new info.

### 2.6 ADR Revision Check

If generating this document reveals that a previous ADR decision should change:

```
Potential ADR revision detected:
  ADR-[NNN]: [title]
  Current decision: [X]
  Issue: [why it should change]
  Suggested: [new decision]

Options:
  1. Create new ADR superseding ADR-[NNN]
  2. Keep current ADR (note concern)
  3. Skip for now
```

WAIT user.
If option 1 → generate new ADR → save to decisions/ → mark old as SUPERSEDED.

### 2.7 Catalog Check

If this document reveals need for a new catalog:
- Ask user confirm
- Generate catalog → save to `architect/catalogs/[name].md`

### 2.8 Source Structure Validation (before save)

IF document contains source code structure / package layout / folder tree:

**Cross-validate against specialist-source-rules (from Step 0.5):**

| Check | Action |
|-------|--------|
| Folder/package names | Compare each path in document vs specialist Pattern 0.1/0.4 |
| Layer count | Document layers == specialist layers (no extra, no missing) |
| Dependency direction | Document dependency arrows match specialist Pattern 0.3 |
| File type placement | Each file type in correct layer per specialist Pattern 0.2/0.4 |
| Naming convention | Class/file names follow specialist naming rules |

**IF mismatch found:**

```
⚠️ Architecture-Specialist Mismatch Detected

  Document uses: {doc_path}
  Specialist defines: {specialist_path}
  Source: {specialist_file} Pattern {pattern_number}

Action: Auto-correct document to match specialist.
```

Auto-correct the document → display corrected version → WAIT user approve.

**DO NOT save document with mismatched source structure.**

### 2.9 Save Document

Save to `documents/architecture/[NN]-[title].md`.

Update architect-state.json:
```
documents.completedDocs += "[NN]-[title]"
```

Display: "Document [title] saved. ✅ Specialist-validated. [remaining] left."

END FOR

---

## Step 3: Generate Overview (00-overview.md)

This is ALWAYS the last document.

Read ALL generated documents from `documents/architecture/`.

Generate overview containing:
- Executive summary of the architecture
- Document index with brief descriptions
- Key decisions summary (from ADRs)
- Feature summary (from feature map)
- Technology stack overview
- Deployment overview

Display to user.
WAIT approve.
Save `documents/architecture/00-overview.md`.

---

## Step 4: Finalize

Display all documents created:

```
Architecture Documents Complete!

documents/architecture/
  00-overview.md
  01-system-architecture.md
  [list all]

Total: [N] documents
Working artifacts: [M] ADRs, [K] catalogs
```

Update architect-state.json:
```
documents.status = "completed"
currentPhase = "estimation"
```

Display: "Phase 4 complete. [N] architecture documents created."

**RETURN** control to router.

---

**/architect Phase 4: Architecture Documents v1.1**
*Sequential Generation with Gap Detection + ADR Revision + Specialist-Enforced Source Structure*
*EPS Framework v8.0*

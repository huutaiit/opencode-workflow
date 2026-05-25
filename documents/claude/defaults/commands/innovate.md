---
description: Enter INNOVATE mode — Unified Decision Engine (2 Parts + Auto-chain Design)
---

# INNOVATE Command — Unified Decision Engine

> **EXECUTION CONSTRAINTS**
>
> 1. Part 1 (SRS) + Part 2 (BD+DD) run INLINE in same conversation.
> 2. Design documents generate AFTER all decisions made (auto-chain).
> 3. Human-in-Loop REQUIRED: user must approve at each checkpoint.
> 4. Design commands v1 (srs.md, basic.md, detail.md) called AS-IS — NOT modified.

---

## Purpose

Single command replaces v1 innovate×3 + design×3:
- Part 1: Interview + brainstorm SRS → user approve
- Part 2: Brainstorm BD+DD → user approve
- Auto-chain: generate SRS → BD → DD documents via v1 design commands

---

## Step 0: Detect State & Route

```bash
node core/cli/ops.js context-detect
CONTEXT_DIR=$(node -e "const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));console.log(r.data&&r.data.contextPath||'')" 2>/dev/null || echo "")

CURRENT_STATE=$(grep -oP 'Current State:\s*\*\*\K[^*]+' "$CONTEXT_DIR/context.md" 2>/dev/null || echo "")
TASK_TYPE=$(grep -oP 'Task Type:\s*\K\w+' "$CONTEXT_DIR/context.md" 2>/dev/null || echo "new")
```

### Routing Table

| State | Action |
|-------|--------|
| `RESEARCHED` | Full flow: Part 1 → Part 2 → Auto-chain |
| `SRS_CREATED` | Resume: skip Part 1 → Part 2 → Auto-chain |
| `INNOVATE_TECHNICAL` | Resume: skip Parts → Auto-chain only |
| `BD_DD_CREATED` | Done: display "All documents generated. Next: /plan" |
| Other | Error: "Run /research first" |

### Bugfix Special Case

```pseudo
IF TASK_TYPE == "bugfix":
    DISPLAY "Bugfix: skip innovate → /plan"
    update_state("PLAN_READY")
    RETURN
```

---

## Step 1: Execute Part 1 — SRS Decisions (Inline)

**Condition**: State = RESEARCHED

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 1/2: Business Approach (SRS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use the **Read tool** to load `commands/innovate/srs.md` and follow its instructions completely.

The SRS router will dispatch to micro-commands:
```
srs.md → srs/interview.md → srs/evidence-synthesis.md
       → srs/decision-loop.md → srs/function-list.md → srs/save.md
```

After srs.md completes:
- `innovate-srs-selection.md` saved
- State: RESEARCHED → INNOVATE_SRS → SRS_CREATED

---

## Step 1.5: Auto-Split Check (Per-Sub SRS Generation)

**Condition**: Step 5.5 completed (convention codes + `.subfeatures.json` + folder structure exist)

```pseudo
feature_dir = find_feature_directory(feature_name)
subfeatures_path = feature_dir + "/.subfeatures.json"

IF NOT FILE_EXISTS(subfeatures_path):
    GOTO Step 2  # No sub-features → single-pass

subfeatures_json = JSON.PARSE(READ(subfeatures_path))
sub_count = subfeatures_json.subFeatures.LENGTH

IF sub_count < 2:
    GOTO Step 2  # Not enough to split → single-pass

# ═══ AUTO-SPLIT: Generate per-sub SRS ═══

base_srs_path = feature_dir + "/" + feature_name + "-BASE-srs.md"
IF NOT FILE_EXISTS(base_srs_path):
    DISPLAY "⚠️ BASE SRS not found. Continuing single-pass."
    GOTO Step 2

base_srs = READ(base_srs_path)
srs_selection = READ(context_dir + "/innovate-srs-selection.md")

FOR EACH sub IN subfeatures_json.subFeatures:
    sub_srs_path = feature_dir + "/" + sub.code + "-srs.md"

    IF FILE_EXISTS(sub_srs_path):
        DISPLAY "  ⏭ " + sub.code + "-srs.md already exists, skipping"
        CONTINUE

    # Extract sub-specific content from BASE SRS
    sub_srs = "# SRS: " + sub.code + " — " + sub.name + "\n\n"
    sub_srs += "## Extracted from: " + feature_name + "-BASE-srs.md\n\n"

    # Strategy 1: Match by functionalRequirements field
    IF sub.functionalRequirements AND sub.functionalRequirements.LENGTH > 0:
        FOR EACH fr IN sub.functionalRequirements:
            fr_section = findFRSection(base_srs, fr.id)
            IF fr_section:
                sub_srs += fr_section + "\n\n"

    # Strategy 2: Fallback — keyword match on sub.name + sub.description
    ELSE:
        keywords = sub.name.SPLIT(/[\s/&,]+/)
        FOR EACH section IN base_srs.sections:
            IF section.containsAny(keywords):
                sub_srs += section + "\n\n"

    WRITE(sub_srs_path, sub_srs)
    DISPLAY "  📄 " + sub.code + "-srs.md created"

# Display completion
DISPLAY ""
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "✅ " + sub_count + " sub-features prepared:"
DISPLAY ""
FOR EACH sub IN subfeatures_json.subFeatures:
    DISPLAY "  📄 " + sub.code + "-srs.md — " + sub.name
DISPLAY ""
DISPLAY "Next: Run /research for each sub-feature."
DISPLAY "Each sub auto-chains: /research → /innovate → /design"
DISPLAY "Then: /plan → /execute → /validate → /test"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RETURN  # Parent stops. Do NOT continue to Step 2.
```

---

## Step 2: Execute Part 2 — Technical Decisions (Inline)

**Condition**: State = SRS_CREATED

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 2/2: Technical Approach (BD+DD)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use the **Read tool** to load `commands/innovate/technical.md` and follow its instructions completely.

Enhancement mode: pass `mode: "delta"` to technical router.

The technical router will dispatch to micro-commands:
```
technical.md → technical/common.md → technical/architecture.md
             → technical/implementation.md → technical/save.md
```

After technical.md completes:
- `innovate-technical-selection.md` saved
- State: SRS_CREATED → INNOVATE_TECHNICAL

---

## Step 3: Auto-chain Design Generation

**Condition**: State = INNOVATE_TECHNICAL

```markdown
═══════════════════════════════════════════════════════════════
🔄 AUTO-CHAIN: Generating design documents...
═══════════════════════════════════════════════════════════════
```

### 3.1: Adapter — Create v1-compatible temp files

Design commands v1 expect specific selection files. V2 has different format.

```pseudo
# Read selection file
technical_selection = READ("innovate-technical-selection.md")

# Extract BD section → create temp v1-compatible file
bd_section = extract_section(technical_selection, "BD Decisions")
WRITE("innovate-bd-selection.v2-temp.md", format_as_v1_bd(bd_section))

# Extract DD section → create temp v1-compatible file
dd_section = extract_section(technical_selection, "DD Decisions")
WRITE("innovate-dd-selection.v2-temp.md", format_as_v1_dd(dd_section))

# Backup existing v1 files if they exist (safety)
IF EXISTS("innovate-bd-selection.md"):
    COPY("innovate-bd-selection.md", "innovate-bd-selection.md.v2-backup")
IF EXISTS("innovate-dd-selection.md"):
    COPY("innovate-dd-selection.md", "innovate-dd-selection.md.v2-backup")

# Place temp files where v1 design commands expect them
COPY("innovate-bd-selection.v2-temp.md", "innovate-bd-selection.md")
COPY("innovate-dd-selection.v2-temp.md", "innovate-dd-selection.md")
```

### 3.2: Call Design Commands (v1, sequential)

```pseudo
# Design --srs
update_state("INNOVATE_SRS")
DISPLAY "📄 [1/3] Generating SRS document..."
TRY:
    CALL "/design --srs"  # v1 command, unchanged
CATCH error:
    DISPLAY "❌ SRS generation failed: {error}"
    cleanup_temp_files()
    update_state("INNOVATE_TECHNICAL")  # restore v2 state for resume
    STOP

# Design --basic
update_state("INNOVATE_BD")
DISPLAY "📄 [2/3] Generating Basic Design..."
TRY:
    CALL "/design --basic"  # v1 command, unchanged
CATCH error:
    DISPLAY "❌ BD generation failed: {error}"
    DISPLAY "   SRS was generated successfully."
    cleanup_temp_files()
    update_state("INNOVATE_TECHNICAL")
    STOP

# Design --detail (generates FDD + BDD + pseudo-code)
update_state("INNOVATE_DD_APPROVED")
DISPLAY "📄 [3/3] Generating Detail Design (FDD + BDD + pseudo)..."
TRY:
    CALL "/design --detail"  # v1 command, unchanged — auto-generates FDD, BDD, pseudo
CATCH error:
    DISPLAY "❌ DD generation failed: {error}"
    DISPLAY "   SRS + BD were generated successfully."
    cleanup_temp_files()
    update_state("INNOVATE_TECHNICAL")
    STOP
```

### 3.3: Cleanup & Restore

```pseudo
# Remove temp files
DELETE("innovate-bd-selection.v2-temp.md")
DELETE("innovate-dd-selection.v2-temp.md")
DELETE("innovate-bd-selection.md")  # was temp copy
DELETE("innovate-dd-selection.md")  # was temp copy

# Restore backups if they existed
IF EXISTS("innovate-bd-selection.md.v2-backup"):
    MOVE("innovate-bd-selection.md.v2-backup", "innovate-bd-selection.md")
IF EXISTS("innovate-dd-selection.md.v2-backup"):
    MOVE("innovate-dd-selection.md.v2-backup", "innovate-dd-selection.md")

# Final state
update_state("BD_DD_CREATED")
```

---

## Completion Message

```markdown
═══════════════════════════════════════════════════════════════
✅ INNOVATE COMPLETE

Decisions:
  Part 1 (SRS): [N] decisions → innovate-srs-selection.md
  Part 2 (BD+DD): [M] decisions → innovate-technical-selection.md

Documents Generated:
  📄 SRS: [feature]-BASE-srs.md
  📄 BD: [feature]-BASE-basic-design.md
  📄 DD: [feature]-BASE-frontend-detail-design.md
       + [feature]-BASE-backend-detail-design.md
       + [feature]-BASE-api-contracts.md

State: BD_DD_CREATED
Next: /plan
═══════════════════════════════════════════════════════════════
```

---

*INNOVATE Command — Unified Decision Engine*
*2 Parts + Auto-chain Design*
*EPS Framework v9.0*

# INNOVATE/TECHNICAL/ARCHITECTURE — Architecture Decisions [FROM-BD]
# [FROM: innovate/bd.md — full logic]

## Purpose
Architecture decisions: Impact Assessment (enhancement) + SRS Validation + Brainstorm + Per-item decisions.

---

## Step 0: Enhancement Impact Assessment (delta mode only)

**CONDITION**: Only runs when `mode == "delta"` (enhancement task type).

```pseudo
# [FROM-BD: innovate/bd.md Step 0 — Impact Assessment]

IF mode == "delta":
    srs_delta = extract_changes(srs_selection)

    # Map changes to 6 BD layers
    impact_matrix = {
        "§1 Architecture": check_architecture_impact(srs_delta),
        "§2 Component": check_component_impact(srs_delta),
        "§3 Data Flow": check_dataflow_impact(srs_delta),
        "§4 Data Model": check_datamodel_impact(srs_delta),
        "§5 State Mgmt": check_state_impact(srs_delta),
        "§6 NFR": check_nfr_impact(srs_delta)
    }

    # Determine level
    IF impact_matrix["§1 Architecture"] == YES:
        DISPLAY "⚠️ Enhancement requires architecture change. Reclassify as new?"
        # [FROM-BD: bd.md Step 0.3 — Level 3]
        WAIT user_confirm → reclassify or continue
        RETURN  # STOP if reclassify

    affected = [k for k, v in impact_matrix if v == YES]

    IF LENGTH(affected) == 0:
        # [FROM-BD: bd.md Step 0.3 — Level 1]
        DISPLAY "Impact Level 1 (Logic-only): Architecture unchanged."
        RETURN { level: 1, decisions: [], note: "Architecture unchanged" }
    ELSE:
        # [FROM-BD: bd.md Step 0.3 — Level 2]
        DISPLAY "Impact Level 2 (Structural): Sections affected: {affected}"
        # Continue with brainstorm for affected sections only
```

## Step 1: SRS Validation

```pseudo
# [FROM-BD: bd.md Phase 0.1 — validate SRS coverage]

DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "🔍 SRS Validation"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check: all SRS FRs can be addressed by proposed architecture
# Check: NFRs have corresponding architecture patterns
# Check: business rules preserved

validation_issues = validate_srs_coverage(srs_selection, evidence)

IF validation_issues:
    DISPLAY "⚠️ SRS validation issues:"
    FOR EACH issue IN validation_issues:
        DISPLAY "   - {issue}"
    DISPLAY "Proceed anyway? [Y/n]"
    WAIT user_confirm
```

## Step 2: Brainstorm Architecture Options

```pseudo
# [FROM-BD: bd.md Phase 1 — generate + Gemini]

DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "═══ Architecture Decisions [FROM-BD] ═══"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Claude: generate architecture approach inline
claude_arch = generate_claude_architecture(evidence, srs_selection, architecture_content)

# Gemini: alternative perspective (if available)
gemini_arch = call_gemini_architecture(gemini_context) OR NULL

# Enhancement mode: constrain to extend existing, NOT replace
# [FROM-BD: bd.md Task-Type Specific Strategies]
IF mode == "delta":
    DISPLAY "⚠️ Enhancement mode: extend existing patterns, do NOT replace"
```

## Step 3: Per-item Decision Loop (with Cross-debate)

```pseudo
# [FROM-BD: bd.md Phase 1 Step 3→6 — ENHANCED with cross-debate protocol]

decision_items = extract_architecture_decisions(claude_arch, gemini_arch)

# Check Gemini availability once
gemini_available = CHECK_GEMINI_AVAILABLE()
IF NOT gemini_available:
    DISPLAY "ℹ️ Gemini unavailable — using Claude-only self-debate for architecture decisions"

decisions = []
FOR EACH item IN decision_items:

    # ═══ CROSS-DEBATE or FALLBACK ═══
    # Uses same cross_debate() protocol as decision-loop.md
    # INNOVATE_TYPE = "INNOVATE_BD" for architecture decisions
    IF gemini_available:
        debate_result = cross_debate(item, evidence, architecture_content)
    ELSE:
        debate_result = self_debate_fallback(item, evidence, architecture_content)

    # ═══ FRAMING: explain WHY this architecture decision matters ═══
    DISPLAY ""
    DISPLAY "## 🔍 Architecture [{index+1}/{total}]: {item.name}"
    DISPLAY ""
    DISPLAY "**Bối cảnh**: {current_state.summary}"
    DISPLAY "**Vấn đề cần giải quyết**: {problem.description}"
    DISPLAY "**Tại sao cần quyết định**: {item.downstream_impact}"
    IF gemini_available:
        DISPLAY "**Debate**: {debate_result.rounds_used} rounds (Gemini×Claude)"
    DISPLAY ""

    # ═══ PRESENT: based on debate result ═══
    IF debate_result.tag == "CONVERGED":
        DISPLAY "| # | Description | Why Optimal (after cross-debate) |"
        DISPLAY "|---|-------------|----------------------------------|"
        DISPLAY "| 1 | {debate_result.decision} | Survived {debate_result.rounds_used} rounds |"
        DISPLAY ""
        DISPLAY "⭐ Single optimal option — cross-model debate converged"
    ELIF debate_result.tag == "TIE":
        DISPLAY "| # | Description | Strengths | Remaining Trade-off |"
        DISPLAY "|---|-------------|-----------|---------------------|"
        FOR EACH alt IN debate_result.alternatives:
            DISPLAY "| {N} | {alt.description} | {alt.strengths} | {alt.tradeoff} |"
        DISPLAY ""
        DISPLAY "⚖️ Genuinely tied — your call"
    ELSE:
        # Fallback (Claude-only) presentation
        IF LENGTH(debate_result) == 1:
            DISPLAY "| # | Description | Why Optimal (after self-debate) |"
            DISPLAY "|---|-------------|----------------------------------|"
            DISPLAY "| 1 | {debate_result[0].description} | {debate_result[0].rationale} |"
            DISPLAY ""
            DISPLAY "⭐ Single optimal option — self-debate eliminated weaker alternatives"
        ELSE:
            DISPLAY "| # | Source | Description | Strengths | Weaknesses |"
            DISPLAY "|---|--------|-------------|-----------|------------|"
            FOR EACH option IN debate_result:
                DISPLAY "| {option.number} | {option.source} | {option.description} | {option.strengths} | {option.weaknesses} |"
            DISPLAY ""
            DISPLAY "⭐ Recommended: Option {recommended.number} ({recommended.source})"

    # User choice
    DISPLAY ""
    DISPLAY "Choose: [1-N] / own: [idea] / more info"

    response = WAIT USER_INPUT
    decisions.push(process_response(item, response))

    # Progress
    DISPLAY "📊 Progress: {index+1}/{total} architecture decisions"

RETURN { level: 2, decisions: decisions }
```

---

## Enforcement Rules Covered
- B01: Impact Assessment (enhancement only)
- B02: Level 3 → reclassify
- B03: Level 1 → skip BD decisions
- B05: SRS validation checklist
- B08: Enhancement: extend, NOT replace
- B09: Per-item decision loop
- B10: Cross-debate replaces self-debate when Gemini available (UPDATED)
- B11: Framing required — context + problem + why for each item
- B12: Quality over quantity — 1 optimal option acceptable
- B13: Fallback to self-debate when Gemini unavailable (NEW)
- B14: Early exit after R3 if critique fully addressed (NEW)
- B15: Claude double-check convergence tag (NEW)

---

**RETURN** to `innovate/technical.md` router.

*[FROM: innovate/bd.md — full logic]*
*Enforcement: B01, B02, B03, B05, B08, B09*

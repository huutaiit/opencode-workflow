# INNOVATE/SRS/DECISION-LOOP — Per-item Decision + Cross-debate Synthesis
# [FROM: innovate/srs.md Phase 1 — Steps 1 through 6 + Phase 1.5]

## Purpose
Extract decision items from Claude + Gemini approaches, apply CROSS-MODEL DEBATE per item,
present ONLY optimal options to user. Quality over quantity.

---

## CROSS-DEBATE PROTOCOL (CRITICAL — applies to ALL decision items)

**BEFORE presenting ANY option to user**, each decision item MUST go through cross-model debate:

### When Gemini IS Available:

```pseudo
FUNCTION cross_debate(item, evidence, current_impl):
    # ═══ Round 1: Gemini Generate Options ═══
    WRITE "cache/debate-evidence-{item_index}.md" WITH:
        item.context + evidence_excerpt + current_impl_analysis

    BASH: node core/gemini/call-gemini.js \
        --type {INNOVATE_TYPE} \
        --mode generate \
        --evidence "cache/debate-evidence-{item_index}.md" \
        --feature "{feature_name}" \
        --task-type "{task_type}" \
        --output-file "cache/debate-r1-{item_index}.json"

    r1_result = READ "cache/debate-r1-{item_index}.json"
    gemini_options = r1_result.options

    # Initialize transcript file
    WRITE "cache/debate-transcript-{item_index}.md" WITH:
        "### Round 1 — Generate\n"
        FOR EACH option IN gemini_options:
            "[GEMINI] Option {N}: {option.description}\n"

    # ═══ Round 2: Claude Critique (INLINE — FREE) ═══
    claude_critique = CLAUDE_ANALYZE(gemini_options, evidence, current_impl)
    # Identify: weaknesses, blind spots, missing considerations, contradictions

    WRITE "cache/debate-critique-r2-{item_index}.md" WITH:
        claude_critique

    # Append to transcript
    APPEND "cache/debate-transcript-{item_index}.md" WITH:
        "\n### Round 2 — Critique\n"
        FOR EACH line IN claude_critique:
            "[CLAUDE] {line}\n"

    # ═══ Round 3: Gemini Refine ═══
    BASH: node core/gemini/call-gemini.js \
        --type {INNOVATE_TYPE} \
        --mode refine \
        --critique-file "cache/debate-critique-r2-{item_index}.md" \
        --transcript-file "cache/debate-transcript-{item_index}.md" \
        --feature "{feature_name}" \
        --output-file "cache/debate-r3-{item_index}.json"

    r3_result = READ "cache/debate-r3-{item_index}.json"

    # ═══ Early Exit Check (D1) ═══
    # Claude evaluates: did Gemini's refine address all critique points?
    early_exit = CLAUDE_EVALUATE_EARLY_EXIT(r3_result, claude_critique)

    IF early_exit.canExit:
        DISPLAY_INTERNAL "Early exit: R3 addressed all concerns"
        RETURN { tag: "CONVERGED", decision: r3_result.best_option, rounds_used: 3 }

    # ═══ Round 4: Claude Critique Refined (INLINE — FREE) ═══
    claude_critique_r4 = CLAUDE_ANALYZE(r3_result.options, evidence, current_impl)

    WRITE "cache/debate-critique-r4-{item_index}.md" WITH:
        claude_critique_r4

    # ═══ Round 5: Gemini Final Decision ═══
    BASH: node core/gemini/call-gemini.js \
        --type {INNOVATE_TYPE} \
        --mode final \
        --critique-file "cache/debate-critique-r4-{item_index}.md" \
        --transcript-file "cache/debate-transcript-{item_index}.md" \
        --feature "{feature_name}" \
        --output-file "cache/debate-r5-{item_index}.json"

    r5_result = READ "cache/debate-r5-{item_index}.json"

    # ═══ Claude Double-Check Convergence (D3) ═══
    gemini_tag = r5_result.convergence.tag  # CONVERGED or TIE

    claude_override = CLAUDE_VERIFY_CONVERGENCE(
        gemini_tag, r5_result, transcript, claude_critique_r4
    )
    # Override if: Gemini said CONVERGED but R4 critique had unaddressed concerns

    final_tag = claude_override OR gemini_tag

    RETURN {
        tag: final_tag,
        decision: r5_result.convergence.decision,
        alternatives: r5_result.convergence.alternatives,
        rounds_used: 5,
        transcript_file: "cache/debate-transcript-{item_index}.md"
    }
```

### When Gemini NOT Available (Fallback):

```pseudo
FUNCTION self_debate_fallback(item, evidence, current_impl):
    DISPLAY_INTERNAL "⚠️ Gemini unavailable — using Claude-only self-debate"

    raw_candidates = collect_all_candidates(claude_approach)
    surviving_options = raw_candidates

    FOR round = 1 TO 5:
        FOR EACH option IN surviving_options:
            weaknesses = find_weaknesses(option, current_state, problem_root_cause)
            mitigations = find_mitigations(weaknesses)
            option.score = evaluate(option, weaknesses, mitigations)
        surviving_options = surviving_options.filter(o => o.score >= threshold)
        surviving_options = merge_if_complementary(surviving_options)
        IF LENGTH(surviving_options) == 1 AND surviving_options[0].score >= HIGH_CONFIDENCE:
            BREAK

    RETURN surviving_options
```

### Key Principles
- **1 excellent option > 3 mediocre options** — do NOT pad options to reach a count
- Each round MUST genuinely challenge previous conclusions (not rubber-stamp)
- Final options MUST trace back to: current impl analysis + problem root cause + evidence
- If all candidates are weak → state honestly: "No strong option found, need more info"
- Cross-debate preferred over self-debate when Gemini available

---

## Workflow

### Step 1: DIVERGE — Collect All Approaches

```pseudo
all_approaches = {
    claude: claude_approach,
    gemini: gemini_alternatives  # May be NULL
}
```

### Step 2: VALIDATE (Constraint Soft Filter)

```pseudo
FOR EACH approach IN all_approaches:
    violations = check_constraints(approach, project_constraints)
    IF violations:
        approach.flags = violations  # Flag, don't reject (I06)
```

### Step 3: EXTRACT DECISION ITEMS

```pseudo
decision_items = extract_from_all_approaches(all_approaches)
# Deduplicate: merge items that address the same concern
decision_items = deduplicate(decision_items)
```

### Step 4: PER-ITEM DECISION LOOP (HUMAN CHECKPOINT)

```pseudo
# Check Gemini availability once
gemini_available = CHECK_GEMINI_AVAILABLE()
IF NOT gemini_available:
    DISPLAY "ℹ️ Gemini unavailable — using Claude-only self-debate for all items"

decisions = []
FOR EACH item IN decision_items:

    # ═══ DEBATE: Cross-model or self-debate fallback ═══
    IF gemini_available:
        debate_result = cross_debate(item, evidence, current_implementation)
    ELSE:
        debate_result = self_debate_fallback(item, evidence, current_implementation)

    # ═══ FRAMING: 5-section context (same depth as interview questions) ═══
    DISPLAY ""
    DISPLAY "## Decision Item [{index+1}/{total}]: {item.name}"
    DISPLAY ""
    DISPLAY "**Bối cảnh**: {item.context_with_evidence_refs}"
    DISPLAY "  (cite evidence E{N}, pattern X.x, or specific findings)"
    DISPLAY ""
    DISPLAY "**Hiện trạng**: {item.current_state_specific}"
    DISPLAY "  (file names, counts, pattern numbers — NOT vague)"
    DISPLAY ""
    DISPLAY "**Các stack khác**: {item.cross_stack_reference}"
    DISPLAY "  (how comparable stacks solved this — or 'No precedent')"
    DISPLAY ""
    DISPLAY "**Vấn đề**: {item.problem_description}"
    DISPLAY ""
    DISPLAY "**Tại sao cần quyết định**: {item.why_decision_needed}"
    DISPLAY "  (what downstream /plan or /execute steps are blocked)"
    DISPLAY ""
    IF gemini_available:
        DISPLAY "**Debate**: {debate_result.rounds_used} rounds (Gemini×Claude)"
    ELSE:
        DISPLAY "**Debate**: Claude-only self-debate (Gemini unavailable)"
    DISPLAY ""

    # ═══ PRESENT: based on debate result ═══
    IF debate_result.tag == "CONVERGED":
        # Single optimal — from cross-debate
        DISPLAY "| # | Description | Why Optimal (after cross-debate) |"
        DISPLAY "|---|-------------|----------------------------------|"
        DISPLAY "| 1 | {debate_result.decision} | Survived {debate_result.rounds_used} rounds of Gemini×Claude debate |"
        DISPLAY ""
        DISPLAY "⭐ Single optimal option — cross-model debate converged"

    ELIF debate_result.tag == "TIE":
        # Genuinely tied — from cross-debate
        DISPLAY "| # | Description | Strengths | Remaining Trade-off |"
        DISPLAY "|---|-------------|-----------|---------------------|"
        FOR EACH alt IN debate_result.alternatives:
            DISPLAY "| {N} | {alt.description} | {alt.strengths} | {alt.tradeoff} |"
        DISPLAY ""
        DISPLAY "⚖️ Genuinely tied after {debate_result.rounds_used} rounds — your call"

    ELSE:
        # Fallback (Claude-only) — existing presentation format
        IF LENGTH(debate_result) == 1:
            DISPLAY "| # | Source | Description | Why Optimal |"
            DISPLAY "|---|--------|-------------|-------------|"
            DISPLAY "| 1 | {opt.source} | {opt.description} | {opt.rationale} |"
            DISPLAY ""
            DISPLAY "⭐ Single optimal option after self-debate"
        ELSE:
            DISPLAY "| # | Source | Description | Strengths | Weaknesses |"
            DISPLAY "|---|--------|-------------|-----------|------------|"
            FOR EACH option IN debate_result:
                DISPLAY "| {option.number} | {option.source} | {option.description} | {option.strengths} | {option.weaknesses} |"
            DISPLAY ""
            DISPLAY "⭐ Recommended: Option {recommended.number}"

    DISPLAY ""
    DISPLAY "Choose: [1-N] / own: [idea] / more info"

    response = WAIT USER_INPUT  # I21: NEVER auto-select
    decisions.push(process_response(item, response))

    # Save session state after each decision (I11)
    save_session_state(decisions)

    DISPLAY "📊 Progress: {index+1}/{total} decisions"
```

### Step 5: FINAL SUMMARY

```pseudo
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "📋 Summary of All Decisions"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FOR EACH d IN decisions:
    DISPLAY "  ✓ {d.item}: {d.choice} ({d.source})"
```

### Step 6: CONFIRMATION (HUMAN CHECKPOINT)

```pseudo
DISPLAY ""
DISPLAY "Actions: [confirm] / [change N] / [cancel]"
response = WAIT USER_INPUT  # I12

IF response == "change N":
    # Re-run debate for that specific item
    GOTO Step 4 for item N
ELIF response == "cancel":
    STOP
```

### Phase 1.5: Refine Based on User Choice

```pseudo
# If user chose "own:" for any item, integrate their idea
# Re-validate constraints with final selections
# Ensure consistency across all decisions
refined_decisions = refine_and_validate(decisions)
```

---

## Enforcement Rules Covered
- I06: Constraint soft filter (flag, don't reject)
- I07: Extract decision items from ALL approaches
- I08: Per-item decision loop (WAIT per item)
- I09: Show AI recommendation + rationale per item (grounded in debate)
- I10: User responses: number / own: / more info
- I11: Save session state after each decision
- I12: Final summary + confirm/change/cancel
- I13: Phase 1.5 — Refine based on user choice
- I21: NEVER auto-select without user input
- I22: NEVER present unified solution FIRST
- I23: SELF-DEBATE 4-5 rounds per item BEFORE presenting
- I24: FRAMING required — context + problem + why for each item
- I25: Quality over quantity — 1 optimal option acceptable
- I26: CROSS-DEBATE replaces self-debate when Gemini available (NEW)
- I27: FALLBACK to self-debate when Gemini unavailable (NEW)
- I28: Early exit after R3 if critique fully addressed (NEW)
- I29: Claude double-check convergence tag — can override Gemini (NEW)

---

**RETURN** to `innovate/srs.md` router.

---

*INNOVATE/SRS/DECISION-LOOP — Cross-debate + Per-item Decision*
*Enforcement: I06-I13, I21-I29*
*EPS Framework v10.0*

# INNOVATE/TECHNICAL/IMPLEMENTATION — Implementation Decisions [FROM-DD]
# [FROM: innovate/dd.md — full logic]

## Purpose
Implementation decisions that INHERIT from architecture. Innovation scope limited to:
API design, state management, testing strategy, code organization, error handling.

---

## GOLDEN RULE (CRITICAL)

> **DD alternatives MUST implement the BD approach, NOT propose alternative architectures.**

Architecture decisions from `architecture.md` output are **LOCKED**:
- Architecture Pattern (LOCKED)
- Component Structure (LOCKED)
- Data Model (LOCKED)
- Integration Points (LOCKED)
- Technology Stack (LOCKED)

---

## Step 1: Display Inheritance

```pseudo
# [FROM-DD: dd.md — Inheritance from Basic Design]

DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "═══ Implementation Decisions [FROM-DD] ═══"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY ""
DISPLAY "Inherited from Architecture (LOCKED):"
FOR EACH d IN arch_decisions.decisions:
    DISPLAY "  ✓ {d.item}: {d.choice}"
DISPLAY ""
```

## Step 2: Detect Remaining Scope

```pseudo
# [NEW — giải quyết root cause DD innovate trống rỗng]

remaining_scope = detect_remaining_dd_scope(arch_decisions)

# What DD CAN innovate:
# [FROM-DD: dd.md "What DD CAN Innovate"]
possible_items = [
    "API Design (endpoints, DTOs, validation)",
    "State Management (local vs global, cache strategy)",
    "Testing Strategy (unit coverage, integration approach)",
    "Code Organization (file structure, naming conventions)",
    "Error Handling (response format, retry strategy, fallback)"
]

# Filter: which items were NOT already decided by architecture?
remaining = []
FOR EACH item IN possible_items:
    IF NOT already_decided_by_architecture(item, arch_decisions):
        remaining.push(item)

IF LENGTH(remaining) == 0:
    DISPLAY "Architecture decisions cover all implementation concerns."
    DISPLAY "No additional decisions needed."
    DISPLAY ""
    DISPLAY "Confirm? [Y/n]"
    WAIT user_confirm
    RETURN { decisions: [], note: "Confirmed by architecture — no additional decisions" }

DISPLAY "Remaining decisions ({LENGTH(remaining)} items):"
FOR EACH item IN remaining:
    DISPLAY "  → {item}"
DISPLAY ""
```

## Step 3: Brainstorm Implementation Options

```pseudo
# [FROM-DD: dd.md Phase 1 — only for remaining scope]

# Claude: generate implementation approach inline
claude_impl = generate_claude_implementation(evidence, srs_selection, arch_decisions, remaining)

# Gemini: alternative perspective (if available)
gemini_impl = call_gemini_implementation(gemini_context, remaining) OR NULL
```

## Step 4: Per-item Decision Loop (with Cross-debate)

```pseudo
# [FROM-DD: dd.md Phase 1 Step 3→6 — ENHANCED with cross-debate protocol]

decision_items = extract_implementation_decisions(claude_impl, gemini_impl)

# Check Gemini availability once
gemini_available = CHECK_GEMINI_AVAILABLE()
IF NOT gemini_available:
    DISPLAY "ℹ️ Gemini unavailable — using Claude-only self-debate for implementation decisions"

decisions = []
FOR EACH item IN decision_items:
    # CONSTRAINT CHECK: must implement BD, not propose alternatives
    # [FROM-DD: dd.md — GOLDEN RULE]
    validate_bd_compliance(item, arch_decisions)

    # ═══ CROSS-DEBATE or FALLBACK ═══
    # Uses same cross_debate() protocol as decision-loop.md
    # INNOVATE_TYPE = "INNOVATE_DD" for implementation decisions
    # BD constraints passed via --constraints flag to Gemini
    IF gemini_available:
        debate_result = cross_debate(item, evidence, arch_decisions)
    ELSE:
        debate_result = self_debate_fallback(item, evidence, arch_decisions)

    # ═══ FRAMING: explain WHY this implementation decision matters ═══
    DISPLAY ""
    DISPLAY "## 🔍 Implementation [{index+1}/{total}]: {item.name}"
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
            DISPLAY "⭐ Recommended: Option {recommended.number}"

    # User choice
    DISPLAY ""
    DISPLAY "Choose: [1-N] / own: [idea] / more info"
    response = WAIT USER_INPUT
    decisions.push(process_response(item, response))

RETURN { decisions: decisions }
```

---

## Enforcement Rules Covered
- D01: BD Selection MUST load (inherit from architecture.md output)
- D02: GOLDEN RULE — DD MUST implement BD, NOT propose alternatives
- D03: Architecture LOCKED
- D04: DD CAN innovate — API, state, testing, code org, error handling
- D05: Specialist patterns query (via common.md)
- D06: Per-item decision loop
- D07: Cross-debate replaces self-debate when Gemini available (UPDATED)
- D08: Framing required — context + problem + why for each item
- D09: Quality over quantity — 1 optimal option acceptable
- D10: Fallback to self-debate when Gemini unavailable (NEW)
- D11: Early exit after R3 if critique fully addressed (NEW)
- D12: Claude double-check convergence tag (NEW)

---

**RETURN** to `innovate/technical.md` router.

*[FROM: innovate/dd.md — full logic]*
*Enforcement: D01, D02, D03, D04, D05, D06*

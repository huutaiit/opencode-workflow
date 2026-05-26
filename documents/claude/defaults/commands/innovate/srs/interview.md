# INNOVATE/SRS/INTERVIEW — Deep-Context Interview

## Purpose
3-5 adaptive questions (CONFIRM/DISCOVER/DECIDE) to clarify business intent before brainstorming.
Each question is a **mini-analysis** — user sees full picture (context → current state → cross-stack → why → options → recommendation) before answering.

**Inspiration**: /architect Phase 1 interview — scaled down for feature level.

---

## Pre-requisites
- `business_context`: extracted from evidence.md [SCOPE:SRS]
- `domain_kb`: from domain-knowledge.md (may be empty for enhancement/bugfix)
- `cross_stack_data`: scan other stacks in this project for how they solved comparable problems (REQUIRED for DECIDE, best-effort for CONFIRM/DISCOVER)

---

## Question Display Format (MANDATORY — 6 sections)

Every question MUST be presented in this format. No exceptions. No bare questions.

```markdown
── Q{N}/{total} ({TYPE}) ──────────────────────────

**Bối cảnh** (Context):
[What this question is about. Link to specific evidence: "E{N} shows..." or "Pattern X.x states..."]

**Hiện trạng** (Current State):
[What exists TODAY — specific file names, counts, pattern numbers. NOT vague.]

**Các stack khác** (Cross-Stack):
[How other stacks in this project solved the same problem.
e.g., "Java: Pattern 0.1-0.9...", "NestJS: solved via..."
If none: "No precedent in this project — novel problem."]

**Tại sao hỏi** (Why This Matters):
[What downstream decisions are BLOCKED without this answer.]

--- Options ---
| Option | Description | Effort | Risk | Trade-off |
|--------|-------------|--------|------|-----------|
| A | ... | L/M/H | L/M/H | gain vs lose |
| B | ... | L/M/H | L/M/H | gain vs lose |

**Recommendation**: [AI recommendation + reasoning, referencing evidence/cross-stack.]

Your choice? [A/B or explain]:
```

### Format per question type:
- **DECIDE**: Full 6 sections + Options table (>=2 options) + Recommendation
- **CONFIRM**: Full 6 sections + Options = Y/N with implications + Recommendation
- **DISCOVER**: Full 6 sections + "Known options so far" (if any) + open-ended prompt (no Recommendation)

---

## Workflow

### Step 1: Generate Interview Plan

Based on domain KB + evidence + cross-stack scan, generate 3-5 questions.
**CRITICAL**: Every question MUST follow the 6-section format above.

```pseudo
FUNCTION generate_questions(business_context, domain_kb, cross_stack_data):
    questions = []

    # Pre-step: Scan other stacks for comparable solutions
    comparable = scan_other_stacks(business_context.problem_domain)
    # e.g., fixing Next.js specialists → check Java, NestJS, React solutions

    # Type 1: CONFIRM — verify domain standards apply
    IF domain_kb HAS standard_workflows:
        questions.push({
            type: "CONFIRM",
            context: "[Evidence E{N} shows... / Pattern X.x states...]",
            current_state: "[Specific: file names, counts, pattern numbers]",
            cross_stack: "[How comparable stacks handle this — or 'No precedent']",
            why: "[What design decisions depend on this confirmation]",
            content: "Domain standard: [workflow]. Does this apply?",
            options: [
                { label: "Y", description: "Apply as-is", effort: "L", risk: "L", tradeoff: "..." },
                { label: "N", description: "Deviate because...", effort: "M", risk: "M", tradeoff: "..." }
            ],
            recommendation: "[AI recommendation + reasoning]",
            from_kb: true
        })

    # Type 2: DISCOVER — uncover unknowns
    IF business_context HAS gaps OR ambiguities:
        questions.push({
            type: "DISCOVER",
            context: "[What gap was found in evidence]",
            current_state: "[What we know vs what we don't — specific artifacts]",
            cross_stack: "[How other stacks dealt with similar ambiguity]",
            why: "[What decisions are blocked without this answer]",
            content: "[Specific question about the gap]",
            known_options: "[What options we can see so far, if any]",
            from_kb: false
        })

    # Type 3: DECIDE — choose between alternatives
    IF domain_kb HAS multiple_approaches:
        questions.push({
            type: "DECIDE",
            context: "[Problem being solved + why multiple approaches exist]",
            current_state: "[Current implementation — what exists, what's broken]",
            cross_stack: "[How each comparable stack solved this — specific patterns/files]",
            why: "[Why this cannot be deferred — downstream impact on /plan, /execute]",
            content: "Choose approach:",
            options: [
                { label: "A", description: "...", effort: "L/M/H", risk: "L/M/H", tradeoff: "..." },
                { label: "B", description: "...", effort: "L/M/H", risk: "L/M/H", tradeoff: "..." }
            ],
            recommendation: "[AI recommendation + reasoning, citing cross-stack evidence]",
            from_kb: true
        })

    # Cap at 5 questions max
    RETURN questions.slice(0, 5)
```

### Step 2: Interview Loop (Adaptive)

```pseudo
SET total = LENGTH(questions)
SET answers = []

DISPLAY ""
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY "Interview: {total} questions to clarify business intent"
DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FOR i = 0 TO total - 1:
    q = questions[i]

    # ═══ MANDATORY 6-section format ═══
    DISPLAY ""
    DISPLAY "── Q{i+1}/{total} ({q.type}) ──────────────────────────"
    DISPLAY ""
    DISPLAY "**Bối cảnh**: {q.context}"
    DISPLAY ""
    DISPLAY "**Hiện trạng**: {q.current_state}"
    DISPLAY ""
    DISPLAY "**Các stack khác**: {q.cross_stack}"
    DISPLAY ""
    DISPLAY "**Tại sao hỏi**: {q.why}"
    DISPLAY ""

    IF q.type == "DECIDE":
        DISPLAY q.content
        DISPLAY ""
        DISPLAY "| Option | Description | Effort | Risk | Trade-off |"
        DISPLAY "|--------|-------------|--------|------|-----------|"
        FOR EACH opt IN q.options:
            DISPLAY "| {opt.label} | {opt.description} | {opt.effort} | {opt.risk} | {opt.tradeoff} |"
        DISPLAY ""
        DISPLAY "**Recommendation**: {q.recommendation}"
        DISPLAY ""
        DISPLAY "Your choice? [A/B or explain]:"

    ELIF q.type == "CONFIRM":
        DISPLAY q.content
        DISPLAY ""
        DISPLAY "| Option | Description | Effort | Risk | Trade-off |"
        DISPLAY "|--------|-------------|--------|------|-----------|"
        FOR EACH opt IN q.options:
            DISPLAY "| {opt.label} | {opt.description} | {opt.effort} | {opt.risk} | {opt.tradeoff} |"
        DISPLAY ""
        DISPLAY "**Recommendation**: {q.recommendation}"
        DISPLAY ""
        DISPLAY "[Y/n or explain]:"

    ELSE:  # DISCOVER
        DISPLAY q.content
        IF q.known_options:
            DISPLAY ""
            DISPLAY "Known options so far: {q.known_options}"
        DISPLAY ""
        DISPLAY "Your input:"

    # WAIT FOR USER RESPONSE
    answer = AWAIT USER_INPUT
    answers.push({ question: q.content, type: q.type, answer: answer })

    # Adaptive: adjust remaining questions based on answer
    # - If answer reveals new concern → add follow-up
    # - If answer eliminates a question → remove it
    # - Update total accordingly
    questions = adjust_remaining(questions, answers)
    total = LENGTH(questions)

DISPLAY ""
DISPLAY "Interview complete. {LENGTH(answers)} answers collected."
DISPLAY "   Proceeding to evidence synthesis..."
```

---

## Output

`interview_answers` array stored in conversation context.
Used by evidence-synthesis.md to enrich brainstorming.

---

## Quality Rules

### DO
- Every question MUST use the 6-section format: Boi canh → Hien trang → Cac stack khac → Tai sao hoi → Options → Recommendation
- Boi canh MUST reference specific evidence (E{N}), patterns (X.x), or file names — NOT vague statements
- Hien trang MUST cite concrete artifacts (file names, line counts, pattern numbers)
- Cac stack khac MUST reference actual solutions from other stacks in this project — or explicitly state "No precedent"
- DECIDE/CONFIRM MUST have Options table with Effort/Risk/Trade-off columns
- DECIDE/CONFIRM MUST have AI Recommendation with reasoning
- Questions MUST reference domain KB (not generic)
- Adaptive: adjust based on answers
- Max 5 questions (feature-level, not project-level)

### DON'T
- DO NOT present a question without all 6 sections — NEVER display bare questions
- DO NOT write vague context like "there are some issues" — cite evidence
- DO NOT skip Cross-Stack section — "No precedent" is valid, skipping is not
- DO NOT present options without effort/risk assessment
- DO NOT skip Recommendation for DECIDE/CONFIRM — user needs AI analysis to decide
- DO NOT ask generic questions ("What do you want?")
- DO NOT exceed 5 questions
- DO NOT skip WAIT for user response
- DO NOT auto-answer for user

---

**RETURN** to `innovate/srs.md` router.

---

*INNOVATE/SRS/INTERVIEW — Deep-Context Interview*
*3-5 Adaptive Questions with 6-Section Format*
*EPS Framework v10.0*

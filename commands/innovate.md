---
description: Phase 2 — Unified decision engine for SRS and Technical design alternatives with user approval checkpoints
agent: orchestrator
subtask: true
---

# INNOVATE Command — Unified Decision Engine

Brainstorm and decide approach for SRS + Technical design before creating documents.

## Input

$ARGUMENTS

## Step 0: Detect State & Route

Check `context.md` for current state:

| State | Action |
|-------|--------|
| `RESEARCHED` | Full flow: Part 1 → Part 2 → Auto-chain |
| `SRS_CREATED` | Resume: skip Part 1 → Part 2 → Auto-chain |
| `INNOVATE_TECHNICAL` | Skip Parts → Auto-chain only |
| `BD_DD_CREATED` | Done — display "Next: /plan" |
| `INITIAL` | Error: "Run /research first" |
| bugfix task type | Skip innovate → suggest /plan |

## Step 1: Part 1 — SRS Decisions

Requires state = RESEARCHED.

### 1.1 Lightweight Interview
Ask clarifying questions if needed:
- Business goals and success metrics
- Target users and roles
- Integration points with existing systems

### 1.2 Evidence Synthesis
Read `evidence.md`, synthesize key findings tagged `[SCOPE:SRS]`.

### 1.3 Decision Loop
For each functional area, present ≥ 2 alternatives with:
- Description
- Pros/cons
- Evidence support
- Recommendation

### 1.4 Function List
Generate ordered function list with priorities (HIGH/MEDIUM/LOW) and complexity (S/M/L).

### 1.5 Approval Gate
Present SRS decisions to user for approval:
- Show selected business approach with justification
- Show function list with priorities
- **User must approve before proceeding**

### 1.6 Save
Write `innovate-srs-selection.md` to memory bank.
Update `context.md` decisions log.
State: `INNOVATE_SRS` → after checkpoint save → `SRS_CREATED`

## Step 2: Part 2 — Technical Decisions

Requires state = SRS_CREATED.

### 2.1 Architecture Decisions
For architecture layer:
- Database patterns, ORM vs raw queries
- API style (REST, GraphQL, WebSocket)
- Caching strategy
- Authentication approach
- Component boundaries

### 2.2 Implementation Decisions
For implementation layer:
- Code organization patterns
- Error handling strategy
- Testing approach
- Performance considerations

### 2.3 Approval Gate
Present technical decisions to user for approval.

### 2.4 Save
Write `innovate-technical-selection.md` to memory bank.
Update `context.md` decisions log.
State: `INNOVATE_TECHNICAL`

## Step 3: Auto-chain Design

After both parts approved, auto-chain to design phase:
```
/design --srs → /design --basic → /design --detail
```

State: `BD_DD_CREATED`

## Output Files

| File | Purpose |
|------|---------|
| `innovate-srs-selection.md` | Approved SRS decisions, function list |
| `innovate-technical-selection.md` | Approved architecture + implementation decisions |

## State Machine

```
RESEARCHED → INNOVATE_SRS → SRS_CREATED → INNOVATE_TECHNICAL → BD_DD_CREATED
```

## Quality Gate D2
- [ ] All functional areas have documented decisions
- [ ] Each decision has ≥ 2 alternatives considered
- [ ] User has approved both gates
- [ ] Context.md updated with decisions log

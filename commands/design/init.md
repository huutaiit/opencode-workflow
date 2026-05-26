---
description: Arch-Ready Mode — skip research/innovate and go straight to design
agent: orchestrator
subtask: true
---

# Design Init — Arch-Ready Mode

Initialize architecture-ready workflow when research and innovation phases are not needed.

## Prerequisites
- Project architecture already documented
- Requirements are clear without additional research

## Workflow

### Phase 1: Architecture Baseline
1. Load existing architecture docs if any
2. Run `config-project` to detect tech stack
3. Create `project-config.json` in memory bank

### Phase 2: Quick Architecture Review
1. Verify architecture aligns with requirements
2. Identify any gaps or missing decisions
3. Document assumptions

### Phase 3: Set State
State: `ARCH_VERIFIED`

## Output
- `arch-baseline.md` — Architecture baseline summary
- Context updated with ARCH_VERIFIED state

## Next Step
Run `/design --basic` to create Basic Design document.

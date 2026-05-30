# OpenCode Framework - Workflow Structure

## Workflow Commands
```bash
/architect         # Architecture Documents (project-level, 5 phases)
/research          # Phase 1: Evidence gathering (Full Mode)
/innovate          # Phase 2: Generate ≥3 alternatives
/design --srs      # Phase 3: SRS document
/design --basic    # Phase 3: Basic Design
/design --detail   # Phase 3: Detail Design
/design --test     # Phase 3: Test Plan
/plan              # Phase 4: Implementation plan
/execute           # Phase 5: Execute plan
/validate          # Phase 6: Review implementation
/test              # Phase 7: Run tests
```

## Workflow Stages
```
# Stage 1: Research & Analysis
/research "new" "enhancement" "bugfix" --input <path>
  → Evidence collection → Domain knowledge building

# Stage 2: Innovation & Design
/innovate         # Generate design alternatives
/design --srs     # Software Requirements Specification
/design --basic   # Basic Design (Architecture)
/design --detail  # Detail Design (Implementation)
/design --test    # Test Plan

# Stage 3: Implementation
/plan             # Implementation planning
/execute          # Execute implementation
/validate         # Code validation
/test             # Run tests
```

## Utility Commands
```bash
/config-project    # Configure for project
/save              # Save context to memory bank
/recall            # Recall from memory bank
/list              # List all memories
/guide             # Show user guide
```

## File Structure
```
project-root/
│
├── .opencode/                           ← Framework config
│   ├── config/
│   │   └── project-config.json        ← /config-project output
│   ├── memory-bank/                   ← All context per-feature
│   │   └── {branch}/
│   │       └── {FEATURE_ID}-{developer}/    ← Context directory
│   │           ├── context.md               ← Workflow state
│   │           ├── evidence.md              ← Evidence from research
│   │           ├── domain-knowledge.md      ← Domain KB (new features)
│   │           ├── innovate-srs-selection.md     ← SRS decisions
│   │           ├── innovate-technical-selection.md ← Technical decisions
│   │           ├── plans/
│   │           │   ├── {feature}-implementation-plan.md  ← Implementation plan
│   │           │   ├── {feature}-master-plan.md          ← Master plan index
│   │           │   └── SP-{n}-{title}.md                 ← Sub-plans
│   │           ├── execution-checkpoints/
│   │           │   └── execution-state.json   ← Execution resume data
│   │           ├── validation-report.md       ← Validation output
│   │           └── test-run-report.md         ← Test run output
│   │
│   ├── documents/                         ← Design documents (persistent)
│   │   ├── architecture/                  ← /architect output
│   │   │   ├── assessment.md
│   │   │   ├── domain-knowledge.md
│   │   │   ├── feature-map.md
│   │   │   └── decisions/
│   │   │       └── ADR-NNN-*.md
│   │   └── features/
│   │       └── {FEATURE_ID}-{name}/       ← Design docs per-feature
│   │           ├── .subfeatures.json      ← Sub-feature registry
│   │           ├── {feature}-BASE-srs.md
│   │           ├── {feature}-BASE-basic-design.md
│   │           ├── {feature}-BASE-frontend-detail-design.md
│   │           ├── {feature}-BASE-backend-detail-design.md
│   │           ├── {feature}-BASE-api-contracts.md
│   │           └── {feature}-BASE-test-plan.md
│   │
│   ├── cache/
│   │   └── ops-result.json                ← Temp CLI output (auto-overwrite)
│   │
│   └── .checkpoints/                      ← Design checkpoint locks
│       ├── srs-s0.lock … srs-s6.lock
│       ├── basic-s0.lock … basic-s6.lock
│       └── detail-*.lock
│
├── documents/                         ← Design documents (persistent)
│   ├── architecture/                  ← /architect output
│   │   ├── assessment.md
│   │   ├── domain-knowledge.md
│   │   ├── feature-map.md
│   │   └── decisions/
│   │       └── ADR-NNN-*.md
│   └── features/
│       └── {FEATURE_ID}-{name}/       ← Design docs per-feature
│           ├── .subfeatures.json      ← Sub-feature registry
│           ├── reasoning.json         ← BD reasoning (internal)
│           ├── {feature}-BASE-srs.md
│           ├── {feature}-BASE-basic-design.md
│           ├── {feature}-BASE-frontend-detail-design.md
│           ├── {feature}-BASE-backend-detail-design.md
│           ├── {feature}-BASE-api-contracts.md
│           └── {feature}-BASE-test-plan.md
│
├── cache/
│   └── ops-result.json                ← Temp CLI output (auto-overwrite)
│
└── .checkpoints/                      ← Design checkpoint locks
    ├── srs-s0.lock … srs-s6.lock
    ├── basic-s0.lock … basic-s6.lock
    └── detail-*.lock
```

## Workflow States
```
INITIAL
  │
  ▼ /research
RESEARCHED
  │
  ▼ /innovate (Part 1)
INNOVATE_SRS
  │
  ▼
SRS_CREATED
  │
  ▼ /innovate (Part 2)
INNOVATE_TECHNICAL
  │
  ▼ /design (auto-chain)
BD_DD_CREATED
  │
  ▼ /plan
PLAN_CREATED
  │
  ▼ /plan-review (auto)
PLAN_REVIEWED  ←──── /plan-optimize (nếu score < 95%)
  │
  ▼ /execute (auto)
EXECUTED
  │
  ▼ /validate (auto)
VALIDATED
  │
  ▼ /test (confirm)
TESTED ✅
```

## Key Paths
- `core/cli/ops.js` - Single CLI entry point
- `.opencode/config/project-config.json` - Project configuration
- `guards/hooks/` - PreToolUse hooks
- `rules/` - Path-scoped rules

## Critical Rules
- NEVER append AI attribution in commits
- Use OpenCode framework for code generation
- Evidence-based documentation only
- Path-scoped rules auto-loaded by `rules/*.md` frontmatter
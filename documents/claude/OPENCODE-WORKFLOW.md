# OpenCode Framework
*OpenCode Workflow System*

## Workflow Commands
```bash
/workflow         # View project workflow
/research         # Phase 1: Evidence gathering (Full Mode)
/innovate         # Generate design alternatives
/design           # Design documents generation
/plan             # Implementation planning
/execute          # Execute implementation
/validate           # Code validation
```

## Workflow Stages
```
# Stage 1: Research
/research "new" "enhancement" "bugfix" --input <path>
  → /innovate → /design (SRS+BD+DD) → /plan → /execute

# Stage 2: Design
/design --srs      # Software Requirements Specification
/design --basic     # Basic Design
/design --detail    # Detail Design
/design --test      # Test Plan

# Stage 3: Implementation
/plan              # Implementation plan
/execute           # Execute plan
/validate            # Review implementation
```

## Commands Structure
```bash
/config-project    # Configure for project
/architect         # Architecture documents
/save              # Save context to memory bank
/recall            # Recall from memory bank
```

## Workflow Structure
```
# OpenCode Framework - Workflow Structure

## 1. Project Setup Commands
```bash
/config-project    # Configure for project
/architect         # Architecture documents
```

## 2. Workflow Commands
```bash
/research          # Phase 1: Evidence gathering (Full Mode)
/innovate         # Phase 2: Generate ≥3 alternatives
/design --init     # Arch-Ready Mode entry point (skip research/innovate/SRS)
/design --srs      # Phase 3: SRS document
/design --basic     # Phase 3: Basic Design
/design --detail    # Phase 3: Detail Design
/plan             # Phase 4: Implementation plan
/execute           # Phase 5: Execute plan
/validate           # Phase 6: Review implementation
```

## 3. Workflow Modes
```bash
# Full Mode:       /research → /innovulate → /design (SRS+BD+DD) → /plan → /execute
# Arch-Ready Mode: /design --init → /design (BD+DD) → /plan → /execute
# Bugfix Mode:     /research → /plan → /execute
```

## 4. Utility Commands
```bash
/scan              # Index source code into RAG
/save              # Save context to memory bank
/recall            # Recall from memory bank
```

## 5. Quality Gates
| Gate | Criteria |
|------|----------|
| Q1 | ≥80% evidence-based requirements |
| Q2 | FR/NFR IDs unique, terminology consistent |
| Q3 | Bilingual ratio ≥60% |
| Q4 | Interfaces only, no implementation code |

## 6. RAG 2.0
- HippoRAG Server: configured in `config/hipporag-config.json`
- Layers: eps, arch, code, design

## 7. Architecture (6-Layer)
- L1 COMMAND: `commands/*.md` - User commands
- L2 MICRO-CMD: `commands/*/*.md` - Sub-workflows
- L3 SPECIALIST: `specialists/` - Knowledge holders
- L4 GUARD: `guards/` - Enforcement hooks + gates
- L5 SKILL: `skills/` - Reusable capabilities
- L6 ENGINE: `core/` - Runtime JS modules

## 8. Key Paths
- `core/cli/ops.js` - Single CLI entry point (14 operations)
- `.opencode/config/project-config.json` - Project configuration (consumer side)
- `guards/hooks/` - PreToolUse hooks (P4: fail-open)
- `rules/` - Path-scoped rules (D24)

## 9. Critical Rules
- NEVER append AI attribution in commits
- Use OpenCode framework for code generation
- Evidence-based documentation only
- Path-scoped rules auto-loaded by `rules/*.md` frontmatter
```

## 10. File Structure
```
- documents/
  - architecture/
    - assessment.md
    - domain-knowledge.md
    - feature-map.md
    - decisions/
      - ADR-NNN-*.md
  - features/
    - {FEATURE_ID}-{name}/
      - .subfeatures.json
      - {feature}-BASE-srs.md
      - {feature}-BASE-basic-design.md
      - {feature}-BASE-frontend-detail-design.md
      - {feature}-BASE-backend-detail-design.md
      - {feature}-BASE-api-contracts.md
```

## 11. Implementation
```
- /design
- /execute
- /validate
```

## 12. Testing
```
- /test run
- /test validate
```

## 13. File Structure
```
project-root/
│
├── .opencode/                           ← Framework config
│   ├── config/
│   │   └── project-config.json        ← /config-project output
│   └── memory-bank/                   ← All context per-feature
│       └── {branch}/
│           └── {FEATURE_ID}-{developer}/    ← Context directory
│               ├── context.md               ← Workflow state
│               ├── evidence.md              ← Evidence from research
│               ├── domain-knowledge.md        ← Domain KB (new features)
```
# /plan Command

Multi-Model Planning System for opencode workflow.

## Purpose
Generate implementation plans based on approved design documents.
Uses a thin router + micro-commands architecture for modularity.

## Usage
```
/plan
```

## Execution Constraints
- INLINE only — NO Agent/Task tool
- SEQUENTIAL — NO parallel execution
- Each sub-plan must be generated and written before proceeding to the next

## Routing by Task Type

| Task Type | Micro-command Chain | Context Loaded |
|-----------|---------------------|----------------|
| `new/feature` | feature-workflow → context-loading → document-loading → generation → save-and-display | ~1,470 lines |
| `bugfix` | bugfix → save-and-display | ~430 lines |
| `enhancement` | enhancement → context-loading → generation → save-and-display | ~1,190 lines |

## Persona Flags (Optional)
```
--persona architect|security|frontend|backend|...
```
- Adjusts confidence thresholds and knowledge base loading

## Auto-Chain After Plan
```
/plan → /plan-review (auto) → /plan-optimize (if <95%, max 3 times) → /execute (auto)
```

## Micro-commands

See the `plan/` subdirectory for detailed micro-commands:
- `feature-workflow.md`: State validation + Quality Gate D4
- `bugfix.md`: Evidence-based bugfix plan
- `enhancement.md`: Enhancement delta workflow
- `context-loading.md`: RAG + patterns + evidence + specialists + architecture
- `document-loading.md`: Mode-aware design document loading
- `generation.md`: Plan generation + auto-split
- `save-and-display.md`: Save + state update + auto plan-review

## Output
- `{feature}-BASE-plan.md`: Contains allowedFiles, boundaries, checkpoints, and implementation steps
- Updates workflow state to `PLAN_CREATED`

## Examples
Run the plan command (after design approval):
```
/plan
```
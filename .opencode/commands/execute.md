# /execute Command

Implementation Engine for opencode workflow.

## Purpose
Execute the approved plan step by step, with checkpoints and boundary enforcement.

## Usage
```
/execute
```

## Execution Constraints
- SEQUENTIAL: One step at a time — NO parallel execution
- CHECKPOINT: Required after each step (dual-layer: design-checkpoint + execution-state.json)
- BOUNDARY ENFORCEMENT: Only modify files in `allowedFiles` of the plan

## Micro-command Chain
```
execute.md
  → execute/pre-gates.md     # Stack load + state validation + G0 + confidence check
  → execute/plan-loading.md  # Load plan + boundaries + checkpoint restore
  → execute/step-runner.md   # Per-step execution loop
  → execute/finalize.md      # Feedback + verify-all + state → EXECUTED
```

## Auto-Chain After Execute
```
/execute → /validate (auto, mandatory) → confirm /test (human-in-loop)
```

## Strict Mode Rules
- Execute ONLY what is in the plan
- Validate each file before editing
- Stop and ask user if deviation is detected
- NO improvisation, NO bonus improvements
- NO new methods unless specified in the plan

## Output
- Modified files as per the plan
- Updated execution-state.json and design-checkpoint
- Updates workflow state to `EXECUTED`

## Subcommands
See the `execute/` subdirectory for detailed micro-commands:
- `pre-gates.md`: Pre-execution checks
- `plan-loading.md`: Load plan and boundaries
- `step-runner.md`: Per-step execution
- `finalize.md`: Finalize and update state

## Examples
Run the execute command (after plan approval):
```
/execute
```
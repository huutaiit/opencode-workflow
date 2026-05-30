# /research Command

Unified Knowledge Base Builder for opencode workflow.

## Purpose

Build comprehensive domain knowledge base in a single run.
Adapts depth based on task type (new, enhancement, bugfix).

## Usage

```
/research --type <new|enhancement|bugfix> --input <path> [--module <code>]
```

## Flags

- `--type`: Task type (`new`, `enhancement`, `bugfix`)
- `--input`: Path to requirements file
- `--module`: Module code (optional)

## Adaptive Depth

| Task Type | Phases | Description |
|-----------|--------|-------------|
| `new` | 3 phases | Domain KB + Codebase survey + External refs |
| `enhancement` | 2 phases | Deep codebase scan + Impact analysis |
| `bugfix` | 2 phases | Root cause analysis + Targeted scan |

## Output

- `evidence.md` — with section tags `[SCOPE:SRS]`, `[SCOPE:BD]`, `[SCOPE:DD]`
- `domain-knowledge.md` (only with `new` tasks)
- Updates workflow state to `RESEARCHED`

## Multi-Model Research

For `new` tasks: Uses Claude (primary) + Gemini (parallel) for research.

## Enforcement Rules

| Rule | Description |
|------|-------------|
| R01 | Check state, auto-resume if already researched |
| R04 | Each section must have ≥2 evidence pieces with source citations |
| R06 | Enable Gemini parallel research for `new` tasks |
| R08 | Update state to `RESEARCHED` upon completion |

## Examples

New feature:
```
/research --type new --input docs/requirements/REQ-001.md --module USR
```

Enhancement:
```
/research --type enhancement --input docs/enhancements/ENH-005.md
```

Bugfix:
```
/research --type bugfix --input bugs/BUG-123.txt
```
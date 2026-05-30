# /innovate Command

Unified Decision Engine for opencode workflow.

## Purpose

Brainstorm and decide on approach for SRS + Technical design.
Consists of two parts: SRS decisions and Technical decisions.

## Usage

```
/innovate
```

## Two Parts

```
Part 1: SRS Decisions
  innovate/srs/interview.md → innovate/srs/evidence-synthesis.md
                            → innovate/srs/decision-loop.md
                            → innovate/srs/function-list.md
                            → innovate/srs/save.md

Part 2: Technical Decisions
  innovate/technical/common.md → innovate/technical/architecture.md
                               → innovate/technical/implementation.md
                               → innovate/technical/save.md
```

## Approval Gates

- User must approve SRS decisions (Part 1) before running Part 2
- User must approve Technical decisions (Part 2) before auto-chaining to design

## Auto-Chain After Approval

After approving both parts, auto-chain to:
```
/design --srs → /design --basic → /design --detail (FDD + BDD + API) → /design-review
```

## Auto-Split

If feature has sub-features (`subfeatures.json`), creates per-sub SRS for each sub-feature.

## Output

- `innovate-srs-selection.md`
- `innovate-technical-selection.md`
- Updates workflow state to `BD_DD_CREATED`

## Subcommands

See `innovate/srs/` and `innovate/technical/` directories for detailed subcommands.
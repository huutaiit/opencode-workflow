# /design Command

Design Document Generator for opencode workflow.

## Purpose

Generate design documents based on the approved decisions from the innovate phase.

## Usage

```
/design --<srs|basic|detail|test>
```

## Flags

- `--srs`: Generate Software Requirements Specification
- `--basic`: Generate Basic Design (Architecture)
- `--detail`: Generate Detail Design (FDD + BDD + API)
- `--test`: Generate Test Plan

## Output Files

| Flag | Document | Output File |
|------|----------|-------------|
| `--srs` | SRS | `{feature}-BASE-srs.md` |
| `--basic` | Basic Design | `{feature}-BASE-basic-design.md` |
| `--detail` | Frontend Detail Design | `{feature}-BASE-frontend-detail-design.md` |
|  | Backend Detail Design | `{feature}-BASE-backend-detail-design.md` |
|  | API Contracts | `{feature}-BASE-api-contracts.md` |
| `--test` | Test Plan | `{feature}-BASE-test-plan.md` |

## Detail Design Pipeline (`--detail`)

```
detail.md (router)
  → design/detail/fdd.md          # Frontend Detail Design
  → design/detail/fdd-pseudo.md   # FDD → pseudo-code
  → design/detail/bdd.md          # Backend Detail Design
  → design/detail/bdd-pseudo.md   # BDD → pseudo-code
  → design/detail/api-contract.md # API contracts (from FDD Section 5)
```

## BDD Sections (10 required, enforced)

1. Entity & DAO
2. Repository
3. Service
4. Handler/Controller
5. Router/Endpoint
6. Unit Tests
7. Integration Tests
8. Error Handling
9. Security
10. Performance

## Auto-Chain

After generating all design documents, auto-chain to `/design-review` for quality review.

## Examples

Generate SRS:
```
/design --srs
```

Generate Basic Design:
```
/design --basic
```

Generate Detail Design:
```
/design --detail
```

Generate Test Plan:
```
/design --test
```
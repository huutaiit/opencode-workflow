---
description: Pass 3 code review — logic review against design documents
agent: orchestrator
subtask: true
---

# Validate Code Review

Logic review comparing implementation against design documents.

## Dimensions

### R1: Business Logic vs BD/evidence
- Does implementation match the business rules from BD?
- Are edge cases from evidence.md handled?
- Are business validations correct?

### R2: API Contract vs api-contracts.md
- Does each endpoint match its contract?
  - Method, path, request/response schemas
  - HTTP status codes
  - Error handling
- Are all required endpoints implemented?

### R3: Edge Cases vs DD pseudo/evidence
- Are edge cases from detail design handled?
- Error states and boundary conditions
- Empty/null/invalid input handling

### R4: Abnormal Cases vs Plan Section 3.1
- Are abnormal test cases from plan covered?
- Each abnormal test case should have corresponding error handling

### R5: Specialist Pattern Review
- Does code follow specialist patterns for each layer?
- Layer-specific: naming, structure, conventions
- Import organization
- Error handling patterns

## Scoring

| Dimension | Weight |
|-----------|--------|
| R1 Business Logic | 25% |
| R2 API Contracts | 25% |
| R3 Edge Cases | 20% |
| R4 Abnormal Cases | 15% |
| R5 Specialist | 15% |

Per finding: document file, line, issue, severity (WARNING/ERROR).
WARNING = -5%, ERROR = -10% from dimension score.

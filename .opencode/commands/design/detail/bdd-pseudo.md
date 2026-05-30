# BDD → Pseudo-code

## Purpose
Convert Backend Detail Design (BDD) into pseudo-code for use in the planning phase.

## Input
- `{feature}-BASE-backend-detail-design.md`

## Output
- Pseudo-code snippets that capture the backend logic, to be used in the plan generation.

## Process
1. For each service method in the BDD, write pseudo-code for:
   - Input validation
   - Business logic steps
   - Database operations (via DAO/repository)
   - Error handling
   - Return value
2. Focus on the logic rather than syntax; this is language-agnostic.
3. Organize pseudo-code by service or by use case.

## Example Pseudo-code for a Service Method
```
Service: UserService
Method: createUser(userData)
  Validate userData (required fields, email format)
  Check if user already exists (by email)
  If exists: throw ConflictException
  Create user entity from userData
  Save user entity via userDAO
  Return saved user entity (without password)
```

## Usage in Plan
The pseudo-code from this step is used by the `/plan` command to estimate effort and to generate implementation steps.
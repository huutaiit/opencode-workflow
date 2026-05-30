# FDD → Pseudo-code

## Purpose
Convert Frontend Detail Design (FDD) into pseudo-code for use in the planning phase.

## Input
- `{feature}-BASE-frontend-detail-design.md`

## Output
- Pseudo-code snippets that capture the frontend logic, to be used in the plan generation.

## Process
1. For each component in the FDD, write pseudo-code for:
   - Initialization
   - Event handlers
   - State updates
   - Data fetching
   - Rendering logic
2. Focus on the logic rather than syntax; this is language-agnostic.
3. Organize pseudo-code by component or by user story.

## Example Pseudo-code for a Component
```
Component: UserProfile
  OnMount:
    Fetch user data from API
    Set loading state to true
  OnDataReceived:
    Set user data
    Set loading state to false
  OnError:
    Set error message
    Set loading state to false
  Render:
    If loading: show spinner
    Else if error: show error message
    Else: display user data
```

## Usage in Plan
The pseudo-code from this step is used by the `/plan` command to estimate effort and to generate implementation steps.
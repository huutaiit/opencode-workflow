# API Contracts (from FDD Section 5)

## Purpose
Extract API contracts from the Frontend Detail Design (FDD) Section 5, which details the data that the frontend needs from the backend.

## Input
- `{feature}-BASE-frontend-detail-design.md` (specifically Section 5: API Requirements)

## Output
- `{feature}-BASE-api-contracts.md`

## Process
1. From the FDD, identify all API calls the frontend needs to make.
2. For each API call, define:
   - HTTP method (GET, POST, PUT, DELETE, etc.)
   - Endpoint (URL)
   - Request parameters (path, query, body)
   - Request headers (if any)
   - Response structure (success and error)
   - Status codes
3. Organize by resource or by user story.
4. Include any real-time communication (WebSockets) if applicable.

## Example API Contract
```
Endpoint: GET /api/users/{userId}
Purpose: Retrieve user profile by ID
Request:
  Path Parameters:
    userId (string, required): The unique identifier of the user
  Query Parameters:
    none
  Headers:
    Authorization: Bearer <token> (required)
Response (200 OK):
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "createdAt": "ISO 8601 date string"
  }
Error Responses:
  400 Bad Request: Invalid userId format
  401 Unauthorized: Missing or invalid token
  403 Forbidden: User not authorized to access this resource
  404 Not Found: User with given ID does not exist
  500 Internal Server Error: Unexpected server error
```

## Enforcement
- Must be derived strictly from the FDD Section 5.
- Must match the backend design (BDD) in terms of resources and operations.
- Should consider API versioning, security, and error handling standards.
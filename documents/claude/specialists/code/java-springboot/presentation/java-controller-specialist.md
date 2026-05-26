# Java Controller Specialist
# コントローラー スペシャリスト
# Chuyên Gia Controller Java
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: ALL

> 📌 **Note**: Spring MVC `@RestController` patterns are variant-agnostic.
> For reactive-specific patterns, see: `presentation/java-webflux-specialist.md`, `presentation/java-router-specialist.md`.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Package** | `{rootPackage}.rest.{moduleCode}` |
| **Maven Module** | core-manager / sfa-manager |
| **Variant** | ALL |
| **Pattern Numbers** | 1.1–1.N |
| **Source Paths** | N/A — see annotated reactive controllers (Pattern 42.x) for Reactive variant |
| **File Count** | N/A |
| **Naming Convention** | `{DomainPrefix}{Entity}Resource.java` |
| **Base Class** | N/A |
| **Imports From** | Application (Services, DTOs), Infrastructure (VMs, VM Mappers) |
| **Cannot Import** | Domain directly |
| **Dependencies** | None (uses Spring MVC core) |
| **When To Use** | Standard MVC controllers with JPA for blocking REST endpoints |
| **Source Skeleton** | `{sourceRoot}/infrastructure/web/rest/{moduleCode}/{Entity}Controller.java` |
| **Specialist Type** | code |
| **Purpose** | Generate Spring MVC @RestController endpoints with request mapping, validation, and response handling |
| **Activation Trigger** | files: **/rest/**/*.java, **/controller/**/*.java; keywords: restController, requestMapping, mvcController |

---

## Purpose
Generates REST controllers with proper request/response handling, validation, pagination, and OpenAPI documentation.

## Patterns

### Pattern 1: CRUD Controller
```java
@RestController
@RequestMapping("/api/v1/loans")
@RequiredArgsConstructor
@Tag(name = "Loans", description = "Loan management endpoints")
public class LoanController {
    private final LoanService loanService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new loan request")
    public LoanResponse create(@Valid @RequestBody CreateLoanRequest request) {
        return loanService.createLoan(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get loan by ID")
    public LoanResponse getById(@PathVariable UUID id) {
        return loanService.getLoanById(id);
    }

    @GetMapping
    @Operation(summary = "Search loans with filters")
    public Page<LoanResponse> search(
            @Valid LoanSearchCriteria criteria,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return loanService.searchLoans(criteria, pageable);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve a pending loan")
    public LoanResponse approve(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return loanService.approveLoan(id, principal.getId());
    }
}
```

### Pattern 2: File Upload Endpoint
```java
@PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
@Operation(summary = "Upload loan document")
public DocumentResponse uploadDocument(
        @PathVariable UUID id,
        @RequestPart("file") MultipartFile file,
        @RequestPart("metadata") @Valid DocumentMetadata metadata) {
    if (file.getSize() > 10_000_000) {
        throw new FileTooLargeException("Max file size is 10MB");
    }
    return loanService.uploadDocument(id, file, metadata);
}
```

### Pattern 3: Async Response with SSE
```java
@GetMapping(value = "/{id}/status-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
@Operation(summary = "Stream loan status updates")
public SseEmitter streamStatus(@PathVariable UUID id) {
    var emitter = new SseEmitter(30_000L);
    loanService.registerStatusListener(id, emitter);
    emitter.onCompletion(() -> loanService.removeStatusListener(id));
    emitter.onTimeout(emitter::complete);
    return emitter;
}
```

### Pattern 4: Batch Operations
```java
@PostMapping("/batch")
@PreAuthorize("hasRole('ADMIN')")
@Operation(summary = "Process batch of loan actions")
public BatchResponse processBatch(@Valid @RequestBody BatchRequest request) {
    if (request.ids().size() > 100) {
        throw new BadRequestException("Batch size cannot exceed 100");
    }
    return loanService.processBatch(request);
}
```

### Pattern 5: Error Response Structure
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(EntityNotFoundException ex) {
        return new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage(),
            LocalDateTime.now()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ValidationErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
            .toList();
        return new ValidationErrorResponse(HttpStatus.BAD_REQUEST.value(), errors);
    }

    @ExceptionHandler(BusinessRuleException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public ErrorResponse handleBusinessRule(BusinessRuleException ex) {
        return new ErrorResponse(422, ex.getMessage(), LocalDateTime.now());
    }
}
```

## Clean-Modulith Controller

#### Clean-Modulith / Standard

> Clean-Modulith controllers nam trong `presentation/controller/{feature}/`.
> Inject **UseCase** class (khong phai Service).
> Map domain entity → Response DTO trong controller.
> Blocking — dung voi Virtual Threads, KHONG can Mono/Flux.

### Pattern 4.6: Clean-Modulith REST Controller

```java
// presentation/controller/ingest/IngestController.java
package {rootPackage}.presentation.controller.ingest;

import {rootPackage}.application.usecase.ingest.IngestUseCase;
import {rootPackage}.application.usecase.ingest.IngestCommand;
import {rootPackage}.presentation.dto.ingest.IngestRequest;
import {rootPackage}.presentation.dto.ingest.IngestResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ingest")
public class IngestController {

    private final IngestUseCase ingestUseCase;

    public IngestController(IngestUseCase ingestUseCase) {
        this.ingestUseCase = ingestUseCase;
    }

    @PostMapping
    public ResponseEntity<IngestResponse> ingest(@Valid @RequestBody IngestRequest request) {
        // 1. Map Request DTO → Command
        var command = new IngestCommand(
            request.sourceSystem(),
            request.sourceId(),
            request.type(),
            request.payload()
        );

        // 2. Execute UseCase
        var ledger = ingestUseCase.ingest(command);

        // 3. Map domain entity → Response DTO
        var response = new IngestResponse(
            ledger.callId(),
            ledger.state(),
            ledger.createdAt()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

**Key Points**:
- Package: `{rootPackage}.presentation.controller.{feature}` (theo Pattern 0.7)
- Naming: `{Feature}Controller.java` (khong phai `*Resource.java`)
- Inject **UseCase** (khong phai Service) — Clean Architecture dependency rule
- Map Request → Command → UseCase → Entity → Response trong controller
- Blocking — dung voi Virtual Threads (`spring.threads.virtual.enabled=true`)
- `@Valid` cho request validation
- Return `ResponseEntity<T>` voi proper HTTP status

### Pattern 4.7: Clean-Modulith Exception Handler

```java
// presentation/common/GlobalExceptionHandler.java
package {rootPackage}.presentation.common;

import {rootPackage}.domain.exception.LedgerNotFoundException;
import {rootPackage}.domain.exception.DuplicateTransactionException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(LedgerNotFoundException.class)
    public ProblemDetail handleNotFound(LedgerNotFoundException ex) {
        var problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle(ex.getEntityName() + " Not Found");
        return problem;
    }

    @ExceptionHandler(DuplicateTransactionException.class)
    public ProblemDetail handleDuplicate(DuplicateTransactionException ex) {
        return ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT, ex.getMessage());
    }
}
```

**Key Points**:
- Package: `{rootPackage}.presentation.common` (presentation layer)
- Map domain exceptions → RFC 7807 ProblemDetail (Spring 6+)
- KHONG import infrastructure classes
- Moi domain exception → 1 handler method

---

## Guidelines
- Use `@Valid` for request body validation
- Return proper HTTP status codes (`201` for creation, `204` for delete)
- Use `@PageableDefault` for pagination defaults
- Apply `@PreAuthorize` for method-level security
- Use `@AuthenticationPrincipal` to access current user
- Document with OpenAPI `@Operation` and `@Tag`
- Keep controllers thin - delegate to service layer

## REJECTED Patterns

- DO NOT name controller classes `*Controller.java` — convention uses `*Resource.java`
- DO NOT return entity objects directly — return DTOs or VMs
- DO NOT use `@Autowired` — use constructor injection
- DO NOT use blocking calls in controller methods — return `Mono`/`Flux`

---

## Related Specialists

- `patterns/annotated-reactive-controller-specialist.md` — reactive controller patterns (42.x)
- `patterns/viewmodel-specialist.md` — DTO↔VM mapping at controller boundary (47.x)
- `domain/java-exception-specialist.md` — error handling (7.x)
- `application/usecase-port-specialist.md` — UseCase + Port patterns injected by controller (54.x)

# Java DTO Specialist
# DTO スペシャリスト
# Chuyên Gia DTO Java
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: ALL

> 📌 **Note**: Record/validation patterns (Patterns 1-3, 5) are variant-agnostic.
> Pattern 4 (Mapper) has variant-aware sections — JPA navigation vs explicit parameters.

> 📌 **Project Note**: This architecture uses a two-layer mapping pattern:
> - `*DTO.java` in `application/service/dto/{moduleCode}/` for service layer (entity↔DTO via MapStruct)
> - `Create*VM.java`, `Update*VM.java` in `infrastructure/web/rest/vm/{moduleCode}/` for REST layer (DTO↔ViewModel)
> See: `patterns/viewmodel-specialist.md` (Pattern 47.x) for details.
> See: `architecture/backend-clean-architecture-specialist.md` (Pattern 0.x) for architecture overview.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Variant-dependent (see below) |
| **Package** | Variant-dependent (see below) |
| **Maven Module** | common (Standard/Reactive), backbone (Clean-Modulith) |
| **Variant** | ALL |
| **Pattern Numbers** | 5.1–5.N |
| **Source Paths** | Variant-dependent (see below) |
| **File Count** | ~100+ DTOs |
| **Naming Convention** | Variant-dependent (see below) |
| **Base Class** | N/A |
| **Imports From** | Domain (Enums only) |
| **Cannot Import** | Variant-dependent (see below) |
| **Dependencies** | None (uses Java records) |
| **When To Use** | DTO creation for data transfer |
| **Source Skeleton** | Variant-dependent (see below) |
| **Specialist Type** | code |
| **Purpose** | Generate DTO records with validation annotations, mapper utilities, and nested composition patterns |
| **Activation Trigger** | files: **/dto/**/*.java; keywords: dto, dataTransfer, requestDto, responseDto |

### Variant-Specific Package Rules

| Property | Standard (JPA) | Clean-Modulith |
|----------|---------------|----------------|
| **Layer** | Application | Presentation |
| **Package** | `{rootPackage}.application.service.dto.{moduleCode}` | `{rootPackage}.presentation.dto.{scope}` |
| **Source Path** | `{sourceRoot}/application/service/dto/{moduleCode}/` | `{sourceRoot}/presentation/dto/{scope}/` |
| **Naming** | `{Entity}DTO.java` | `{Entity}Request.java`, `{Entity}Response.java` |
| **Cannot Import** | Infrastructure, REST (`rest.*`) | Domain directly, Infrastructure |

### Clean-Modulith DTO Sub-Package Convention

```
presentation/dto/
├── common/           # Shared DTOs (ApiResponse, BatchRequest, PageResponse, ErrorDetail)
├── {system}/         # Per-system DTOs (bravo/, crm/, ingest/)
│   ├── {Feature}Request.java
│   └── {Feature}Response.java
└── ErrorResponse.java  # (legacy — migrate to common/)
```

> **Why sub-packages matter**: Clean-Modulith projects grow across multiple systems/modules.
> Without sub-package convention, `presentation/dto/` becomes a flat dump of 100+ files.
> `common/` holds cross-cutting DTOs shared across systems; `{system}/` isolates per-system contracts.

---

## Purpose
Generates request/response DTOs using Java records with validation annotations and mapper methods.

## Patterns

### Pattern 1: Request DTO with Validation
```java
public record CreateLoanRequest(
    @NotNull(message = "Borrower ID is required")
    Long borrowerId,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1000", message = "Minimum loan amount is 1000")
    @DecimalMax(value = "1000000", message = "Maximum loan amount is 1000000")
    BigDecimal amount,

    @NotNull(message = "Interest rate is required")
    @DecimalMin(value = "0.01")
    @DecimalMax(value = "0.30")
    BigDecimal interestRate,

    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Minimum duration is 1 month")
    @Max(value = 60, message = "Maximum duration is 60 months")
    Integer durationMonths,

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    String description
) {}
```

### Pattern 2: Response DTO
```java
public record LoanResponse(
    Long id,
    BigDecimal amount,
    BigDecimal interestRate,
    Integer durationMonths,
    LoanStatus status,
    String borrowerEmail,
    String borrowerName,
    LocalDateTime createdAt,
    LocalDateTime approvedAt,
    List<PaymentResponse> recentPayments
) {}
```

### Pattern 3: Search Criteria DTO
```java
public record LoanSearchCriteria(
    @Nullable LoanStatus status,
    @Nullable @DecimalMin("0") BigDecimal minAmount,
    @Nullable @DecimalMax("10000000") BigDecimal maxAmount,
    @Nullable Long borrowerId,
    @Nullable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
    @Nullable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
) {}
```

### Pattern 4: Mapper Utility

#### Standard (JPA)
```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LoanMapper {
    public static LoanResponse toResponse(Loan loan) {
        return new LoanResponse(
            loan.getId(),
            loan.getAmount(),
            loan.getInterestRate(),
            loan.getDurationMonths(),
            loan.getStatus(),
            loan.getBorrower().getEmail(),       // JPA lazy-loaded navigation
            loan.getBorrower().getFullName(),
            loan.getCreatedAt(),
            loan.getApprovedAt(),
            loan.getPayments().stream()          // JPA collection navigation
                .sorted(Comparator.comparing(Payment::getCreatedAt).reversed())
                .limit(5)
                .map(PaymentMapper::toResponse)
                .toList()
        );
    }

    public static Loan toEntity(CreateLoanRequest request, User borrower) {
        var loan = new Loan();
        loan.setAmount(request.amount());        // mutable entity setters
        loan.setInterestRate(request.interestRate());
        loan.setDurationMonths(request.durationMonths());
        loan.setDescription(request.description());
        loan.setBorrower(borrower);
        loan.setStatus(LoanStatus.PENDING);
        return loan;
    }
}
```

#### Clean-Modulith (Spring Data JDBC)
```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LoanMapper {
    public static LoanResponse toResponse(Loan loan, User borrower, List<Payment> payments) {
        return new LoanResponse(
            loan.id(),
            loan.amount(),
            loan.interestRate(),
            loan.durationMonths(),
            loan.status(),
            borrower.email(),                    // no lazy loading — passed explicitly
            borrower.fullName(),
            loan.insDate(),
            loan.approvedAt(),
            payments.stream()                    // passed explicitly, not navigated
                .sorted(Comparator.comparing(Payment::insDate).reversed())
                .limit(5)
                .map(PaymentMapper::toResponse)
                .toList()
        );
    }

    public static Loan toEntity(CreateLoanRequest request, Long borrowerId) {
        return new Loan(                         // immutable record constructor
            null,                                // id = null for new entity
            request.amount(),
            request.interestRate(),
            request.durationMonths(),
            request.description(),
            borrowerId,                          // FK id, not entity reference
            LoanStatus.PENDING,
            null, null, null, null, null, null, 1 // audit fields
        );
    }
}
```

### Pattern 5: Nested and Composed DTOs
```java
public record BatchRequest(
    @NotEmpty(message = "IDs list cannot be empty")
    @Size(max = 100, message = "Batch size cannot exceed 100")
    List<Long> ids,

    @NotNull(message = "Action is required")
    BatchAction action
) {}

public record BatchResponse(
    int totalProcessed,
    int successCount,
    int failureCount,
    List<BatchItemResult> results
) {
    public record BatchItemResult(Long id, boolean success, String message) {}
}

public record ErrorResponse(int status, String message, LocalDateTime timestamp) {}

public record ValidationErrorResponse(int status, List<FieldError> errors) {
    public record FieldError(String field, String message) {}
}
```

## Guidelines
- Use Java `record` for all DTOs (immutable by default)
- Apply Bean Validation annotations on request records
- Response records should have flat structure (avoid nesting entities)
- Mapper classes are `final` with private constructor
- Use `@Nullable` from Spring for optional search fields
- Keep request/response separate (never reuse for both)
- Limit nested collection sizes in responses

## REJECTED Patterns

- DO NOT embed domain entities inside DTOs — use flat field mapping
- DO NOT use the same DTO for request and response — separate them
- DO NOT add business logic to DTOs — they are pure data carriers
- DO NOT use mutable classes for DTOs — prefer Java records

---

## Related Specialists

- `application/java-mapper-specialist.md` — entity↔DTO mapping with MapStruct (11.x)
- `patterns/search-criteria-specialist.md` — search/filter DTOs (43.x)
- `patterns/viewmodel-specialist.md` — controller-layer VM separate from service DTO (47.x)

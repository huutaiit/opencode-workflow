# Java Validation Specialist
# バリデーション スペシャリスト
# Chuyên Gia Validation Java
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: ALL

> 📌 **Note**: Bean Validation (`@Valid`, `@NotNull`, etc.) is variant-agnostic — patterns apply to all variants.
> Package location depends on variant — see Variant-Specific Package Rules below.
> See: `architecture/backend-clean-architecture-specialist.md` (Pattern 0.x) for architecture overview.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Variant-dependent (see below) |
| **Package** | Variant-dependent (see below) |
| **Maven Module** | common (Standard/Reactive), backbone (Clean-Modulith) |
| **Variant** | ALL |
| **Pattern Numbers** | 6.1–6.N |
| **Source Paths** | Variant-dependent (see below) |
| **File Count** | N/A (validation on DTOs) |
| **Naming Convention** | `@Valid` on DTO fields |
| **Base Class** | N/A |
| **Imports From** | Domain (Enums only) |
| **Cannot Import** | Variant-dependent (see below) |
| **Dependencies** | jakarta.validation:jakarta.validation-api |
| **When To Use** | Bean Validation constraints on DTOs and request objects |
| **Source Skeleton** | N/A (validation annotations applied on DTO fields) |
| **Specialist Type** | code |
| **Purpose** | Generate Bean Validation constraints on DTOs — @NotNull, @Size, custom validators, validation groups |
| **Activation Trigger** | files: **/dto/**/*.java; keywords: validation, beanValidation, constraint, valid |

### Variant-Specific Package Rules

| Property | Standard / Reactive | Clean-Modulith |
|----------|-------------------|----------------|
| **Layer** | Application | Presentation |
| **Package** | `{rootPackage}.application.service.dto.{moduleCode}` | `{rootPackage}.presentation.dto.{scope}` |
| **Source Path** | `{sourceRoot}/application/service/dto/{moduleCode}/` | `{sourceRoot}/presentation/dto/{scope}/` |
| **Cannot Import** | Infrastructure, REST (`rest.*`) | Domain directly, Infrastructure |

> **Note**: Validation annotations (`@NotNull`, `@Size`, custom constraints) are identical across variants.
> Only the DTO package location differs — validation follows wherever DTOs live.

---

## Purpose
Generates custom validators, constraint annotations, and cross-field validation logic.

## Patterns

### Pattern 1: Custom Constraint Annotation
```java
@Documented
@Constraint(validatedBy = ValidLoanAmountValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidLoanAmount {
    String message() default "Loan amount does not meet criteria";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

### Pattern 2: Cross-Field Validator
```java
public class ValidLoanAmountValidator
        implements ConstraintValidator<ValidLoanAmount, CreateLoanRequest> {

    @Override
    public boolean isValid(CreateLoanRequest request, ConstraintValidatorContext context) {
        if (request == null) return true;

        boolean valid = true;

        if (request.amount() != null && request.durationMonths() != null) {
            var monthlyPayment = request.amount()
                .divide(BigDecimal.valueOf(request.durationMonths()), 2, RoundingMode.HALF_UP);

            if (monthlyPayment.compareTo(new BigDecimal("50")) < 0) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate(
                        "Monthly payment must be at least 50")
                    .addPropertyNode("amount")
                    .addConstraintViolation();
                valid = false;
            }
        }
        return valid;
    }
}
```

### Pattern 3: Programmatic Validation in Service
```java
@Service
@RequiredArgsConstructor
public class LoanValidationService {
    private final LoanRepository loanRepository;
    private final CreditScoreClient creditScoreClient;

    public void validateLoanCreation(CreateLoanRequest request, User borrower) {
        var violations = new ArrayList<String>();

        var activeLoans = loanRepository.countByBorrowerIdAndStatusIn(
            borrower.getId(), List.of(LoanStatus.ACTIVE, LoanStatus.APPROVED));
        if (activeLoans >= 3) {
            violations.add("Maximum 3 active loans allowed");
        }

        var creditScore = creditScoreClient.getScore(borrower.getId());
        if (creditScore < 600 && request.amount().compareTo(new BigDecimal("50000")) > 0) {
            violations.add("Credit score too low for requested amount");
        }

        if (!violations.isEmpty()) {
            throw new ValidationException(violations);
        }
    }
}
```

### Pattern 4: Validation Groups
```java
public interface OnCreate {}
public interface OnUpdate {}

public record UpdateLoanRequest(
    @Null(groups = OnCreate.class, message = "ID must not be provided on create")
    @NotNull(groups = OnUpdate.class, message = "ID is required on update")
    UUID id,

    @NotNull(groups = OnCreate.class)
    BigDecimal amount,

    @Size(max = 500)
    String description
) {}

// In controller:
@PostMapping
public LoanResponse create(
        @Validated(OnCreate.class) @RequestBody UpdateLoanRequest request) {
    return loanService.create(request);
}
```

### Pattern 5: Collection and Enum Validation
```java
public record AssignLendersRequest(
    @NotNull UUID loanId,

    @NotEmpty(message = "At least one lender required")
    @Size(max = 10, message = "Maximum 10 lenders per loan")
    List<@NotNull UUID> lenderIds,

    @NotNull
    @ValidEnum(enumClass = AllocationStrategy.class)
    String allocationStrategy
) {}

@Constraint(validatedBy = ValidEnumValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidEnum {
    Class<? extends Enum<?>> enumClass();
    String message() default "Invalid enum value";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

### Pattern 6: Reactive Mono-based Validation
Validation in reactive pipeline must not block.
```java
public Mono<CmnMCustomerDTO> validateAndSave(CmnMCustomerDTO dto) {
    return Mono.just(dto)
        .flatMap(this::validateBusinessRules)
        .flatMap(repository::save);
}

private Mono<CmnMCustomerDTO> validateBusinessRules(CmnMCustomerDTO dto) {
    if (dto.getCustomerCd() == null) {
        return Mono.error(new ValidationException("customerCd required"));
    }
    return Mono.just(dto);
}
```

### Pattern 7: Flux Stream Validation
Validate items in reactive stream for batch operations.
```java
public Flux<CmnMCustomerDTO> validateBatch(Flux<CmnMCustomerDTO> items) {
    return items.flatMap(item ->
        validateBusinessRules(item)
            .onErrorResume(e -> Mono.empty()) // skip invalid
    );
}
```

## Guidelines
- Use Bean Validation annotations for simple constraints
- Create custom `@Constraint` for reusable cross-field validation
- Use programmatic validation for business rules requiring DB access
- Use `ValidationGroups` when same DTO serves create/update
- Always provide meaningful error messages
- Validate at controller level (request) AND service level (business rules)
- Prefer early validation failure over processing invalid data

## REJECTED Patterns

- DO NOT validate in repository layer — validate in service or controller
- DO NOT throw generic `RuntimeException` — use domain-specific exceptions
- DO NOT skip reactive validation — use `Mono.error()` not `throw`
- DO NOT duplicate validation between DTO and entity — single source of truth

---

## Related Specialists

- `domain/java-exception-specialist.md` — exception hierarchy for validation failures (7.x)
- `domain/java-dto-specialist.md` — Bean Validation on request DTOs (5.x)
- `patterns/crud-service-base-specialist.md` — validation hooks in service base (45.x)

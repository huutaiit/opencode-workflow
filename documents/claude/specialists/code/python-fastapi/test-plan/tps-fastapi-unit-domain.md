# Test Plan Specialist — FastAPI Unit Testing: Domain Layer
# テストプランスペシャリスト — FastAPI Unit Testing: Domain Layer
# Chuyen Gia Test — FastAPI Unit Testing: Domain Layer

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Domain layer testing - Pydantic model validation, SQLAlchemy model fields, enums, pure Python logic (NO FastAPI app, NO DB)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | UT-D |
| **Specialist Type** | code |
| **Purpose** | Domain layer testing - Pydantic model validation, SQLAlchemy model fields, enums, pure Python logic (NO FastAPI app, NO DB) |

---

## Patterns

### Pattern UT-D.1: Pydantic Schema Validation

Test valid/invalid data via model_validate(). Pydantic V2: ValidationError with field-level errors. Test @field_validator custom rules, computed fields, model_dump() output.

---

### Pattern UT-D.2: SQLAlchemy Model Fields

Test default values, __repr__, custom properties. NO DB connection - just Python object instantiation. Test relationship loading (lazy/eager config, not actual queries).

---

### Pattern UT-D.3: Enum Behavior

Test from_value(), display labels, allowed transitions. ParametrizeD: @pytest.mark.parametrize("status", list(StatusEnum))

---

### Pattern UT-D.4: Domain Logic (Pure Functions)

Interest calculation, eligibility check, amount validation. NO async, NO DB - pure Python functions. Assert with pytest.approx() for float comparison.

---

## ❌ Negative Example

BAD: from app.main import app in domain test = domain coupled to FastAPI. GOOD: from src.domain.models import User - pure Python import.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Unit Testing: Domain Layer | EPS v10.0*

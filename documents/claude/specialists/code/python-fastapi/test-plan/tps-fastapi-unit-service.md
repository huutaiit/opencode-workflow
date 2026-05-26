# Test Plan Specialist — FastAPI Unit Testing: Service Layer
# テストプランスペシャリスト — FastAPI Unit Testing: Service Layer
# Chuyen Gia Test — FastAPI Unit Testing: Service Layer

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Service layer testing - business logic with AsyncMock repositories, event emission, error propagation

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | UT-S |
| **Specialist Type** | code |
| **Purpose** | Service layer testing - business logic with AsyncMock repositories, event emission, error propagation |

---

## Patterns

### Pattern UT-S.1: Service with AsyncMock Repository

repo = AsyncMock(spec=UserRepository). repo.get_by_id.return_value = mock_user. result = await service.get_user(1). assert repo.get_by_id.called_once_with(1).

---

### Pattern UT-S.2: Service Error Propagation

repo.get_by_id.side_effect = RecordNotFoundError(). with pytest.raises(HTTPException) as exc: await service.get_user(999). assert exc.value.status_code == 404.

---

### Pattern UT-S.3: Service Event Emission

Mock event bus. await service.create_order(dto). event_bus.publish.assert_called_once_with("order.created", match_payload).

---

### Pattern UT-S.4: Service Transaction Boundary

Mock UnitOfWork. await service.transfer(from_id, to_id, amount). uow.commit.assert_called_once(). On error: uow.rollback.assert_called().

---

## ❌ Negative Example

BAD: @pytest.fixture with real DB session in service test = integration test disguised as unit. GOOD: AsyncMock(spec=Repository) - pure logic test.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Unit Testing: Service Layer | EPS v10.0*

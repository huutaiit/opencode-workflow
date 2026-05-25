# Python Design Patterns Specialist
# Pythonデザインパターンスペシャリスト
# Chuyen Gia Mau Thiet Ke Python

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | `src/{domain}/`, `src/core/` |
| **Variant** | ALL |
| **Naming Convention** | `*_repository.py`, `*_service.py`, `*_factory.py` |
| **Imports From** | N/A (patterns apply across layers) |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (Python built-in) |
| **When To Use** | Repository, Unit of Work, Strategy, Factory, DI patterns |
| **Source Skeleton** | `src/{domain}/repository.py`, `src/core/unit_of_work.py` |
| **Pattern Numbers** | 68.1–68.7 |
| **Source Paths** | `**/*.py` |
| **File Count** | N/A |
| **Imported By** | ALL specialists |
| **Specialist Type** | language |
| **Purpose** | Repository, Unit of Work, Strategy, Factory, DI, Observer/Event, Adapter patterns in Python |
| **Activation Trigger** | pattern, repository, factory, strategy, decorator, design, unit of work |

---

## Purpose

Define design patterns for Python FastAPI: generic Repository for data access abstraction, Unit of Work for transaction management, Strategy with Protocol for interchangeable algorithms, Factory for object creation, Dependency Injection with FastAPI Depends, Observer/Event for domain events, and Adapter for wrapping third-party SDKs.

---

## Pattern 68.1: Repository Pattern

```python
from typing import Generic, TypeVar
from abc import ABC, abstractmethod
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class BaseRepository(ABC, Generic[T]):
    """Generic async repository — abstracts data access."""

    @abstractmethod
    async def get_by_id(self, id: int) -> T | None: ...

    @abstractmethod
    async def list(self, skip: int = 0, limit: int = 100) -> list[T]: ...

    @abstractmethod
    async def create(self, entity: T) -> T: ...

    @abstractmethod
    async def update(self, id: int, entity: T) -> T | None: ...

    @abstractmethod
    async def delete(self, id: int) -> bool: ...


# Concrete implementation
class SQLAlchemyUserRepository(BaseRepository[UserSchema]):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, id: int) -> UserSchema | None:
        result = await self.session.get(UserModel, id)
        return UserSchema.model_validate(result) if result else None

    async def list(self, skip: int = 0, limit: int = 100) -> list[UserSchema]:
        stmt = select(UserModel).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return [UserSchema.model_validate(r) for r in result.scalars()]

    async def create(self, entity: UserSchema) -> UserSchema:
        db_obj = UserModel(**entity.model_dump())
        self.session.add(db_obj)
        await self.session.flush()
        return UserSchema.model_validate(db_obj)

    async def update(self, id: int, entity: UserSchema) -> UserSchema | None:
        db_obj = await self.session.get(UserModel, id)
        if not db_obj:
            return None
        for key, value in entity.model_dump(exclude_unset=True).items():
            setattr(db_obj, key, value)
        await self.session.flush()
        return UserSchema.model_validate(db_obj)

    async def delete(self, id: int) -> bool:
        db_obj = await self.session.get(UserModel, id)
        if not db_obj:
            return False
        await self.session.delete(db_obj)
        return True
```

---

## Pattern 68.2: Unit of Work

```python
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession


class UnitOfWork:
    """Groups repositories + manages transaction."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = SQLAlchemyUserRepository(session)
        self.orders = SQLAlchemyOrderRepository(session)

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()


@asynccontextmanager
async def get_uow():
    """Context manager for unit of work."""
    async with async_session() as session:
        uow = UnitOfWork(session)
        try:
            yield uow
            await uow.commit()
        except Exception:
            await uow.rollback()
            raise


# Usage in service
class OrderService:
    async def create_order(self, user_id: int, items: list) -> Order:
        async with get_uow() as uow:
            user = await uow.users.get_by_id(user_id)
            if not user:
                raise ValueError("User not found")

            order = await uow.orders.create(Order(user_id=user_id, items=items))
            # Both operations commit together (or rollback together)
            return order
```

---

## Pattern 68.3: Strategy Pattern

```python
from typing import Protocol


class NotificationStrategy(Protocol):
    """Strategy interface — any class with send() works."""
    async def send(self, recipient: str, message: str) -> bool: ...


class EmailNotifier:
    async def send(self, recipient: str, message: str) -> bool:
        # Send via SMTP
        return True


class SMSNotifier:
    async def send(self, recipient: str, message: str) -> bool:
        # Send via Twilio
        return True


class SlackNotifier:
    async def send(self, recipient: str, message: str) -> bool:
        # Send via Slack webhook
        return True


class NotificationService:
    """Uses strategy pattern — strategy is injected."""

    def __init__(self, strategy: NotificationStrategy):
        self.strategy = strategy

    async def notify(self, recipient: str, message: str) -> bool:
        return await self.strategy.send(recipient, message)


# Swap strategies at runtime
service = NotificationService(EmailNotifier())
# or
service = NotificationService(SlackNotifier())
```

**Key rule**: Use `Protocol` (not ABC) for strategy interfaces — enables structural subtyping (duck typing with types). No inheritance required.

> Source: PierreVannier

---

## Pattern 68.4: Factory Pattern

```python
from src.core.config import settings


def create_notification_service() -> NotificationService:
    """Factory — creates service based on configuration."""
    match settings.NOTIFICATION_PROVIDER:
        case "email":
            return NotificationService(EmailNotifier())
        case "sms":
            return NotificationService(SMSNotifier())
        case "slack":
            return NotificationService(SlackNotifier())
        case _:
            raise ValueError(f"Unknown provider: {settings.NOTIFICATION_PROVIDER}")


def create_storage_client():
    """Factory for storage backends."""
    match settings.STORAGE_BACKEND:
        case "s3":
            return S3StorageClient(settings.S3_BUCKET)
        case "local":
            return LocalStorageClient(settings.UPLOAD_DIR)
        case "gcs":
            return GCSStorageClient(settings.GCS_BUCKET)
```

---

## Pattern 68.5: Dependency Injection (FastAPI)

```python
from typing import Annotated
from fastapi import Depends


# Function dependency
async def get_db_session():
    async with async_session() as session:
        yield session


# Class dependency
class UserRepository:
    def __init__(self, session: AsyncSession = Depends(get_db_session)):
        self.session = session

    async def get(self, id: int):
        return await self.session.get(UserModel, id)


# Chained dependencies
class UserService:
    def __init__(self, repo: UserRepository = Depends()):
        self.repo = repo


# Type alias for clean signatures
SessionDep = Annotated[AsyncSession, Depends(get_db_session)]
UserServiceDep = Annotated[UserService, Depends()]


@router.get("/users/{user_id}")
async def get_user(user_id: int, service: UserServiceDep):
    return await service.repo.get(user_id)


# Override for testing
async def get_test_session():
    async with test_engine.begin() as conn:
        yield conn

app.dependency_overrides[get_db_session] = get_test_session
```

> Source: bossjones gist

---

## Pattern 68.6: Observer/Event Pattern

```python
from collections import defaultdict
from collections.abc import Callable
from typing import Any


class EventBus:
    """Simple in-process event bus."""

    def __init__(self):
        self._handlers: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: str, handler: Callable) -> None:
        self._handlers[event_type].append(handler)

    async def publish(self, event_type: str, data: Any) -> None:
        for handler in self._handlers[event_type]:
            await handler(data)


event_bus = EventBus()


# Domain events
class OrderCreated:
    def __init__(self, order_id: int, user_id: int):
        self.order_id = order_id
        self.user_id = user_id


# Handlers (subscribe)
async def send_order_confirmation(event: OrderCreated):
    await email_service.send(event.user_id, f"Order {event.order_id} confirmed")


async def update_inventory(event: OrderCreated):
    await inventory_service.reserve(event.order_id)


event_bus.subscribe("order.created", send_order_confirmation)
event_bus.subscribe("order.created", update_inventory)


# Publish in service
class OrderService:
    async def create(self, data: dict) -> Order:
        order = await self.repo.create(data)
        await event_bus.publish("order.created", OrderCreated(order.id, order.user_id))
        return order
```

---

## Pattern 68.7: Adapter Pattern

```python
from typing import Protocol


class PaymentGateway(Protocol):
    """Abstract interface for payment processing."""
    async def charge(self, amount: float, currency: str, token: str) -> dict: ...
    async def refund(self, transaction_id: str, amount: float) -> dict: ...


class StripeAdapter:
    """Wraps Stripe SDK behind our interface."""

    def __init__(self, api_key: str):
        import stripe
        stripe.api_key = api_key
        self._stripe = stripe

    async def charge(self, amount: float, currency: str, token: str) -> dict:
        intent = self._stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Stripe uses cents
            currency=currency,
            payment_method=token,
            confirm=True,
        )
        return {"transaction_id": intent.id, "status": intent.status}

    async def refund(self, transaction_id: str, amount: float) -> dict:
        refund = self._stripe.Refund.create(
            payment_intent=transaction_id,
            amount=int(amount * 100),
        )
        return {"refund_id": refund.id, "status": refund.status}


class PayPalAdapter:
    """Wraps PayPal SDK behind same interface."""

    async def charge(self, amount: float, currency: str, token: str) -> dict:
        # PayPal-specific implementation
        ...

    async def refund(self, transaction_id: str, amount: float) -> dict:
        ...
```

**Key rule**: Adapters isolate third-party SDK details. When SDK changes or you switch providers, only the adapter changes.

> Source: PierreVannier (Structural patterns)

---

## MUST DO

- Use Repository pattern to abstract data access
- Use Unit of Work for multi-repository transactions
- Use Protocol (not ABC) for strategy interfaces
- Use FastAPI Depends() for dependency injection
- Use factories for configurable object creation
- Use adapters to wrap third-party SDKs

## MUST NOT DO

- Put business logic in repositories (repositories = data access only)
- Use patterns prematurely (YAGNI — add when needed)
- Create deep inheritance hierarchies (prefer composition)
- Use global mutable state instead of DI
- Mix transaction management across services
- Couple domain logic to third-party SDKs directly

---

## References

- [FastAPI Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Cosmic Python (Architecture Patterns)](https://www.cosmicpython.com/)
- [Python Design Patterns](https://refactoring.guru/design-patterns/python)

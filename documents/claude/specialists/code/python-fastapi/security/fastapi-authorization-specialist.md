# FastAPI Authorization Specialist
# FastAPI認可スペシャリスト
# Chuyen Gia FastAPI Authorization

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `src/core/permissions.py`, `src/auth/authorization.py` |
| **Variant** | ALL |
| **Naming Convention** | `permissions.py` (role/policy defs), `authorization.py` (dep factories) |
| **Imports From** | Domain (User model, Role enum) |
| **Cannot Import** | Presentation, Data Access |
| **Dependencies** | N/A (custom RBAC/ABAC), `casbin` (optional external policy) |
| **When To Use** | RBAC, ABAC, OAuth2 scopes, multi-tenant authorization |
| **Source Skeleton** | `src/core/permissions.py`, `src/{domain}/policies.py` |
| **Pattern Numbers** | 21.1–21.5 |
| **Source Paths** | `**/permissions.py`, `**/authorization.py` |
| **File Count** | 1-2 (permissions + authorization dependencies) |
| **Imported By** | Presentation (router dependencies) |
| **Specialist Type** | code |
| **Purpose** | RBAC via dependency factories, ABAC with policy functions, OAuth2 scopes, multi-tenant filtering, external policy engines |
| **Activation Trigger** | role, permission, authorize, tenant, RBAC, ABAC, `require_role` |

---

## Purpose

Define authorization patterns for FastAPI: RBAC via reusable dependency factories, ABAC with pure policy functions, OAuth2 scopes for granular API access, multi-tenant data isolation, and integration with external policy engines (Permit.io, Auth0 FGA).

---

## Pattern 21.1: RBAC via Dependency Factory

```python
from enum import StrEnum
from typing import Annotated

from fastapi import Depends, HTTPException, status

from src.auth.dependencies import get_current_user
from src.domain.user import User


class Role(StrEnum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"


def require_role(*allowed_roles: Role):
    """Factory: returns a dependency that enforces role membership."""

    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' not authorized. "
                f"Required: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


# Usage on routes
@router.get("/admin/users")
async def list_users(
    user: User = Depends(require_role(Role.ADMIN)),
):
    ...


@router.put("/projects/{project_id}")
async def update_project(
    project_id: int,
    user: User = Depends(require_role(Role.ADMIN, Role.MANAGER)),
):
    ...
```

**Key rule**: Role check is a dependency factory — create once, reuse across routes. Roles are `StrEnum` for DB storage and serialization.

---

## Pattern 21.2: ABAC with Policy Functions

```python
from src.domain.project import Project
from src.domain.user import User


def can_edit_project(user: User, project: Project) -> bool:
    """Pure policy function — no side effects, easy to test."""
    if user.role == Role.ADMIN:
        return True
    if project.owner_id == user.id:
        return True
    if user.id in project.collaborator_ids and user.role in (Role.MANAGER,):
        return True
    return False


def can_delete_project(user: User, project: Project) -> bool:
    return user.role == Role.ADMIN or project.owner_id == user.id


# Usage in service layer
class ProjectService:
    async def update_project(
        self, project_id: int, data: ProjectUpdate, actor: User
    ) -> Project:
        project = await self._repo.get_by_id(project_id)
        if project is None:
            raise NotFoundError("Project", project_id)

        if not can_edit_project(actor, project):
            raise ForbiddenError("Cannot edit this project")

        return await self._repo.update(project_id, data)
```

**Key rule**: Policy functions are pure (no DB calls, no framework imports). They take domain objects and return `bool`. Service layer calls them and raises domain exceptions on failure.

---

## Pattern 21.3: OAuth2 Scopes

```python
from fastapi import Security
from fastapi.security import OAuth2PasswordBearer, SecurityScopes

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    scopes={
        "users:read": "Read user profiles",
        "users:write": "Create/update users",
        "projects:read": "Read projects",
        "projects:write": "Create/update/delete projects",
        "admin": "Full admin access",
    },
)


async def get_current_user_with_scopes(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    payload = decode_token(token)
    token_scopes = payload.get("scopes", [])

    for scope in security_scopes.scopes:
        if scope not in token_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing scope: {scope}",
                headers={
                    "WWW-Authenticate": f'Bearer scope="{security_scopes.scope_str}"'
                },
            )

    user = await user_repo.get_by_id(int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# Usage on routes
@router.get("/users/me")
async def read_me(
    user: User = Security(get_current_user_with_scopes, scopes=["users:read"]),
):
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Security(get_current_user_with_scopes, scopes=["admin"]),
):
    ...
```

**Key rule**: Use `Security()` instead of `Depends()` for scope-aware dependencies. Scopes are embedded in the JWT payload at token creation time.

---

## Pattern 21.4: Multi-Tenant Data Isolation

```python
from fastapi import Depends, Request


async def get_current_tenant(
    current_user: Annotated[User, Depends(get_current_user)],
) -> int:
    """Extract tenant_id from authenticated user."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=403, detail="No tenant assigned")
    return current_user.tenant_id


TenantId = Annotated[int, Depends(get_current_tenant)]


# Repository with tenant filtering
class TenantScopedRepository:
    def __init__(self, session: AsyncSession, tenant_id: int) -> None:
        self._session = session
        self._tenant_id = tenant_id

    async def get_all(self, model_class) -> list:
        """ALWAYS filter by tenant_id — no cross-tenant data leak."""
        stmt = select(model_class).where(
            model_class.tenant_id == self._tenant_id
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(self, model_class, record_id: int):
        """Double-check: record exists AND belongs to tenant."""
        stmt = select(model_class).where(
            model_class.id == record_id,
            model_class.tenant_id == self._tenant_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


# Usage in route
@router.get("/projects")
async def list_projects(
    tenant_id: TenantId,
    repo: TenantScopedRepository = Depends(),
):
    return await repo.get_all(Project)
```

**Key rule**: EVERY query in multi-tenant systems MUST include `tenant_id` filter. Never trust client-supplied tenant ID — derive from authenticated user.

---

## Pattern 21.5: External Policy Engines

```python
import httpx


class PermitClient:
    """Integration with Permit.io for complex authorization."""

    def __init__(self, api_key: str, pdp_url: str = "http://localhost:7766") -> None:
        self._api_key = api_key
        self._pdp_url = pdp_url

    async def check(
        self, user_id: str, action: str, resource: str, context: dict | None = None
    ) -> bool:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._pdp_url}/allowed",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={
                    "user": {"key": user_id},
                    "action": action,
                    "resource": {"type": resource, **(context or {})},
                },
            )
            return response.json().get("allow", False)


# Usage as dependency
async def require_permission(
    action: str, resource: str
):
    async def checker(
        current_user: Annotated[User, Depends(get_current_user)],
        permit: PermitClient = Depends(get_permit_client),
    ) -> User:
        allowed = await permit.check(str(current_user.id), action, resource)
        if not allowed:
            raise HTTPException(status_code=403, detail="Permission denied")
        return current_user

    return checker
```

**When to use external engines**: >50 roles, complex attribute rules, audit requirements, or need for non-developer policy management UI.

---

## MUST DO

- Use dependency factories for reusable role checks (`require_role()`)
- Keep policy functions pure — no side effects, no DB calls
- Derive `tenant_id` from authenticated user — never from client input
- Filter ALL queries by `tenant_id` in multi-tenant systems
- Use `Security()` for scope-aware dependencies
- Use `StrEnum` for roles (DB-serializable, type-safe)

## MUST NOT DO

- Hardcode role checks inline in route handlers
- Put authorization logic in repositories (belongs in service layer)
- Trust client-supplied `tenant_id` or role claims without server validation
- Mix RBAC and ABAC without clear boundaries (RBAC for route access, ABAC for resource-level)
- Skip tenant filtering on any query (data leak vulnerability)
- Use numeric role levels (1=admin, 2=user) instead of explicit role names

---

## References

- [FastAPI: Security Scopes](https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/)
- [Permit.io: FastAPI Authorization](https://docs.permit.io/sdk/python/)
- [derekmizak: security-api-design](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
- [Van-LLM-Crew: ASVS access-control](https://github.com/Van-LLM-Crew/cursor-secure-coding)

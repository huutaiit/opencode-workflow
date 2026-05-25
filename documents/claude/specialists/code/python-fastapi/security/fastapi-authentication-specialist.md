# FastAPI Authentication Specialist
# FastAPI認証スペシャリスト
# Chuyen Gia FastAPI Authentication

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `src/core/security.py`, `src/auth/` |
| **Variant** | ALL |
| **Naming Convention** | `security.py` (token/password utils), `dependencies.py` (auth deps) |
| **Imports From** | Domain (User model), Data Access (user repository) |
| **Cannot Import** | Presentation |
| **Dependencies** | `python-jose[cryptography]`, `passlib[bcrypt]`, `python-multipart` |
| **When To Use** | JWT authentication, token refresh, password hashing, API keys |
| **Source Skeleton** | `src/core/security.py`, `src/auth/router.py`, `src/auth/service.py` |
| **Pattern Numbers** | 20.1–20.6 |
| **Source Paths** | `**/security.py`, `**/auth/**` |
| **File Count** | 2-3 (security core + auth dependencies + optional auth router) |
| **Imported By** | Application (services), Presentation (router dependencies) |
| **Specialist Type** | code |
| **Purpose** | OAuth2+JWT authentication, token refresh/rotation, API key auth, password hashing with Argon2, timing attack prevention |
| **Activation Trigger** | login, token, JWT, OAuth2, authentication, password, `get_current_user` |

---

## Purpose

Define authentication patterns for FastAPI: OAuth2 with JWT (PyJWT), access/refresh token lifecycle, API key authentication, password hashing with pwdlib[argon2], token blacklisting via Redis, and timing attack prevention.

---

## Pattern 20.1: OAuth2 + JWT Authentication

```python
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from src.core.config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

Settings = get_settings()


def create_access_token(
    subject: str | int,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=Settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, Settings.SECRET_KEY, algorithm=Settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            Settings.SECRET_KEY,
            algorithms=[Settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await user_repo.get_by_id(int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
```

**Key rule**: Use `PyJWT` (NOT `python-jose` — abandoned, no maintenance since 2022).

**Install**: `pip install PyJWT[crypto]` (includes RSA/EC key support)

---

## Pattern 20.2: Token Refresh / Rotation

```python
import uuid


def create_refresh_token(subject: str | int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=Settings.REFRESH_TOKEN_EXPIRE_DAYS  # 7 days
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": str(uuid.uuid4()),  # Unique ID for blacklisting
    }
    return jwt.encode(payload, Settings.SECRET_KEY, algorithm=Settings.JWT_ALGORITHM)


async def refresh_access_token(
    refresh_token: str,
    user_repo: UserRepository,
    blacklist: TokenBlacklist,
) -> tuple[str, str]:
    """Rotate tokens: verify refresh → blacklist old → issue new pair."""
    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    jti = payload.get("jti")
    if await blacklist.is_blacklisted(jti):
        raise HTTPException(status_code=401, detail="Token revoked")

    # Blacklist used refresh token (rotation)
    await blacklist.add(jti, ttl=Settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    user = await user_repo.get_by_id(int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return (
        create_access_token(user.id),
        create_refresh_token(user.id),
    )
```

**Token lifecycle**: Access = 15min (short, stateless). Refresh = 7 days (longer, blacklistable). Rotate refresh on each use.

---

## Pattern 20.3: Token Blacklisting (Redis)

```python
import redis.asyncio as aioredis


class TokenBlacklist:
    """Redis-backed JTI blacklist for token revocation."""

    def __init__(self, redis_client: aioredis.Redis) -> None:
        self._redis = redis_client
        self._prefix = "token:blacklist"

    async def add(self, jti: str, ttl: int) -> None:
        """Blacklist a JTI. TTL matches token expiry (auto-cleanup)."""
        await self._redis.set(f"{self._prefix}:{jti}", "1", ex=ttl)

    async def is_blacklisted(self, jti: str) -> bool:
        return await self._redis.exists(f"{self._prefix}:{jti}") > 0

    async def revoke_all_user_tokens(self, user_id: int) -> None:
        """Emergency: increment user's token version in DB instead.
        All existing tokens become invalid on next decode check."""
        pass  # Implement via user.token_version field
```

**Key rule**: Set TTL on blacklist entries matching token expiry — prevents unbounded Redis memory growth.

---

## Pattern 20.4: API Key Authentication

```python
import secrets
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(
    api_key: str | None = Depends(api_key_header),
    key_repo: APIKeyRepository = Depends(get_api_key_repository),
) -> APIKeyRecord:
    if api_key is None:
        raise HTTPException(status_code=401, detail="API key required")

    record = await key_repo.get_by_key_hash(hash_api_key(api_key))
    if record is None or not record.is_active:
        raise HTTPException(status_code=403, detail="Invalid API key")

    if record.expires_at and record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="API key expired")

    return record


def generate_api_key() -> str:
    """Generate a secure random API key (32 bytes = 43 base64 chars)."""
    return secrets.token_urlsafe(32)


def hash_api_key(key: str) -> str:
    """Store hashed keys only — never store raw API keys."""
    import hashlib
    return hashlib.sha256(key.encode()).hexdigest()
```

**Key rule**: Store hashed API keys in DB. Use `secrets.compare_digest()` for constant-time comparison when checking raw keys directly.

---

## Pattern 20.5: Password Hashing (Argon2)

```python
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

password_hash = PasswordHash((Argon2Hasher(),))


def hash_password(plain: str) -> str:
    return password_hash.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return password_hash.verify(plain, hashed)


def check_needs_rehash(hashed: str) -> bool:
    """Check if hash uses outdated parameters — rehash on next login."""
    return password_hash.is_deprecated(hashed)


# Usage in login flow
async def authenticate_user(
    email: str,
    password: str,
    user_repo: UserRepository,
) -> User | None:
    user = await user_repo.get_by_email(email)
    if user is None:
        # Timing attack prevention: hash dummy to equalize response time
        verify_password(password, DUMMY_HASH)
        return None

    if not verify_password(password, user.hashed_password):
        return None

    # Rehash if using outdated parameters
    if check_needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(password)
        await user_repo.update(user)

    return user
```

**Install**: `pip install pwdlib[argon2]` (replaces deprecated `passlib` + `bcrypt`)

---

## Pattern 20.6: Timing Attack Prevention

```python
# Pre-compute a dummy hash at module level (one-time cost)
DUMMY_HASH = hash_password("dummy-password-for-timing-equalization")


async def login(credentials: LoginRequest, user_repo: UserRepository) -> TokenResponse:
    user = await authenticate_user(
        credentials.email, credentials.password, user_repo
    )
    if user is None:
        # Same response time whether user exists or not
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        token_type="bearer",
    )
```

**Key rule**: Always hash against `DUMMY_HASH` when user not found — prevents user enumeration via response timing.

---

## MUST DO

- Use `PyJWT` (NOT `python-jose` — abandoned)
- Use `pwdlib[argon2]` (NOT `passlib` — deprecated)
- Include `jti` claim in refresh tokens for revocation
- Set `WWW-Authenticate: Bearer` header on 401 responses
- Rotate refresh tokens on each use (one-time use)
- Hash API keys before storing in database
- Pre-compute `DUMMY_HASH` for timing equalization

## MUST NOT DO

- Use `python-jose` (no maintenance since 2022)
- Use `passlib` or bare `bcrypt` (deprecated/compatibility issues)
- Store plain-text API keys in database
- Use long-lived access tokens (>30min) instead of refresh tokens
- Skip `jti` in refresh tokens (cannot revoke individual tokens)
- Return different error messages for "user not found" vs "wrong password"

---

## References

- [FastAPI: OAuth2 with JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)
- [pwdlib GitHub](https://github.com/frankie567/pwdlib)
- [derekmizak/Copilot-RuleSet-FastApi: security-implementation](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)

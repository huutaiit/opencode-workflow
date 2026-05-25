# FastAPI Configuration Specialist
# FastAPI設定スペシャリスト
# Chuyên Gia Cấu Hình FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/core/config.py`, `src/{domain}/config.py` |
| **Variant** | ALL |
| **Naming Convention** | `config.py`, `Settings` class, `UPPER_SNAKE_CASE` field names |
| **Imports From** | None (leaf — pure configuration) |
| **Cannot Import** | Application, Presentation, Data Access |
| **Dependencies** | pydantic-settings>=2.0 |
| **When To Use** | App configuration, environment variables, secrets management |
| **Source Skeleton** | `src/core/config.py`, `.env`, `.env.example` |
| **Pattern Numbers** | 7.1–7.6 |
| **Source Paths** | `**/config.py`, `**/settings.py` |
| **File Count** | 1 core + optional per domain |
| **Imported By** | ALL layers |
| **Specialist Type** | code |
| **Purpose** | pydantic-settings v2 configuration: BaseSettings, env vars, secrets, environment switching, testing |
| **Activation Trigger** | `config.py`, `Settings`, `BaseSettings`, `.env`, environment configuration |

---

## Purpose

Define configuration patterns for FastAPI using pydantic-settings v2: BaseSettings with SettingsConfigDict, environment-based switching, singleton access, domain-scoped settings, secrets management, and test overrides.

---

## Pattern 7.1: Core Settings Class

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",          # Ignore unknown env vars
    )

    # Application
    APP_NAME: str = "My FastAPI App"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str          # No default — MUST be set via env
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
```

**Priority** (highest wins): Environment variables > `.env` file > `secrets_dir` > field defaults.

> Source: FastAPI Settings docs, zhanymkanov/fastapi-best-practices

---

## Pattern 7.2: Domain-Scoped Settings

Split large settings into focused classes per domain.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AUTH_")

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7


class DatabaseConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DB_")

    URL: str                    # Reads DB_URL from env
    POOL_SIZE: int = 5          # Reads DB_POOL_SIZE
    MAX_OVERFLOW: int = 10      # Reads DB_MAX_OVERFLOW
    POOL_RECYCLE: int = 1800    # Reads DB_POOL_RECYCLE
    ECHO: bool = False          # Reads DB_ECHO


class RedisConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="REDIS_")

    URL: str = "redis://localhost:6379/0"
    MAX_CONNECTIONS: int = 20


# Compose in main Settings
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",  # SETTINGS__DB__URL → nested
    )

    APP_NAME: str = "My App"
    auth: AuthConfig = AuthConfig()
    db: DatabaseConfig = DatabaseConfig()
    redis: RedisConfig = RedisConfig()
```

> Source: zhanymkanov/fastapi-best-practices (split BaseSettings per domain)

---

## Pattern 7.3: Singleton via @lru_cache

```python
from functools import lru_cache


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Use in dependencies
from fastapi import Depends
from typing import Annotated

SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/info")
async def app_info(settings: SettingsDep):
    return {"app_name": settings.APP_NAME, "debug": settings.DEBUG}
```

**Why `@lru_cache`**: Settings are parsed from `.env` + env vars on first call, then cached. Parsing happens once, not per-request.

---

## Pattern 7.4: Environment-Based Switching

```python
from enum import StrEnum


class Environment(StrEnum):
    LOCAL = "local"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    ENVIRONMENT: Environment = Environment.LOCAL

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def show_docs(self) -> bool:
        return self.ENVIRONMENT in (Environment.LOCAL, Environment.STAGING)


# In create_app()
def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.APP_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.show_docs else None,
        debug=settings.DEBUG,
    )
    return app
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-deployment.md)

---

## Pattern 7.5: Secrets Management

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        secrets_dir="/run/secrets",  # Docker/K8s secrets mount
    )

    # Secrets — repr=False hides from logs/repr
    SECRET_KEY: str = Field(repr=False)
    DATABASE_URL: str = Field(repr=False)
    REDIS_PASSWORD: str = Field(default="", repr=False)

    # API keys — no defaults for production secrets
    OPENAI_API_KEY: str = Field(default="", repr=False)
    STRIPE_SECRET_KEY: str = Field(default="", repr=False)
```

**Production hierarchy** (most to least secure):
1. Kubernetes Secrets / Cloud KMS (AWS Secrets Manager, GCP Secret Manager)
2. HashiCorp Vault
3. Docker Secrets (`/run/secrets`)
4. Environment variables
5. `.env` file (development only)

**Key rules**:
- `repr=False` on ALL sensitive fields (prevents accidental logging)
- No default values for production secrets (force explicit configuration)
- Never commit `.env` files (`.gitignore` MUST include `.env*`)

> Source: PierreVannier gist (security rule #7), FastAPI Settings docs

---

## Pattern 7.6: Testing Override

```python
import pytest
from functools import lru_cache

from src.core.config import Settings, get_settings
from src.main import app


def get_test_settings() -> Settings:
    return Settings(
        ENVIRONMENT="testing",
        DATABASE_URL="postgresql+asyncpg://test:test@localhost/test_db",
        SECRET_KEY="test-secret-key-not-for-production",
        DEBUG=True,
    )


@pytest.fixture(autouse=True)
def override_settings():
    app.dependency_overrides[get_settings] = get_test_settings
    yield
    app.dependency_overrides.clear()


# Or via environment variables in conftest.py
@pytest.fixture(scope="session", autouse=True)
def set_test_env(monkeypatch_session):
    monkeypatch_session.setenv("ENVIRONMENT", "testing")
    monkeypatch_session.setenv("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test_db")
    monkeypatch_session.setenv("SECRET_KEY", "test-secret")
    get_settings.cache_clear()  # Clear lru_cache
```

---

## MUST DO

- Use `pydantic-settings` v2 (`BaseSettings` + `SettingsConfigDict`)
- Use `@lru_cache` on `get_settings()` for singleton access
- Use `repr=False` on all sensitive fields
- Use `env_prefix` for domain-scoped settings
- Use `Field()` without defaults for production secrets
- Add `.env*` to `.gitignore`
- Use `StrEnum` for environment names (type-safe)

## MUST NOT DO

- Commit `.env` files to version control
- Set default values for production secrets (`SECRET_KEY`, `DATABASE_URL`)
- Use `os.getenv()` directly (lose validation, type coercion, documentation)
- Skip `repr=False` on secrets (will leak in logs, repr, debug output)
- Create Settings instances per-request (use `@lru_cache` singleton)
- Hardcode configuration values in application code

---

## References

- [FastAPI: Settings and Environment Variables](https://fastapi.tiangolo.com/advanced/settings/)
- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [derekmizak/Copilot-RuleSet-FastApi](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
- [PierreVannier gist](https://gist.github.com/PierreVannier)

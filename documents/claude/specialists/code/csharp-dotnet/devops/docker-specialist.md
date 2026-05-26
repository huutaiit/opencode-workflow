# Docker Specialist — Generic
# Dockerスペシャリスト — 汎用
# Chuyen Gia Docker — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: Docker, docker-compose, .NET Container Images
**Aspect**: DevOps — Multi-Stage Builds, Alpine Optimization, Health Checks, Compose
**Purpose**: Consultation agent for /plan and /execute — Docker containerization for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | N/A (DevOps tooling, not C# namespace) |
| **Variant** | ALL |
| **Pattern Numbers** | 72.1–72.3 |
| **Source Paths** | `Dockerfile, docker-compose.yml, .dockerignore` |
| **File Count** | 3 files per project |
| **Naming Convention** | `Dockerfile`, `docker-compose.yml` |
| **Imports From** | N/A (build tooling, not C# code) |
| **Cannot Import** | N/A (build tooling) |
| **Imported By** | Infrastructure (deployment pipeline uses Docker images) |
| **Dependencies** | None (Docker tooling) |
| **When To Use** | Container builds, multi-stage Dockerfile, docker-compose orchestration |
| **Source Skeleton** | `Dockerfile`, `docker-compose.yml`, `.dockerignore` |
| **Specialist Type** | code |
| **Purpose** | Generate multi-stage Dockerfile with Alpine optimization and docker-compose for local dev |
| **Activation Trigger** | `files: Dockerfile, docker-compose.yml, .dockerignore; keywords: FROM, ENTRYPOINT, services` |

---

## ROLE

**Your ONLY responsibility**: Enforce Docker standards for .NET — multi-stage builds (restore → build → publish → runtime), chiseled/Alpine images for smallest size, non-root user, health checks, and docker-compose for local development.

---

## Patterns

### Pattern 72.1: Multi-Stage Dockerfile
> Source: E1 docker

Always multi-stage: restore (cached), build, publish, runtime. Use `mcr.microsoft.com/dotnet/aspnet` for runtime.

```dockerfile
# DO — Multi-stage build [E1]
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Orders.Api/Orders.Api.csproj", "src/Orders.Api/"]
COPY ["src/Orders.Domain/Orders.Domain.csproj", "src/Orders.Domain/"]
RUN dotnet restore "src/Orders.Api/Orders.Api.csproj"
COPY . .
RUN dotnet publish "src/Orders.Api/Orders.Api.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app
RUN adduser -D appuser && chown -R appuser /app
USER appuser
COPY --from=build /app/publish .
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
EXPOSE 8080
ENTRYPOINT ["dotnet", "Orders.Api.dll"]
```

```dockerfile
# DON'T — Single-stage with SDK image [E1]
FROM mcr.microsoft.com/dotnet/sdk:8.0
COPY . .
RUN dotnet publish -o /app
ENTRYPOINT ["dotnet", "/app/Orders.Api.dll"]
# SDK image is 800MB+ vs 100MB for alpine runtime
```

### Pattern 72.2: Docker Compose for Local Development
> Source: E1 docker

```yaml
# DO — docker-compose.yml with dependencies [E1]
services:
  api:
    build: .
    ports: ["8080:8080"]
    environment:
      - ConnectionStrings__OrdersDb=Server=db;Database=Orders;User=sa;Password=${SA_PASSWORD}
    depends_on:
      db: { condition: service_healthy }

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: ${SA_PASSWORD}
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$$SA_PASSWORD" -Q "SELECT 1" -C
      interval: 10s
      retries: 5
```

### Pattern 72.3: .dockerignore
> Source: E1 docker

```
# DO — Minimize build context [E1]
**/bin/
**/obj/
**/node_modules/
**/.git/
**/Dockerfile*
**/docker-compose*
**/.vs/
**/.idea/
```

---

*Docker Specialist v2.0 — Generic*
*Sources: E1 docker*
*Pattern range: 72.1–72.3*

# CI/CD Specialist — Generic
# CI/CDスペシャリスト — 汎用
# Chuyen Gia CI/CD — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: GitHub Actions, Azure DevOps, dotnet CLI
**Aspect**: DevOps — CI/CD Pipelines, NuGet Caching, Test Reporting
**Purpose**: Consultation agent for /plan and /execute — CI/CD pipeline patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | N/A (DevOps tooling, not C# namespace) |
| **Variant** | ALL |
| **Pattern Numbers** | 72.4–72.7 |
| **Source Paths** | `.github/workflows/*.yml, azure-pipelines.yml` |
| **File Count** | 1–3 pipeline files |
| **Naming Convention** | `ci.yml`, `cd.yml` |
| **Imports From** | N/A (pipeline tooling, not C# code) |
| **Cannot Import** | N/A (pipeline tooling) |
| **Imported By** | Infrastructure (deployment) |
| **Dependencies** | None (CI/CD tooling) |
| **When To Use** | GitHub Actions pipelines, NuGet restore caching, test + publish + deploy |
| **Source Skeleton** | `.github/workflows/ci.yml` |
| **Specialist Type** | code |
| **Purpose** | Generate GitHub Actions / Azure DevOps CI/CD pipelines with NuGet cache and test reporting |
| **Activation Trigger** | `files: .github/workflows/*.yml; keywords: dotnet restore, dotnet test, dotnet publish` |

---

## ROLE

**Your ONLY responsibility**: Enforce CI/CD standards — GitHub Actions with dotnet CLI, NuGet cache for fast restores, test with coverage reporting, and conditional deploy on main branch.

---

## Patterns

### Pattern 72.4: GitHub Actions CI Pipeline
> Source: E1 cicd

```yaml
# DO — Standard .NET CI pipeline [E1]
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }
      - uses: actions/cache@v4
        with:
          path: ~/.nuget/packages
          key: ${{ runner.os }}-nuget-${{ hashFiles('**/*.csproj') }}
          restore-keys: ${{ runner.os }}-nuget-
      - run: dotnet restore
      - run: dotnet build --no-restore -c Release
      - run: dotnet test --no-build -c Release --logger trx --collect:"XPlat Code Coverage"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: '**/TestResults/**'
```

### Pattern 72.5: Conditional Deploy
> Source: E1 cicd

```yaml
# DO — Deploy only on main branch [E1]
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: dotnet publish src/Orders.Api -c Release -o publish
      - uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ vars.AZURE_WEBAPP_NAME }}
          package: publish
```

---

*CI/CD Specialist v2.0 — Generic*
*Sources: E1 cicd*
*Pattern range: 72.4–72.7*

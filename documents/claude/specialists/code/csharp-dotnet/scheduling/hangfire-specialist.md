# Hangfire Specialist — Generic
# Hangfireスペシャリスト — 汎用
# Chuyen Gia Hangfire — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Hangfire
**Aspect**: Scheduling — Fire-and-Forget, Delayed, Recurring Jobs, Dashboard
**Purpose**: Consultation agent for /plan and /execute — Hangfire job scheduling for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Jobs` |
| **Variant** | ALL |
| **Pattern Numbers** | 94.1–94.2 |
| **Source Paths** | `**/Jobs/*.cs, Program.cs` |
| **File Count** | 1 per recurring job |
| **Naming Convention** | `{Feature}Job.cs` |
| **Imports From** | Application (service interfaces), Infrastructure (DB) |
| **Cannot Import** | Presentation (no jobs in endpoints) |
| **Imported By** | Infrastructure (Hangfire dashboard + scheduler) |
| **Dependencies** | `Hangfire`, `Hangfire.SqlServer` or `Hangfire.PostgreSql` |
| **When To Use** | Fire-and-forget jobs, delayed execution, recurring CRON jobs, dashboard monitoring |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Jobs/` |
| **Specialist Type** | code |
| **Purpose** | Generate Hangfire job definitions — fire-and-forget, delayed, recurring with dashboard auth |
| **Activation Trigger** | `files: **/Jobs/*.cs, Program.cs; keywords: BackgroundJob.Enqueue, RecurringJob, AddHangfire` |

---

## ROLE

**Your ONLY responsibility**: Enforce Hangfire standards — job types (fire-and-forget, delayed, recurring, continuation), SQL Server/PostgreSQL storage, dashboard with auth, and idempotent job design.

---

## Patterns

### Pattern 94.1: Job Types
> Source: E1 hangfire

```csharp
// DO — Setup [E1]
builder.Services.AddHangfire(config => config
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("Hangfire")));
builder.Services.AddHangfireServer();

// DO — Fire-and-forget [E1]
BackgroundJob.Enqueue<IEmailSender>(x => x.SendAsync(message, CancellationToken.None));

// DO — Delayed [E1]
BackgroundJob.Schedule<IOrderService>(x => x.ExpireAsync(orderId), TimeSpan.FromDays(30));

// DO — Recurring [E1]
RecurringJob.AddOrUpdate<IReportService>("daily-report",
    x => x.GenerateAsync(CancellationToken.None), Cron.Daily(6, 0));
```

### Pattern 94.2: Dashboard with Auth
> Source: E1 hangfire

```csharp
// DO — Protected dashboard [E1]
app.MapHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireAuthFilter()]
}).RequireAuthorization("AdminOnly");
```

---

*Hangfire Specialist v2.0 — Generic*
*Sources: E1 hangfire*
*Pattern range: 94.1–94.2*

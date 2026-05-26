# Quartz.NET Specialist — Generic
# Quartz.NETスペシャリスト — 汎用
# Chuyen Gia Quartz.NET — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Quartz.NET
**Aspect**: Scheduling — Cron Triggers, Job Clustering, Persistent Job Store
**Purpose**: Consultation agent for /plan and /execute — Quartz.NET job scheduling for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Jobs` |
| **Variant** | ALL |
| **Pattern Numbers** | 95.1–95.2 |
| **Source Paths** | `**/Jobs/**Job.cs, Program.cs` |
| **File Count** | 1 per scheduled job |
| **Naming Convention** | `{Job}Job` |
| **Imports From** | Application (service interfaces), Infrastructure (DB for persistence) |
| **Cannot Import** | Presentation |
| **Imported By** | Infrastructure (Quartz scheduler triggers jobs) |
| **Dependencies** | `Quartz`, `Quartz.Extensions.Hosting` |
| **When To Use** | Complex CRON scheduling, job clustering, persistent job store, calendar exclusions |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Jobs/` |
| **Specialist Type** | code |
| **Purpose** | Generate Quartz.NET job implementations with CRON triggers and persistent job store clustering |
| **Activation Trigger** | `files: **/Jobs/**Job.cs; keywords: IJob, AddQuartz, WithCronSchedule, UsePersistentStore` |

---

## ROLE

**Your ONLY responsibility**: Enforce Quartz.NET standards — IJob implementation, CRON triggers, DI integration via AddQuartz, and persistent store for multi-instance deployments.

---

## Patterns

### Pattern 95.1: Job + Trigger Setup
> Source: E1 quartz

```csharp
// DO — DI-friendly Quartz setup [E1]
builder.Services.AddQuartz(q =>
{
    q.UseMicrosoftDependencyInjectionJobFactory();

    q.AddJob<ExpireOrdersJob>(opts => opts.WithIdentity("expire-orders"));
    q.AddTrigger(opts => opts
        .ForJob("expire-orders")
        .WithIdentity("expire-orders-trigger")
        .WithCronSchedule("0 0 * * * ?"));  // Every hour
});
builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

// DO — Job with DI [E1]
public sealed class ExpireOrdersJob(AppDbContext db, TimeProvider clock) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        var cutoff = clock.GetUtcNow().AddDays(-30);
        await db.Orders
            .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Expired));
    }
}
```

### Pattern 95.2: Persistent Store (Multi-Instance)
> Source: E1 quartz

```csharp
// DO — SQL Server persistent store for clustering [E1]
q.UsePersistentStore(s =>
{
    s.UseProperties = true;
    s.UseSqlServer(builder.Configuration.GetConnectionString("Quartz")!);
    s.UseClustering();
});
```

---

*Quartz.NET Specialist v2.0 — Generic*
*Sources: E1 quartz*
*Pattern range: 95.1–95.2*

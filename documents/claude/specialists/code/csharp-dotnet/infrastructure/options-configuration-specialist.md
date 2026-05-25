# Options Configuration Specialist — Generic
# オプション設定スペシャリスト — 汎用
# Chuyen Gia Options Configuration — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Microsoft.Extensions.Options
**Aspect**: Infrastructure — Options Pattern, ValidateOnStart, IOptionsMonitor, Complex Validation
**Purpose**: Consultation agent for /plan and /execute — Options pattern for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure` |
| **Variant** | ALL |
| **Pattern Numbers** | 65.4, 65.5, 65.6 |
| **Source Paths** | `**/*Options.cs, appsettings*.json` |
| **File Count** | 1 per config section |
| **Naming Convention** | `{Feature}Options.cs` |
| **Imports From** | Infrastructure (configuration providers) |
| **Cannot Import** | N/A (options are consumed by all layers — read-only POCO) |
| **Imported By** | ALL (every layer reads configuration via IOptions) |
| **Dependencies** | `Microsoft.Extensions.Options` (built-in) |
| **When To Use** | Strongly-typed config, ValidateOnStart, IOptionsSnapshot/Monitor, IValidateOptions |
| **Source Skeleton** | `appsettings.json`, `{Feature}Options.cs` |
| **Specialist Type** | code |
| **Purpose** | Generate strongly-typed Options pattern with ValidateOnStart and IValidateOptions |
| **Activation Trigger** | `files: **/*Options.cs, appsettings*.json; keywords: IOptions, BindConfiguration, ValidateOnStart` |

---

## ROLE

**Your ONLY responsibility**: Enforce Options pattern standards — strongly-typed config with ValidateOnStart, correct IOptions/IOptionsSnapshot/IOptionsMonitor usage, and IValidateOptions for complex cross-property validation.

---

## Patterns

### Pattern 65.4: Options Pattern — Strongly-Typed Configuration
> Source: E2 config, E1 dependency-injection

Bind configuration sections to POCO classes. Always use `ValidateOnStart()` — fail fast.

```csharp
// DO — Options with validation [E2]
builder.Services.AddOptions<SmtpSettings>()
    .BindConfiguration(SmtpSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();  // CRITICAL — fail at startup, not at runtime

public class SmtpSettings
{
    public const string SectionName = "Smtp";

    [Required(ErrorMessage = "SMTP host is required")]
    public string Host { get; set; } = string.Empty;

    [Range(1, 65535)]
    public int Port { get; set; } = 587;
}
```

```csharp
// DON'T — Manual IConfiguration access [E2]
public class MyService(IConfiguration config)
{
    var host = config["Smtp:Host"];  // No validation, no strong typing!
}
```

### Pattern 65.5: IOptions vs IOptionsSnapshot vs IOptionsMonitor
> Source: E2 config

| Interface | Lifetime | Reloads on Change | Use Case |
|-----------|----------|-------------------|----------|
| `IOptions<T>` | Singleton | No | Static config, read once |
| `IOptionsSnapshot<T>` | Scoped | Yes (per request) | Web apps needing fresh config |
| `IOptionsMonitor<T>` | Singleton | Yes (with callback) | Background services, real-time |

### Pattern 65.6: IValidateOptions<T> for Complex Validation
> Source: E2 config

For cross-property or conditional validation, implement `IValidateOptions<T>`.

```csharp
// DO — Complex validator [E2]
public class SmtpSettingsValidator : IValidateOptions<SmtpSettings>
{
    public ValidateOptionsResult Validate(string? name, SmtpSettings options)
    {
        var failures = new List<string>();
        if (string.IsNullOrWhiteSpace(options.Host))
            failures.Add("Host is required");
        if (!string.IsNullOrEmpty(options.Username) && string.IsNullOrEmpty(options.Password))
            failures.Add("Password is required when Username is specified");
        if (options.UseSsl && options.Port == 25)
            failures.Add("Port 25 is not used with SSL. Use 465 or 587");
        return failures.Count > 0
            ? ValidateOptionsResult.Fail(failures)
            : ValidateOptionsResult.Success;
    }
}

builder.Services.AddSingleton<IValidateOptions<SmtpSettings>, SmtpSettingsValidator>();
```

---

*Options Configuration Specialist v2.0 — Generic*
*Sources: E2 config, E1 dependency-injection*
*Pattern range: 65.4–65.6*

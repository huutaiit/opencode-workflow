# Data Protection Specialist — Generic
# データ保護スペシャリスト — 汎用
# Chuyen Gia Bao Ve Du Lieu — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Data Protection API, OWASP
**Aspect**: Security — Secrets Management, PII Protection, OWASP Compliance, HTTPS
**Purpose**: Consultation agent for /plan and /execute — data protection patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — enforces security rules across all code) |
| **Namespace Pattern** | N/A (rule-set — enforces security rules across all code) |
| **Variant** | ALL |
| **Pattern Numbers** | 66.3, 66.4, 66.6 |
| **Source Paths** | `**/*.cs, **/*.json, **/*.yml` |
| **File Count** | Cross-cutting: applies to all source files |
| **Naming Convention** | N/A (enforcement rules on existing code, not new file creation) |
| **Imports From** | N/A (rule-set applied to all code, not a code module) |
| **Cannot Import** | N/A (rule-set — not importable code) |
| **Imported By** | N/A (enforcement rules — not consumed by other code) |
| **Dependencies** | `Microsoft.AspNetCore.DataProtection` |
| **When To Use** | Secrets management, OWASP hardening, PII in logs, encryption at rest |
| **Source Skeleton** | N/A (enforcement rules, no files created) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce secrets management, OWASP Top 10, PII log redaction, and HTTPS compliance |
| **Activation Trigger** | `files: **/*.cs, **/*.json; keywords: ConnectionString, Password, UseHsts, DataProtection` |

---

## ROLE

**Your ONLY responsibility**: Enforce data protection standards — secrets management (never hardcode), OWASP Top 10 input validation, PII redaction in logs, HTTPS/HSTS enforcement, and Data Protection API for encryption.

---

## Patterns

### Pattern 66.3: Secrets Management
> Source: E1 security-scan, E1-rules security

Never hardcode secrets. Use user-secrets (dev), Key Vault / env vars (prod).

```csharp
// DO — Configuration-based secrets [E1-rules]
var connectionString = builder.Configuration.GetConnectionString("OrdersDb");
builder.Configuration.AddAzureKeyVault(vaultUri, credential);
```

```bash
# DO — User secrets for development [E1-rules]
dotnet user-secrets set "Jwt:Key" "your-256-bit-secret-base64"
dotnet user-secrets set "ConnectionStrings:OrdersDb" "Server=localhost;..."
```

```csharp
// DON'T — Hardcoded secrets [E1-rules]
var conn = "Server=prod;Password=hunter2";  // Ends up in git history!

// DON'T — Secrets in appsettings.json (committed to repo) [E1-rules]
{ "Jwt": { "Key": "super-secret-key" } }
```

### Pattern 66.4: OWASP Top 10 — Input Validation & Injection Prevention
> Source: E1 security-scan, E1-rules security

Validate at system boundaries. Use parameterized queries — never string concatenation for SQL.

```csharp
// DO — Parameterized queries [E1-rules]
db.Database.SqlQuery<Order>($"SELECT * FROM Orders WHERE Id = {id}");
// EF Core interpolation is parameterized — safe

// DO — LINQ preferred [E1-rules]
var orders = await db.Orders.Where(o => o.CustomerId == customerId).ToListAsync();
```

```csharp
// DON'T — String concatenation SQL [E1-rules]
db.Database.ExecuteSqlRaw("SELECT * FROM Orders WHERE Id = '" + id + "'");

// DON'T — Insecure deserialization [E1]
JsonConvert.DeserializeObject<T>(json, new JsonSerializerSettings
    { TypeNameHandling = TypeNameHandling.All });  // Use System.Text.Json instead

// DON'T — MD5/SHA1 for security [E1]
MD5.Create().ComputeHash(data);  // Use SHA256 minimum
```

### Pattern 66.6: Data Protection & PII in Logs
> Source: E1 security-scan, E1-rules security

Log identifiers, not identity data. Use Data Protection API for encryption at rest. HTTPS everywhere.

```csharp
// DO — Log identifiers only [E1]
logger.LogInformation("Order {OrderId} placed by customer {CustomerId}",
    order.Id, order.CustomerId);

// DO — HTTPS + HSTS [E1-rules]
app.UseHsts();
app.UseHttpsRedirection();
```

```csharp
// DON'T — PII in logs [E1]
logger.LogInformation("Order placed by {Email} for {CreditCard}",
    order.CustomerEmail, order.PaymentCard);

// DON'T — Return full entity with sensitive fields [E1]
return TypedResults.Ok(user);  // Includes PasswordHash! Use DTO instead
```

---

*Data Protection Specialist v2.0 — Generic*
*Sources: E1 security-scan, E1-rules security*
*Pattern range: 66.3, 66.4, 66.6*

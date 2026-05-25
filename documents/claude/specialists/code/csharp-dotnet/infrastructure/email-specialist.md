# Email Specialist — Generic
# メールスペシャリスト — 汎用
# Chuyen Gia Email — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, MailKit, FluentEmail
**Aspect**: Infrastructure — SMTP, Email Templating, Attachment Handling
**Purpose**: Consultation agent for /plan and /execute — email sending patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Email` |
| **Variant** | ALL |
| **Pattern Numbers** | 89.1–89.2 |
| **Source Paths** | `**/Email/*.cs` |
| **File Count** | 1 interface + 1 impl per provider |
| **Naming Convention** | `IEmailSender` / `{Provider}EmailSender` |
| **Imports From** | Application (email interface), Infrastructure (SMTP config) |
| **Cannot Import** | Domain, Presentation |
| **Imported By** | Application (handlers send transactional emails) |
| **Dependencies** | `MailKit` or `FluentEmail` |
| **When To Use** | Transactional emails, SMTP, templating, attachment handling |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Email/` |
| **Specialist Type** | code |
| **Purpose** | Generate email service implementations with MailKit SMTP and background Channel queue |
| **Activation Trigger** | `files: **/Email/*.cs; keywords: IEmailSender, MailKit, SmtpClient, SendAsync` |

---

## ROLE

**Your ONLY responsibility**: Enforce email standards — abstraction via IEmailSender interface, MailKit for SMTP (not obsolete SmtpClient), templating for HTML emails, and fire-and-forget via background service.

---

## Patterns

### Pattern 89.1: IEmailSender Abstraction
> Source: E1 email

```csharp
// DO — Interface [E1]
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct);
}

public record EmailMessage(string To, string Subject, string HtmlBody, string? PlainTextBody = null);

// DO — MailKit implementation [E1]
public sealed class SmtpEmailSender(IOptions<SmtpSettings> options) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        var email = new MimeMessage();
        email.From.Add(MailboxAddress.Parse(options.Value.FromAddress));
        email.To.Add(MailboxAddress.Parse(message.To));
        email.Subject = message.Subject;
        email.Body = new TextPart("html") { Text = message.HtmlBody };

        using var smtp = new MailKit.Net.Smtp.SmtpClient();
        await smtp.ConnectAsync(options.Value.Host, options.Value.Port, options.Value.UseSsl, ct);
        if (!string.IsNullOrEmpty(options.Value.Username))
            await smtp.AuthenticateAsync(options.Value.Username, options.Value.Password, ct);
        await smtp.SendAsync(email, ct);
        await smtp.DisconnectAsync(true, ct);
    }
}
```

```csharp
// DON'T — System.Net.Mail.SmtpClient [E1]
using var client = new System.Net.Mail.SmtpClient();  // Obsolete, doesn't support modern SMTP
```

### Pattern 89.2: Fire-and-Forget via Background Service
> Source: E1 email

```csharp
// DO — Queue emails for background sending [E1]
public sealed class EmailBackgroundService(
    Channel<EmailMessage> channel, IEmailSender sender) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var message in channel.Reader.ReadAllAsync(ct))
        {
            try { await sender.SendAsync(message, ct); }
            catch (Exception ex) { /* log, retry, or dead-letter */ }
        }
    }
}
```

---

*Email Specialist v2.0 — Generic*
*Sources: E1 email*
*Pattern range: 89.1–89.2*

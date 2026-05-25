# Server-Sent Events Specialist — Generic
# SSEスペシャリスト — 汎用
# Chuyen Gia SSE — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, IAsyncEnumerable, Channel<T>
**Aspect**: Realtime — Server-Sent Events, Streaming, Reconnection
**Purpose**: Consultation agent for /plan and /execute — SSE patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api.Endpoints` |
| **Variant** | ALL |
| **Pattern Numbers** | 112.1 |
| **Source Paths** | `**/Endpoints/*.cs` |
| **File Count** | 1 per streaming endpoint |
| **Naming Convention** | `{Feature}StreamEndpoint.cs` |
| **Imports From** | Application (data source channels) |
| **Cannot Import** | Domain, Infrastructure |
| **Imported By** | None (HTTP streaming endpoint — terminal) |
| **Dependencies** | None (uses ASP.NET Core built-in) |
| **When To Use** | One-way server push, live updates, simpler than SignalR for read-only streams |
| **Source Skeleton** | `src/{Domain}.Api/Endpoints/` |
| **Specialist Type** | code |
| **Purpose** | Generate Server-Sent Events endpoints with IAsyncEnumerable streaming and reconnection |
| **Activation Trigger** | `files: **/Endpoints/*.cs; keywords: IAsyncEnumerable, text/event-stream, yield return` |

---

## ROLE

**Your ONLY responsibility**: Enforce SSE standards — text/event-stream content type, IAsyncEnumerable for streaming, proper cancellation, and when to use SSE vs SignalR.

---

## Patterns

### Pattern 112.1: SSE Endpoint
> Source: E1 sse

```csharp
// DO — SSE with IAsyncEnumerable [E1]
group.MapGet("/stream", (CancellationToken ct) =>
{
    async IAsyncEnumerable<OrderEvent> Stream([EnumeratorCancellation] CancellationToken token)
    {
        var channel = Channel.CreateUnbounded<OrderEvent>();
        // Subscribe to events...
        await foreach (var item in channel.Reader.ReadAllAsync(token))
            yield return item;
    }
    return TypedResults.Ok(Stream(ct));
});

// When to use SSE vs SignalR:
// SSE: One-way server → client, text-based, auto-reconnect, simpler
// SignalR: Bidirectional, binary support, groups/rooms, more complex
```

---

*SSE Specialist v2.0 — Generic*
*Sources: E1 sse*
*Pattern range: 112.1*

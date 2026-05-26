# C# Concurrency Specialist — Generic
# C#並行処理スペシャリスト — 汎用
# Chuyên Gia Đồng Thời C# — Dùng Chung

**Created**: 2026-03-21
**Version**: 1.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: async/await, Channels, Parallel, IAsyncEnumerable
**Aspect**: Concurrency & Async Patterns
**Purpose**: Consultation agent for /plan and /execute — choosing the right concurrency abstraction

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — enforces concurrency patterns across all code) |
| **Namespace Pattern** | N/A (rule-set — enforces concurrency patterns across all code) |
| **Variant** | ALL |
| **Pattern Numbers** | 61.1–61.7 |
| **Source Paths** | `**/*.cs` |
| **File Count** | Cross-cutting: applies to all C# files |
| **Naming Convention** | N/A (enforcement rules on existing code, not new file creation) |
| **Imports From** | N/A (rule-set applied to all code, not a code module) |
| **Cannot Import** | N/A (rule-set — not importable code) |
| **Imported By** | N/A (enforcement rules — not consumed by other code) |
| **Dependencies** | None (C# built-in async/await) |
| **When To Use** | Async patterns, Channels, Parallel, IAsyncEnumerable |
| **Source Skeleton** | N/A (enforcement rules, no files created) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce async/await best practices — Channels, Parallel, IAsyncEnumerable selection |
| **Activation Trigger** | `files: **/*.cs; keywords: async, await, Channel, Parallel, IAsyncEnumerable, ConfigureAwait` |

---

## ROLE

**Your ONLY responsibility**: Guide concurrency decisions — async/await for I/O, Parallel for CPU, Channels for producer/consumer. Avoid locks and shared mutable state.

---

## Patterns

### Pattern 61.1: Decision Tree — Choose the Right Tool
> 📌 Source: E2 csharp-concurrency

```
What are you trying to do?
├── Wait for I/O (HTTP, DB, file)?        → async/await
├── Process collection in parallel (CPU)?  → Parallel.ForEachAsync
├── Producer/consumer (work queue)?        → System.Threading.Channels
├── UI event handling (debounce)?          → Reactive Extensions (Rx)
├── Server-side stream processing?         → Akka.NET Streams
├── State machines with transitions?       → Akka.NET Actors
└── Multiple async tasks, first wins?      → Task.WhenAny
```

**Philosophy** [E2]: Start simple (async/await), escalate only when needed. Try to avoid shared mutable state — immutability and message passing eliminate entire categories of bugs.

### Pattern 61.2: Async/Await — Always CancellationToken
> 📌 Source: E2 csharp-coding-standards

```csharp
// ✅ DO — Accept CancellationToken with default [E2]
public async Task<Order> GetOrderAsync(string id, CancellationToken ct = default)
{
    return await _db.Orders.FindAsync(id, ct);
}

// ✅ DO — ConfigureAwait(false) in library code [E2]
public async Task<byte[]> ReadFileAsync(string path, CancellationToken ct)
{
    return await File.ReadAllBytesAsync(path, ct).ConfigureAwait(false);
}
```

```csharp
// ❌ DON'T — Block on async [E2]
var result = GetOrderAsync(id).Result;       // Deadlock risk
var result2 = task.GetAwaiter().GetResult();  // Same problem
```

### Pattern 61.3: ValueTask for Hot Paths
> 📌 Source: E2 csharp-coding-standards

```csharp
// ✅ DO — ValueTask when result is often synchronous [E2]
public ValueTask<Order?> GetCachedOrderAsync(string id, CancellationToken ct)
{
    if (_cache.TryGetValue(id, out var order))
        return ValueTask.FromResult<Order?>(order);  // No allocation
    return GetFromDatabaseAsync(id, ct);
}
```

### Pattern 61.4: Parallel.ForEachAsync — CPU-Bound
> 📌 Source: E2 csharp-concurrency

```csharp
// ✅ DO — Bounded parallelism for CPU work [E2]
await Parallel.ForEachAsync(
    items,
    new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
    async (item, ct) =>
    {
        await ProcessItemAsync(item, ct);
    });
```

### Pattern 61.5: Channel<T> — Producer/Consumer
> 📌 Source: E2 csharp-concurrency

```csharp
// ✅ DO — Bounded channel with backpressure [E2]
var channel = Channel.CreateBounded<WorkItem>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait
});

// Producer
await channel.Writer.WriteAsync(new WorkItem(data), ct);

// Consumer
await foreach (var item in channel.Reader.ReadAllAsync(ct))
{
    await ProcessAsync(item, ct);
}
```

### Pattern 61.6: IAsyncEnumerable — Streaming
> 📌 Source: E2 csharp-coding-standards

```csharp
// ✅ DO — Streaming with cancellation [E2]
public async IAsyncEnumerable<Order> StreamOrdersAsync(
    string customerId,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var order in _db.Orders
        .Where(o => o.CustomerId == customerId)
        .AsAsyncEnumerable()
        .WithCancellation(ct))
    {
        yield return order;
    }
}
```

### Pattern 61.7: Avoid Locks — Escalation Path
> 📌 Source: E2 csharp-concurrency

```csharp
// ✅ DO — Prefer ConcurrentDictionary over lock + Dictionary [E2]
private readonly ConcurrentDictionary<string, Order> _orders = new();

// ✅ DO — If lock unavoidable, keep critical section SHORT [E2]
private readonly Lock _lock = new();  // .NET 9+
public void UpdateCounter()
{
    lock (_lock) { _counter++; }  // Minimal work inside lock
}
```

```csharp
// ❌ DON'T — Long-running work inside lock [E2]
lock (_lock)
{
    var data = await FetchDataAsync();  // NEVER await inside lock
    ProcessData(data);
}
```

---

*C# Concurrency Specialist v1.0 — Generic*
*Sources: E2 csharp-concurrency (2 files), E2 csharp-coding-standards*
*Pattern range: 61.1–61.7*

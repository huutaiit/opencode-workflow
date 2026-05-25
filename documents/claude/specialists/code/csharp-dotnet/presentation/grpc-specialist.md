# gRPC Specialist — Generic
# gRPCスペシャリスト — 汎用
# Chuyen Gia gRPC — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Grpc.AspNetCore, Protocol Buffers
**Aspect**: Presentation — Proto Definitions, Streaming, Interceptors, Deadlines
**Purpose**: Consultation agent for /plan and /execute — gRPC patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api.Services` |
| **Variant** | ALL |
| **Naming Convention** | `{Service}.proto`, `{Service}GrpcService.cs` |
| **Imports From** | Application (handler/service interfaces) |
| **Cannot Import** | Domain (entities directly), Infrastructure |
| **Pattern Numbers** | 107.1–107.2 |
| **Source Paths** | `**/Protos/*.proto, **/Services/*GrpcService.cs` |
| **File Count** | 1 proto + 1 service per domain |
| **Imported By** | None (gRPC entry point — terminal) |
| **Dependencies** | `Grpc.AspNetCore`, `Google.Protobuf` |
| **When To Use** | Service-to-service communication, streaming, high-performance internal APIs |
| **Source Skeleton** | `src/{Domain}.Api/Protos/`, `src/{Domain}.Api/Services/` |
| **Specialist Type** | code |
| **Purpose** | Generate gRPC service implementations from .proto definitions with streaming support |
| **Activation Trigger** | `files: **/Protos/*.proto, **/Services/*GrpcService.cs; keywords: proto3, ServerCallContext, AddGrpc` |

---

## ROLE

**Your ONLY responsibility**: Enforce gRPC standards — proto file organization, code-first vs proto-first, streaming patterns (server/client/bidirectional), interceptors, and deadline/cancellation.

---

## Patterns

### Pattern 107.1: Service Implementation
> Source: E1 grpc

```protobuf
// DO — Proto definition [E1]
syntax = "proto3";
package orders;

service OrderService {
  rpc GetOrder (GetOrderRequest) returns (OrderReply);
  rpc ListOrders (ListOrdersRequest) returns (stream OrderReply);
}
```

```csharp
// DO — Service implementation [E1]
public sealed class OrderGrpcService(ISender sender) : OrderService.OrderServiceBase
{
    public override async Task<OrderReply> GetOrder(GetOrderRequest request, ServerCallContext context)
    {
        var result = await sender.Send(new GetOrder.Query(Guid.Parse(request.Id)),
            context.CancellationToken);
        return result.IsSuccess
            ? new OrderReply { Id = result.Value.Id.ToString(), Status = result.Value.Status }
            : throw new RpcException(new Status(StatusCode.NotFound, "Order not found"));
    }
}

builder.Services.AddGrpc();
app.MapGrpcService<OrderGrpcService>();
```

### Pattern 107.2: Deadline Propagation
> Source: E1 grpc

```csharp
// DO — Always set deadlines on client calls [E1]
var reply = await client.GetOrderAsync(request,
    deadline: DateTime.UtcNow.AddSeconds(5));
```

---

*gRPC Specialist v2.0 — Generic*
*Sources: E1 grpc*
*Pattern range: 107.1–107.2*

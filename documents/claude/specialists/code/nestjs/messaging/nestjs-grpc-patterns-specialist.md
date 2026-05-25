# NestJS gRPC Patterns Specialist — Messaging
# NestJS gRPCパターンスペシャリスト — メッセージング
# Chuyen Gia gRPC NestJS — Nhan Tin

**Version**: 2.0.0
**Technology**: NestJS 10+ gRPC (@grpc/grpc-js)
**Aspect**: gRPC Patterns
**Category**: messaging
**Purpose**: Knowledge provider for NestJS gRPC — server/client setup, proto definitions, streaming, metadata, interceptors, error handling, load balancing

---

## Metadata

```json
{
  "id": "nestjs-grpc-patterns-specialist",
  "technology": "NestJS 10+ gRPC",
  "aspect": "gRPC Patterns",
  "category": "messaging",
  "subcategory": "nestjs",
  "lines": 420,
  "token_cost": 2500,
  "version": "2.0.0",
  "evidence": [
    "E1: gRPC — HTTP/2, protobuf serialization, bidirectional streaming",
    "E2: @grpc/grpc-js — pure JavaScript gRPC implementation",
    "E5: p2plend gRPC — real-world gRPC patterns between NestJS services"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 210.9–210.16 |
| **Directory Pattern** | `src/infrastructure/grpc/` |
| **Dependencies** | @grpc/grpc-js, @nestjs/microservices, @grpc/proto-loader |
| **When To Use** | Typed sync service-to-service RPC with Protocol Buffers |
| **Source Skeleton** | proto/{service}.proto, src/infrastructure/grpc/{service}.grpc-client.ts, src/infrastructure/grpc/{service}.grpc-controller.ts |
| **Specialist Type** | code |
| **Purpose** | gRPC patterns — proto definitions, client/server, streaming, metadata |
| **Activation Trigger** | files: **/*.proto, **/grpc/**; keywords: grpc, proto, grpcMethod, streaming |

> **See also**: nestjs-microservices-transport (210.1-210.8) for general transport patterns

---

## Role

You are a **NestJS gRPC Patterns Specialist**. You supply patterns for gRPC integration in NestJS — proto file design, server/client configuration, unary and streaming RPCs, metadata propagation, gRPC interceptors, error codes, and load balancing.

---

## Patterns

### Pattern 210.9: Proto Definition

**Category**: gRPC Fundamentals
**Description**: Protocol Buffers schema for service contract.

```protobuf
// proto/lending.proto
syntax = "proto3";

package lending;

service LoanService {
  rpc CreateLoan (CreateLoanRequest) returns (LoanResponse);
  rpc GetLoan (GetLoanRequest) returns (LoanResponse);
  rpc ListLoans (ListLoansRequest) returns (ListLoansResponse);
  rpc StreamLoanUpdates (GetLoanRequest) returns (stream LoanResponse); // server streaming
}

message CreateLoanRequest {
  string borrower_id = 1;
  double amount = 2;
  int32 term_months = 3;
  string currency = 4;
}

message LoanResponse {
  string id = 1;
  string borrower_id = 2;
  double amount = 3;
  string status = 4;
  string created_at = 5;
}

message ListLoansRequest {
  string borrower_id = 1;
  int32 page = 2;
  int32 limit = 3;
}

message ListLoansResponse {
  repeated LoanResponse loans = 1;
  int32 total = 2;
}

message GetLoanRequest {
  string id = 1;
}
```

**Key Points**:
- Use `snake_case` for proto field names — gRPC convention
- `repeated` for arrays, `optional` for nullable
- Version your proto: `package lending.v1;` for backwards compatibility
- Share proto files between services via Git submodule or npm package

---

### Pattern 210.10: gRPC Server Setup

**Category**: gRPC Server
**Description**: NestJS microservice with gRPC transport.

```typescript
// main.ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.GRPC,
  options: {
    package: 'lending',
    protoPath: join(__dirname, 'proto/lending.proto'),
    url: '0.0.0.0:50051',
    loader: {
      keepCase: true,  // preserve snake_case from proto
      longs: String,   // int64 as string (JS precision)
      enums: String,
      defaults: true,
    },
  },
});
await app.listen();
```

---

### Pattern 210.11: gRPC Controller (Server-Side)

```typescript
@Controller()
export class LoanGrpcController {
  constructor(private loanService: LoanService) {}

  @GrpcMethod('LoanService', 'CreateLoan')
  async createLoan(data: CreateLoanRequest): Promise<LoanResponse> {
    const loan = await this.loanService.create(data);
    return LoanMapper.toGrpc(loan);
  }

  @GrpcMethod('LoanService', 'GetLoan')
  async getLoan(data: GetLoanRequest): Promise<LoanResponse> {
    const loan = await this.loanService.findById(data.id);
    if (!loan) throw new RpcException({ code: status.NOT_FOUND, message: 'Loan not found' });
    return LoanMapper.toGrpc(loan);
  }

  @GrpcStreamMethod('LoanService', 'StreamLoanUpdates')
  streamUpdates(data: Observable<GetLoanRequest>): Observable<LoanResponse> {
    // Server streaming — push updates as they happen
    return new Observable(subscriber => {
      const interval = setInterval(async () => {
        const loan = await this.loanService.findById(data.id);
        if (loan) subscriber.next(LoanMapper.toGrpc(loan));
      }, 5000);
      return () => clearInterval(interval);
    });
  }
}
```

---

### Pattern 210.12: gRPC Client

```typescript
// Module registration
@Module({
  imports: [
    ClientsModule.register([{
      name: 'LENDING_PACKAGE',
      transport: Transport.GRPC,
      options: {
        package: 'lending',
        protoPath: join(__dirname, 'proto/lending.proto'),
        url: process.env.LENDING_GRPC_URL || 'lending-service:50051',
      },
    }]),
  ],
})
export class GrpcClientModule {}

// Client usage
@Injectable()
export class LendingGrpcClient implements OnModuleInit {
  private loanService: LoanServiceClient;

  constructor(@Inject('LENDING_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.loanService = this.client.getService<LoanServiceClient>('LoanService');
  }

  async getLoan(id: string): Promise<LoanResponse> {
    return firstValueFrom(this.loanService.getLoan({ id }));
  }

  async createLoan(dto: CreateLoanRequest): Promise<LoanResponse> {
    return firstValueFrom(this.loanService.createLoan(dto));
  }
}
```

---

### Pattern 210.13: gRPC Error Codes

**Category**: Error Handling
**Description**: Map domain exceptions to gRPC status codes.

```typescript
import { status } from '@grpc/grpc-js';

const DOMAIN_TO_GRPC_STATUS: Record<number, number> = {
  400: status.INVALID_ARGUMENT,
  401: status.UNAUTHENTICATED,
  403: status.PERMISSION_DENIED,
  404: status.NOT_FOUND,
  409: status.ALREADY_EXISTS,
  422: status.FAILED_PRECONDITION,
  429: status.RESOURCE_EXHAUSTED,
  500: status.INTERNAL,
  503: status.UNAVAILABLE,
};

// Exception filter for gRPC
@Catch(DomainException)
export class GrpcExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const grpcCode = DOMAIN_TO_GRPC_STATUS[exception.statusHint] ?? status.INTERNAL;
    throw new RpcException({ code: grpcCode, message: exception.message });
  }
}
```

---

### Pattern 210.14: Metadata Propagation

**Category**: Advanced gRPC
**Description**: Pass auth tokens and correlation IDs via gRPC metadata.

```typescript
// Client — add metadata to outgoing call
async getLoanWithAuth(id: string, token: string): Promise<LoanResponse> {
  const metadata = new Metadata();
  metadata.set('authorization', `Bearer ${token}`);
  metadata.set('x-correlation-id', randomUUID());
  return firstValueFrom(this.loanService.getLoan({ id }, metadata));
}

// Server — read metadata
@GrpcMethod('LoanService', 'GetLoan')
async getLoan(data: GetLoanRequest, metadata: Metadata): Promise<LoanResponse> {
  const token = metadata.get('authorization')[0] as string;
  const correlationId = metadata.get('x-correlation-id')[0] as string;
  // ... validate token, use correlation ID for logging
}
```

---

### Pattern 210.15: gRPC Interceptor

**Category**: Advanced gRPC
**Description**: Server-side interceptor for logging, auth, metrics.

```typescript
@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'rpc') return next.handle();

    const rpcContext = context.switchToRpc();
    const handler = context.getHandler().name;
    const className = context.getClass().name;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => this.logger.log(`gRPC ${className}.${handler} — ${Date.now() - start}ms`)),
      catchError(err => {
        this.logger.error(`gRPC ${className}.${handler} FAILED — ${err.message}`);
        return throwError(() => err);
      }),
    );
  }
}
```

---

## Proto Design Best Practices

- One `.proto` file per service — `lending.proto`, `auth.proto`
- Use `google.protobuf.Timestamp` for dates — not string
- Field numbers are permanent — never reuse deleted field numbers
- Version with package: `lending.v1`, `lending.v2`
- Share protos via shared repo or npm package — single source of truth

---

## Best Practices

- Use gRPC for sync service-to-service communication — 10x faster than REST
- Proto-first design — define API contract before implementation
- `keepCase: true` in loader — match proto's snake_case in TypeScript
- `longs: String` — JavaScript numbers lose precision for int64

---

## Abnormal Case Patterns

1. **Proto not found** — Wrong protoPath. Fix: use `join(__dirname, ...)` for reliable path.
2. **Field type mismatch** — Proto says `int32`, TypeScript expects `string`. Fix: match types exactly, use `longs: String` for int64.
3. **Streaming not closing** — Server stream without completion. Fix: call `subscriber.complete()` when done.
4. **Auth metadata missing** — Client doesn't set metadata. Fix: add metadata interceptor on client side.
5. **Connection refused** — Service not listening on expected port. Fix: verify URL, check DNS resolution in K8s.
6. **Deadline exceeded** — Long-running RPC without deadline. Fix: set deadline on client: `{ deadline: Date.now() + 5000 }`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5)?
- [ ] **Q2**: Pattern IDs unique (210.9-210.15)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS gRPC Patterns Specialist — Messaging | EPS v3.2*

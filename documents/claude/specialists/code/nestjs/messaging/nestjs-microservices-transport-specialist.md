# NestJS Microservices Transport Specialist — Messaging
# NestJSマイクロサービストランスポートスペシャリスト — メッセージング
# Chuyen Gia Transport Microservices NestJS — Nhan Tin

**Version**: 2.0.0
**Technology**: NestJS 10+ Microservices Transport Layer
**Aspect**: Microservices Transport
**Category**: messaging
**Purpose**: Knowledge provider for NestJS transport layer — TCP, Redis, NATS, RabbitMQ transport, hybrid application, message patterns, serialization, health checks

---

## Metadata

```json
{
  "id": "nestjs-microservices-transport-specialist",
  "technology": "NestJS 10+ Microservices Transport",
  "aspect": "Microservices Transport",
  "category": "messaging",
  "subcategory": "nestjs",
  "lines": 450,
  "token_cost": 2700,
  "version": "2.0.0",
  "evidence": [
    "E1: NestJS microservices — transport layer abstraction, message patterns",
    "E2: Hybrid application — REST + microservice in single NestJS app",
    "E5: p2plend transport — gRPC + RabbitMQ real-world patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 210.1–210.8 |
| **Directory Pattern** | `src/infrastructure/messaging/` |
| **Dependencies** | @nestjs/microservices |
| **When To Use** | Inter-service communication — TCP, Redis, RabbitMQ, NATS transport |
| **Source Skeleton** | src/infrastructure/transport/{service}.client.ts, src/main.ts (hybrid setup) |
| **Specialist Type** | code |
| **Purpose** | NestJS microservices transport — RabbitMQ, Kafka, TCP, NATS, Redis |
| **Activation Trigger** | files: **/messaging/**; keywords: clientProxy, messagePattern, eventPattern, transport |

> **See also**: nestjs-grpc-patterns (210.9+) for gRPC-specific patterns

---

## Role

You are a **NestJS Microservices Transport Specialist**. You supply patterns for NestJS microservice transport layer — configuring transport protocols (TCP, Redis, RabbitMQ, NATS), message/event patterns, hybrid applications, serialization, and transport-level health checks.

---

## Patterns

### Pattern 210.1: Microservice Application Setup

**Category**: Transport Fundamentals
**Description**: Create a NestJS microservice with specific transport.

```typescript
// TCP transport
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.TCP,
  options: { host: '0.0.0.0', port: 3001 },
});

// RabbitMQ transport
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
    queue: 'lending-service',
    queueOptions: { durable: true },
    prefetchCount: 10,
  },
});

// Redis transport
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.REDIS,
  options: { host: 'redis', port: 6379 },
});
```

---

### Pattern 210.2: Hybrid Application (REST + Microservice)

**Category**: Transport Fundamentals
**Description**: Single NestJS app handles both HTTP and microservice transport.

```typescript
// main.ts — hybrid: REST + gRPC + RabbitMQ
const app = await NestFactory.create(AppModule);

// Add gRPC microservice
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: 'lending',
    protoPath: join(__dirname, 'proto/lending.proto'),
    url: '0.0.0.0:50051',
  },
});

// Add RabbitMQ microservice
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
    queue: 'lending-events',
    queueOptions: { durable: true },
  },
});

await app.startAllMicroservices();
await app.listen(3000);
// Now handles: REST on :3000, gRPC on :50051, RabbitMQ consumer
```

**Key Points**:
- Hybrid = single process, multiple transports — simplifies deployment
- Each transport registers independently — can have separate guards/interceptors
- `startAllMicroservices()` before `listen()` — microservices ready before HTTP

---

### Pattern 210.3: Message Patterns (Request-Response)

**Category**: Communication
**Description**: Synchronous request-response between services.

```typescript
// Server — handles message and returns response
@Controller()
export class LoanController {
  @MessagePattern({ cmd: 'get-loan' })
  async getLoan(data: { loanId: string }): Promise<Loan> {
    return this.loanService.findById(data.loanId);
  }

  @MessagePattern({ cmd: 'create-loan' })
  async createLoan(data: CreateLoanDto): Promise<Loan> {
    return this.loanService.create(data);
  }
}

// Client — sends message and awaits response
@Injectable()
export class LoanClient {
  constructor(@Inject('LENDING_SERVICE') private client: ClientProxy) {}

  async getLoan(loanId: string): Promise<Loan> {
    return firstValueFrom(
      this.client.send<Loan>({ cmd: 'get-loan' }, { loanId }),
    );
  }
}
```

---

### Pattern 210.4: Event Patterns (Fire-and-Forget)

**Category**: Communication
**Description**: Async events — no response expected.

```typescript
// Publisher
@Injectable()
export class OrderService {
  constructor(@Inject('NOTIFICATION_SERVICE') private client: ClientProxy) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.orderRepo.save(Order.create(dto));
    // Fire and forget — don't await response
    this.client.emit('order.created', {
      orderId: order.id,
      customerId: dto.customerId,
      amount: order.totalAmount,
    });
    return order;
  }
}

// Consumer
@Controller()
export class NotificationConsumer {
  @EventPattern('order.created')
  async handleOrderCreated(data: { orderId: string; customerId: string; amount: number }) {
    await this.notificationService.sendOrderConfirmation(data);
  }
}
```

---

### Pattern 210.5: Client Registration

**Category**: Configuration
**Description**: Register transport clients in module.

```typescript
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'LENDING_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'lending',
            protoPath: join(__dirname, 'proto/lending.proto'),
            url: config.get('LENDING_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'NOTIFICATION_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get('RABBITMQ_URL')],
            queue: 'notification-events',
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
})
export class MessagingModule {}
```

---

### Pattern 210.6: Error Handling Across Transport

**Category**: Reliability
**Description**: Propagate errors across service boundaries.

```typescript
// Server — throw RpcException for transport-level errors
@MessagePattern({ cmd: 'get-loan' })
async getLoan(data: { loanId: string }) {
  const loan = await this.loanService.findById(data.loanId);
  if (!loan) throw new RpcException({ code: 404, message: 'Loan not found' });
  return loan;
}

// Client — handle RpcException
async getLoan(loanId: string): Promise<Loan> {
  try {
    return await firstValueFrom(this.client.send({ cmd: 'get-loan' }, { loanId }));
  } catch (error) {
    if (error.code === 404) throw new EntityNotFoundException('Loan', loanId);
    throw new ExternalServiceException('lending-service', error.message);
  }
}
```

---

### Pattern 210.7: Transport Health Check

```typescript
@Injectable()
export class MicroserviceHealthIndicator extends HealthIndicator {
  constructor(@Inject('LENDING_SERVICE') private client: ClientProxy) { super(); }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await firstValueFrom(this.client.send({ cmd: 'health' }, {}).pipe(timeout(3000)));
      return this.getStatus(key, true);
    } catch {
      throw new HealthCheckError(`${key} unavailable`, this.getStatus(key, false));
    }
  }
}
```

---

## Transport Comparison

| Transport | Protocol | Use Case | Latency | Reliability |
|-----------|----------|----------|---------|-------------|
| TCP | Custom binary | Internal, same network | Low | Medium |
| gRPC | HTTP/2 + protobuf | Typed APIs, streaming | Low | High |
| RabbitMQ | AMQP | Event-driven, queues | Medium | High (persistent) |
| Redis | TCP | Pub/sub, simple messaging | Very low | Medium |
| NATS | Custom | High throughput messaging | Very low | Medium-High |

---

## Best Practices

- Hybrid for microservices needing both REST and internal transport
- @MessagePattern for request-response, @EventPattern for fire-and-forget
- Always handle transport errors — map RpcException to domain exceptions
- Health check all transport connections — fail readiness on transport failure

---

## Abnormal Case Patterns

1. **Client not connected** — `send()` before `connect()`. Fix: NestJS auto-connects on first send, but check health on startup.
2. **Message lost** — RabbitMQ queue not durable. Fix: `queueOptions: { durable: true }`.
3. **Timeout on send** — Downstream service slow. Fix: `timeout()` operator on client.send().
4. **Serialization error** — Complex object not serializable. Fix: use plain objects, not class instances.
5. **Prefetch too high** — Consumer overwhelmed. Fix: set `prefetchCount: 10` matching processing capacity.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5)?
- [ ] **Q2**: Pattern IDs unique (210.1-210.7)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Microservices Transport Specialist — Messaging | EPS v3.2*

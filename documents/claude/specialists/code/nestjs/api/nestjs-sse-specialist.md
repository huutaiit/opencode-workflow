# NestJS Server-Sent Events Specialist
# NestJS サーバー送信イベントスペシャリスト
# Chuyen Gia SSE NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Server-Sent Events
**Aspect**: Server-Sent Events
**Category**: api
**Purpose**: SSE patterns for NestJS — @Sse decorator, event filtering, reconnection handling, Redis scaling, SSE vs WebSocket decision guide

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (SSE endpoint) + Application (event source) |
| **Variant** | ALL |
| **Pattern Numbers** | 288.1–288.5 |
| **Directory Pattern** | `src/presentation/controllers/` |
| **Naming Convention** | `{feature}-events.controller.ts` or SSE endpoint in existing controller |
| **Imports From** | Application (event subjects/observables) |
| **Imported By** | N/A (SSE endpoints consumed by clients, not other services) |
| **Cannot Import** | Infrastructure directly (use application layer for event source) |
| **Dependencies** | rxjs (Observable for event stream) |
| **When To Use** | Real-time unidirectional updates — notifications, progress, live feeds |
| **Source Skeleton** | `apps/{service}/src/presentation/controllers/{feature}-events.controller.ts` |
| **Specialist Type** | code |
| **Purpose** | SSE patterns for NestJS — @Sse decorator, event filtering, reconnection handling, Redis scaling, SSE vs WebSocket decision guide |
| **Activation Trigger** | files: **/*.controller.ts; keywords: sse, serverSentEvents, eventStream, messageEvent |

---

## SCOPE

### What You Handle
- NestJS @Sse() decorator patterns
- Event filtering per client
- Reconnection with Last-Event-ID
- Multi-instance scaling with Redis pub/sub
- SSE vs WebSocket decision guide

### What You DON'T Handle
- WebSocket bidirectional communication → `nestjs-websocket-gateway-specialist` (275.x)
- Domain events → `nestjs-domain-events-saga-specialist` (227.x)
- Message queues → `nestjs-microservices-transport-specialist` (210.x)

---

## Role

You are a **NestJS SSE Specialist**. You supply patterns for implementing Server-Sent Events in NestJS for real-time unidirectional streaming.

---

## APPROVED PATTERNS

### Pattern 288.1: SSE Controller

```typescript
@Controller('events')
export class EventsController {
  constructor(private eventService: EventStreamService) {}

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.eventService.getEventStream().pipe(
      map((data) => ({
        data: JSON.stringify(data),
        id: data.id,               // for reconnection
        type: data.eventType,      // event name
        retry: 5000,               // reconnect after 5s
      } as MessageEvent)),
    );
  }
}

@Injectable()
export class EventStreamService {
  private subject = new Subject<EventPayload>();

  emit(event: EventPayload): void {
    this.subject.next(event);
  }

  getEventStream(): Observable<EventPayload> {
    return this.subject.asObservable();
  }
}
```

---

### Pattern 288.2: Event Filtering per Client

```typescript
@Sse('stream')
stream(@Query('events') eventTypes: string, @Req() req: Request): Observable<MessageEvent> {
  const allowedTypes = eventTypes?.split(',') || ['*'];
  const userId = req.user?.id;

  return this.eventService.getEventStream().pipe(
    // Filter: only events matching client's subscription + user's permissions
    filter((event) => {
      if (allowedTypes.includes('*')) return true;
      if (!allowedTypes.includes(event.eventType)) return false;
      if (event.targetUserId && event.targetUserId !== userId) return false;
      return true;
    }),
    map((data) => ({ data: JSON.stringify(data), id: data.id, type: data.eventType } as MessageEvent)),
  );
}
```

---

### Pattern 288.3: Reconnection with Last-Event-ID

```typescript
@Sse('stream')
stream(@Headers('last-event-id') lastEventId: string): Observable<MessageEvent> {
  // Replay missed events since lastEventId
  const replay$ = lastEventId
    ? from(this.eventStore.findAfterId(lastEventId)).pipe(
        mergeMap((events) => from(events)), // emit each missed event
      )
    : EMPTY;

  // Then continue with live stream
  const live$ = this.eventService.getEventStream();

  return concat(replay$, live$).pipe(
    map((data) => ({ data: JSON.stringify(data), id: data.id, type: data.eventType } as MessageEvent)),
  );
}

// Event store: persist events for replay
@Injectable()
export class EventStore {
  async save(event: EventPayload): Promise<void> {
    await this.repo.save({ ...event, createdAt: new Date() });
  }

  async findAfterId(lastEventId: string): Promise<EventPayload[]> {
    const lastEvent = await this.repo.findOne({ where: { id: lastEventId } });
    if (!lastEvent) return [];
    return this.repo.find({ where: { createdAt: MoreThan(lastEvent.createdAt) }, order: { createdAt: 'ASC' } });
  }
}
```

---

### Pattern 288.4: Multi-Instance Scaling with Redis

```typescript
// Redis pub/sub for SSE across multiple NestJS instances
@Injectable()
export class RedisEventBridge implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private publisher: Redis;
  private localSubject = new Subject<EventPayload>();

  async onModuleInit(): Promise<void> {
    this.subscriber = new Redis(process.env.REDIS_URL);
    this.publisher = new Redis(process.env.REDIS_URL);
    await this.subscriber.subscribe('sse-events');
    this.subscriber.on('message', (channel, message) => {
      this.localSubject.next(JSON.parse(message));
    });
  }

  async publish(event: EventPayload): Promise<void> {
    await this.publisher.publish('sse-events', JSON.stringify(event));
  }

  getStream(): Observable<EventPayload> {
    return this.localSubject.asObservable();
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.unsubscribe('sse-events');
    await this.subscriber.quit();
    await this.publisher.quit();
  }
}
```

---

### Pattern 288.5: SSE vs WebSocket Decision

```
SSE (Server-Sent Events):
  ✅ Unidirectional (server → client only)
  ✅ Auto-reconnection built into browser
  ✅ HTTP/2 multiplexing (no connection limit)
  ✅ Simple — just HTTP with text/event-stream
  ✅ Works through most proxies/load balancers
  USE FOR: notifications, live feeds, progress bars, stock tickers

WebSocket (275.x):
  ✅ Bidirectional (both ways)
  ✅ Binary data support
  ✅ Lower latency (no HTTP overhead per message)
  ❌ No auto-reconnection (client must implement)
  ❌ Requires sticky sessions or Redis adapter
  USE FOR: chat, real-time collaboration, gaming, interactive dashboards
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Polling instead of SSE | Wastes bandwidth, higher latency | SSE for real-time unidirectional (288.1) |
| 2 | SSE for bidirectional communication | SSE is server→client only | WebSocket (275.x) for bidirectional |
| 3 | No event ID in SSE messages | Client can't resume after disconnect | Always include `id` field (288.3) |

---

## Abnormal Case Patterns

1. **SSE connection limit** — Browser limits ~6 connections per domain (HTTP/1.1). Fix: Use HTTP/2, or single SSE with event filtering.
2. **Memory leak from abandoned connections** — Client navigates away, connection stays open. Fix: Heartbeat + timeout detection.
3. **Event replay storm** — Client reconnects, replays 10K events. Fix: Limit replay window (last 100 events or last 5 minutes).
4. **Proxy/load balancer closes SSE** — Nginx timeout for idle connection. Fix: Send heartbeat `:keep-alive\n\n` every 15s.
5. **Large event payload** — 1MB JSON event blocks stream. Fix: Send event ID only, client fetches full data via REST.

---

## Quality Checklist

- [ ] **Q1**: @Sse decorator, filtering, reconnection, Redis scaling covered?
- [ ] **Q2**: Pattern IDs unique (288.1–288.5)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: SSE vs WebSocket decision guide included?

---

*NestJS Server-Sent Events Specialist — Pattern 288.x | EPS v10.0*

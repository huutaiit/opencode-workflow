# NestJS WebSocket Gateway Specialist — Data
# NestJS WebSocketゲートウェイスペシャリスト — データ
# Chuyen Gia WebSocket Gateway NestJS — Du Lieu

**Version**: 1.0.0
**Technology**: NestJS 10+ WebSocket (Socket.IO)
**Aspect**: WebSocket Gateway
**Category**: data
**Purpose**: Knowledge provider for WebSocket gateway setup, event handling, room management, authentication, and connection state in NestJS clean architecture

---

## Metadata

```json
{
  "id": "nestjs-websocket-gateway-specialist",
  "technology": "NestJS 10+ WebSocket (Socket.IO)",
  "aspect": "WebSocket Gateway",
  "category": "data",
  "subcategory": "nestjs",
  "lines": 230,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E5: p2plend Socket.IO patterns — real-world WebSocket gateway patterns in BFF service"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 275.1–275.8 |
| **Directory Pattern** | `src/presentation/gateways/` |
| **Naming Convention** | `{module}.gateway.ts`, `connection-manager.ts`, `{event}.handler.ts` |
| **Imports From** | Application (use cases for event handling), Infrastructure (cache for connection state) |
| **Imported By** | None (WebSocket entry point — terminal, consumed by frontend clients) |
| **Cannot Import** | Domain directly (gateway is transport, must go through Application layer) |
| **Dependencies** | @nestjs/websockets, @nestjs/platform-socket.io, socket.io |
| **When To Use** | Real-time bidirectional communication via WebSocket |
| **Source Skeleton** | src/presentation/gateways/{feature}.gateway.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS WebSocket gateway — Socket.IO, rooms, events, authentication |
| **Activation Trigger** | files: **/*.gateway.ts; keywords: webSocketGateway, subscribeMessage, socket, emit |

---

## Role

You are a **NestJS WebSocket Gateway Specialist**. Your responsibility is to provide WebSocket best practices for NestJS microservice projects following clean architecture. You supply patterns for gateway setup, event subscription, room management, namespace isolation, WebSocket authentication guards, connection lifecycle, server-push broadcasting, and multi-instance connection state management with Redis.

**Used by**: Any code agent working with real-time WebSocket features in NestJS (chat, notifications, live updates)
**Not used by**: REST-only APIs, gRPC-only microservices without client-facing real-time features

---

## Patterns

### Pattern 275.1–275.4: Gateway Fundamentals (HIGH)

```
275.1 Gateway decorator: @WebSocketGateway({cors, namespace, transports}).
      Configure CORS, namespace, and transport options at gateway class level.
```

```typescript
@WebSocketGateway({
  cors: { origin: process.env.CLIENT_ORIGIN, credentials: true },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  afterInit(server: Server) { /* initialization logic */ }
}
```

```
211.2 Event handlers: @SubscribeMessage('event') handleEvent(client, payload).
      Each event maps to a handler method — return value is sent back to the client.
```

```typescript
@SubscribeMessage('message:send')
async handleSendMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: SendMessageDto,
): Promise<WsResponse<MessageResponseDto>> {
  const message = await this.chatService.sendMessage(client.data.userId, payload);
  this.server.to(payload.roomId).emit('message:new', message);
  return { event: 'message:sent', data: message };
}
```

```
211.3 Room management: client.join('room'), server.to('room').emit('event').
      Use rooms for targeted broadcasting — users join rooms on connection or on demand.
```

```typescript
@SubscribeMessage('room:join')
async handleJoinRoom(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: { roomId: string },
): Promise<void> {
  await client.join(payload.roomId);
  this.server.to(payload.roomId).emit('room:userJoined', {
    userId: client.data.userId,
    roomId: payload.roomId,
  });
}
```

```
211.4 Namespaces: Separate gateways per namespace for domain isolation.
      Each namespace handles distinct concerns — chat, notifications, presence.
```

```typescript
@WebSocketGateway({ namespace: '/notifications' })
export class NotificationGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('notifications:subscribe')
  async handleSubscribe(@ConnectedSocket() client: Socket): Promise<void> {
    await client.join(`user:${client.data.userId}`);
  }

  async pushNotification(userId: string, notification: NotificationDto): Promise<void> {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }
}
```

### Pattern 275.5–275.8: Security & State Management (MEDIUM-HIGH)

```
211.5 WS Guards: @UseGuards(WsJwtGuard) for WebSocket authentication.
      Validate JWT from handshake auth or query params before allowing connection.
```

```typescript
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    const payload = this.jwtService.verify(token as string);
    client.data.userId = payload.sub;
    return true;
  }
}

// Usage on gateway
@UseGuards(WsJwtGuard)
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway {}
```

```
211.6 Connection lifecycle: handleConnection/handleDisconnect for state management.
      Track online users, clean up resources on disconnect, log connection metrics.
```

```typescript
async handleConnection(client: Socket): Promise<void> {
  const userId = client.data.userId;
  await this.connectionManager.addConnection(userId, client.id);
  this.server.emit('presence:online', { userId });
}

async handleDisconnect(client: Socket): Promise<void> {
  const userId = client.data.userId;
  await this.connectionManager.removeConnection(userId, client.id);
  if (!(await this.connectionManager.isOnline(userId))) {
    this.server.emit('presence:offline', { userId });
  }
}
```

```
211.7 Broadcast: @WebSocketServer() server for server-push events.
      Inject server instance for pushing events from services outside the gateway.
```

```typescript
@Injectable()
export class LiveUpdateService {
  constructor(
    @Inject(ChatGateway) private readonly chatGateway: ChatGateway,
  ) {}

  async broadcastOrderUpdate(roomId: string, update: OrderUpdateDto): Promise<void> {
    this.chatGateway.server.to(roomId).emit('order:updated', update);
  }
}
```

```
275.8 Connection manager: Track active connections in Redis for multi-instance.
      Store connection-to-user mapping in Redis — required for horizontal scaling with Socket.IO adapter.
```

```typescript
@Injectable()
export class RedisConnectionManager {
  constructor(@Inject('REDIS') private redis: Redis) {}

  async addConnection(userId: string, socketId: string): Promise<void> {
    await this.redis.sadd(`ws:connections:${userId}`, socketId);
  }

  async removeConnection(userId: string, socketId: string): Promise<void> {
    await this.redis.srem(`ws:connections:${userId}`, socketId);
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.scard(`ws:connections:${userId}`)) > 0;
  }
}
```

---

### Pattern 275.9: Room/Channel Management

```typescript
@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('joinRoom')
  handleJoin(client: Socket, roomId: string): void {
    client.join(`room:${roomId}`);
    this.server.to(`room:${roomId}`).emit('userJoined', { userId: client.data.userId });
  }

  @SubscribeMessage('leaveRoom')
  handleLeave(client: Socket, roomId: string): void {
    client.leave(`room:${roomId}`);
    this.server.to(`room:${roomId}`).emit('userLeft', { userId: client.data.userId });
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: { roomId: string; text: string }): void {
    // Room-based broadcast — only members receive
    this.server.to(`room:${payload.roomId}`).emit('message', {
      userId: client.data.userId,
      text: payload.text,
      timestamp: new Date().toISOString(),
    });
  }

  // Cleanup on disconnect
  handleDisconnect(client: Socket): void {
    // Socket.IO auto-removes from rooms on disconnect
    this.logger.log(`Client ${client.id} disconnected`);
  }
}
```

---

### Pattern 275.10: Horizontal Scaling with Redis Adapter

```typescript
// Socket.IO Redis adapter — required for multi-instance deployment
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

// main.ts
const app = await NestFactory.create(AppModule);
const redisAdapter = new RedisIoAdapter(app);
await redisAdapter.connectToRedis();
app.useWebSocketAdapter(redisAdapter);
```

**K8s requirement**: Use sticky sessions (`sessionAffinity: ClientIP`) or Redis adapter for cross-pod messaging.

---

### Pattern 275.11: Heartbeat/Ping-Pong

```typescript
// Server-side configuration — detect dead connections
@WebSocketGateway({
  pingInterval: 25000,   // send ping every 25s
  pingTimeout: 10000,    // close connection if no pong within 10s
  connectTimeout: 5000,  // max time for initial handshake
})
export class HealthGateway {
  // Server monitors connection health automatically
  // If client doesn't respond to ping within pingTimeout → disconnect event fires

  handleDisconnect(client: Socket): void {
    const reason = client.disconnected ? 'transport close' : 'ping timeout';
    this.logger.warn(`Client ${client.id} disconnected: ${reason}`);
    // Cleanup: remove from active sessions, notify room members
  }
}
```

---

### Pattern 275.12: Reconnection Strategy

```typescript
// Server-side: state recovery on reconnect
@WebSocketGateway()
export class StatefulGateway {
  @SubscribeMessage('reconnect')
  async handleReconnect(client: Socket, payload: { lastEventId: string }): Promise<void> {
    // Replay missed events from event store since lastEventId
    const missedEvents = await this.eventStore.findAfter(payload.lastEventId);

    for (const event of missedEvents) {
      client.emit(event.type, event.data);
    }

    client.emit('reconnectComplete', { replayedCount: missedEvents.length });
  }

  // Store session token for reconnection identity
  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth.sessionToken;
    if (token) {
      const session = await this.sessionStore.restore(token);
      if (session) {
        client.data.userId = session.userId;
        // Re-join rooms from previous session
        for (const room of session.rooms) {
          client.join(room);
        }
      }
    }
  }
}
```

---

## Abnormal Case Patterns (4 patterns)

1. **CORS rejection on WebSocket handshake** — Gateway CORS config does not match client origin. Fix: Set `cors.origin` to match frontend URL, enable `credentials: true` for cookie-based auth.

2. **Memory leak from undisposed connections** — handleDisconnect not cleaning up client state. Fix: Always remove connection from Redis/Map in handleDisconnect, use try/catch to prevent cleanup failures.

3. **Messages lost across instances** — Multiple server instances without shared adapter. Fix: Use `@socket.io/redis-adapter` to broadcast events across all instances via Redis pub/sub.

4. **Guard not triggered on events** — WsGuard applied at method level but handshake already passed. Fix: Apply guard at gateway class level for connection-time auth, or validate on each message for per-event auth.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E5 source referenced)?
- [ ] **Q2**: Pattern IDs unique (275.1-275.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS WebSocket Gateway Specialist — Data | EPS v3.2*

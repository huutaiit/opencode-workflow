# React SignalR Specialist
# React SignalRスペシャリスト
# Chuyen Gia SignalR React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features (connection in shared, subscriptions in features) |
| **Directory Pattern** | `src/shared/realtime/signalr/`, `src/features/{name}/realtime/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 22.1–22.10 |
| **Source Paths** | `src/shared/realtime/signalr/**`, `**/realtime/**/*.ts` |
| **File Count** | 3–8 files (hub connection, hooks, typed interfaces, per-feature subscriptions) |
| **Naming Convention** | `{hub}Hub.ts`, `use{Hub}Event.ts`, `{hub}.types.ts` |
| **Imports From** | Shared (config for hub URL, auth for token) |
| **Cannot Import** | Features directly (shared signalr client is feature-agnostic) |
| **Imported By** | Features (useSignalREvent in components), Widgets (realtime dashboards) |
| **Dependencies** | `@microsoft/signalr:8.x` |
| **When To Use** | Real-time features with .NET backend — live notifications, chat, collaborative editing, dashboard live updates |
| **Source Skeleton** | `src/shared/realtime/signalr/hubConnection.ts`, `src/shared/hooks/useSignalR.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate SignalR client patterns — typed hub methods, auto-reconnection, auth token attachment, event subscription hooks |
| **Activation Trigger** | files: src/shared/realtime/signalr/**; keywords: signalr, hubConnection, realtimeEvent, liveUpdate |

---

## Evidence Sources

- E1: @microsoft/signalr npm package documentation
- E2: ASP.NET Core SignalR client-side JavaScript guide
- E3: SignalR reconnection best practices
- E4: TypeScript generic patterns for hub method typing

---

## Patterns

### Pattern 22.1: HubConnection Setup (CRITICAL)

```typescript
// src/shared/realtime/signalr/hubConnection.ts
import { HubConnectionBuilder, HubConnection, LogLevel, HttpTransportType } from '@microsoft/signalr';
import { getRuntimeConfig } from '@/shared/config/runtime';
import { useAuthStore } from '@/shared/store/authStore';

let connection: HubConnection | null = null;

export function getHubConnection(): HubConnection {
  if (connection) return connection;

  connection = new HubConnectionBuilder()
    .withUrl(`${getRuntimeConfig().signalrUrl}/app`, {
      accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
    .build();

  return connection;
}

export async function startConnection(): Promise<void> {
  const hub = getHubConnection();
  if (hub.state === 'Connected') return;
  try {
    await hub.start();
    console.log('[SignalR] Connected');
  } catch (err) {
    console.error('[SignalR] Connection failed:', err);
    setTimeout(startConnection, 5000);
  }
}

export async function stopConnection(): Promise<void> {
  if (connection) {
    await connection.stop();
    connection = null;
  }
}
```

### Pattern 22.2: Typed Hub Methods (CRITICAL)

```typescript
// src/shared/realtime/signalr/types.ts
export interface ServerToClientEvents {
  'notification:received': (notification: { id: string; title: string; body: string; type: string }) => void;
  'user:statusChanged': (data: { userId: string; status: 'online' | 'offline' }) => void;
  'order:updated': (data: { orderId: string; status: string; updatedAt: string }) => void;
  'chat:messageReceived': (message: { id: string; senderId: string; content: string; timestamp: string }) => void;
}

export interface ClientToServerEvents {
  'chat:sendMessage': (data: { roomId: string; content: string }) => void;
  'chat:joinRoom': (roomId: string) => void;
  'chat:leaveRoom': (roomId: string) => void;
  'presence:heartbeat': () => void;
}

// Type-safe invoke wrapper
export async function invokeHub<K extends keyof ClientToServerEvents>(
  method: K,
  ...args: Parameters<ClientToServerEvents[K]>
): Promise<void> {
  const hub = getHubConnection();
  await hub.invoke(method, ...args);
}
```

### Pattern 22.3: Connection Lifecycle Hook (HIGH)

```typescript
// src/shared/hooks/useSignalR.ts
import { useEffect, useRef, useState } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { getHubConnection, startConnection, stopConnection } from '@/shared/realtime/signalr/hubConnection';

export function useSignalR() {
  const [status, setStatus] = useState<HubConnectionState>(HubConnectionState.Disconnected);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const hub = getHubConnection();

    hub.onreconnecting(() => mounted.current && setStatus(HubConnectionState.Reconnecting));
    hub.onreconnected(() => mounted.current && setStatus(HubConnectionState.Connected));
    hub.onclose(() => mounted.current && setStatus(HubConnectionState.Disconnected));

    startConnection().then(() => mounted.current && setStatus(HubConnectionState.Connected));

    return () => {
      mounted.current = false;
      stopConnection();
    };
  }, []);

  return { status, isConnected: status === HubConnectionState.Connected };
}
```

### Pattern 22.4: Auto-Reconnection (HIGH)

```typescript
// Built-in: withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
// Custom reconnection policy
class CustomRetryPolicy {
  nextRetryDelayInMilliseconds(retryContext: { previousRetryCount: number; elapsedMilliseconds: number }): number | null {
    if (retryContext.elapsedMilliseconds > 60000) return null; // Stop after 1 min
    return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
  }
}

// Re-subscribe to groups after reconnection
hub.onreconnected(async (connectionId) => {
  console.log('[SignalR] Reconnected:', connectionId);
  // Re-join groups
  for (const room of activeRooms) {
    await hub.invoke('chat:joinRoom', room);
  }
});
```

### Pattern 22.5: Auth Token Attachment (HIGH)

```typescript
// Token factory — called on every connection/reconnection
accessTokenFactory: () => {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('No auth token for SignalR');
  return token;
},

// Token refresh handling
hub.onclose(async (error) => {
  if (error?.message?.includes('401')) {
    // Token expired during connection
    await refreshToken();
    await startConnection(); // Reconnect with new token
  }
});
```

### Pattern 22.6: Group/Channel Management (MEDIUM-HIGH)

```typescript
export function useSignalRRoom(roomId: string) {
  const hub = getHubConnection();

  useEffect(() => {
    if (hub.state !== 'Connected') return;

    hub.invoke('chat:joinRoom', roomId);

    return () => {
      hub.invoke('chat:leaveRoom', roomId).catch(console.warn);
    };
  }, [roomId, hub.state]);
}
```

### Pattern 22.7: Event Subscription Hook (HIGH)

```typescript
// src/shared/hooks/useSignalREvent.ts
import { useEffect, useCallback, useRef } from 'react';
import { getHubConnection } from '@/shared/realtime/signalr/hubConnection';
import type { ServerToClientEvents } from '@/shared/realtime/signalr/types';

export function useSignalREvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K],
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const hub = getHubConnection();
    const wrappedHandler = (...args: any[]) => (handlerRef.current as Function)(...args);

    hub.on(event, wrappedHandler);
    return () => hub.off(event, wrappedHandler);
  }, [event]);
}

// Usage
function NotificationBell() {
  const { notification } = App.useApp();

  useSignalREvent('notification:received', (data) => {
    notification.info({ message: data.title, description: data.body });
  });
}
```

### Pattern 22.8: Connection State Badge (MEDIUM)

```typescript
import { Badge, Tooltip } from 'antd';
import { useSignalR } from '@/shared/hooks/useSignalR';

function ConnectionStatus() {
  const { status, isConnected } = useSignalR();
  const statusMap = {
    Connected: { status: 'success', text: 'Connected' },
    Reconnecting: { status: 'processing', text: 'Reconnecting...' },
    Disconnected: { status: 'error', text: 'Disconnected' },
  } as const;

  const info = statusMap[status] ?? statusMap.Disconnected;
  return (
    <Tooltip title={info.text}>
      <Badge status={info.status} />
    </Tooltip>
  );
}
```

### Pattern 22.9: FSD Placement (MEDIUM)

```
src/shared/realtime/signalr/
├── hubConnection.ts     # Singleton connection
├── types.ts             # ServerToClient + ClientToServer event types
└── index.ts

src/shared/hooks/
├── useSignalR.ts        # Connection lifecycle
└── useSignalREvent.ts   # Event subscription

src/features/chat/realtime/
└── useChatHub.ts        # Feature-specific: join room, send message
src/features/notifications/realtime/
└── useNotificationHub.ts
```

### Pattern 22.10: Anti-patterns (MEDIUM)

**1. Missing cleanup** — Not removing event handlers on unmount → duplicate handlers.
**2. No reconnection** — User disconnects and app never recovers.
**3. Untyped events** — Using `hub.on('event', (data: any) => ...)`.
**4. Multiple connections** — Creating new HubConnection per component.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (22.1–22.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React SignalR Specialist | EPS v3.2 | Metadata v2.1*

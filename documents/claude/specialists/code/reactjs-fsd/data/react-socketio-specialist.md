# React Socket.IO Specialist
# React Socket.IOスペシャリスト
# Chuyen Gia Socket.IO React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features (client in shared, subscriptions in features) |
| **Directory Pattern** | `src/shared/realtime/socket/`, `src/features/{name}/realtime/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 23.1–23.10 |
| **Source Paths** | `src/shared/realtime/socket/**`, `**/realtime/**/*.ts` |
| **File Count** | 3–8 files (socket client, hooks, typed events, per-feature listeners) |
| **Naming Convention** | `socketClient.ts`, `use{Event}Socket.ts`, `socket.types.ts` |
| **Imports From** | Shared (config for socket URL, auth for token) |
| **Cannot Import** | Features directly (shared socket client is feature-agnostic) |
| **Imported By** | Features (useSocketEvent in components), Widgets (realtime dashboards) |
| **Dependencies** | `socket.io-client:4.x` |
| **When To Use** | Real-time features with Node.js backend — chat, notifications, live collaboration, event streaming |
| **Source Skeleton** | `src/shared/realtime/socket/socketClient.ts`, `src/shared/hooks/useSocket.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate Socket.IO client patterns — typed events, auto-reconnection with backoff, heartbeat zombie detection, room lifecycle |
| **Activation Trigger** | files: src/shared/realtime/socket/**; keywords: socketio, socketClient, realtimeEvent, roomSubscription |

---

## Evidence Sources

- E1: Socket.IO client v4 documentation
- E2: Socket.IO typed events API
- E3: Heartbeat zombie detection pattern (enterprise reliability)
- E4: FSD realtime layer conventions

---

## Patterns

### Pattern 23.1: Typed Socket.IO Client (CRITICAL)

```typescript
// src/shared/realtime/socket/types.ts
export interface ServerToClientEvents {
  'notification:new': (data: { id: string; title: string; body: string }) => void;
  'user:online': (data: { userId: string; timestamp: string }) => void;
  'user:offline': (data: { userId: string }) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:typing': (data: { userId: string; roomId: string }) => void;
  'pong': () => void;
}

export interface ClientToServerEvents {
  'chat:send': (data: { roomId: string; content: string }) => void;
  'chat:join': (roomId: string) => void;
  'chat:leave': (roomId: string) => void;
  'ping': () => void;
}

// src/shared/realtime/socket/socketClient.ts
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from './types';
import { getRuntimeConfig } from '@/shared/config/runtime';
import { useAuthStore } from '@/shared/store/authStore';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (socket) return socket;

  socket = io(getRuntimeConfig().socketUrl, {
    auth: { token: useAuthStore.getState().accessToken },
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) s.connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

### Pattern 23.2: Auto-Reconnection with Re-auth (HIGH)

```typescript
const s = getSocket();

s.on('connect', () => {
  console.log('[Socket] Connected:', s.id);
});

s.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server kicked us — re-auth needed
    s.auth = { token: useAuthStore.getState().accessToken };
    s.connect();
  }
  // For other reasons, socket.io auto-reconnects
});

s.on('connect_error', async (err) => {
  if (err.message === 'Authentication error') {
    // Token expired — refresh and retry
    await refreshToken();
    s.auth = { token: useAuthStore.getState().accessToken };
    s.connect();
  }
});
```

### Pattern 23.3: Typed Event Hook (HIGH)

```typescript
// src/shared/hooks/useSocketEvent.ts
import { useEffect, useRef } from 'react';
import { getSocket } from '@/shared/realtime/socket/socketClient';
import type { ServerToClientEvents } from '@/shared/realtime/socket/types';

export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K],
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const wrappedHandler = (...args: any[]) => (handlerRef.current as Function)(...args);

    socket.on(event, wrappedHandler as any);
    return () => { socket.off(event, wrappedHandler as any); };
  }, [event]);
}

// Usage
function NotificationListener() {
  const { notification } = App.useApp();

  useSocketEvent('notification:new', (data) => {
    notification.info({ message: data.title, description: data.body });
  });

  return null; // Headless component
}
```

### Pattern 23.4: Connection State Hook (MEDIUM-HIGH)

```typescript
// src/shared/hooks/useSocketStatus.ts
export function useSocketStatus() {
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<string>('');

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      setTransport(socket.io.engine.transport.name);
    };
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { connected, transport };
}
```

### Pattern 23.5: Room Join/Leave (HIGH)

```typescript
export function useSocketRoom(roomId: string) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) return;

    socket.emit('chat:join', roomId);

    return () => {
      socket.emit('chat:leave', roomId);
    };
  }, [roomId]);
}
```

### Pattern 23.6: Namespace Pattern (MEDIUM)

```typescript
// Multiple namespaces for different concerns
const chatSocket = io('/chat', { auth: { token } });
const notificationSocket = io('/notifications', { auth: { token } });

// Each namespace has independent connection lifecycle
export function getChatSocket(): TypedSocket { return chatSocket; }
export function getNotificationSocket(): TypedSocket { return notificationSocket; }
```

### Pattern 23.7: Heartbeat Zombie Detection (CRITICAL)

Detect zombie connections that appear connected but aren't receiving data.

```typescript
// src/shared/realtime/socket/heartbeat.ts
const HEARTBEAT_INTERVAL = 25000; // 25 seconds
const HEARTBEAT_TIMEOUT = 10000;  // 10 seconds to respond

export function setupHeartbeat(socket: TypedSocket) {
  let heartbeatTimer: ReturnType<typeof setInterval>;
  let timeoutTimer: ReturnType<typeof setTimeout>;

  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      socket.emit('ping');

      // If no pong within timeout, connection is zombie
      timeoutTimer = setTimeout(() => {
        console.warn('[Socket] Heartbeat timeout — zombie connection detected');
        socket.disconnect();
        // Socket.IO will auto-reconnect
      }, HEARTBEAT_TIMEOUT);
    }, HEARTBEAT_INTERVAL);
  }

  socket.on('pong', () => {
    clearTimeout(timeoutTimer);
  });

  socket.on('connect', startHeartbeat);
  socket.on('disconnect', () => {
    clearInterval(heartbeatTimer);
    clearTimeout(timeoutTimer);
  });
}
```

### Pattern 23.8: Binary Data Transfer (MEDIUM)

```typescript
// Send file via Socket.IO
function sendFile(roomId: string, file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    socket.emit('file:upload', {
      roomId,
      fileName: file.name,
      fileType: file.type,
      data: reader.result, // ArrayBuffer
    });
  };
  reader.readAsArrayBuffer(file);
}
```

### Pattern 23.9: FSD Placement (MEDIUM)

```
src/shared/realtime/socket/
├── socketClient.ts      # Singleton typed client
├── types.ts             # Event interfaces
├── heartbeat.ts         # Zombie detection
└── index.ts

src/shared/hooks/
├── useSocket.ts         # Connection lifecycle
├── useSocketEvent.ts    # Event subscription
└── useSocketRoom.ts     # Room join/leave

src/features/chat/realtime/
└── useChatSocket.ts     # Feature-specific chat events
```

### Pattern 23.10: Anti-patterns (MEDIUM)

**1. Missing cleanup** — Not calling `socket.off()` → duplicate event handlers on re-mount.
**2. Duplicate listeners** — Adding listener in useEffect without cleanup → N listeners after N re-renders.
**3. Auth token expiry** — Token embedded at connection time never refreshed.
**4. No heartbeat** — Zombie connections waste resources and cause missed messages.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (23.1–23.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Socket.IO Specialist | EPS v3.2 | Metadata v2.1*

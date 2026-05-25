# Laravel Broadcasting Specialist — Messaging
# Laravelブロードキャストスペシャリスト — メッセージング
# Chuyen Gia Broadcasting Laravel — Messaging

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Broadcasting + Reverb
**Aspect**: Broadcasting & Real-Time
**Category**: messaging
**Purpose**: Knowledge provider for Laravel broadcasting architecture — event broadcasting, channel authorization, Reverb WebSocket server, Laravel Echo integration, and real-time notification delivery

---

## Metadata

```json
{
  "id": "laravel-broadcasting-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Broadcasting + Reverb",
  "aspect": "Broadcasting & Real-Time",
  "category": "messaging",
  "subcategory": "php-laravel",
  "lines": 470,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 broadcasting — ShouldBroadcast contract, broadcastOn(), broadcastWith()",
    "E2: Channel authorization — private/presence channels, routes/channels.php",
    "E3: Laravel Reverb — first-party WebSocket server for Laravel 11",
    "E4: Laravel Echo — JavaScript client for subscribing to channels and listening to events"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 340.1–340.6 |
| **Directory Pattern** | `app/Events/` (broadcast events), `routes/channels.php` (authorization) |
| **Naming Convention** | `{Entity}{Action}Event.php` (broadcastable events) |
| **Imports From** | Domain (models, value objects), Infrastructure (queue, cache) |
| **Imported By** | Presentation (JavaScript/Echo client), Application (controllers, listeners) |
| **Cannot Import** | N/A |
| **Dependencies** | `laravel/reverb`, `laravel/framework` (broadcasting component) |
| **When To Use** | Real-time features — chat, live dashboards, presence indicators, live notifications |
| **Source Skeleton** | `app/Events/{Entity}{Action}Event.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel broadcasting lifecycle — event broadcasting, channel types, authorization, Reverb setup, Echo client integration |
| **Activation Trigger** | files: `app/Events/*Event.php`, `routes/channels.php`; keywords: broadcast, ShouldBroadcast, Echo, Reverb, channel, presence, whisper |

---

## Role

You are a **Laravel Broadcasting Specialist**. Your responsibility is to provide best practices for Laravel 11 broadcasting architecture — event broadcasting over WebSocket, private/presence channel authorization, Laravel Reverb server configuration, Laravel Echo client integration, and real-time notification patterns.

**Used by**: Any code agent working with real-time features in Laravel (chat, live updates, dashboards)
**Not used by**: Non-Laravel stacks, applications without real-time requirements

---

## Patterns

### Pattern 340.1: Broadcasting Events

**Category**: Event Broadcasting Fundamentals
**Description**: Broadcastable event class with channel routing and payload customization.

```php
<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithBroadcasting;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

final class MessageSentEvent implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithBroadcasting;

    public function __construct(
        public readonly Message $message,
    ) {
        $this->broadcastVia(attributes: 'reverb');
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel(name: "conversation.{$this->message->conversation_id}"),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'sender_id' => $this->message->user_id,
            'sender_name' => $this->message->user->name,
            'body' => $this->message->body,
            'sent_at' => $this->message->created_at->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
```

**Key Points**:
- Implement `ShouldBroadcast` (async via queue) or `ShouldBroadcastNow` (sync, blocks)
- `broadcastOn()` returns array of channels — `Channel`, `PrivateChannel`, or `PresenceChannel`
- `broadcastWith()` customizes payload — only include data the frontend needs
- `broadcastAs()` overrides default event name (defaults to FQCN)
- `broadcastVia()` selects broadcast driver — `reverb`, `pusher`, `ably`, `log`
- Dispatch via `event(new MessageSentEvent($message))` or `MessageSentEvent::dispatch($message)`

---

### Pattern 340.2: Private and Presence Channels

**Category**: Channel Types
**Description**: Channel types for access control — public, private (authenticated), presence (authenticated + member tracking).

```php
<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Project;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

final class ProjectUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(
        public readonly Project $project,
        public readonly string $field,
        public readonly mixed $newValue,
    ) {}

    /**
     * @return array<int, PresenceChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PresenceChannel(name: "project.{$this->project->id}"),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'project_id' => $this->project->id,
            'field' => $this->field,
            'value' => $this->newValue,
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

// Another event on a private channel — user-specific
namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

final class UserBalanceUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(
        public readonly User $user,
        public readonly float $newBalance,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel(name: "user.{$this->user->id}"),
        ];
    }
}
```

**Key Points**:
- `Channel` — public, anyone can listen (use for public dashboards, tickers)
- `PrivateChannel` — requires authentication; authorized in `routes/channels.php`
- `PresenceChannel` — authenticated + tracks who is online (collaborative features)
- Presence channels expose `here()`, `joining()`, `leaving()` on the Echo client
- Channel names must be unique across the application — use `{entity}.{id}` convention

---

### Pattern 340.3: Channel Authorization

**Category**: Security
**Description**: Authorize user access to private and presence channels in `routes/channels.php`.

```php
<?php

declare(strict_types=1);

// routes/channels.php

use App\Models\Conversation;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Private channel — return bool
Broadcast::channel(
    channel: 'conversation.{conversationId}',
    callback: function (User $user, int $conversationId): bool {
        return $user->conversations()
            ->where('conversations.id', $conversationId)
            ->exists();
    },
);

// Private channel — simple ownership check
Broadcast::channel(
    channel: 'user.{userId}',
    callback: fn (User $user, int $userId): bool => $user->id === $userId,
);

// Presence channel — return user data array (truthy = authorized)
Broadcast::channel(
    channel: 'project.{projectId}',
    callback: function (User $user, int $projectId): ?array {
        $project = Project::find($projectId);

        if (! $project || ! $project->members()->where('user_id', $user->id)->exists()) {
            return null; // unauthorized
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url,
        ];
    },
);
```

**Key Points**:
- Private channels: callback returns `bool` — `true` authorizes, `false` rejects
- Presence channels: callback returns `array` (user info) for authorized, `null` for rejected
- Channel wildcard parameters are passed as arguments after `$user`
- Authorization checked via POST to `/broadcasting/auth` (configured automatically)
- Use model binding in channel callbacks for cleaner authorization logic
- Keep authorization logic simple — delegate complex checks to policies

---

### Pattern 340.4: Reverb Setup (Laravel 11)

**Category**: WebSocket Server
**Description**: Configure Laravel Reverb as the first-party WebSocket server for Laravel 11.

```php
<?php

declare(strict_types=1);

// config/broadcasting.php — Reverb connection
return [
    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    'connections' => [
        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST', '0.0.0.0'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'https'),
                'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
            ],
        ],
    ],
];
```

```env
# .env — Reverb configuration
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=my-app-id
REVERB_APP_KEY=my-app-key
REVERB_APP_SECRET=my-app-secret
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
REVERB_SCHEME=https

# Frontend connection (may differ from server bind)
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="example.com"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

**Key Points**:
- Install: `composer require laravel/reverb` then `php artisan reverb:install`
- Start server: `php artisan reverb:start` (or `--host=0.0.0.0 --port=8080`)
- Reverb is a first-party WebSocket server — no third-party dependencies (Pusher, Soketi)
- Production: run behind Nginx reverse proxy with TLS termination
- Use Supervisor to keep `reverb:start` running in production
- Reverb supports horizontal scaling via Redis pub/sub for multi-server deployments

---

### Pattern 340.5: WebSocket with Laravel Echo

**Category**: Client Integration
**Description**: Frontend setup with Laravel Echo for subscribing to channels and listening to events.

```javascript
// resources/js/bootstrap.js — Echo initialization
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});
```

```javascript
// Listening to events on channels
// Private channel — authenticated user
Echo.private(`conversation.${conversationId}`)
    .listen('.message.sent', (event) => {
        console.log('New message:', event.body);
        addMessageToUI(event);
    });

// Presence channel — track online users
Echo.join(`project.${projectId}`)
    .here((users) => {
        console.log('Currently online:', users);
        setOnlineUsers(users);
    })
    .joining((user) => {
        console.log('User joined:', user.name);
        addOnlineUser(user);
    })
    .leaving((user) => {
        console.log('User left:', user.name);
        removeOnlineUser(user);
    })
    .listen('.project.updated', (event) => {
        updateProjectField(event.field, event.value);
    });

// Client-to-client whisper (no server round-trip)
Echo.private(`conversation.${conversationId}`)
    .listenForWhisper('typing', (event) => {
        showTypingIndicator(event.userName);
    });

// Sending whisper
Echo.private(`conversation.${conversationId}`)
    .whisper('typing', { userName: currentUser.name });
```

**Key Points**:
- Install: `npm install laravel-echo pusher-js` (Echo uses Pusher protocol for Reverb)
- Use `.listen('.event.name')` with dot prefix when using custom `broadcastAs()` names
- Presence channels: `here()` fires on join with current members, `joining()`/`leaving()` for changes
- `whisper()` — client-to-client events without server round-trip (typing indicators)
- `Echo.private()` for private channels, `Echo.join()` for presence, `Echo.channel()` for public
- Leave channels when component unmounts: `Echo.leave('channel-name')`

---

### Pattern 340.6: Real-Time Notifications

**Category**: Notification Broadcasting
**Description**: Combine notification system with broadcasting for real-time in-app alerts.

```php
<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

final class TaskAssignedNotification extends Notification implements ShouldQueue, ShouldBroadcast
{
    use Queueable;

    public function __construct(
        public readonly Task $task,
    ) {
        $this->onQueue(queue: 'notifications');
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'assigned_by' => $this->task->creator->name,
            'url' => route('tasks.show', $this->task),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage(data: [
            'type' => 'task.assigned',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'assigned_by' => $this->task->creator->name,
        ]);
    }
}
```

```javascript
// Frontend — listening for real-time notifications
Echo.private(`App.Models.User.${userId}`)
    .notification((notification) => {
        console.log('Notification type:', notification.type);

        if (notification.type === 'task.assigned') {
            showToast(`New task: ${notification.task_title}`);
            incrementNotificationBadge();
        }
    });
```

**Key Points**:
- Notification broadcasts on `App.Models.User.{id}` channel by default
- Override channel via `broadcastOn()` in the notification class if needed
- Combine `database` + `broadcast` channels for persistent storage and real-time delivery
- Frontend uses `.notification()` listener (not `.listen()`) for notification broadcasts
- The `type` field is automatically included — maps to notification class name or `broadcastType()`
- Queue broadcast notifications to prevent blocking — use dedicated `notifications` queue

---

## Best Practices

- **Always use ShouldBroadcast (async)** — avoid `ShouldBroadcastNow` unless latency is critical and queue adds unacceptable delay
- **Minimize broadcast payload** — send IDs and computed strings, not full model data
- **Authorize all private/presence channels** — never rely on obscurity for channel security
- **Use broadcastAs() for clean event names** — avoid exposing PHP namespaces to frontend
- **Separate broadcast queue** — dedicated workers for broadcast jobs prevent delays from heavy jobs
- **Handle reconnection** — Echo automatically reconnects, but consider missed events during disconnection
- **Use presence channels sparingly** — each presence channel maintains member list in memory; excessive use impacts Reverb memory
- **TLS in production** — always use `wss://` with TLS termination at Nginx/load balancer level
- **Test with Event::fake()** — assert events broadcast on correct channels with expected data

---

## Abnormal Case Patterns

1. **Event not received on frontend** — event broadcasts but Echo does not receive. Fix: verify `broadcastAs()` matches `.listen('.event.name')` with dot prefix; check channel authorization passes.

2. **Reverb connection drops under load** — WebSocket connections drop with many concurrent users. Fix: tune Reverb `--max-request-size`, use Redis pub/sub for horizontal scaling, increase file descriptor limits.

3. **Channel authorization fails silently** — private channel returns 403 but no error logged. Fix: check `/broadcasting/auth` route is accessible (not blocked by middleware); verify CSRF token is sent.

4. **Presence channel shows stale members** — users appear online after disconnecting. Fix: Reverb handles cleanup automatically; if using Pusher, check `member_removed` webhook; reduce ping interval.

5. **Duplicate events received** — same event received multiple times on frontend. Fix: check if event is dispatched multiple times server-side; use event ID for client-side deduplication; verify Echo is not subscribing to same channel twice.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (340.1–340.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Broadcasting Specialist — Messaging | EPS v3.2*

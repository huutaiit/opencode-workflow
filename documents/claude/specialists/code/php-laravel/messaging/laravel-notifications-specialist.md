# Laravel Notifications Specialist — Messaging
# Laravel通知スペシャリスト — メッセージング
# Chuyen Gia Notifications Laravel — Messaging

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Notification System
**Aspect**: Notifications
**Category**: messaging
**Purpose**: Knowledge provider for Laravel notification architecture — mail, database, broadcast, custom channels, on-demand notifications, and notification testing

---

## Metadata

```json
{
  "id": "laravel-notifications-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Notification System",
  "aspect": "Notifications",
  "category": "messaging",
  "subcategory": "php-laravel",
  "lines": 460,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 notification system — Notifiable trait, via() routing, channel drivers",
    "E2: Mail notifications — MailMessage builder, Markdown templates, attachments",
    "E3: Database notifications — JSON storage, read/unread tracking, polymorphic relation",
    "E4: Custom notification channels — third-party integrations (Slack, SMS, push)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 339.1–339.6 |
| **Directory Pattern** | `app/Notifications/` |
| **Naming Convention** | `{Entity}{Action}Notification.php` |
| **Imports From** | Domain (models, value objects), Infrastructure (channel drivers) |
| **Imported By** | Application (controllers, listeners, jobs), Domain (event handlers) |
| **Cannot Import** | Presentation (views, responses — except mail Markdown templates) |
| **Dependencies** | `laravel/framework` (notification component) |
| **When To Use** | User-facing alerts — email, in-app, push, SMS, Slack, custom channels |
| **Source Skeleton** | `app/Notifications/{Entity}{Action}Notification.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel notification lifecycle — channel routing, mail/database/broadcast delivery, custom channels, on-demand dispatch |
| **Activation Trigger** | files: `app/Notifications/*.php`; keywords: notify, Notification, Notifiable, toMail, toDatabase, toBroadcast |

---

## Role

You are a **Laravel Notifications Specialist**. Your responsibility is to provide best practices for Laravel 11 notification architecture — multi-channel delivery via mail, database, and broadcast channels, custom channel creation, on-demand notifications for non-user recipients, and notification testing strategies.

**Used by**: Any code agent working with user notifications in Laravel
**Not used by**: Non-Laravel stacks, systems using only raw email sending without notification abstraction

---

## Patterns

### Pattern 339.1: Notification Class

**Category**: Notification Fundamentals
**Description**: Basic notification class with multi-channel routing via `via()` method.

```php
<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

final class OrderShippedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Order $order,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $notifiable->prefers_sms
            ? ['mail', 'vonage']
            : ['mail', 'database'];
    }
}
```

**Key Points**:
- `via()` determines delivery channels per notifiable — supports conditional routing
- Implement `ShouldQueue` to send notifications asynchronously (recommended for production)
- Each channel requires a corresponding `to{Channel}()` method (e.g., `toMail()`, `toDatabase()`)
- Dispatch via `$user->notify(new OrderShippedNotification($order))`
- Bulk: `Notification::send($users, new OrderShippedNotification($order))`
- Mark notification classes `final` unless extension is explicitly designed

---

### Pattern 339.2: Mail Notifications

**Category**: Email Channel
**Description**: Rich email notifications using MailMessage builder and Markdown templates.

```php
<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class InvoiceGeneratedNotification extends Notification
{
    public function __construct(
        public readonly Invoice $invoice,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject(subject: "Invoice #{$this->invoice->number} Generated")
            ->greeting(greeting: "Hello {$notifiable->name},")
            ->line(line: "Your invoice for {$this->invoice->formatted_total} has been generated.")
            ->action(text: 'View Invoice', url: route('invoices.show', $this->invoice))
            ->line(line: 'Thank you for your business!')
            ->attach(file: $this->invoice->pdf_path, options: [
                'as' => "invoice-{$this->invoice->number}.pdf",
                'mime' => 'application/pdf',
            ]);
    }
}
```

```php
<?php

declare(strict_types=1);

// Markdown mail notification — uses Blade template
namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class SubscriptionRenewalNotification extends Notification
{
    public function __construct(
        public readonly Subscription $subscription,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->markdown(view: 'emails.subscription.renewal', data: [
                'subscription' => $this->subscription,
                'user' => $notifiable,
            ]);
    }
}
```

**Key Points**:
- `MailMessage` builder provides fluent API — `greeting()`, `line()`, `action()`, `attach()`
- `markdown()` uses Blade templates from `resources/views/vendor/mail/` for custom styling
- Customize via `php artisan vendor:publish --tag=laravel-mail`
- Attachments support raw data via `attachData($data, $name, $options)`
- Override `$locale` for multilingual email content via `$notifiable->preferredLocale()`

---

### Pattern 339.3: Database Notifications

**Category**: In-App Channel
**Description**: Store notifications in database for in-app notification centers and read/unread tracking.

```php
<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Comment;
use Illuminate\Notifications\Notification;

final class CommentPostedNotification extends Notification
{
    public function __construct(
        public readonly Comment $comment,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'comment_id' => $this->comment->id,
            'post_id' => $this->comment->post_id,
            'commenter_name' => $this->comment->user->name,
            'excerpt' => str($this->comment->body)->limit(100)->toString(),
            'url' => route('posts.show', $this->comment->post_id) . "#comment-{$this->comment->id}",
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

// Reading database notifications in a controller
namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->unreadNotifications()
            ->latest()
            ->paginate(perPage: 20);

        return response()->json(data: $notifications);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $request->user()
            ->notifications()
            ->where('id', $id)
            ->first()
            ?->markAsRead();

        return response()->json(data: ['status' => 'ok']);
    }
}
```

**Key Points**:
- Requires `notifications` table — run `php artisan notifications:table && php artisan migrate`
- `toDatabase()` returns array stored as JSON in `data` column
- Access via `$user->notifications`, `$user->unreadNotifications`, `$user->readNotifications`
- `markAsRead()` sets `read_at` timestamp; `markAsUnread()` nullifies it
- Polymorphic relation: `notifiable_type` + `notifiable_id` supports any model

---

### Pattern 339.4: Broadcast Notifications

**Category**: Real-Time Channel
**Description**: Push notifications to frontend via WebSocket using the broadcast channel.

```php
<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Message;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

final class NewMessageNotification extends Notification implements ShouldBroadcast
{
    public function __construct(
        public readonly Message $message,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return (new BroadcastMessage(data: [
            'message_id' => $this->message->id,
            'sender' => $this->message->sender->name,
            'preview' => str($this->message->body)->limit(80)->toString(),
            'sent_at' => $this->message->created_at->toIso8601String(),
        ]))->onQueue(queue: 'broadcasts');
    }

    /**
     * Broadcast on the user's private notification channel.
     * Default: App.Models.User.{id}
     */
}
```

**Key Points**:
- Implement `ShouldBroadcast` to push notifications over WebSocket
- Default broadcast channel: `{notifiable_type}.{notifiable_id}` (e.g., `App.Models.User.42`)
- `toBroadcast()` returns `BroadcastMessage` with custom data payload
- Frontend listens via Laravel Echo: `Echo.private('App.Models.User.' + userId).notification(cb)`
- Combine with `database` channel for persistent + real-time delivery

---

### Pattern 339.5: Custom Channels

**Category**: Channel Extension
**Description**: Create custom notification channels for third-party services (SMS, Slack, push, webhooks).

```php
<?php

declare(strict_types=1);

namespace App\Notifications\Channels;

use App\Notifications\Messages\TelegramMessage;
use Illuminate\Notifications\Notification;

final class TelegramChannel
{
    public function __construct(
        private readonly \App\Services\TelegramClient $client,
    ) {}

    public function send(object $notifiable, Notification $notification): void
    {
        /** @var TelegramMessage $message */
        $message = $notification->toTelegram($notifiable);

        $chatId = $notifiable->routeNotificationFor('telegram');

        if (! $chatId) {
            return;
        }

        $this->client->sendMessage(
            chatId: $chatId,
            text: $message->content,
            parseMode: $message->parseMode,
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Notifications\Messages;

final class TelegramMessage
{
    public function __construct(
        public readonly string $content,
        public readonly string $parseMode = 'HTML',
    ) {}

    public static function create(string $content): self
    {
        return new self(content: $content);
    }
}
```

```php
<?php

declare(strict_types=1);

// In the notification class — use custom channel
namespace App\Notifications;

use App\Notifications\Channels\TelegramChannel;
use App\Notifications\Messages\TelegramMessage;
use Illuminate\Notifications\Notification;

final class ServerAlertNotification extends Notification
{
    public function __construct(
        public readonly string $serverName,
        public readonly string $alertMessage,
    ) {}

    /**
     * @return array<int, string|class-string>
     */
    public function via(object $notifiable): array
    {
        return [TelegramChannel::class, 'mail'];
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        return TelegramMessage::create(
            content: "<b>Alert:</b> {$this->serverName}\n{$this->alertMessage}",
        );
    }
}
```

**Key Points**:
- Custom channel class must implement `send(object $notifiable, Notification $notification)` method
- Channel is resolved from container — supports constructor injection
- Notifiable model provides routing via `routeNotificationFor{Channel}()` method
- Reference channel by class name in `via()` — Laravel resolves it automatically
- Create corresponding `to{Channel}()` method on the notification for channel-specific formatting

---

### Pattern 339.6: On-Demand Notifications

**Category**: Ad-Hoc Delivery
**Description**: Send notifications to recipients that are not Notifiable models — external emails, phone numbers, webhooks.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Notifications\SystemAlertNotification;
use Illuminate\Support\Facades\Notification;

final class AlertService
{
    public function notifyExternalRecipients(string $message): void
    {
        // On-demand: send to email address without a User model
        Notification::route(channel: 'mail', route: 'ops-team@example.com')
            ->route(channel: 'slack', route: config('services.slack.ops_webhook'))
            ->route(channel: 'vonage', route: '+1234567890')
            ->notify(notification: new SystemAlertNotification(message: $message));
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\SlackMessage;
use Illuminate\Notifications\Notification;

final class SystemAlertNotification extends Notification
{
    public function __construct(
        public readonly string $message,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'slack'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject(subject: 'System Alert')
            ->line(line: $this->message)
            ->level(level: 'error');
    }

    public function toSlack(object $notifiable): SlackMessage
    {
        return (new SlackMessage())
            ->error()
            ->content(content: $this->message);
    }
}
```

**Key Points**:
- `Notification::route()` creates an anonymous notifiable with specified routing
- Chain multiple `route()` calls for multi-channel on-demand delivery
- Useful for external recipients (monitoring endpoints, partner APIs, guest emails)
- The anonymous notifiable is an `AnonymousNotifiable` instance — not persisted
- On-demand notifications support all channels including custom ones

---

## Best Practices

- **Queue all notifications** — implement `ShouldQueue` to prevent blocking HTTP responses
- **Keep notification data minimal** — store IDs and computed strings, not entire models
- **Use `via()` for channel routing** — conditionally select channels per notifiable preferences
- **Separate notification from trigger** — dispatch from event listeners or jobs, not directly from controllers
- **Localize content** — use `$notifiable->preferredLocale()` for multilingual notifications
- **Rate limit notifications** — use `Illuminate\Notifications\Notification::throttle()` or job middleware
- **Test with Notification::fake()** — assert notification sent, channels used, and data structure
- **Group by entity** — name as `{Entity}{Action}Notification` for discoverability
- **Markdown templates for email** — reusable, customizable, consistent branding

---

## Abnormal Case Patterns

1. **Missing `routeNotificationFor` method** — notification sent to channel but notifiable has no routing method. Fix: implement `routeNotificationFor{Channel}()` on the model or use on-demand routing.

2. **Notification queued but queue worker not running** — notifications pile up in queue table. Fix: ensure Supervisor or Horizon is running workers for the notification queue.

3. **Database notification data too large** — storing full HTML or binary data in JSON column. Fix: store only IDs and short text; load full data when displaying.

4. **Broadcast notification not received** — ShouldBroadcast implemented but frontend not listening on correct channel. Fix: verify channel name matches `{Model}.{id}` convention and Echo is configured.

5. **Duplicate notifications on retry** — queued notification fails and retries, sending twice. Fix: implement idempotency check in channel `send()` method or use `ShouldBeUnique`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (339.1–339.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Notifications Specialist — Messaging | EPS v3.2*

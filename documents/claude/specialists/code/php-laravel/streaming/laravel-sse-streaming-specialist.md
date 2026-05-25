# Laravel SSE & Streaming Specialist — Streaming
# Laravel SSE＆ストリーミングスペシャリスト — ストリーミング
# Chuyen Gia SSE va Streaming Laravel — Truyen Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Streaming
**Aspect**: Server-Sent Events & Streaming Responses
**Category**: streaming
**Purpose**: Knowledge provider for Laravel streaming — Server-Sent Events, StreamedResponse, streaming JSON, chunked transfer, and real-time dashboard updates

---

## Metadata

```json
{
  "id": "laravel-sse-streaming-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Streaming",
  "aspect": "Server-Sent Events & Streaming Responses",
  "category": "streaming",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Server-Sent Events — unidirectional server-to-client event stream",
    "E2: StreamedResponse — Symfony response for chunked HTTP output",
    "E3: Streaming JSON — large dataset transfer without memory exhaustion",
    "E4: Real-time updates — dashboard polling alternative via SSE"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 372.1–372.5 |
| **Directory Pattern** | `app/Http/Controllers/`, `routes/web.php` |
| **Naming Convention** | `{Domain}StreamController.php` |
| **Imports From** | Application (services), Domain (models) |
| **Imported By** | N/A (HTTP entry point) |
| **Cannot Import** | Infrastructure layer directly |
| **Dependencies** | `symfony/http-foundation` (included with Laravel) |
| **When To Use** | Real-time notifications, live dashboards, large data exports, AI response streaming |
| **Source Skeleton** | `app/Http/Controllers/{Domain}StreamController.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel SSE and streaming — real-time events, chunked responses, streaming JSON |
| **Activation Trigger** | keywords: SSE, Server-Sent Events, stream, StreamedResponse, real-time, chunked |

---

## Role

You are a **Laravel SSE & Streaming Specialist**. Your responsibility is to provide best practices for Laravel 11+ streaming patterns — Server-Sent Events for real-time updates, StreamedResponse for large outputs, streaming JSON for API responses, chunked transfer encoding, and real-time dashboard implementations.

**Used by**: Any code agent implementing real-time updates or large data streaming in Laravel
**Not used by**: Non-Laravel stacks, projects without streaming requirements

---

## Patterns

### Pattern 372.1: Server-Sent Events

**Category**: Real-Time
**Description**: Implement SSE for unidirectional server-to-client event streaming.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class NotificationStreamController extends Controller
{
    public function stream(Request $request): StreamedResponse
    {
        $user = $request->user();

        return response()->stream(function () use ($user): void {
            // Disable output buffering
            if (ob_get_level()) {
                ob_end_clean();
            }

            $lastEventId = 0;

            while (true) {
                // Check for new notifications since last event
                $notifications = $user->unreadNotifications()
                    ->where('id', '>', $lastEventId)
                    ->orderBy('id')
                    ->limit(10)
                    ->get();

                foreach ($notifications as $notification) {
                    echo "id: {$notification->id}\n";
                    echo "event: notification\n";
                    echo "data: " . json_encode([
                        'id' => $notification->id,
                        'type' => $notification->type,
                        'message' => $notification->data['message'] ?? '',
                        'created_at' => $notification->created_at->toISOString(),
                    ]) . "\n\n";

                    $lastEventId = $notification->id;
                }

                // Heartbeat to keep connection alive
                if ($notifications->isEmpty()) {
                    echo ": heartbeat\n\n";
                }

                // Flush output buffer
                if (ob_get_level()) {
                    ob_flush();
                }
                flush();

                // Check if client disconnected
                if (connection_aborted()) {
                    break;
                }

                sleep(2); // Poll interval
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no', // Disable Nginx buffering
        ]);
    }
}
```

**Key Points**:
- SSE uses `text/event-stream` content type — browsers auto-reconnect on disconnect
- `id:` field enables `Last-Event-ID` header for resume-from-disconnect
- `event:` field allows client-side event type filtering via `addEventListener()`
- Heartbeat comments (`: heartbeat`) prevent proxy/load balancer timeouts
- `X-Accel-Buffering: no` disables Nginx response buffering — critical for real-time

---

### Pattern 372.2: StreamedResponse

**Category**: Large Output
**Description**: Use StreamedResponse for large data output without loading everything into memory.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Transaction;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ExportController extends Controller
{
    /**
     * Stream CSV export — handles millions of rows without memory issues.
     */
    public function exportTransactions(): StreamedResponse
    {
        return response()->stream(function (): void {
            $handle = fopen('php://output', 'w');

            // CSV header
            fputcsv($handle, [
                'ID', 'Date', 'Amount', 'Currency', 'Status', 'Customer', 'Description',
            ]);

            // Stream rows in chunks
            Transaction::query()
                ->with('customer:id,name')
                ->orderBy('id')
                ->chunk(2000, function ($transactions) use ($handle): void {
                    foreach ($transactions as $txn) {
                        fputcsv($handle, [
                            $txn->id,
                            $txn->created_at->format('Y-m-d H:i:s'),
                            $txn->amount,
                            $txn->currency,
                            $txn->status,
                            $txn->customer?->name ?? 'N/A',
                            $txn->description,
                        ]);
                    }

                    flush(); // Send chunk to client immediately
                });

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="transactions-' . date('Y-m-d') . '.csv"',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Stream XML export.
     */
    public function exportXml(): StreamedResponse
    {
        return response()->stream(function (): void {
            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<transactions>' . "\n";

            Transaction::query()
                ->orderBy('id')
                ->chunk(1000, function ($transactions): void {
                    foreach ($transactions as $txn) {
                        echo "  <transaction>\n";
                        echo "    <id>{$txn->id}</id>\n";
                        echo "    <amount>{$txn->amount}</amount>\n";
                        echo "    <status>{$txn->status}</status>\n";
                        echo "  </transaction>\n";
                    }
                    flush();
                });

            echo '</transactions>' . "\n";
        }, 200, [
            'Content-Type' => 'application/xml',
            'Content-Disposition' => 'attachment; filename="transactions.xml"',
        ]);
    }
}
```

**Key Points**:
- `php://output` writes directly to the response body — no intermediate variable
- `chunk()` processes database records in batches — constant memory usage
- `flush()` sends buffered output to the client after each chunk
- Set `Content-Disposition: attachment` for download — `inline` for browser display
- CSV/XML exports of millions of rows run in ~50MB memory vs gigabytes without streaming

---

### Pattern 372.3: Streaming JSON

**Category**: API Response
**Description**: Stream large JSON arrays without building the entire response in memory.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ProductExportController extends Controller
{
    /**
     * Stream JSON array of products — avoids memory exhaustion on large datasets.
     */
    public function export(): StreamedResponse
    {
        return response()->stream(function (): void {
            echo '{"data":[';

            $first = true;

            Product::query()
                ->with(['category:id,name'])
                ->select(['id', 'name', 'sku', 'price', 'category_id', 'created_at'])
                ->orderBy('id')
                ->chunk(1000, function ($products) use (&$first): void {
                    foreach ($products as $product) {
                        if (! $first) {
                            echo ',';
                        }
                        $first = false;

                        echo json_encode([
                            'id' => $product->id,
                            'name' => $product->name,
                            'sku' => $product->sku,
                            'price' => (float) $product->price,
                            'category' => $product->category?->name,
                            'created_at' => $product->created_at->toISOString(),
                        ], JSON_UNESCAPED_UNICODE);
                    }

                    flush();
                });

            echo '],"exported_at":"' . now()->toISOString() . '"}';
        }, 200, [
            'Content-Type' => 'application/json',
            'Cache-Control' => 'no-store',
        ]);
    }
}
```

**Key Points**:
- Manually construct JSON array structure — `[` prefix, comma separators, `]` suffix
- Each item is individually `json_encode()`d — avoids building a massive array in memory
- `JSON_UNESCAPED_UNICODE` preserves non-ASCII characters (Japanese, Vietnamese)
- Clients can parse streaming JSON with libraries like `oboe.js` or wait for completion
- Use `select()` to limit columns — reduces memory per row

---

### Pattern 372.4: Chunked Transfer

**Category**: Transfer Encoding
**Description**: Use chunked transfer encoding for responses where total size is unknown upfront.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class AiResponseController extends Controller
{
    /**
     * Stream AI-generated text response (ChatGPT-style streaming).
     */
    public function generate(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:2000'],
        ]);

        return response()->stream(function () use ($validated): void {
            if (ob_get_level()) {
                ob_end_clean();
            }

            $client = app(\App\Services\AiClient::class);

            $stream = $client->streamCompletion(
                prompt: $validated['prompt'],
                maxTokens: 1000,
            );

            foreach ($stream as $chunk) {
                echo "data: " . json_encode(['text' => $chunk->text]) . "\n\n";
                flush();

                if (connection_aborted()) {
                    break;
                }
            }

            echo "data: " . json_encode(['done' => true]) . "\n\n";
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream a zip file being generated on-the-fly.
     */
    public function downloadArchive(): StreamedResponse
    {
        return response()->stream(function (): void {
            $zip = new \ZipStream\ZipStream(
                outputStream: fopen('php://output', 'w'),
                sendHttpHeaders: false,
            );

            \App\Models\Document::query()
                ->where('user_id', auth()->id())
                ->chunk(100, function ($documents) use ($zip): void {
                    foreach ($documents as $doc) {
                        $content = \Illuminate\Support\Facades\Storage::get($doc->storage_path);
                        if ($content) {
                            $zip->addFile(
                                fileName: $doc->original_name,
                                data: $content,
                            );
                        }
                    }
                });

            $zip->finish();
        }, 200, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => 'attachment; filename="documents.zip"',
        ]);
    }
}
```

**Key Points**:
- Chunked transfer does not require `Content-Length` — response size unknown at start
- AI response streaming uses SSE format for progressive text display
- Zip streaming generates archives on-the-fly — no temporary file on disk
- `connection_aborted()` checks if client disconnected — clean up resources
- Disable output buffering (`ob_end_clean()`) for immediate chunk delivery

---

### Pattern 372.5: Real-Time Dashboard Updates

**Category**: Live Data
**Description**: Implement real-time dashboard metrics using SSE with event filtering.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\DashboardMetricsService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DashboardStreamController extends Controller
{
    public function __construct(
        private readonly DashboardMetricsService $metrics,
    ) {}

    /**
     * Stream dashboard metrics — replaces polling with push.
     */
    public function stream(Request $request): StreamedResponse
    {
        $channels = $request->input('channels', 'orders,revenue,users');
        $channels = explode(',', $channels);

        return response()->stream(function () use ($channels): void {
            if (ob_get_level()) {
                ob_end_clean();
            }

            $lastValues = [];
            $iteration = 0;

            while (true) {
                $iteration++;

                foreach ($channels as $channel) {
                    $value = match ($channel) {
                        'orders' => $this->metrics->getActiveOrderCount(),
                        'revenue' => $this->metrics->getTodayRevenue(),
                        'users' => $this->metrics->getOnlineUserCount(),
                        default => null,
                    };

                    // Only send if value changed (delta compression)
                    if ($value !== null && ($lastValues[$channel] ?? null) !== $value) {
                        echo "event: {$channel}\n";
                        echo "data: " . json_encode([
                            'value' => $value,
                            'timestamp' => now()->toISOString(),
                        ]) . "\n\n";

                        $lastValues[$channel] = $value;
                    }
                }

                // Periodic heartbeat every 10 iterations
                if ($iteration % 10 === 0) {
                    echo ": heartbeat\n\n";
                }

                if (ob_get_level()) {
                    ob_flush();
                }
                flush();

                if (connection_aborted()) {
                    break;
                }

                sleep(3); // Update interval
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
```

```javascript
// Frontend SSE client
const eventSource = new EventSource('/api/dashboard/stream?channels=orders,revenue,users');

eventSource.addEventListener('orders', (event) => {
    const data = JSON.parse(event.data);
    document.getElementById('order-count').textContent = data.value;
});

eventSource.addEventListener('revenue', (event) => {
    const data = JSON.parse(event.data);
    document.getElementById('revenue').textContent = `$${data.value.toLocaleString()}`;
});

eventSource.addEventListener('users', (event) => {
    const data = JSON.parse(event.data);
    document.getElementById('online-users').textContent = data.value;
});

eventSource.onerror = () => {
    console.log('SSE connection lost, auto-reconnecting...');
};
```

**Key Points**:
- Named events (`event: orders`) enable channel-based filtering on the client
- Delta compression — only send updates when values change, reducing bandwidth
- `EventSource` auto-reconnects on disconnect — built-in browser resilience
- Channel selection via query parameter — clients subscribe to needed metrics only
- Heartbeats prevent proxy timeouts without sending unnecessary data

---

## Best Practices

- **Disable output buffering** — call `ob_end_clean()` at the start of streaming closures
- **Set `X-Accel-Buffering: no`** — required for Nginx reverse proxy to pass through SSE
- **Use `connection_aborted()` checks** — clean up resources when client disconnects
- **Send heartbeats** — prevent proxy/load balancer idle timeouts (typically 60s)
- **Use chunk() for database queries** — constant memory regardless of dataset size
- **Delta compression for SSE** — only push changed values to reduce bandwidth
- **Set appropriate Cache-Control** — `no-cache` for SSE, `no-store` for sensitive exports
- **Consider Octane for SSE** — traditional PHP-FPM ties up a worker per SSE connection

---

## Abnormal Case Patterns

1. **Nginx buffering SSE responses** — events arrive in batches instead of real-time. Fix: add `X-Accel-Buffering: no` header and configure `proxy_buffering off` in Nginx.

2. **PHP-FPM worker exhaustion** — too many SSE connections consume all FPM workers. Fix: limit concurrent SSE connections; consider Laravel Octane or Reverb for high-concurrency.

3. **Output buffering preventing flush** — `flush()` has no effect because `ob_start()` was called upstream. Fix: call `ob_end_clean()` before streaming loop.

4. **Memory leak in long-running SSE** — Eloquent models accumulate in memory during loop. Fix: call `DB::disconnect()` periodically or use raw queries in the loop.

5. **JSON streaming produces invalid JSON** — client disconnects mid-stream leaving unclosed brackets. Fix: clients should use streaming JSON parsers or validate complete responses.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (372.1–372.5), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel SSE & Streaming Specialist — Streaming | EPS v3.2*

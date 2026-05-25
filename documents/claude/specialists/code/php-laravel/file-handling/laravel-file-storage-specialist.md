# Laravel File Storage Specialist — File Handling
# Laravelファイルストレージスペシャリスト — ファイル処理
# Chuyen Gia Luu Tru Tap Tin Laravel — Xu Ly Tap Tin

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Flysystem
**Aspect**: File Storage & Upload
**Category**: file-handling
**Purpose**: Knowledge provider for Laravel file storage — Storage facade, S3 integration, file uploads, temporary URLs, streaming downloads, and image manipulation

---

## Metadata

```json
{
  "id": "laravel-file-storage-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Flysystem",
  "aspect": "File Storage & Upload",
  "category": "file-handling",
  "subcategory": "php-laravel",
  "lines": 470,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Storage facade — Flysystem v3 abstraction",
    "E2: S3 disk — league/flysystem-aws-s3-v3 integration",
    "E3: File upload handling — UploadedFile validation and storage",
    "E4: Temporary URLs and streaming — signed URL generation"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 367.1–367.6 |
| **Directory Pattern** | `config/filesystems.php`, `app/Services/`, `storage/` |
| **Naming Convention** | `{Domain}StorageService.php` |
| **Imports From** | Domain (models for file metadata) |
| **Imported By** | Application (controllers), Domain (services) |
| **Cannot Import** | Presentation layer |
| **Dependencies** | `illuminate/filesystem`, `league/flysystem-aws-s3-v3` |
| **When To Use** | File uploads, document management, S3 storage, media handling |
| **Source Skeleton** | `config/filesystems.php`, `app/Services/{Domain}StorageService.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel file storage — disks, uploads, S3, temporary URLs, streaming |
| **Activation Trigger** | files: `config/filesystems.php`; keywords: Storage, upload, file, S3, disk, download |

---

## Role

You are a **Laravel File Storage Specialist**. Your responsibility is to provide best practices for Laravel 11+ file storage — Storage facade usage, S3/cloud disk configuration, secure file uploads, temporary URL generation, streaming downloads, and image manipulation patterns.

**Used by**: Any code agent implementing file management in Laravel applications
**Not used by**: Non-Laravel stacks, projects without file storage requirements

---

## Patterns

### Pattern 367.1: Storage Facade

**Category**: Core API
**Description**: Use the Storage facade for disk-agnostic file operations.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Storage;

final class DocumentStorageService
{
    public function store(string $path, string $contents): bool
    {
        return Storage::disk('documents')->put($path, $contents);
    }

    public function retrieve(string $path): ?string
    {
        if (! Storage::disk('documents')->exists($path)) {
            return null;
        }

        return Storage::disk('documents')->get($path);
    }

    public function delete(string $path): bool
    {
        return Storage::disk('documents')->delete($path);
    }

    /**
     * @return array<string>
     */
    public function listFiles(string $directory = ''): array
    {
        return Storage::disk('documents')->files($directory);
    }

    public function copy(string $from, string $to): bool
    {
        return Storage::disk('documents')->copy($from, $to);
    }

    public function move(string $from, string $to): bool
    {
        return Storage::disk('documents')->move($from, $to);
    }

    public function size(string $path): int
    {
        return Storage::disk('documents')->size($path);
    }

    public function url(string $path): string
    {
        return Storage::disk('documents')->url($path);
    }
}
```

**Key Points**:
- `Storage::disk('name')` selects configured disk — swap between local/S3 without code changes
- `put()` overwrites, `putFile()` auto-generates a unique filename
- Always check `exists()` before `get()` to avoid `FileNotFoundException`
- `url()` generates public URLs — requires proper disk visibility configuration

---

### Pattern 367.2: S3 Disk Configuration

**Category**: Cloud Storage
**Description**: Configure Amazon S3 (or S3-compatible) storage disks.

```php
<?php

// config/filesystems.php
declare(strict_types=1);

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL') . '/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'ap-northeast-1'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => true,
        ],

        'documents' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'ap-northeast-1'),
            'bucket' => env('AWS_DOCUMENTS_BUCKET'),
            'visibility' => 'private',
            'throw' => true,
        ],
    ],
];
```

**Key Points**:
- Separate disks for different storage concerns (public assets, private documents)
- Set `visibility => 'private'` for sensitive files — prevent direct URL access
- `throw => true` for critical disks — catch errors instead of silent failures
- S3-compatible services (MinIO, DigitalOcean Spaces) work via `endpoint` configuration

---

### Pattern 367.3: File Upload Handling

**Category**: Upload Management
**Description**: Secure file upload with validation, storage, and metadata tracking.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;

final class DocumentController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                File::types(['pdf', 'doc', 'docx', 'xlsx'])
                    ->max(50 * 1024), // 50 MB
            ],
            'category' => ['required', 'string', 'in:contract,invoice,report'],
        ]);

        $file = $request->file('file');

        // Store with unique name in categorized directory
        $path = $file->storeAs(
            path: "documents/{$validated['category']}/" . now()->format('Y/m'),
            name: sprintf('%s_%s.%s', now()->format('Ymd_His'), uniqid(), $file->getClientOriginalExtension()),
            options: ['disk' => 'documents'],
        );

        // Track metadata in database
        $document = Document::create([
            'user_id' => $request->user()->id,
            'original_name' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'category' => $validated['category'],
        ]);

        return response()->json($document, status: 201);
    }

    public function uploadMultiple(Request $request): JsonResponse
    {
        $request->validate([
            'files' => ['required', 'array', 'max:10'],
            'files.*' => [
                File::types(['jpg', 'png', 'webp'])->max(10 * 1024),
            ],
        ]);

        $uploaded = collect($request->file('files'))->map(function ($file) use ($request) {
            $path = $file->store('uploads/' . now()->format('Y/m'), 's3');

            return Document::create([
                'user_id' => $request->user()->id,
                'original_name' => $file->getClientOriginalName(),
                'storage_path' => $path,
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ]);
        });

        return response()->json($uploaded, status: 201);
    }
}
```

**Key Points**:
- Use `File::types()` rule for MIME type validation — never trust client extension alone
- `storeAs()` for controlled filenames; `store()` for auto-generated unique names
- Organize files by category and date: `documents/contract/2026/04/`
- Track file metadata (original name, MIME, size) in database for search and audit
- Limit multiple uploads with array validation: `'files' => ['array', 'max:10']`

---

### Pattern 367.4: Temporary URLs

**Category**: Secure Access
**Description**: Generate time-limited signed URLs for private file access.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Facades\Storage;

final class DocumentAccessService
{
    /**
     * Generate a temporary URL for private file download.
     */
    public function generateTemporaryUrl(Document $document, int $minutes = 30): string
    {
        return Storage::disk('documents')->temporaryUrl(
            path: $document->storage_path,
            expiration: now()->addMinutes($minutes),
            options: [
                'ResponseContentDisposition' => sprintf(
                    'attachment; filename="%s"',
                    $document->original_name,
                ),
            ],
        );
    }

    /**
     * Generate a temporary URL for inline viewing (e.g., PDF in browser).
     */
    public function generateViewUrl(Document $document, int $minutes = 60): string
    {
        return Storage::disk('documents')->temporaryUrl(
            path: $document->storage_path,
            expiration: now()->addMinutes($minutes),
            options: [
                'ResponseContentType' => $document->mime_type,
                'ResponseContentDisposition' => sprintf(
                    'inline; filename="%s"',
                    $document->original_name,
                ),
            ],
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\DocumentAccessService;
use Illuminate\Http\JsonResponse;

final class DocumentDownloadController extends Controller
{
    public function __construct(
        private readonly DocumentAccessService $accessService,
    ) {}

    public function download(Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $url = $this->accessService->generateTemporaryUrl(
            document: $document,
            minutes: 15,
        );

        return response()->json(['download_url' => $url]);
    }
}
```

**Key Points**:
- `temporaryUrl()` requires S3 or compatible driver — local disk does not support it natively
- Set short expiration (5-30 minutes) for sensitive documents
- `ResponseContentDisposition` controls download (`attachment`) vs inline (`inline`) behavior
- Always authorize access before generating temporary URLs
- Temporary URLs are stateless — no server-side session required

---

### Pattern 367.5: Streaming Downloads

**Category**: Download Optimization
**Description**: Stream large files to clients without loading entire file into memory.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class StreamingDownloadController extends Controller
{
    /**
     * Stream file directly from storage disk.
     */
    public function download(Document $document): StreamedResponse
    {
        $this->authorize('download', $document);

        return Storage::disk('documents')->download(
            path: $document->storage_path,
            name: $document->original_name,
            headers: [
                'Content-Type' => $document->mime_type,
                'Cache-Control' => 'no-store',
            ],
        );
    }

    /**
     * Stream a dynamically generated CSV export.
     */
    public function exportCsv(): StreamedResponse
    {
        return response()->streamDownload(function (): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Name', 'Email', 'Created At']);

            \App\Models\User::query()
                ->select(['id', 'name', 'email', 'created_at'])
                ->orderBy('id')
                ->chunk(1000, function ($users) use ($handle): void {
                    foreach ($users as $user) {
                        fputcsv($handle, [
                            $user->id,
                            $user->name,
                            $user->email,
                            $user->created_at->toISOString(),
                        ]);
                    }
                });

            fclose($handle);
        }, 'users-export.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
```

**Key Points**:
- `Storage::download()` streams file from disk — constant memory usage regardless of file size
- `response()->streamDownload()` for dynamically generated content (CSV, XML, JSON)
- Use `chunk()` for large database exports — prevents memory exhaustion
- Set `Cache-Control: no-store` for sensitive file downloads
- Streaming avoids PHP memory limit errors on large files

---

### Pattern 367.6: Image Manipulation

**Category**: Media Processing
**Description**: Image resizing, format conversion, and thumbnail generation.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

final class ImageProcessingService
{
    private readonly ImageManager $manager;

    public function __construct()
    {
        $this->manager = new ImageManager(new Driver());
    }

    /**
     * Process uploaded image — resize and create thumbnails.
     *
     * @return array{original: string, thumbnail: string, medium: string}
     */
    public function processUpload(UploadedFile $file, string $directory): array
    {
        $filename = uniqid() . '.webp';
        $image = $this->manager->read($file->getPathname());

        // Original (max 2000px, converted to WebP)
        $original = $image->scaleDown(width: 2000)
            ->toWebp(quality: 85);
        $originalPath = "{$directory}/original/{$filename}";
        Storage::disk('s3')->put($originalPath, (string) $original);

        // Medium (800px)
        $medium = $image->scaleDown(width: 800)
            ->toWebp(quality: 80);
        $mediumPath = "{$directory}/medium/{$filename}";
        Storage::disk('s3')->put($mediumPath, (string) $medium);

        // Thumbnail (200px square crop)
        $thumbnail = $image->cover(width: 200, height: 200)
            ->toWebp(quality: 75);
        $thumbnailPath = "{$directory}/thumb/{$filename}";
        Storage::disk('s3')->put($thumbnailPath, (string) $thumbnail);

        return [
            'original' => $originalPath,
            'medium' => $mediumPath,
            'thumbnail' => $thumbnailPath,
        ];
    }

    /**
     * Delete all image variants.
     *
     * @param array{original: string, thumbnail: string, medium: string} $paths
     */
    public function deleteVariants(array $paths): void
    {
        Storage::disk('s3')->delete(array_values($paths));
    }
}
```

**Key Points**:
- Use `intervention/image` v3 with GD or Imagick driver for image manipulation
- Convert to WebP for smaller file sizes — 25-35% savings over JPEG
- Generate multiple sizes (original, medium, thumbnail) on upload
- `scaleDown()` respects aspect ratio; `cover()` crops to exact dimensions
- Process images in queued jobs for heavy traffic — avoid blocking HTTP requests

---

## Best Practices

- **Use disk abstraction** — never hardcode file paths; switch storage backends via config
- **Validate uploads strictly** — check MIME types, file size, and extension; never trust client data
- **Private by default** — use `visibility => 'private'` and temporary URLs for access control
- **Track metadata in database** — store original name, path, MIME type, size for auditing
- **Stream large files** — use `Storage::download()` or `streamDownload()` to avoid memory issues
- **Organize by date** — `uploads/2026/04/` prevents directory bloat with thousands of files
- **Process images asynchronously** — queue thumbnail generation for high-traffic uploads
- **Clean up orphaned files** — schedule a task to delete files with no database reference

---

## Abnormal Case Patterns

1. **File upload exceeds PHP limits** — `upload_max_filesize` or `post_max_size` in php.ini too low. Fix: set PHP limits higher than Laravel validation limits.

2. **Temporary URL on local disk** — `temporaryUrl()` throws `RuntimeException` on local driver. Fix: use `url()` for local disk or implement a signed route for local temporary access.

3. **S3 CORS errors on direct upload** — browser uploads blocked by missing CORS policy. Fix: configure S3 bucket CORS to allow PUT from your domain.

4. **Storage link not created** — `storage/app/public` not symlinked to `public/storage`. Fix: run `php artisan storage:link` in deployment.

5. **Memory exhaustion on image processing** — large images (50MP+) exceed PHP memory limit. Fix: increase `memory_limit` for image processing jobs or use streaming resize with Imagick.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (367.1–367.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel File Storage Specialist — File Handling | EPS v3.2*

# NestJS File Handling Specialist
# NestJS ファイルハンドリングスペシャリスト
# Chuyen Gia Xu Ly File NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ File Handling
**Aspect**: File Handling
**Category**: file-handling
**Purpose**: File handling for NestJS — upload with validation, large file streaming, storage abstraction (S3/local), image processing, signed URLs, metadata management

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (upload endpoint) + Application (use case) + Infrastructure (storage) |
| **Variant** | ALL |
| **Pattern Numbers** | 286.1–286.6 |
| **Directory Pattern** | `src/infrastructure/file-storage/`, `src/presentation/controllers/` |
| **Naming Convention** | `file-storage.port.ts`, `s3-storage.adapter.ts`, `file.controller.ts` |
| **Imports From** | Domain (file metadata entity), Application (upload use case) |
| **Imported By** | Presentation (controllers), Application (use cases trigger storage) |
| **Cannot Import** | Domain should not know file storage implementation |
| **Dependencies** | @nestjs/platform-express (multer), @aws-sdk/client-s3, sharp |
| **When To Use** | Any application with file upload — documents, images, media, exports |
| **Source Skeleton** | `apps/{service}/src/infrastructure/file-storage/` |
| **Specialist Type** | code |
| **Purpose** | File handling for NestJS — upload with validation, large file streaming, storage abstraction (S3/local), image processing, signed URLs, metadata management |
| **Activation Trigger** | files: **/file-storage/**, **/upload/**; keywords: multer, fileUpload, s3, storage, signedUrl, sharp |

---

## SCOPE

### What You Handle
- File upload with validation (size, MIME type, virus scan hook)
- Large file streaming (multipart, chunked)
- Storage abstraction via port/adapter (local FS, S3, Azure Blob, GCS)
- Image/media processing (resize, thumbnail, format conversion)
- Pre-signed URL generation for secure download
- File metadata management (DB record per file)

### What You DON'T Handle
- Report generation (Excel/PDF) → `nestjs-analytics-specialist` (296.x)
- Static file serving → NestJS ServeStaticModule (built-in)
- CDN configuration → DevOps/infrastructure concern

---

## Role

You are a **NestJS File Handling Specialist**. You supply patterns for upload, storage, processing, and serving files in NestJS applications.

---

## APPROVED PATTERNS

### Pattern 286.1: File Upload with Validation

```typescript
@Controller('files')
export class FileController {
  constructor(private uploadUseCase: UploadFileUseCase) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowed.includes(file.mimetype)) {
        return cb(new BadRequestException(`File type ${file.mimetype} not allowed`), false);
      }
      cb(null, true);
    },
  }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request): Promise<FileResponseDto> {
    return this.uploadUseCase.execute({ file, userId: req.user.id });
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 5)) // max 5 files
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]): Promise<FileResponseDto[]> {
    return Promise.all(files.map(f => this.uploadUseCase.execute({ file: f })));
  }
}
```

---

### Pattern 286.2: Large File Streaming

```typescript
// Chunked upload for files > 100MB — use streaming to avoid memory overload
@Post('upload/stream')
async uploadStream(@Req() req: Request): Promise<{ fileId: string }> {
  const busboy = Busboy({ headers: req.headers, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

  return new Promise((resolve, reject) => {
    busboy.on('file', (fieldname, stream, info) => {
      const key = `uploads/${randomUUID()}-${info.filename}`;
      // Pipe directly to S3 — never loads entire file into memory
      this.storageAdapter.uploadStream(key, stream, info.mimeType)
        .then(fileId => resolve({ fileId }))
        .catch(reject);
    });
    busboy.on('error', reject);
    req.pipe(busboy);
  });
}

// S3 multipart upload for very large files
async uploadStream(key: string, stream: Readable, contentType: string): Promise<string> {
  const upload = new Upload({
    client: this.s3Client,
    params: { Bucket: this.bucket, Key: key, Body: stream, ContentType: contentType },
    partSize: 10 * 1024 * 1024, // 10MB parts
    queueSize: 4, // 4 concurrent part uploads
  });
  await upload.done();
  return key;
}
```

---

### Pattern 286.3: Storage Abstraction (Port/Adapter)

```typescript
// Domain port — storage-agnostic interface
export interface FileStoragePort {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  uploadStream(key: string, stream: Readable, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');

// Infrastructure: S3 adapter
@Injectable()
export class S3StorageAdapter implements FileStoragePort {
  constructor(private s3: S3Client, @Inject('S3_BUCKET') private bucket: string) {}

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType }));
    return key;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn });
  }
  // ... other methods
}

// Infrastructure: Local FS adapter (development)
@Injectable()
export class LocalStorageAdapter implements FileStoragePort {
  async upload(key: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(process.env.UPLOAD_DIR, key);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, buffer);
    return key;
  }
  // ... other methods
}

// Module: switch adapter via config
{ provide: FILE_STORAGE, useClass: process.env.STORAGE_TYPE === 's3' ? S3StorageAdapter : LocalStorageAdapter }
```

---

### Pattern 286.4: Image Processing

```typescript
import sharp from 'sharp';

@Injectable()
export class ImageProcessingService {
  async resize(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    return sharp(buffer).resize(width, height, { fit: 'inside', withoutEnlargement: true }).toBuffer();
  }

  async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  }

  async convertFormat(buffer: Buffer, format: 'jpeg' | 'png' | 'webp'): Promise<Buffer> {
    return sharp(buffer).toFormat(format).toBuffer();
  }

  // Process via queue for heavy operations
  async processAsync(fileId: string, operations: ImageOperation[]): Promise<void> {
    await this.queue.add('image-process', { fileId, operations });
  }
}
```

---

### Pattern 286.5: Signed URL Generation

```typescript
// Pre-signed upload URL — client uploads directly to S3 (bypasses API server)
@Get('upload-url')
async getUploadUrl(@Query('filename') filename: string): Promise<{ url: string; key: string }> {
  const key = `uploads/${randomUUID()}-${filename}`;
  const url = await getSignedUrl(this.s3, new PutObjectCommand({
    Bucket: this.bucket, Key: key,
    ContentType: 'application/octet-stream',
  }), { expiresIn: 600 }); // 10 min

  return { url, key };
}

// Pre-signed download URL — time-limited secure access
@Get(':id/download')
async getDownloadUrl(@Param('id') id: string): Promise<{ url: string }> {
  const file = await this.fileRepo.findOneOrFail({ where: { id } });
  const url = await this.storage.getSignedUrl(file.storageKey, 3600); // 1 hour
  return { url };
}
```

---

### Pattern 286.6: File Metadata Management

```typescript
@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() originalName: string;
  @Column() storageKey: string;       // S3 key or local path
  @Column() mimeType: string;
  @Column('bigint') size: number;      // bytes
  @Column() uploadedBy: string;        // userId
  @Column({ nullable: true }) thumbnailKey: string;
  @Column({ default: false }) isDeleted: boolean; // soft delete
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

// Soft delete with storage cleanup job
@Cron('0 3 * * *') // daily at 3 AM
async cleanupDeletedFiles(): Promise<void> {
  const deleted = await this.fileRepo.find({ where: { isDeleted: true, updatedAt: LessThan(subDays(new Date(), 30)) } });
  for (const file of deleted) {
    await this.storage.delete(file.storageKey);
    if (file.thumbnailKey) await this.storage.delete(file.thumbnailKey);
    await this.fileRepo.remove(file);
  }
}
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Store files in database BLOB | DB bloat, backup size, slow queries | Object storage (S3) + metadata in DB |
| 2 | No file type validation | Malicious file upload (web shell) | MIME type whitelist + magic bytes check |
| 3 | Serve files directly from API server | API server becomes bottleneck | Signed URLs → CDN/S3 direct download |

---

## Abnormal Case Patterns

1. **Upload timeout for large files** — Client connection drops at 90%. Fix: Chunked/multipart upload with resume capability.
2. **Storage quota exceeded** — S3 bucket fills up. Fix: Lifecycle rules for auto-archival/deletion.
3. **Image processing OOM** — Sharp processing 50MB image. Fix: Set sharp concurrency limit, process via queue.
4. **Signed URL shared publicly** — User shares download link. Fix: Short TTL (15 min), per-user signed URLs.
5. **Orphaned files** — Upload succeeds but DB insert fails. Fix: Upload to temp path, move to final path after DB commit.
6. **MIME type spoofing** — Renamed .exe to .jpg. Fix: Check magic bytes (file signature), not just extension/content-type header.
7. **Concurrent upload same filename** — Two users upload `report.pdf`. Fix: Always use UUID in storage key.

---

## Quality Checklist

- [ ] **Q1**: Upload, streaming, storage abstraction, processing, signed URLs covered?
- [ ] **Q2**: Pattern IDs unique (286.1–286.6)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Port/adapter pattern for storage abstraction?

---

*NestJS File Handling Specialist — Pattern 286.x | EPS v10.0*

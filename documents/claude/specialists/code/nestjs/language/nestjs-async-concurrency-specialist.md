# NestJS Async/Concurrency Patterns Specialist
# NestJS 非同期/並行処理パターンスペシャリスト
# Chuyen Gia Xu Ly Bat Dong Bo NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Async/Concurrency
**Aspect**: Async Patterns
**Category**: language
**Purpose**: TypeScript async patterns for NestJS — Promise strategies, RxJS, streams, worker threads, AsyncLocalStorage, event loop protection

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (async patterns apply across layers) |
| **Variant** | ALL |
| **Pattern Numbers** | 278.1–278.7 |
| **Directory Pattern** | N/A (cross-cutting TypeScript patterns) |
| **Naming Convention** | N/A (patterns applied within existing file types) |
| **Imports From** | N/A (language-level patterns) |
| **Imported By** | ALL (every layer uses async operations) |
| **Cannot Import** | N/A (language-level — no layer restriction) |
| **Dependencies** | rxjs (NestJS core) |
| **When To Use** | Any async operation — API calls, DB queries, file I/O, message processing |
| **Source Skeleton** | N/A (patterns applied within existing files) |
| **Specialist Type** | code |
| **Purpose** | TypeScript async patterns for NestJS — Promise strategies, RxJS, streams, worker threads, AsyncLocalStorage, event loop protection |
| **Activation Trigger** | files: **/*.ts; keywords: async, await, promise, observable, stream, worker, asyncLocalStorage |

---

## SCOPE

### What You Handle
- Promise.all vs Promise.allSettled decision patterns
- Error propagation in async chains
- RxJS in NestJS context (when it adds value)
- Event loop blocking prevention
- Node.js streams for large data processing
- Async iterator patterns
- AsyncLocalStorage for request-scoped context

### What You DON'T Handle
- HTTP client retry/timeout → `nestjs-http-client-specialist` (266.x)
- Message queue async processing → `nestjs-microservices-transport-specialist` (210.x)
- Database query optimization → `nestjs-query-optimization-specialist` (280.x)

---

## Role

You are a **NestJS Async/Concurrency Specialist**. You supply patterns for handling asynchronous operations correctly in NestJS — from basic Promise strategies to advanced stream processing and worker thread offloading.

---

## APPROVED PATTERNS

### Pattern 278.1: Promise.all vs Promise.allSettled

```typescript
// Promise.all — fail-fast: if ANY fails, all fail
// USE WHEN: all results are required (e.g., loading user + permissions + settings)
const [user, permissions, settings] = await Promise.all([
  this.userRepo.findById(userId),
  this.permRepo.findByUser(userId),
  this.settingsRepo.findByUser(userId),
]);
// If permissions query fails → user and settings also rejected

// Promise.allSettled — collect all results regardless of failures
// USE WHEN: partial results are acceptable (e.g., enrichment from multiple sources)
const results = await Promise.allSettled([
  this.enrichFromCRM(userId),
  this.enrichFromAnalytics(userId),
  this.enrichFromExternal(userId),
]);

const enrichments = results
  .filter((r): r is PromiseFulfilledResult<Enrichment> => r.status === 'fulfilled')
  .map(r => r.value);
const failures = results.filter(r => r.status === 'rejected');
if (failures.length > 0) this.logger.warn(`${failures.length} enrichment sources failed`);
```

---

### Pattern 278.2: Error Propagation in Async Chains

```typescript
// ❌ BAD: swallowing errors silently
async process(data: any): Promise<void> {
  try { await this.save(data); } catch (e) { /* silent */ }
}

// ✅ GOOD: let errors propagate, handle at boundary (controller/filter)
async process(data: any): Promise<Result> {
  const validated = this.validate(data); // throws ValidationException
  const saved = await this.repo.save(validated); // throws DBException
  return saved; // caller (controller) handles exceptions via global filter
}

// Global unhandled rejection handler (bootstrap)
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  // In production: log + alert, don't crash
});
```

---

### Pattern 278.3: RxJS in NestJS — When It Adds Value

```typescript
// ✅ RxJS adds value: interceptor pipelines, SSE streams, WebSocket events
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => this.logger.log(`${Date.now() - start}ms`)),
      catchError((err) => { this.logger.error(err); throw err; }),
    );
  }
}

// ❌ RxJS overhead: simple async operations — use Promise instead
// BAD: converting Promise to Observable and back
const result = await firstValueFrom(from(this.repo.findById(id)));
// GOOD: just use await
const result = await this.repo.findById(id);
```

---

### Pattern 278.4: Event Loop Blocking Prevention

```typescript
// Detect: operations that block event loop > 100ms
// CPU-intensive: bcrypt hashing, PDF generation, image processing, JSON parsing large files

// Solution 1: Worker threads for CPU-bound operations
import { Worker } from 'worker_threads';

@Injectable()
export class CpuIntensiveService {
  async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./workers/bcrypt.worker.js', {
        workerData: { password, rounds: 12 },
      });
      worker.on('message', resolve);
      worker.on('error', reject);
    });
  }
}

// Solution 2: Bull queue offloading
@Processor('heavy-tasks')
export class HeavyTaskProcessor {
  @Process('generate-pdf')
  async handlePdf(job: Job<{ templateId: string; data: any }>): Promise<void> {
    // Runs in separate process — doesn't block API event loop
    await this.pdfService.generate(job.data);
  }
}
```

---

### Pattern 278.5: Node.js Stream Processing

```typescript
// Process large files without loading entirely into memory
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';
const pipelineAsync = promisify(pipeline);

@Injectable()
export class LargeFileProcessor {
  async processCSV(inputPath: string, outputPath: string): Promise<number> {
    let processed = 0;

    const transform = new Transform({
      objectMode: true,
      transform(row, encoding, callback) {
        processed++;
        // Transform each row — backpressure handled automatically
        const result = processRow(row);
        callback(null, result);
      },
    });

    await pipelineAsync(
      fs.createReadStream(inputPath),
      csvParser(),
      transform,
      fs.createWriteStream(outputPath),
    );

    return processed;
  }
}

// TypeORM streaming query results
const stream = await this.repo.createQueryBuilder('order')
  .where('order.status = :status', { status: 'PENDING' })
  .stream();

for await (const row of stream) {
  await this.processOrder(row); // backpressure: next row waits until this completes
}
```

---

### Pattern 278.6: Async Iterator Patterns

```typescript
// Paginated API consumption with async generator
async function* fetchAllPages<T>(client: HttpService, baseUrl: string): AsyncGenerator<T[]> {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data } = await firstValueFrom(
      client.get<{ items: T[]; hasMore: boolean }>(`${baseUrl}?page=${page}&limit=100`),
    );
    yield data.items;
    hasMore = data.hasMore;
    page++;
  }
}

// Usage: process all pages without loading all into memory
for await (const batch of fetchAllPages<User>(this.http, '/api/users')) {
  await this.processBatch(batch);
}
```

---

### Pattern 278.7: AsyncLocalStorage for Request Context

```typescript
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  correlationId: string;
  userId?: string;
  tenantId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

// Middleware: set context at request entry
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const ctx: RequestContext = {
      correlationId: (req.headers['x-correlation-id'] as string) || randomUUID(),
      userId: req.user?.id,
      tenantId: req.headers['x-tenant-id'] as string,
    };
    requestContext.run(ctx, () => next());
  }
}

// Access anywhere without DI — works across async boundaries
function getCurrentUser(): string | undefined {
  return requestContext.getStore()?.userId;
}
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | `await` inside `forEach` loop | Runs sequentially despite looking parallel | `Promise.all(items.map(...))` or `for...of` |
| 2 | Catching all errors with empty catch | Hides bugs, makes debugging impossible | Let errors propagate to global filter |
| 3 | `setTimeout` for delay in production code | Unreliable, not testable | Bull queue delayed jobs or RxJS `delay()` |
| 4 | Synchronous file I/O (`fs.readFileSync`) in request handler | Blocks event loop for all requests | `fs.promises.readFile` or streams |

---

## Abnormal Case Patterns

1. **Promise.all rejects but partial results needed** — One service in Promise.all fails, losing all results. Fix: Use Promise.allSettled for non-critical enrichments.
2. **Memory spike from unbounded Promise.all** — 10K promises launched simultaneously. Fix: Use `p-limit` to cap concurrency.
3. **AsyncLocalStorage context lost in setTimeout** — Callback runs outside async context. Fix: Capture store reference before setTimeout.
4. **Stream backpressure ignored** — Producer faster than consumer, memory grows. Fix: Use `pipeline()` which handles backpressure automatically.
5. **Worker thread crashes silently** — Unhandled exception in worker. Fix: Always listen to `error` event on worker.
6. **Event loop lag in health check** — Health check passes but event loop is blocked. Fix: Monitor `nodejs_eventloop_lag_seconds` metric.
7. **RxJS subscription leak** — Observable not unsubscribed in interceptor. Fix: Use `pipe(take(1))` or ensure completion.

---

## Quality Checklist

- [ ] **Q1**: Patterns cover Promise, RxJS, streams, workers, AsyncLocalStorage?
- [ ] **Q2**: Pattern IDs unique (278.1–278.7)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Code examples are NestJS-specific (not generic Node.js)?

---

*NestJS Async/Concurrency Patterns Specialist — Pattern 278.x | EPS v10.0*

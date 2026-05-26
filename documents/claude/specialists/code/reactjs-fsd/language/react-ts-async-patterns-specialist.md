# React TypeScript Async Patterns Specialist
# React TypeScript非同期パターンスペシャリスト
# Chuyen Gia Async Patterns TypeScript React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — async patterns used in hooks, services, API calls across all layers) |
| **Directory Pattern** | `src/shared/lib/async/`, `src/shared/hooks/useAsync*.ts` |
| **Variant** | enterprise |
| **Pattern Numbers** | 10.1–10.10 |
| **Source Paths** | `**/lib/async/**/*.ts`, `**/hooks/useAsync*.ts`, `**/api/**/*.ts` |
| **File Count** | 3–8 async utility files + hooks |
| **Naming Convention** | `useAsync{Name}.ts` (hooks), `{concern}Async.ts` (utilities), `retry.ts`, `queue.ts` |
| **Imports From** | Shared (config for timeout values, types) |
| **Cannot Import** | Features, Pages (async utilities are shared-level) |
| **Imported By** | Data (API client uses retry/abort), Features (hooks use debounce/throttle), Shared (other utils) |
| **Dependencies** | None (uses native Promise, AbortController, setTimeout) |
| **When To Use** | API call cancellation on unmount, search debouncing, retry with backoff, parallel data fetching, queue patterns |
| **Source Skeleton** | `src/shared/lib/async/retry.ts`, `src/shared/lib/async/queue.ts`, `src/shared/hooks/useDebounce.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate async TypeScript patterns — AbortController cancellation, race condition prevention, retry with backoff, debounce/throttle |
| **Activation Trigger** | files: **/lib/async/**, **/hooks/useAsync*; keywords: abortController, raceCondition, retry, debounce, throttle, asyncQueue |

---

## Evidence Sources

- E1: MDN AbortController API documentation
- E2: React 19 useEffect cleanup patterns
- E3: Exponential backoff with jitter (AWS architecture blog)
- E4: Async iterator and streaming patterns

---

## Role

You are a **TypeScript Async Patterns Specialist** for enterprise React FSD projects. Your responsibility is to define robust async patterns: request cancellation, race condition prevention, retry logic, debounce/throttle, and async queuing. Enterprise apps have complex async flows that need proper cleanup, error handling, and cancellation.

**Used by**: API client specialists, hook specialists, data fetching specialists
**Not used by**: Synchronous-only code paths

---

## Patterns

### Pattern 10.1: AbortController for Request Cancellation (CRITICAL)

Cancel API calls on component unmount or navigation to prevent state updates on unmounted components.

```typescript
// src/shared/lib/async/cancellable.ts
export function cancellableFetch<T>(
  url: string,
  options?: RequestInit,
): { promise: Promise<T>; abort: () => void } {
  const controller = new AbortController();

  const promise = fetch(url, {
    ...options,
    signal: controller.signal,
  }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  });

  return { promise, abort: () => controller.abort() };
}
```

```typescript
// src/shared/hooks/useCancellableQuery.ts
import { useEffect, useRef } from 'react';

export function useCancellableEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: React.DependencyList,
) {
  useEffect(() => {
    const controller = new AbortController();
    effect(controller.signal).catch((err) => {
      if (err.name !== 'AbortError') throw err;
    });
    return () => controller.abort();
  }, deps);
}

// Usage
useCancellableEffect(async (signal) => {
  const response = await fetch(`/api/users/${id}`, { signal });
  const data = await response.json();
  setUser(data);
}, [id]);
```

```typescript
// Axios with AbortController
import axios from 'axios';

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: ({ signal }) => // TanStack Query passes signal automatically
      axios.get(`/api/users/${id}`, { signal }).then((r) => r.data),
  });
}
```

---

### Pattern 10.2: Race Condition Prevention (CRITICAL)

Prevent stale request results from overwriting newer data.

```typescript
// src/shared/hooks/useLatestRequest.ts
import { useRef, useCallback } from 'react';

export function useLatestRequest<T>(
  asyncFn: (...args: any[]) => Promise<T>,
) {
  const requestIdRef = useRef(0);

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    const currentId = ++requestIdRef.current;
    const result = await asyncFn(...args);

    // Only return if this is still the latest request
    if (currentId !== requestIdRef.current) {
      return null; // Stale — newer request in flight
    }
    return result;
  }, [asyncFn]);

  return execute;
}

// Usage — search with race condition protection
function SearchResults() {
  const [results, setResults] = useState<User[]>([]);
  const searchUsers = useLatestRequest(
    (query: string) => apiClient.get(`/users?q=${query}`).then((r) => r.data),
  );

  const handleSearch = async (query: string) => {
    const data = await searchUsers(query);
    if (data) setResults(data); // Only update if latest
  };
}
```

```typescript
// useEffect with cleanup flag (simpler approach)
useEffect(() => {
  let isCurrent = true;

  fetchUser(id).then((user) => {
    if (isCurrent) setUser(user); // Only update if effect is still current
  });

  return () => { isCurrent = false; };
}, [id]);
```

---

### Pattern 10.3: Retry with Exponential Backoff (HIGH)

Configurable retry logic with jitter for resilient API calls.

```typescript
// src/shared/lib/async/retry.ts
interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  retryOn?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  jitter: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...defaultOptions, ...options };

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxRetries) throw err;
      if (opts.retryOn && !opts.retryOn(err)) throw err;

      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt),
        opts.maxDelay,
      );
      const jitteredDelay = opts.jitter
        ? delay * (0.5 + Math.random() * 0.5)
        : delay;

      opts.onRetry?.(attempt + 1, err);
      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }

  throw new Error('Unreachable');
}

// Usage
const user = await withRetry(
  () => apiClient.get(`/users/${id}`).then((r) => r.data),
  {
    maxRetries: 3,
    retryOn: (err) => {
      // Only retry on network errors or 5xx
      if (err.message.includes('Network Error')) return true;
      if (err.message.includes('500')) return true;
      return false;
    },
    onRetry: (attempt, err) => {
      console.warn(`Retry attempt ${attempt}:`, err.message);
    },
  },
);
```

---

### Pattern 10.4: Promise.all vs Promise.allSettled (HIGH)

Parallel API calls with different failure handling strategies.

```typescript
// src/shared/lib/async/parallel.ts

// Promise.all — fail fast: ALL must succeed
async function loadDashboard() {
  const [users, orders, analytics] = await Promise.all([
    fetchUsers(),
    fetchOrders(),
    fetchAnalytics(),
  ]);
  return { users, orders, analytics };
}

// Promise.allSettled — partial failure: some can fail
async function loadDashboardResilient() {
  const results = await Promise.allSettled([
    fetchUsers(),
    fetchOrders(),
    fetchAnalytics(), // Analytics failure shouldn't block dashboard
  ]);

  return {
    users: results[0].status === 'fulfilled' ? results[0].value : [],
    orders: results[1].status === 'fulfilled' ? results[1].value : [],
    analytics: results[2].status === 'fulfilled' ? results[2].value : null,
  };
}

// Type-safe allSettled helper
export function getSettledResults<T>(
  results: PromiseSettledResult<T>[],
): { fulfilled: T[]; rejected: Error[] } {
  const fulfilled: T[] = [];
  const rejected: Error[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') fulfilled.push(result.value);
    else rejected.push(result.reason);
  }

  return { fulfilled, rejected };
}
```

---

### Pattern 10.5: Async Iterator / Streaming (MEDIUM-HIGH)

Consume streaming responses (SSE, chunked transfer).

```typescript
// src/shared/lib/async/stream.ts
export async function* streamResponse<T>(
  url: string,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  const response = await fetch(url, { signal });
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6)) as T;
          yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Usage — SSE consumption
for await (const event of streamResponse<NotificationEvent>('/api/events', signal)) {
  handleNotification(event);
}
```

---

### Pattern 10.6: Debounce / Throttle Async (HIGH)

Debounced API calls for search, throttled updates for scroll.

```typescript
// src/shared/hooks/useDebounce.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Debounced callback (for functions)
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: any[]) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
    }) as T,
    [delay],
  );
}

// Usage — debounced search
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return <Input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

```typescript
// src/shared/hooks/useThrottle.ts
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const lastCallRef = useRef(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [delay],
  );
}
```

---

### Pattern 10.7: Timeout Pattern (MEDIUM)

Promise.race with configurable timeout for slow API calls.

```typescript
// src/shared/lib/async/timeout.ts
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(ms)), ms),
    ),
  ]);
}

// Usage
try {
  const user = await withTimeout(fetchUser(id), 5000);
} catch (error) {
  if (error instanceof TimeoutError) {
    notification.warning({ message: 'Request timed out. Please try again.' });
  }
}
```

---

### Pattern 10.8: Queue Pattern (MEDIUM)

Sequential async operations with concurrency control.

```typescript
// src/shared/lib/async/queue.ts
export class AsyncQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private concurrency: number;

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const fn = this.queue.shift()!;
      this.running++;
      fn().finally(() => {
        this.running--;
        this.process();
      });
    }
  }
}

// Usage — upload queue (max 3 concurrent)
const uploadQueue = new AsyncQueue(3);

async function uploadFiles(files: File[]) {
  const results = await Promise.all(
    files.map((file) =>
      uploadQueue.add(() => uploadFile(file)),
    ),
  );
  return results;
}
```

---

### Pattern 10.9: Result Type for Typed Error Handling (MEDIUM)

`Result<T, E>` pattern as alternative to try/catch for typed errors.

```typescript
// src/shared/types/result.ts
export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function Ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage — typed error handling without try/catch
async function createUser(dto: CreateUserDTO): Promise<Result<User, ApiError>> {
  try {
    const user = await apiClient.post<User>('/users', dto);
    return Ok(user.data);
  } catch (error) {
    if (isApiError(error)) return Err(error);
    return Err({ code: 'UNKNOWN', message: 'Unknown error' });
  }
}

// Consumer — exhaustive handling
const result = await createUser(formValues);
if (result.ok) {
  message.success(`User ${result.data.displayName} created`);
} else {
  if (result.error.code === 'DUPLICATE_EMAIL') {
    form.setFields([{ name: 'email', errors: ['Email already exists'] }]);
  } else {
    notification.error({ message: result.error.message });
  }
}
```

---

### Pattern 10.10: Anti-patterns (MEDIUM)

**1. Unhandled promises** — Fire-and-forget async calls.
```typescript
// BAD: No error handling, no cancellation
useEffect(() => {
  fetchData(); // Promise ignored
}, []);
// FIX: Handle errors, add cleanup
useEffect(() => {
  let active = true;
  fetchData().then(d => active && setData(d)).catch(console.error);
  return () => { active = false; };
}, []);
```

**2. Missing cleanup** — AbortController not used in useEffect.
```typescript
// BAD: Request continues after unmount
useEffect(() => { fetch(url).then(setData); }, [url]);
// FIX: Abort on cleanup
useEffect(() => {
  const ctrl = new AbortController();
  fetch(url, { signal: ctrl.signal }).then(setData);
  return () => ctrl.abort();
}, [url]);
```

**3. Fire-and-forget mutations** — Mutations without error handling.
```typescript
// BAD: No error handling on mutation
onClick={() => deleteUser(id)}
// FIX: Handle success and error
onClick={async () => {
  try { await deleteUser(id); message.success('Deleted'); }
  catch { notification.error({ message: 'Delete failed' }); }
}}
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (10.1–10.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React TypeScript Async Patterns Specialist | EPS v3.2 | Metadata v2.1*

# NestJS HTTP Client Specialist — Gateway
# NestJS HTTPクライアントスペシャリスト — ゲートウェイ
# Chuyen Gia HTTP Client NestJS — Gateway

**Version**: 1.0.0
**Technology**: NestJS 10+ @nestjs/axios, HttpModule
**Aspect**: HTTP Client Patterns
**Category**: gateway
**Purpose**: Knowledge provider for NestJS HTTP client — Axios config, interceptors, retry, timeout, circuit breaker, request logging, error normalization

---

## Metadata

```json
{
  "id": "nestjs-http-client-specialist",
  "technology": "NestJS 10+ HTTP Client",
  "aspect": "HTTP Client Patterns",
  "category": "gateway",
  "subcategory": "nestjs",
  "lines": 280,
  "token_cost": 1700,
  "version": "1.0.0",
  "evidence": [
    "E1: @nestjs/axios — HttpModule wrapping Axios for NestJS DI",
    "E2: Axios interceptors — request/response transformation, error handling",
    "E3: Resilient HTTP patterns — retry, timeout, circuit breaker for external calls"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 266.1–266.5 |
| **Directory Pattern** | `src/infrastructure/http/` |
| **Dependencies** | @nestjs/axios, axios |
| **When To Use** | HTTP client for calling external APIs with retry and timeout |
| **Source Skeleton** | src/infrastructure/http/{service}.client.ts, src/infrastructure/external/{provider}.adapter.ts |
| **Specialist Type** | code |
| **Purpose** | HTTP client patterns — @nestjs/axios, retry, timeout, error handling |
| **Activation Trigger** | files: **/http/*.client.ts; keywords: httpService, axios, httpModule, interceptor |

---

## Patterns

### Pattern 266.1: HttpModule Setup

```typescript
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: config.get('EXTERNAL_API_URL'),
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ExternalApiClient],
  exports: [ExternalApiClient],
})
export class ExternalApiModule {}
```

### Pattern 266.2: Typed API Client

```typescript
@Injectable()
export class PaymentGatewayClient {
  constructor(private http: HttpService, private config: ConfigService) {}

  async charge(dto: ChargeDto): Promise<ChargeResult> {
    const { data } = await firstValueFrom(
      this.http.post<ChargeResult>('/charges', dto, {
        headers: { Authorization: `Bearer ${this.config.get('PAYMENT_API_KEY')}` },
        timeout: 10000,
      }),
    );
    return data;
  }

  async getBalance(accountId: string): Promise<Balance> {
    const { data } = await firstValueFrom(
      this.http.get<Balance>(`/accounts/${accountId}/balance`),
    );
    return data;
  }
}
```

### Pattern 266.3: Error Normalization

```typescript
@Injectable()
export class ExternalApiClient {
  async callApi<T>(request: () => Observable<AxiosResponse<T>>): Promise<T> {
    try {
      const { data } = await firstValueFrom(request());
      return data;
    } catch (error) {
      if (error.response) {
        // HTTP error from external service
        throw new ExternalServiceException(
          error.response.status,
          error.response.data?.message || 'External service error',
        );
      }
      if (error.code === 'ECONNABORTED') {
        throw new ExternalServiceTimeoutException('Request timed out');
      }
      throw new ExternalServiceException(503, 'External service unavailable');
    }
  }
}
```

### Pattern 266.4: Request/Response Logging

```typescript
@Injectable()
export class HttpLoggingInterceptor implements OnModuleInit {
  constructor(private http: HttpService, private logger: PinoLogger) {}

  onModuleInit() {
    this.http.axiosRef.interceptors.request.use((config) => {
      config['startTime'] = Date.now();
      this.logger.debug({ method: config.method, url: config.url }, 'HTTP request');
      return config;
    });

    this.http.axiosRef.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config['startTime'];
        this.logger.info({ method: response.config.method, url: response.config.url, status: response.status, duration }, 'HTTP response');
        return response;
      },
      (error) => {
        const duration = Date.now() - error.config?.['startTime'];
        this.logger.error({ url: error.config?.url, status: error.response?.status, duration }, 'HTTP error');
        return Promise.reject(error);
      },
    );
  }
}
```

---

### Pattern 266.5: Response Caching

```typescript
// Cache GET responses via interceptor — skip for authenticated requests
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request.headers.authorization) return next.handle(); // skip auth requests

    const key = `http:${request.url}:${JSON.stringify(request.query)}`;
    const cached = await this.cacheManager.get(key);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap((data) => this.cacheManager.set(key, data, { ttl: 300 })), // 5 min TTL
    );
  }
}
```

---

### Pattern 266.6: Timeout Configuration

```typescript
// Per-request timeout via AxiosRequestConfig
const response = await firstValueFrom(
  this.httpService.get('/api/data', {
    timeout: 5000, // 5s per-request timeout
    signal: AbortSignal.timeout(5000), // Node.js 18+ AbortController
  }),
);

// Global default in module registration
HttpModule.register({
  timeout: 10000,       // 10s default
  maxRedirects: 3,
  headers: { 'User-Agent': 'NestJS-Service/1.0' },
});

// Connection vs read timeout (via axios adapter config)
HttpModule.register({
  timeout: 10000,                    // read timeout
  httpAgent: new http.Agent({
    timeout: 3000,                   // connection timeout (separate)
    keepAlive: true,
  }),
});
```

---

### Pattern 266.7: Retry with Exponential Backoff

```typescript
import { retry, timer } from 'rxjs';

// RxJS retry with exponential backoff — skip retry for 4xx client errors
async callWithRetry<T>(request$: Observable<AxiosResponse<T>>): Promise<T> {
  return firstValueFrom(
    request$.pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // Don't retry client errors (4xx)
          if (error.response?.status >= 400 && error.response?.status < 500) {
            throw error;
          }
          const delayMs = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          this.logger.warn(`Retry ${retryCount}/3 after ${delayMs}ms`);
          return timer(delayMs);
        },
      }),
      map((res) => res.data),
    ),
  );
}
```

---

### Pattern 266.8: Circuit Breaker Integration

```typescript
import CircuitBreaker from 'opossum';

// Combine with resilience specialist (251.x)
@Injectable()
export class ResilientHttpClient {
  private breaker: CircuitBreaker;

  constructor(private httpService: HttpService) {
    this.breaker = new CircuitBreaker(
      (url: string) => firstValueFrom(this.httpService.get(url).pipe(map(r => r.data))),
      {
        timeout: 5000,          // 5s before considering failure
        errorThresholdPercentage: 50,  // open circuit at 50% error rate
        resetTimeout: 30000,    // try half-open after 30s
      },
    );

    this.breaker.on('open', () => this.logger.warn('Circuit OPEN'));
    this.breaker.on('halfOpen', () => this.logger.log('Circuit HALF-OPEN'));
    this.breaker.on('close', () => this.logger.log('Circuit CLOSED'));

    // Fallback on circuit open
    this.breaker.fallback(() => ({ data: null, fromCache: true }));
  }

  async get<T>(url: string): Promise<T> {
    return this.breaker.fire(url);
  }
}
```

---

## Best Practices

- Always set timeout — never let external calls hang indefinitely
- Normalize external errors — map to domain exceptions
- Log all external calls — method, URL, status, duration
- Use `firstValueFrom()` to convert Observable to Promise
- Separate API client per external service — each with own config

---

## Abnormal Case Patterns

1. **Observable not subscribed** — `this.http.get()` returns cold Observable. Fix: use `firstValueFrom()`.
2. **Timeout too long** — 60s default. Fix: set explicit timeout per client (5-10s).
3. **Auth token expired** — 401 from external service. Fix: Axios interceptor auto-refreshes token.
4. **Error swallowed** — catch block returns null. Fix: always re-throw as typed exception.

---

*NestJS HTTP Client Specialist — Gateway | EPS v3.2*

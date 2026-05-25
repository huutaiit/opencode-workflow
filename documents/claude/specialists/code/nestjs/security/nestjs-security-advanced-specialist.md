# NestJS Security Advanced Specialist — Security
# NestJSセキュリティ高度スペシャリスト — セキュリティ
# Chuyen Gia Bao Mat Nang Cao NestJS — Bao Mat

**Version**: 1.0.0
**Technology**: NestJS 10+ Security Middleware & Configuration
**Aspect**: Security Advanced
**Category**: security
**Purpose**: Knowledge provider for NestJS advanced security — Helmet, CORS, rate limiting, CSRF protection, input sanitization, secrets management

---

## Metadata

```json
{
  "id": "nestjs-security-advanced-specialist",
  "technology": "NestJS 10+ Security Middleware & Configuration",
  "aspect": "Security Advanced",
  "category": "security",
  "subcategory": "nestjs",
  "lines": 220,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: 6 architecture rules — security middleware at presentation boundary, not in domain",
    "E2: Transport-level security — middleware pipeline before business logic",
    "E5: p2plend security — Helmet, CORS, rate limiting in production microservices"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 214.1–214.8 |
| **Directory Pattern** | `src/infrastructure/security/` |
| **Naming Convention** | `{name}.middleware.ts`, `rate-limit.config.ts`, `cors.config.ts`, `helmet.config.ts` |
| **Imports From** | Presentation (middleware pipeline), Infrastructure (encryption libs, rate limit store) |
| **Imported By** | Presentation (applied globally via app.use() or module config) |
| **Cannot Import** | Domain business logic (security middleware is transport-level, not business concern) |
| **Dependencies** | helmet, @nestjs/throttler |
| **When To Use** | OWASP security patterns — CORS, CSRF, rate limiting, headers |
| **Source Skeleton** | src/main.ts (security setup), src/presentation/middleware/security/*.ts |
| **Specialist Type** | code |
| **Purpose** | Advanced NestJS security — encryption, hashing, CSRF, security headers |
| **Activation Trigger** | files: **/security/**; keywords: encryption, bcrypt, csrf, helmet, security |

---

## Role

You are a **NestJS Security Advanced Specialist**. Your responsibility is to provide transport-level security patterns for NestJS microservice projects following clean architecture. You supply patterns for HTTP security headers, CORS configuration, rate limiting, CSRF protection, input sanitization, and secrets management.

**Used by**: Any code agent working with NestJS security hardening and middleware
**Not used by**: Non-NestJS stacks, authentication logic (see Auth Guards Specialist 213.x)

---

## Patterns

### Pattern 214.1–214.4: Core Security Middleware (HIGH)

```
214.1 Helmet: app.use(helmet()) for HTTP security headers.
      Applies X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, and more.
```

```typescript
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
    crossOriginEmbedderPolicy: true,
  }));
}
```

```
214.2 CORS: app.enableCors({origin, methods, credentials}) per environment.
      Whitelist allowed origins, restrict methods, enable credentials only when needed.
```

```typescript
app.enableCors({
  origin: configService.get<string[]>('CORS_ORIGINS'),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 3600,
});
```

```
214.3 Rate limiting: @nestjs/throttler — ThrottlerGuard with Redis store.
      Protect endpoints from abuse with configurable ttl/limit per route or globally.
```

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
      storage: new ThrottlerStorageRedisService(redisClient),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

```
214.4 CSRF protection: csurf middleware for session-based apps.
      Apply CSRF tokens for cookie/session-based auth, skip for pure JWT APIs.
```

```typescript
import * as csurf from 'csurf';

// Only for session-based apps — skip for stateless JWT APIs
app.use(csurf({ cookie: { httpOnly: true, secure: true } }));
```

### Pattern 214.5–214.8: Advanced Security Patterns (MEDIUM-HIGH)

```
214.5 Input sanitization: Custom pipe to strip XSS payloads from user input.
      Apply globally to sanitize all incoming string fields before reaching handlers.
```

```typescript
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
    }
    if (typeof value === 'object' && value !== null) {
      for (const key of Object.keys(value)) {
        value[key] = this.transform(value[key]);
      }
    }
    return value;
  }
}
```

```
214.6 Request size limits: Express body-parser limits for payload protection.
      Prevent oversized payloads from consuming memory or causing DoS.
```

```typescript
const app = await NestFactory.create(AppModule, {
  bodyParser: false,
});
app.use(json({ limit: '1mb' }));
app.use(urlencoded({ extended: true, limit: '1mb' }));
```

```
214.7 Secrets management: Vault integration or environment-based secrets.
      Load secrets from Vault at startup, fall back to environment variables.
```

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [async () => {
        const vaultClient = new VaultClient(process.env.VAULT_ADDR);
        const secrets = await vaultClient.read('secret/data/app');
        return { ...secrets.data, ...process.env };
      }],
    }),
  ],
})
export class AppModule {}
```

```
214.8 Security headers: X-Content-Type-Options, X-Frame-Options, CSP.
      Custom middleware for headers not covered by Helmet or requiring app-specific values.
```

```typescript
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  }
}
```

---

## Abnormal Case Patterns (4 patterns)

1. **CORS preflight fails in production** — Browser blocks requests due to missing allowed origins. Fix: Ensure CORS_ORIGINS includes the exact frontend domain (with protocol and port), verify OPTIONS requests are not blocked by reverse proxy.

2. **Rate limiter blocks legitimate traffic** — Global throttle too aggressive for high-traffic endpoints. Fix: Use `@SkipThrottle()` for health checks, apply `@Throttle()` per-route with endpoint-specific limits.

3. **Helmet CSP blocks inline scripts** — Frontend assets fail to load after Helmet is enabled. Fix: Configure `contentSecurityPolicy.directives` to allow required sources, use nonce-based CSP for inline scripts.

4. **Request body silently truncated** — Large file uploads fail with no error when body-parser limit is too low. Fix: Set appropriate limits per route, use multipart/form-data with multer for file uploads instead of JSON body.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (214.1-214.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Security Advanced Specialist — Security | EPS v3.2*

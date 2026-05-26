# NestJS API Gateway & Discovery Specialist — Infrastructure
# NestJS APIゲートウェイ&ディスカバリスペシャリスト — インフラストラクチャ
# Chuyen Gia API Gateway va Service Discovery NestJS — Ha Tang

**Version**: 1.0.0
**Technology**: Nginx, Consul, JWT Gateway with NestJS
**Aspect**: API Gateway & Service Discovery
**Category**: infrastructure
**Purpose**: Knowledge provider for API gateway and service discovery — Nginx reverse proxy, Consul registration, JWT gateway validation, service routing, load balancing, rate limiting

---

## Metadata

```json
{
  "id": "nestjs-api-gateway-discovery-specialist",
  "technology": "Nginx, Consul, JWT Gateway with NestJS",
  "aspect": "API Gateway & Service Discovery",
  "category": "infrastructure",
  "subcategory": "nestjs",
  "lines": 230,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: API gateway pattern — single entry point for microservice routing",
    "E2: Consul service discovery — dynamic registration and health checking",
    "E5: p2plend gateway — Nginx + Consul real-world microservice routing"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 226.1–226.8 |
| **Directory Pattern** | `src/presentation/controllers/gateway/` |
| **Naming Convention** | `gateway.config.ts`, `consul.provider.ts`, `service-registry.ts`, `nginx.conf` |
| **Imports From** | Infrastructure (Consul SDK, Nginx config), Presentation (JWT validation at gateway) |
| **Imported By** | ALL services (discovered and routed through gateway) |
| **Cannot Import** | Domain business logic (gateway is infrastructure routing, not business concern) |
| **Dependencies** | none (Nginx/Consul config) |
| **When To Use** | API gateway routing, service discovery, JWT gateway validation |
| **Source Skeleton** | nginx/nginx.conf, consul/service-registration.json |
| **Specialist Type** | code |
| **Purpose** | API Gateway — service discovery, routing, load balancing, health-based routing |
| **Activation Trigger** | files: **/gateway/**; keywords: apiGateway, serviceDiscovery, proxy, loadBalance |

---

## Role

You are a **NestJS API Gateway & Discovery Specialist**. Your responsibility is to provide API gateway and service discovery best practices for NestJS microservice projects following clean architecture. You supply patterns for Nginx reverse proxy, Consul service registration, JWT validation at gateway, path-based routing, load balancing, rate limiting, and service mesh configuration.

**Used by**: Any code agent working with API gateway or service discovery in NestJS microservices
**Not used by**: Monolithic NestJS apps, direct service-to-service without gateway

---

## Patterns

### Pattern 226.1–226.4: Gateway Fundamentals (HIGH)

```
226.1 Nginx API gateway: Reverse proxy routing to backend services.
      Single entry point handles TLS termination, routing, and static responses.
```

```nginx
upstream loan-service { server loan-service:3001; }
upstream user-service { server user-service:3002; }

server {
  listen 80;
  location /api/loans/ { proxy_pass http://loan-service/; }
  location /api/users/ { proxy_pass http://user-service/; }
  location /health     { return 200 '{"status":"ok"}'; }
}
```

```
226.2 Consul service discovery: Register service on startup, deregister on shutdown.
      Each NestJS service self-registers with Consul including health check URL.
```

```typescript
@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  constructor(private config: ConfigService) {}
  async onModuleInit() {
    await consul.agent.service.register({
      name: this.config.get('SERVICE_NAME'),
      port: this.config.get<number>('PORT'),
      check: { http: `http://localhost:${this.config.get('PORT')}/health`, interval: '10s' },
    });
  }
  async onModuleDestroy() { await consul.agent.service.deregister(this.config.get('SERVICE_NAME')); }
}
```

```
226.3 JWT gateway validation: Validate token at gateway, pass user context downstream.
      Gateway extracts and verifies JWT, forwards user claims as headers to services.
```

```typescript
@Injectable()
export class GatewayAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = this.jwt.verify(token);
    req.headers['x-user-id'] = payload.sub;
    return true;
  }
}
```

```
226.4 Service routing: Path-based routing (/api/loans -> lending-service).
      Route requests by URL prefix to appropriate backend microservice.
```

```nginx
location /api/loans/  { proxy_pass http://loan-service/;  proxy_set_header X-Real-IP $remote_addr; }
location /api/users/  { proxy_pass http://user-service/;  proxy_set_header X-Real-IP $remote_addr; }
location /api/wallet/ { proxy_pass http://wallet-service/; proxy_set_header X-Real-IP $remote_addr; }
```

### Pattern 226.5–226.8: Advanced Gateway Patterns (MEDIUM-HIGH)

```
226.5 Load balancing: Round-robin or least-connections across service instances.
      Nginx upstream block distributes traffic across multiple service replicas.
```

```nginx
upstream loan-service {
  least_conn;
  server loan-service-1:3001;
  server loan-service-2:3001;
  server loan-service-3:3001;
}
```

```
226.6 Rate limiting at gateway: Global rate limits before reaching services.
      Apply rate limiting at Nginx level to protect backend services from overload.
```

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;

server {
  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
  }
}
```

```
226.7 Health check routing: /health endpoints aggregated at gateway level.
      Gateway exposes aggregate health status, checking each backend service.
```

```typescript
@Controller('health')
export class GatewayHealthController {
  constructor(private health: HealthCheckService, private http: HttpHealthIndicator) {}
  @Get()
  check() {
    return this.health.check([
      () => this.http.pingCheck('loan-service', 'http://loan-service:3001/health'),
      () => this.http.pingCheck('user-service', 'http://user-service:3002/health'),
    ]);
  }
}
```

```
226.8 Service mesh: Optional Consul Connect for mTLS between services.
      Consul Connect provides automatic mutual TLS without application-level cert management.
```

```typescript
// Service registration with Consul Connect sidecar
await consul.agent.service.register({
  name: 'loan-service',
  port: 3001,
  connect: { sidecar_service: {} },  // enables Consul Connect proxy
  check: { http: 'http://localhost:3001/health', interval: '10s' },
});
```

---

## Best Practices

### Gateway Design
- Keep the gateway thin — routing, auth validation, rate limiting, and request transformation only; no business logic
- Use declarative routing configuration (Nginx conf or Kong declarative config) that can be version-controlled and reviewed
- Implement request/response transformation at the gateway to normalize backend response formats for frontend consumers
- Version API routes at the gateway level (`/v1/orders`, `/v2/orders`) to enable backend migration without frontend disruption

### Security
- Validate JWT at the gateway to reject unauthorized requests before they reach backend services
- Terminate TLS at the gateway; use plain HTTP internally within the trusted network for performance
- Configure rate limiting per client IP and per API key to prevent abuse and protect backend resources
- Strip internal headers (e.g., `X-Internal-Service-Id`) before forwarding to backend to prevent header injection

### Load Balancing
- Use least-connections algorithm for long-lived requests; round-robin for uniform short requests
- Configure health checks on upstream servers to automatically remove unhealthy backends from the pool
- Set appropriate connection and read timeouts per upstream based on the service's expected response time
- Enable keepalive connections to upstream servers to reduce connection establishment overhead

### Service Discovery
- Use Consul health checks with appropriate intervals (10-30s) to balance freshness vs. overhead
- Register services with metadata tags (version, environment) to enable canary routing and blue-green deployments
- Configure `deregister_critical_service_after` to automatically clean up services that have been unhealthy for extended periods
- Use DNS-based discovery for simple setups; switch to API-based for dynamic routing decisions

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Business logic in gateway | Gateway becomes a monolith; changes require gateway redeployment affecting all services | Move all business logic to domain services; gateway handles only cross-cutting concerns |
| No rate limiting | Single abusive client can overwhelm backend services; no protection against DDoS | Configure `limit_req_zone` in Nginx per client IP and per endpoint; return 429 with `Retry-After` |
| Exposing all backend services | Internal-only services accessible from the internet; expanded attack surface | Whitelist only public-facing routes in gateway config; deny by default |
| Hardcoded upstream URLs | Cannot scale, move, or replace services without gateway redeployment | Use service discovery (Consul) for dynamic upstream resolution; or use environment variables at minimum |
| No gateway health check | Orchestrator cannot detect gateway failure; dead gateway serves 502 to all clients | Add dedicated `/gateway/health` endpoint that checks Nginx worker status and upstream availability |

## Testing Patterns

### Test Gateway Routing
```typescript
describe('API Gateway', () => {
  it('should route /api/orders to order-service', async () => {
    const response = await fetch('http://gateway:8080/api/orders');
    expect(response.status).toBe(200);
    expect(response.headers.get('x-upstream')).toBe('order-service');
  });

  it('should return 404 for unregistered routes', async () => {
    const response = await fetch('http://gateway:8080/api/nonexistent');
    expect(response.status).toBe(404);
  });
});
```

### Test Rate Limiting
```typescript
it('should return 429 when rate limit exceeded', async () => {
  const requests = Array.from({ length: 20 }, () =>
    fetch('http://gateway:8080/api/orders'),
  );
  const responses = await Promise.all(requests);
  const tooMany = responses.filter(r => r.status === 429);
  expect(tooMany.length).toBeGreaterThan(0);
});
```

### Test JWT Validation at Gateway
```typescript
it('should reject request without valid JWT', async () => {
  const response = await fetch('http://gateway:8080/api/protected');
  expect(response.status).toBe(401);
});

it('should forward request with valid JWT', async () => {
  const token = generateValidJwt({ sub: 'user1', roles: ['admin'] });
  const response = await fetch('http://gateway:8080/api/protected', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(200);
});
```

---

## Abnormal Case Patterns (8 patterns)

1. **Gateway 502 Bad Gateway** — Backend service not reachable from Nginx. Fix: Verify Docker network connectivity, check upstream service name matches compose service name, confirm service is healthy.

2. **Consul service flapping** — Service repeatedly registers and deregisters. Fix: Increase health check interval, add `deregister_critical_service_after` TTL, investigate OOM or crash loops.

3. **JWT validation inconsistency** — Gateway accepts token but downstream service rejects claims. Fix: Ensure gateway and services share the same JWT secret/public key, standardize claim names (sub, roles).

4. **Rate limiter blocks legitimate traffic** — Burst traffic from single client exceeds limit. Fix: Tune `burst` parameter, use `$http_x_forwarded_for` for client identification behind proxy, add per-endpoint rate zones.

5. **SSL termination misconfigured** — Gateway serves HTTPS but backend receives plain HTTP; `X-Forwarded-Proto` not set, causing redirect loops or mixed content. Fix: Set `proxy_set_header X-Forwarded-Proto $scheme` in Nginx; configure backend to trust forwarded headers via `app.set('trust proxy', true)`.

6. **WebSocket upgrade not proxied** — Gateway handles HTTP but drops WebSocket connections because Nginx does not forward the `Upgrade` header. Fix: Add `proxy_http_version 1.1`, `proxy_set_header Upgrade $http_upgrade`, `proxy_set_header Connection "upgrade"` to the WebSocket location block.

7. **Gateway single point of failure** — Only one gateway instance; if it crashes, all services become unreachable. Fix: Deploy multiple gateway instances behind a load balancer (AWS ALB, HAProxy); use Consul to health-check gateway instances and remove unhealthy ones.

8. **Health check endpoint exposed publicly** — Internal health check endpoints (`/health`, `/metrics`) are accessible from the internet, leaking infrastructure details. Fix: Restrict health check routes to internal network using `allow` and `deny` directives in Nginx; or serve health checks on a separate internal-only port.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (226.1-226.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS API Gateway & Discovery Specialist — Infrastructure | EPS v3.2*

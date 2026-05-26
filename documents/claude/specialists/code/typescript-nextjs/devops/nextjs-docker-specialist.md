# Next.js Docker Specialist
# Next.js Dockerスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure / DevOps |
| **Directory Pattern** | `Dockerfile`, `docker-compose.yml`, `.dockerignore` |
| **Variant** | ALL |
| **Pattern Numbers** | 114.1–114.7 |
| **Source Paths** | `Dockerfile`, `docker-compose.yml`, `next.config.ts` |
| **File Count** | 2-3 |
| **Naming Convention** | Standard Docker conventions |
| **Imports From** | N/A |
| **Imported By** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (Docker tooling) |
| **When To Use** | Self-hosted deployment, container orchestration |
| **Source Skeleton** | `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `cache-handler.js` |
| **Specialist Type** | rule-set |
| **Purpose** | Docker deployment: standalone output, multi-stage builds, ISR cache, reverse proxy, health checks, graceful shutdown |
| **Activation Trigger** | docker, dockerfile, container, standalone, deployment, self-hosting, nginx |

---

## Rules

### 114.1 — Standalone Output Configuration

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone', // Generates minimal runtime files
}
```

`standalone` copies only required files to `.next/standalone/`, reducing image size dramatically.

### 114.2 — Multi-Stage Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 114.3 — .dockerignore

```
node_modules
.next
.git
*.md
.env*.local
docker-compose*.yml
Dockerfile*
```

### 114.4 — Reverse Proxy (nginx)

```nginx
# nginx.conf — recommended in front of Next.js
upstream nextjs {
  server app:3000;
}

server {
  listen 80;

  # Disable buffering for streaming/SSE
  proxy_buffering off;
  proxy_set_header X-Accel-Buffering no;

  # Security headers
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;

  location / {
    proxy_pass http://nextjs;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### 114.5 — ISR Cache (Multi-Instance)

```typescript
// next.config.ts — custom cache handler for multi-instance
module.exports = {
  cacheHandler: require.resolve('./cache-handler.js'),
  cacheMaxMemorySize: 0, // Disable in-memory cache
}

// cache-handler.js — Redis example
const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)

module.exports = class CacheHandler {
  async get(key) {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }
  async set(key, data, ctx) {
    await redis.set(key, JSON.stringify({ value: data, lastModified: Date.now(), tags: ctx.tags }))
  }
  async revalidateTag(tags) {
    tags = [tags].flat()
    // Scan and delete entries with matching tags
  }
}
```

**Problem**: Instance A revalidates → Instance B still serves stale cache.
**Solution**: Shared cache (Redis/S3) + `refreshTags()` for cross-instance coordination.

### 114.6 — Health Check

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
```

### 114.7 — Graceful Shutdown

- Send `SIGINT` or `SIGTERM` to Next.js process
- Server finishes in-flight requests
- Executes pending `after()` callbacks
- Recommended drain period: **10-30 seconds**
- Configure in orchestrator (K8s terminationGracePeriodSeconds)

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | Docker for local dev (Mac/Windows) | Performance penalty | Use `npm run dev` locally |
| 2 | No standalone output | Image includes all node_modules | `output: 'standalone'` |
| 3 | Root user in container | Security risk | Non-root user (nextjs:nodejs) |
| 4 | No .dockerignore | Large context, slow builds | Add .dockerignore |
| 5 | In-memory cache with multiple instances | Stale data across pods | Redis/S3 cache handler |

# Next.js Deployment Specialist
# Next.jsデプロイスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure / DevOps |
| **Directory Pattern** | `next.config.ts`, CI/CD config files |
| **Variant** | ALL |
| **Pattern Numbers** | 115.1–115.7 |
| **Source Paths** | `next.config.ts`, `.github/workflows/`, `vercel.json` |
| **File Count** | 1-3 |
| **Naming Convention** | Platform-specific |
| **Imports From** | N/A |
| **Imported By** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (platform config) |
| **When To Use** | Any deployment — Vercel, Docker, static, adapters |
| **Source Skeleton** | `next.config.ts` (output, deploymentId, generateBuildId), `vercel.json` |
| **Specialist Type** | rule-set |
| **Purpose** | Deployment: 4 options (Node.js, Docker, Static, Adapters), env variables, multi-server, version skew, build optimization |
| **Activation Trigger** | deploy, deployment, vercel, production, environment, build, CI/CD, version skew |

---

## Rules

### 115.1 — Deployment Options

| Option | Feature Support | Use When |
|--------|----------------|----------|
| Node.js server | All | Standard server |
| Docker container | All | Container orchestration (K8s) |
| Static export | Limited (no SSR, API Routes, Middleware) | Simple static sites |
| Adapters | Varies | Platform-specific (Vercel, Bun) |

### 115.2 — Environment Variables

```typescript
// ✅ Server-only (default) — NOT in client bundle
const dbUrl = process.env.DATABASE_URL

// ✅ Client-exposed — MUST prefix with NEXT_PUBLIC_
const apiUrl = process.env.NEXT_PUBLIC_API_URL
// ⚠️ Inlined at BUILD TIME — not runtime

// ✅ Runtime server env — use connection() for dynamic rendering
import { connection } from 'next/server'

export default async function Page() {
  await connection() // Opt into dynamic rendering
  const value = process.env.MY_RUNTIME_VALUE // ✅ Evaluated at runtime
}
```

**Rule**: Single Docker image can promote through environments using runtime env vars (with `connection()`).

### 115.3 — Multi-Server Configuration

```javascript
// next.config.js — multi-instance deployment
module.exports = {
  // 1. Consistent encryption key across all instances
  // Set via env: NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (base64, 16/24/32 bytes)

  // 2. Version skew protection
  deploymentId: process.env.DEPLOYMENT_VERSION,

  // 3. Consistent build ID across containers
  generateBuildId: async () => process.env.GIT_HASH,

  // 4. Shared cache handler
  cacheHandler: require.resolve('./cache-handler.js'),
  cacheMaxMemorySize: 0,
}
```

### 115.4 — Version Skew Handling

When `deploymentId` is configured:
- Static assets get `?dpl=<deploymentId>` query param
- Client sends `x-deployment-id` header on navigation
- Server compares → mismatch triggers hard navigation (full reload)
- `useState` lost on reload — URL state/localStorage persists

### 115.5 — Streaming Configuration

```javascript
// next.config.js — required for streaming behind reverse proxy
module.exports = {
  async headers() {
    return [{
      source: '/:path*{/}?',
      headers: [{ key: 'X-Accel-Buffering', value: 'no' }],
    }]
  },
}
```

Requirements for streaming:
- Load balancers: support chunked transfer / HTTP/2
- All proxies: pass through chunked responses
- PPR requires streaming support

### 115.6 — Verified Adapters (Next.js 16)

| Adapter | Status |
|---------|--------|
| Vercel | ✅ Verified |
| Bun | ✅ Verified |
| Cloudflare | Working on verified adapter |
| Netlify | Working on verified adapter |

Other platforms: AWS Amplify, Firebase App Hosting, Deno Deploy, Fly.io, DigitalOcean, Google Cloud Run, Render, SST

### 115.7 — Build Optimization

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // Tree-shake barrel imports
  optimizePackageImports: ['antd', 'lodash', '@ant-design/icons'],

  // Transpile monorepo packages
  transpilePackages: ['@company/shared-ui'],

  // Exclude large server-only packages from bundling
  serverExternalPackages: ['sharp', 'pino'],

  // Enable React Compiler (auto-memoization)
  reactCompiler: true,

  // Turbopack (faster dev builds)
  // turbopack: {},
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | NEXT_PUBLIC_ for secrets | Exposed in client JS bundle | Server-only env vars |
| 2 | Different build per environment | Inconsistent behavior | Single build, runtime env |
| 3 | No deploymentId with multi-instance | Version skew errors | Set deploymentId |
| 4 | No shared cache with multi-instance | Stale data across pods | Redis cache handler |
| 5 | Proxy buffering enabled | Breaks streaming/PPR | X-Accel-Buffering: no |

# Next.js Configuration Specialist
# Next.js設定スペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure / Application |
| **Directory Pattern** | `next.config.ts`, `next.config.js`, `next.config.mjs` |
| **Variant** | ALL |
| **Pattern Numbers** | 116.1–116.6 |
| **Source Paths** | `next.config.ts` |
| **File Count** | 1 |
| **Naming Convention** | `next.config.ts` (TypeScript recommended) |
| **Imports From** | `next`: NextConfig type |
| **Imported By** | N/A (build system entry point) |
| **Cannot Import** | Browser APIs, React components |
| **Dependencies** | next (built-in) |
| **When To Use** | Project setup, feature flags, build optimization, caching config |
| **Source Skeleton** | `next.config.ts` |
| **Specialist Type** | rule-set |
| **Purpose** | next.config.ts: 60+ config options organized by concern — caching, routing, security, build, deployment |
| **Activation Trigger** | next.config, nextConfig, configuration, config option |

---

## Rules

### 116.1 — TypeScript Configuration (Recommended)

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options */
}

export default nextConfig
```

Supports: `.ts`, `.js`, `.mjs`. Does NOT support `.cjs` or `.cts`.

### 116.2 — Phase-Based Configuration

```javascript
const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = require('next/constants')

module.exports = (phase, { defaultConfig }) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return { /* dev-only config */ }
  }
  return { /* production config */ }
}
```

### 116.3 — Key Options by Concern

#### Caching
| Option | Purpose |
|--------|---------|
| `cacheComponents` | Enable `'use cache'` directive (replaces experimental PPR) |
| `cacheHandlers` | Custom cache backends for `'use cache'` |
| `cacheLife` | Cache lifetime profiles (default, minutes, hours, days, weeks, max) |
| `cacheHandler` | Custom ISR cache handler (Redis, S3) |
| `expireTime` | ISR stale-while-revalidate TTL |
| `staleTimes` | Client cache invalidation times |

#### Routing & Redirects
| Option | Purpose |
|--------|---------|
| `basePath` | Deploy under sub-path (`/app`) |
| `redirects` | Redirect rules (source → destination) |
| `rewrites` | Rewrite rules (URL stays same, content changes) |
| `headers` | Custom HTTP headers per route |
| `trailingSlash` | Enforce trailing slash behavior |
| `typedRoutes` | Statically typed `<Link href>` |

#### Images & Assets
| Option | Purpose |
|--------|---------|
| `images` | Image optimization: domains, loader, formats, sizes |
| `assetPrefix` | CDN prefix for static assets |
| `sassOptions` | Sass/SCSS configuration |
| `inlineCss` | Inline CSS support |

#### Build & Performance
| Option | Purpose |
|--------|---------|
| `output` | `'standalone'` (Docker) or `'export'` (static) |
| `optimizePackageImports` | Tree-shake barrel imports (antd, lodash, etc.) |
| `transpilePackages` | Transpile monorepo/external packages |
| `serverExternalPackages` | Exclude from Server Component bundling |
| `reactCompiler` | React Compiler auto-optimization |
| `turbopack` | Turbopack dev server options |

#### Security
| Option | Purpose |
|--------|---------|
| `serverActions` | Server Actions config (body size limits) |
| `authInterrupts` | Enable `forbidden()` and `unauthorized()` APIs |
| `taint` | Object/value tainting (prevent client exposure) |
| `poweredByHeader` | Disable `x-powered-by` header |

#### Advanced
| Option | Purpose |
|--------|---------|
| `viewTransition` | View Transition API for page transitions |
| `logging` | Fetch/request logging in dev |
| `webVitalsAttribution` | Web Vitals source attribution |
| `deploymentId` | Version skew protection |
| `generateBuildId` | Consistent build ID across containers |

### 116.4 — Common Configurations

```typescript
const nextConfig: NextConfig = {
  // ✅ Essential for most projects
  reactStrictMode: true,
  poweredByHeader: false,                    // Security
  optimizePackageImports: ['antd', 'lodash'], // Performance

  // ✅ Docker deployment
  output: 'standalone',

  // ✅ Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
    ],
  },

  // ✅ Modern features
  cacheComponents: true,        // Enable 'use cache'
  reactCompiler: true,          // Auto-memoization
  viewTransition: true,         // Page transitions
}
```

### 116.5 — Async Configuration

```typescript
// next.config.ts — async config for runtime values
export default async function nextConfig(): Promise<NextConfig> {
  const config = await fetchRemoteConfig()
  return {
    env: { FEATURE_FLAGS: JSON.stringify(config.features) },
  }
}
```

### 116.6 — Unit Testing Config (Experimental, v15.1+)

```typescript
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server'

const response = await unstable_getResponseFromNextConfig({
  url: 'https://example.com/old-path',
  nextConfig: {
    async redirects() {
      return [{ source: '/old-path', destination: '/new-path', permanent: true }]
    },
  },
})
expect(response.status).toEqual(308)
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | No `poweredByHeader: false` | Exposes framework version | Disable it |
| 2 | Missing `optimizePackageImports` | Large bundle from barrel imports | Add for antd, lodash, icons |
| 3 | Hardcoded env in config | Different per environment | Use `process.env` |
| 4 | No `reactStrictMode` | Misses double-render bug detection | Enable it |

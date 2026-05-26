# Next.js Observability Specialist
# Next.jsオブザーバビリティスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (cross-cutting) |
| **Directory Pattern** | `instrumentation.ts`, `instrumentation.node.ts` |
| **Variant** | ALL |
| **Pattern Numbers** | 112.1–112.6 |
| **Source Paths** | `instrumentation.ts`, `instrumentation.node.ts` |
| **File Count** | 1-2 |
| **Naming Convention** | `instrumentation.ts` (convention file) |
| **Imports From** | `@vercel/otel`, `@opentelemetry/*` |
| **Imported By** | N/A (auto-loaded by framework) |
| **Cannot Import** | N/A |
| **Dependencies** | @vercel/otel, @opentelemetry/sdk-logs, @opentelemetry/api-logs, @opentelemetry/instrumentation |
| **When To Use** | Production monitoring, request tracing, performance debugging |
| **Source Skeleton** | `instrumentation.ts`, `instrumentation.node.ts` |
| **Specialist Type** | rule-set |
| **Purpose** | OpenTelemetry instrumentation: @vercel/otel, manual NodeSDK, default spans, custom spans, exporters |
| **Activation Trigger** | opentelemetry, otel, instrumentation, tracing, span, observability, monitoring, telemetry |

---

## Rules

### 112.1 — Quick Setup with @vercel/otel

```bash
pnpm add @vercel/otel @opentelemetry/sdk-logs @opentelemetry/api-logs @opentelemetry/instrumentation
```

```typescript
// instrumentation.ts — in project ROOT (not app/ or pages/)
import { registerOTel } from '@vercel/otel'

export function register() {
  registerOTel({ serviceName: 'my-nextjs-app' })
}
```

**Rules**:
- File MUST be in root (or `src/` if using src directory)
- `register()` executes BEFORE app code runs
- Works on both Vercel and self-hosted

### 112.2 — Manual NodeSDK Setup

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node.ts')
  }
}

// instrumentation.node.ts — Node.js only (NOT Edge compatible)
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'my-nextjs-app',
  }),
  spanProcessor: new SimpleSpanProcessor(new OTLPTraceExporter()),
})
sdk.start()
```

### 112.3 — Default Spans (Auto-Instrumented)

| Span Type | Description |
|-----------|-------------|
| `BaseServer.handleRequest` | Root span per incoming request (HTTP method, route, status) |
| `AppRender.getBodyResult` | Render route in app router |
| `AppRender.fetch` | Fetch requests in code |
| `AppRouteRouteHandlers.runHandler` | API Route Handler execution |
| `ResolveMetadata.generateMetadata` | Metadata generation per page |
| `NextNodeServer.findPageComponents` | Page component resolution |
| `NextNodeServer.getLayoutOrPageModule` | Layout/page module loading |
| `NextNodeServer.startResponse` | First byte sent (zero-length) |

Custom attributes: `next.span_name`, `next.span_type`, `next.route`, `next.rsc`, `next.page`

### 112.4 — Custom Spans

```typescript
import { trace } from '@opentelemetry/api'

export async function fetchUserData(userId: string) {
  return await trace
    .getTracer('my-app')
    .startActiveSpan('fetchUserData', async (span) => {
      try {
        span.setAttribute('user.id', userId)
        const data = await db.user.findUnique({ where: { id: userId } })
        span.setAttribute('user.found', !!data)
        return data
      } catch (error) {
        span.recordException(error as Error)
        throw error
      } finally {
        span.end()
      }
    })
}
```

### 112.5 — Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_OTEL_VERBOSE=1` | Show more spans than default |
| `NEXT_OTEL_FETCH_DISABLED=1` | Disable fetch instrumentation (use custom library) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector endpoint |

### 112.6 — Self-Hosted Collector Setup

```yaml
# docker-compose.yml — OpenTelemetry Collector
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib
    ports:
      - "4317:4317"   # gRPC
      - "4318:4318"   # HTTP
    volumes:
      - ./otel-config.yaml:/etc/otel-config.yaml
    command: ["--config", "/etc/otel-config.yaml"]
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | instrumentation.ts in app/ | Not loaded by framework | Place in project root |
| 2 | NodeSDK in Edge runtime | Not compatible | Conditional import with NEXT_RUNTIME check |
| 3 | No span.end() | Memory leak, incomplete traces | Always end in finally block |
| 4 | Too many custom spans | Performance overhead | Span only meaningful operations |

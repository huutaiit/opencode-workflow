# FastAPI Observability Specialist
# FastAPIオブザーバビリティスペシャリスト
# Chuyen Gia Observability FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/core/telemetry.py`, `src/core/metrics.py` |
| **Variant** | ALL |
| **Naming Convention** | `telemetry.py`, `metrics.py`, `tracing.py` |
| **Imports From** | N/A (infrastructure) |
| **Cannot Import** | N/A |
| **Dependencies** | opentelemetry-api, opentelemetry-sdk, opentelemetry-instrumentation-fastapi, prometheus-client |
| **When To Use** | Distributed tracing, metrics, Prometheus/Grafana integration |
| **Source Skeleton** | `src/core/telemetry.py`, `src/core/metrics.py` |
| **Pattern Numbers** | 76.1–76.6 |
| **Source Paths** | `**/core/telemetry.py`, `**/core/metrics.py` |
| **File Count** | 1-2 per project |
| **Imported By** | Main app (startup) |
| **Specialist Type** | code |
| **Purpose** | OpenTelemetry traces, auto-instrumentation, Prometheus metrics, custom business metrics, Grafana dashboards, export targets |
| **Activation Trigger** | opentelemetry, prometheus, grafana, metrics, traces, spans, observability |

---

## Purpose

Define observability patterns for FastAPI: OpenTelemetry distributed tracing, auto-instrumentation for FastAPI/SQLAlchemy/httpx, Prometheus metrics endpoint, custom business metrics, Grafana dashboard setup, and export target configuration.

---

## Pattern 76.1: OpenTelemetry Setup

```python
# pip install opentelemetry-sdk opentelemetry-exporter-otlp
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource


def setup_tracing(service_name: str, otlp_endpoint: str = "http://localhost:4317"):
    """Configure OpenTelemetry with OTLP exporter."""
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
        "deployment.environment": settings.ENVIRONMENT,
    })

    provider = TracerProvider(resource=resource)

    # BatchSpanProcessor — buffers and sends in batches (production)
    # NOT SimpleSpanProcessor (sends each span immediately — dev only)
    processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint=otlp_endpoint),
        max_queue_size=2048,
        max_export_batch_size=512,
    )
    provider.add_span_processor(processor)

    trace.set_tracer_provider(provider)


# Custom spans in application code
tracer = trace.get_tracer(__name__)


async def process_order(order_id: int):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)

        with tracer.start_as_current_span("validate_order"):
            await validate(order_id)

        with tracer.start_as_current_span("charge_payment"):
            result = await charge(order_id)
            span.set_attribute("payment.status", result.status)
```

---

## Pattern 76.2: Auto-Instrumentation

```python
# pip install opentelemetry-instrumentation-fastapi
# pip install opentelemetry-instrumentation-sqlalchemy
# pip install opentelemetry-instrumentation-httpx
# pip install opentelemetry-instrumentation-redis

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor


def instrument_app(app: FastAPI):
    """Auto-instrument all components."""
    # FastAPI — traces every request
    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls="health,metrics",  # Exclude probes
    )

    # SQLAlchemy — traces every query
    SQLAlchemyInstrumentor().instrument(engine=engine)

    # httpx — traces outgoing HTTP calls
    HTTPXClientInstrumentor().instrument()

    # Redis — traces cache operations
    RedisInstrumentor().instrument()
```

**What auto-instrumentation captures**:
- HTTP: method, path, status code, duration
- SQL: query text, parameters, execution time
- httpx: outgoing URL, status, duration
- Redis: command, key, duration

> Source: MJKHAN31 fastapi.windsurfrules

---

## Pattern 76.3: Prometheus Metrics

```python
# pip install prometheus-fastapi-instrumentator
from prometheus_fastapi_instrumentator import Instrumentator

# Basic setup — exposes /metrics endpoint
Instrumentator().instrument(app).expose(app)


# With custom metrics
instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=False,
    excluded_handlers=["/health", "/metrics"],
    env_var_name="ENABLE_METRICS",
)

instrumentator.instrument(app)
instrumentator.expose(app, include_in_schema=False)
```

**Default metrics exposed**:
- `http_requests_total` — request count by method, path, status
- `http_request_duration_seconds` — histogram of response times
- `http_request_size_bytes` — request body sizes
- `http_response_size_bytes` — response body sizes

---

## Pattern 76.4: Custom Business Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

# Counters (monotonically increasing)
users_created = Counter(
    "users_created_total",
    "Total users created",
    ["tier"],  # Labels
)

# Histograms (distribution of values)
order_processing_time = Histogram(
    "order_processing_seconds",
    "Time to process an order",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
)

# Gauges (current value, can go up/down)
active_websockets = Gauge(
    "active_websocket_connections",
    "Current WebSocket connections",
)


# Usage in application code
@router.post("/users")
async def create_user(payload: UserCreate):
    user = await user_service.create(payload)
    users_created.labels(tier=user.tier).inc()
    return user


@router.post("/orders")
async def create_order(payload: OrderCreate):
    with order_processing_time.time():  # Auto-measures duration
        order = await order_service.create(payload)
    return order


# WebSocket gauge
@app.websocket("/ws")
async def ws(websocket: WebSocket):
    active_websockets.inc()
    try:
        async for msg in websocket.iter_text():
            await websocket.send_text(msg)
    finally:
        active_websockets.dec()
```

> Source: jiatastic logfire skill

---

## Pattern 76.5: Grafana Dashboard

```yaml
# docker-compose.yml for full observability stack
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4317

  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin

  tempo:
    image: grafana/tempo:latest
    ports: ["4317:4317"]  # OTLP gRPC
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "fastapi"
    static_configs:
      - targets: ["api:8000"]
    metrics_path: /metrics
```

**Grafana dashboard**: Import dashboard #16110 (FastAPI Observability) or create custom.

---

## Pattern 76.6: Export Targets

| Target | Protocol | Best For |
|--------|----------|----------|
| **Jaeger** | OTLP / UDP | Traces (standalone) |
| **Tempo** | OTLP | Traces (Grafana ecosystem) |
| **SigNoz** | OTLP | All-in-one (traces + metrics + logs) |
| **Datadog** | OTLP | Enterprise managed |
| **New Relic** | OTLP | Enterprise managed |

```python
# Switch exporter by config
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.jaeger.thrift import JaegerExporter

match settings.TRACE_EXPORTER:
    case "otlp":
        exporter = OTLPSpanExporter(endpoint=settings.OTLP_ENDPOINT)
    case "jaeger":
        exporter = JaegerExporter(agent_host_name="localhost", agent_port=6831)
    case "console":
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter
        exporter = ConsoleSpanExporter()
```

---

## MUST DO

- Use BatchSpanProcessor (not SimpleSpanProcessor) in production
- Exclude health/metrics endpoints from instrumentation
- Use labels sparingly (avoid high-cardinality: user IDs, request IDs)
- Set `service.name` and `deployment.environment` on resources
- Instrument SQLAlchemy and httpx for full trace coverage
- Use Histograms for latency (not Summary)

## MUST NOT DO

- Use SimpleSpanProcessor in production (sends each span immediately)
- Add high-cardinality labels (user IDs, UUIDs as metric labels)
- Instrument /health and /metrics endpoints (noise)
- Skip resource attributes (traces become unidentifiable)
- Create too many custom metrics (maintenance burden)
- Expose /metrics without access control in production

---

## References

- [OpenTelemetry Python](https://opentelemetry.io/docs/languages/python/)
- [prometheus-fastapi-instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator)
- [Grafana Tempo](https://grafana.com/docs/tempo/latest/)

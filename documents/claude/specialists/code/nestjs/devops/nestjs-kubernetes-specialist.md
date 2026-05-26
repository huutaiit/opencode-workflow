# NestJS Kubernetes Specialist — DevOps
# NestJS Kubernetesスペシャリスト — DevOps
# Chuyen Gia Kubernetes NestJS — DevOps

**Version**: 1.0.0
**Technology**: NestJS 10+ on Kubernetes
**Aspect**: Kubernetes Deployment
**Category**: devops
**Purpose**: Knowledge provider for deploying NestJS microservices on Kubernetes — manifests, health probes, ConfigMap/Secret, Helm charts, HPA, graceful shutdown, service mesh

---

## Metadata

```json
{
  "id": "nestjs-kubernetes-specialist",
  "technology": "NestJS 10+ on Kubernetes",
  "aspect": "Kubernetes Deployment",
  "category": "devops",
  "subcategory": "nestjs",
  "lines": 400,
  "token_cost": 2400,
  "version": "1.0.0",
  "evidence": [
    "E1: Kubernetes official docs — Deployments, Services, ConfigMaps, Probes",
    "E2: NestJS @nestjs/terminus — health check endpoints for K8s probes",
    "E3: Helm charts — templated K8s manifests for microservice deployment"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (DevOps) |
| **Variant** | ALL |
| **Pattern Numbers** | 243.1–243.8 |
| **Directory Pattern** | N/A (Kubernetes manifests) |
| **Naming Convention** | `deployment.yaml`, `service.yaml`, `configmap.yaml`, `hpa.yaml` |
| **Dependencies** | @nestjs/terminus (for health probes) |
| **When To Use** | Kubernetes deployment manifests, probes, HPA, graceful shutdown |
| **Source Skeleton** | k8s/deployment.yaml, k8s/service.yaml, k8s/hpa.yaml |
| **Specialist Type** | code |
| **Purpose** | Kubernetes deployment — manifests, services, ingress, config maps |
| **Activation Trigger** | files: k8s/**, **/*.yaml; keywords: kubernetes, k8s, deployment, service, ingress |

---

## Role

You are a **NestJS Kubernetes Specialist**. You supply patterns for deploying NestJS microservices to Kubernetes — deployment manifests, health probes using @nestjs/terminus, ConfigMap/Secret for configuration, Helm charts, horizontal pod autoscaling, graceful shutdown, and resource management.

**Used by**: Any code agent deploying NestJS to Kubernetes
**Not used by**: Non-K8s deployments, serverless platforms

---

## Patterns

### Pattern 243.1: Deployment Manifest

**Category**: K8s Fundamentals
**Description**: Standard Kubernetes Deployment for NestJS microservice.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lending-service
  labels:
    app: lending-service
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels: { app: lending-service }
  template:
    metadata:
      labels: { app: lending-service, version: v1 }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: lending-service
          image: registry.example.com/lending-service:1.0.0
          ports:
            - containerPort: 3000
              name: http
            - containerPort: 50051
              name: grpc
          envFrom:
            - configMapRef: { name: lending-service-config }
            - secretRef: { name: lending-service-secrets }
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits: { cpu: 500m, memory: 512Mi }
          livenessProbe:
            httpGet: { path: /health, port: http }
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet: { path: /health/ready, port: http }
            initialDelaySeconds: 5
            periodSeconds: 5
          startupProbe:
            httpGet: { path: /health, port: http }
            failureThreshold: 30
            periodSeconds: 2
```

**Key Points**:
- Always set resource requests AND limits — prevents noisy neighbor
- Three probes: startup (slow init), liveness (is alive), readiness (can serve)
- `terminationGracePeriodSeconds: 30` — must match NestJS graceful shutdown timeout

---

### Pattern 243.2: Health Check with @nestjs/terminus

**Category**: K8s Fundamentals
**Description**: NestJS health endpoints for K8s probes.

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: MicroserviceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([]); // alive = process responds
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.redis.pingCheck('redis', {
        transport: Transport.REDIS,
        options: { host: 'redis', port: 6379 },
      }),
    ]);
  }
}
```

**Key Points**:
- Liveness: lightweight (process alive) — returns 200 if app can respond
- Readiness: checks dependencies (DB, Redis, gRPC) — returns 200 only when ready to serve
- K8s removes pod from Service when readiness fails — no traffic to unhealthy pods

---

### Pattern 243.3: ConfigMap & Secrets

**Category**: K8s Configuration
**Description**: External configuration via K8s ConfigMap and Secret.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lending-service-config
data:
  NODE_ENV: production
  PORT: "3000"
  DB_HOST: postgres-primary.database.svc.cluster.local
  DB_PORT: "5432"
  REDIS_HOST: redis-master.cache.svc.cluster.local
  LOG_LEVEL: info

---
apiVersion: v1
kind: Secret
metadata:
  name: lending-service-secrets
type: Opaque
stringData:
  DB_PASSWORD: "${DB_PASSWORD}"
  JWT_SECRET: "${JWT_SECRET}"
  REDIS_PASSWORD: "${REDIS_PASSWORD}"
```

**Key Points**:
- ConfigMap for non-sensitive values — visible in K8s dashboard
- Secret for credentials — base64 encoded, can be encrypted at rest
- Reference via `envFrom` in Deployment — NestJS reads from process.env

---

### Pattern 243.4: Graceful Shutdown

**Category**: K8s Lifecycle
**Description**: Handle SIGTERM for zero-downtime deployments.

```typescript
// main.ts
app.enableShutdownHooks();

// In service
@Injectable()
export class GracefulShutdown implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Received ${signal} — starting graceful shutdown`);
    // 1. Stop accepting new connections (NestJS does this automatically)
    // 2. Finish in-flight requests (within terminationGracePeriodSeconds)
    // 3. Close database connections
    await this.dataSource.destroy();
    // 4. Close Redis connections
    await this.redis.quit();
    // 5. Close message broker connections
    await this.rabbitConnection.close();
    this.logger.log('Graceful shutdown complete');
  }
}
```

**Key Points**:
- `app.enableShutdownHooks()` — required for lifecycle hooks to trigger
- K8s sends SIGTERM → waits terminationGracePeriodSeconds → sends SIGKILL
- Match NestJS shutdown timeout ≤ K8s terminationGracePeriodSeconds
- Close connections in reverse order of creation

---

### Pattern 243.5: Horizontal Pod Autoscaler

**Category**: Scaling
**Description**: Auto-scale NestJS pods based on CPU/memory/custom metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lending-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lending-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
    - type: Resource
      resource:
        name: memory
        target: { type: Utilization, averageUtilization: 80 }
  behavior:
    scaleUp: { stabilizationWindowSeconds: 30 }
    scaleDown: { stabilizationWindowSeconds: 300 }
```

**Key Points**:
- minReplicas: 2 for high availability (survive 1 pod failure)
- CPU target 70% — leaves headroom for traffic spikes
- scaleDown stabilization 300s — prevents flapping during variable load

---

### Pattern 243.6: Service & Ingress

**Category**: Networking
**Description**: K8s Service + Ingress for external access.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: lending-service
spec:
  selector: { app: lending-service }
  ports:
    - name: http
      port: 80
      targetPort: 3000
    - name: grpc
      port: 50051
      targetPort: 50051

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lending-service-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts: [api.example.com]
      secretName: tls-cert
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /lending
            pathType: Prefix
            backend:
              service: { name: lending-service, port: { number: 80 } }
```

---

## Best Practices

### Resource Management
- Always set resource requests AND limits
- Start conservative: 100m CPU / 256Mi RAM — increase based on actual usage
- Use Vertical Pod Autoscaler (VPA) in recommend mode to find optimal values

### Zero-Downtime Deployment
- Rolling update strategy (default) — new pods start before old ones terminate
- readinessProbe gates traffic — new pod serves only when dependencies are ready
- preStop hook with `sleep 5` — allows Service to remove pod from endpoints

### Security
- Non-root container (USER in Dockerfile)
- Read-only root filesystem where possible
- Network policies to restrict pod-to-pod communication

---

## Abnormal Case Patterns

1. **Pod CrashLoopBackOff** — App crashes on startup (missing config). Fix: check ConfigMap/Secret, use startupProbe.
2. **OOMKilled** — Memory limit too low. Fix: increase limits, profile with `--max-old-space-size`.
3. **Liveness probe kills healthy pod** — Long GC pause. Fix: increase `failureThreshold` and `periodSeconds`.
4. **Zero traffic after deploy** — readinessProbe fails. Fix: check health endpoint + dependencies.
5. **Graceful shutdown incomplete** — SIGKILL before connections close. Fix: increase `terminationGracePeriodSeconds`.
6. **Secret rotation requires restart** — Pod reads env only at startup. Fix: use Reloader or watch for Secret changes.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (243.1-243.6)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Kubernetes Specialist — DevOps | EPS v3.2*

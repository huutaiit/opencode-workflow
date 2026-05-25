# FastAPI Kubernetes Specialist
# FastAPI Kubernetesスペシャリスト
# Chuyen Gia Kubernetes FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Directory Pattern** | `k8s/`, `helm/`, `deploy/` |
| **Variant** | ALL |
| **Naming Convention** | `deployment.yaml`, `service.yaml`, `hpa.yaml` |
| **Imports From** | N/A (infrastructure) |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (K8s manifests) |
| **When To Use** | Kubernetes deployment, probes, HPA, graceful shutdown |
| **Source Skeleton** | `k8s/deployment.yaml`, `k8s/service.yaml`, `k8s/configmap.yaml` |
| **Pattern Numbers** | 92.1–92.6 |
| **Source Paths** | `k8s/**/*.yaml`, `helm/**/*.yaml` |
| **File Count** | 3-6 manifest files |
| **Imported By** | N/A (K8s) |
| **Specialist Type** | devops |
| **Purpose** | K8s Deployment manifests, liveness/readiness probes, HPA autoscaling, graceful shutdown, ConfigMap/Secret, Helm basics |
| **Activation Trigger** | kubernetes, k8s, deployment, pod, hpa, helm, probe |

---

## Purpose

Define Kubernetes deployment patterns for FastAPI: Deployment manifests with probes and resource limits, liveness/readiness probe configuration, HPA autoscaling, graceful shutdown flow, ConfigMap vs Secret management, and Helm chart basics.

---

## Pattern 92.1: Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
  labels:
    app: fastapi-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fastapi-app
  template:
    metadata:
      labels:
        app: fastapi-app
    spec:
      terminationGracePeriodSeconds: 35
      containers:
        - name: api
          image: myregistry/fastapi-app:1.0.0
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          envFrom:
            - configMapRef:
                name: fastapi-config
            - secretRef:
                name: fastapi-secrets
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 15
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "5"]  # Allow LB to drain connections
---
apiVersion: v1
kind: Service
metadata:
  name: fastapi-service
spec:
  selector:
    app: fastapi-app
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP
```

---

## Pattern 92.2: Probes Configuration

```yaml
# Liveness: Is the process alive?
# Failure → Kubernetes RESTARTS the pod
livenessProbe:
  httpGet:
    path: /health/live   # Simple, NO external deps
    port: 8000
  initialDelaySeconds: 10  # Wait for app to start
  periodSeconds: 15
  timeoutSeconds: 3
  failureThreshold: 3      # 3 failures → restart

# Readiness: Can it handle traffic?
# Failure → Kubernetes REMOVES from load balancer
readinessProbe:
  httpGet:
    path: /health/ready   # Checks DB, Redis, etc.
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# Startup: Is the app still starting?
# Failure → Kubernetes KILLS the pod (not ready in time)
startupProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 30     # 30 * 5s = 150s max startup time
```

---

## Pattern 92.3: HPA (Horizontal Pod Autoscaler)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fastapi-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fastapi-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale up at 70% CPU
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60            # Remove max 1 pod per minute
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60            # Add max 2 pods per minute
```

---

## Pattern 92.4: Graceful Shutdown Flow

```
1. K8s sends SIGTERM to pod
2. preStop hook runs: sleep 5 (allows LB to drain)
3. Gunicorn receives SIGTERM
4. Gunicorn stops accepting new connections
5. Workers finish current requests (graceful_timeout=30s)
6. Workers exit
7. If still running after terminationGracePeriodSeconds (35s) → SIGKILL
```

```python
# gunicorn_conf.py
graceful_timeout = 30     # Time for workers to finish requests
timeout = 120             # Max time per request

# FastAPI shutdown handler
@asynccontextmanager
async def lifespan(app):
    # Startup
    await init_resources()
    yield
    # Shutdown — clean up resources
    await close_db_pool()
    await close_redis()
    await close_http_clients()
```

**Key rule**: `terminationGracePeriodSeconds` > `preStop sleep` + `graceful_timeout`

---

## Pattern 92.5: ConfigMap vs Secret

```yaml
# ConfigMap: non-sensitive configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: fastapi-config
data:
  ENVIRONMENT: production
  LOG_LEVEL: INFO
  CORS_ORIGINS: "https://app.example.com"
  WORKERS: "4"

---
# Secret: sensitive credentials
apiVersion: v1
kind: Secret
metadata:
  name: fastapi-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql+asyncpg://user:pass@db:5432/app
  REDIS_URL: redis://:password@redis:6379
  SECRET_KEY: your-secret-key-here
  OPENAI_API_KEY: sk-...
```

---

## Pattern 92.6: Helm Chart Basics

```
helm/fastapi-app/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── hpa.yaml
│   └── configmap.yaml
```

```yaml
# values.yaml
replicaCount: 2
image:
  repository: myregistry/fastapi-app
  tag: "1.0.0"
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPU: 70
```

```bash
# Install
helm install my-api ./helm/fastapi-app -f values-prod.yaml

# Upgrade
helm upgrade my-api ./helm/fastapi-app --set image.tag=1.1.0
```

---

## MUST DO

- Set resource requests AND limits on all containers
- Use liveness (no deps) and readiness (with deps) probes separately
- Add preStop hook for connection draining
- Set `terminationGracePeriodSeconds` > preStop + graceful_timeout
- Use HPA with stabilization windows
- Use Secrets for credentials (not ConfigMap)

## MUST NOT DO

- Check external deps in liveness probe (unnecessary restarts)
- Skip resource limits (unbounded pod can OOM the node)
- Set `terminationGracePeriodSeconds` too short (kills in-flight requests)
- Store secrets in ConfigMap
- Scale to zero replicas (use minReplicas >= 2 for availability)
- Use `latest` image tag in deployments

---

## References

- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Helm](https://helm.sh/docs/)

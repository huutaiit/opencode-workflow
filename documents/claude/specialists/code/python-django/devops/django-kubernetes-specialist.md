# Django Kubernetes Specialist
# Django Kubernetesスペシャリスト
# Chuyen Gia Kubernetes Django

**Stack**: Python 3.12+ / Django 5.x / Kubernetes | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Directory Pattern** | `k8s/`, `helm/` |
| **Variant** | ALL |
| **Naming Convention** | `deployment.yaml`, `service.yaml`, `configmap.yaml` |
| **Imports From** | — |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | deployment-manifest, migrate-init-container, collectstatic-init, health-probes, hpa, configmap-secret |
| **Pattern Numbers** | 46.6–46.11 |
| **Source Paths** | `k8s/*.yaml` |
| **File Count** | 5-8 K8s manifests |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | K8s Deployment with probes and resources, migrate init container, collectstatic strategy, health check views, HPA auto-scaling, ConfigMap vs Secret for Django settings |
| **Activation Trigger** | kubernetes, k8s, deployment, pod, helm, init container, probe |

---

## Purpose

Define Django Kubernetes patterns: Deployment manifest with resource limits and probes, database migration via init container, collectstatic strategies, health check endpoints for liveness and readiness, Horizontal Pod Autoscaler, and ConfigMap/Secret separation for Django settings.

---

## Pattern 46.6: Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: django-web
  labels:
    app: django-web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: django-web
  template:
    metadata:
      labels:
        app: django-web
    spec:
      initContainers:
        - name: migrate
          image: myapp:latest
          command: ["python", "manage.py", "migrate", "--noinput"]
          envFrom:
            - configMapRef:
                name: django-config
            - secretRef:
                name: django-secrets

      containers:
        - name: web
          image: myapp:latest
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: django-config
            - secretRef:
                name: django-secrets
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health/live/
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 30
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready/
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /health/live/
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 30
```

---

## Pattern 46.7: Migrate Init Container

```yaml
# Init container runs BEFORE the main container
initContainers:
  - name: migrate
    image: myapp:latest
    command: ["python", "manage.py", "migrate", "--noinput"]
    envFrom:
      - configMapRef:
          name: django-config
      - secretRef:
          name: django-secrets
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "256Mi"
```

Migrations run once per deployment rollout, before any web pod starts. If migration fails, the pod stays in Init state and doesn't receive traffic.

---

## Pattern 46.8: collectstatic Strategy

```dockerfile
# PREFERRED: collectstatic during Docker build
# (Already in Dockerfile — Pattern 45.1)
RUN DJANGO_SETTINGS_MODULE=config.settings.production \
    SECRET_KEY=build-placeholder \
    python manage.py collectstatic --noinput
```

```yaml
# Alternative: collectstatic as init container (when static files need runtime config)
initContainers:
  - name: collectstatic
    image: myapp:latest
    command: ["python", "manage.py", "collectstatic", "--noinput"]
    envFrom:
      - configMapRef:
          name: django-config
    volumeMounts:
      - name: static-files
        mountPath: /app/staticfiles

volumes:
  - name: static-files
    emptyDir: {}
```

---

## Pattern 46.9: Health Check Views

```python
# apps/core/views.py
from django.http import JsonResponse
from django.db import connection


def liveness(request):
    """Liveness probe — is the process alive? No external deps."""
    return JsonResponse({"status": "ok"})


def readiness(request):
    """Readiness probe — can the app serve traffic? Check DB + Redis."""
    checks = {}

    # Database check
    try:
        connection.ensure_connection()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = str(e)
        return JsonResponse({"status": "error", "checks": checks}, status=503)

    # Redis check
    try:
        from django.core.cache import cache
        cache.set("health_check", "ok", timeout=10)
        assert cache.get("health_check") == "ok"
        checks["cache"] = "ok"
    except Exception as e:
        checks["cache"] = str(e)
        return JsonResponse({"status": "error", "checks": checks}, status=503)

    return JsonResponse({"status": "ok", "checks": checks})
```

```python
# urls.py
urlpatterns = [
    path("health/live/", liveness, name="health-live"),
    path("health/ready/", readiness, name="health-ready"),
]
```

---

## Pattern 46.10: HPA Configuration

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: django-web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: django-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
```

---

## Pattern 46.11: ConfigMap vs Secret

```yaml
# k8s/configmap.yaml — Non-sensitive settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: django-config
data:
  DJANGO_SETTINGS_MODULE: "config.settings.production"
  ALLOWED_HOSTS: "myapp.example.com,www.myapp.example.com"
  DEBUG: "False"
  CELERY_BROKER_URL: "redis://redis-svc:6379/0"
  STATIC_URL: "/static/"
```

```yaml
# k8s/secret.yaml — Sensitive settings (base64 encoded)
apiVersion: v1
kind: Secret
metadata:
  name: django-secrets
type: Opaque
data:
  SECRET_KEY: <base64-encoded>
  DATABASE_URL: <base64-encoded>
  AWS_ACCESS_KEY_ID: <base64-encoded>
  AWS_SECRET_ACCESS_KEY: <base64-encoded>
  SENTRY_DSN: <base64-encoded>
```

```bash
# Create secret from .env file
kubectl create secret generic django-secrets --from-env-file=.env.production

# Or with individual values
kubectl create secret generic django-secrets \
  --from-literal=SECRET_KEY='your-secret-key' \
  --from-literal=DATABASE_URL='postgres://...'
```

---

## MUST DO

- Run migrations as init container (not in app startup)
- Separate liveness (process alive) from readiness (can serve) probes
- Use ConfigMap for non-sensitive, Secret for sensitive settings
- Set resource requests AND limits on all containers
- Use `Recreate` strategy for Celery Beat deployment

## MUST NOT DO

- Check database in liveness probe (causes restart loops during DB maintenance)
- Run migrations inside the main container entrypoint
- Store secrets in ConfigMap
- Skip startup probe (causes premature restarts during slow startup)
- Run multiple Celery Beat replicas

---

## References

- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes: HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)

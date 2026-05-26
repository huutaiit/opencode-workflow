# Laravel Kubernetes Specialist — DevOps
# Laravel Kubernetesスペシャリスト — デブオプス
# Chuyen Gia Kubernetes Laravel — Van Hanh

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Kubernetes
**Aspect**: Kubernetes Deployment & Orchestration
**Category**: devops
**Purpose**: Knowledge provider for Laravel Kubernetes deployments — deployment manifests, services, ingress, ConfigMap/Secret, horizontal pod autoscaler, cron jobs for scheduler, and persistent volumes for storage

---

## Metadata

```json
{
  "id": "laravel-kubernetes-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Kubernetes",
  "aspect": "Kubernetes Deployment & Orchestration",
  "category": "devops",
  "subcategory": "php-laravel",
  "lines": 440,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: Kubernetes Deployment — declarative pod management with rolling updates",
    "E2: ConfigMap/Secret — externalized configuration for 12-factor compliance",
    "E3: HPA — CPU/memory-based horizontal scaling for Laravel workloads"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 362.1–362.6 |
| **Directory Pattern** | `k8s/`, `deploy/k8s/` |
| **Naming Convention** | `{resource}-{name}.yaml` |
| **Imports From** | Application (container image), DevOps (Docker image) |
| **Imported By** | Production/Staging clusters |
| **Cannot Import** | N/A |
| **Dependencies** | Kubernetes 1.28+, kubectl, Helm (optional) |
| **When To Use** | Laravel projects deploying to Kubernetes clusters |
| **Source Skeleton** | `k8s/deployment.yaml`, `k8s/service.yaml`, `k8s/ingress.yaml` |
| **Specialist Type** | code |
| **Purpose** | Kubernetes deployment — manifests, services, ingress, config, autoscaling, cron, storage |
| **Activation Trigger** | files: `k8s/*.yaml`, `deploy/k8s/*.yaml`; keywords: Kubernetes, k8s, kubectl, deployment, pod, ingress |

---

## Role

You are a **Laravel Kubernetes Specialist**. Your responsibility is to provide best practices for deploying Laravel 11+ applications on Kubernetes — deployment manifests with rolling updates, service and ingress configuration, ConfigMap/Secret management, horizontal pod autoscaling, scheduler as CronJob, and persistent volume claims for file storage.

**Used by**: Any code agent deploying Laravel to Kubernetes clusters
**Not used by**: Local development (see laravel-docker-compose-specialist), non-containerized deployments

---

## Patterns

### Pattern 362.1: Kubernetes Deployment Manifest

**Category**: Workload Management
**Description**: Laravel deployment with PHP-FPM + Nginx sidecar, rolling update strategy, and health probes.

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: laravel-app
  namespace: production
  labels:
    app: laravel
    tier: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: laravel
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: laravel
        tier: backend
    spec:
      initContainers:
        - name: migrate
          image: registry.example.com/laravel-app:latest
          command: ["php", "artisan", "migrate", "--force"]
          envFrom:
            - configMapRef:
                name: laravel-config
            - secretRef:
                name: laravel-secrets
      containers:
        - name: php-fpm
          image: registry.example.com/laravel-app:latest
          ports:
            - containerPort: 9000
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          envFrom:
            - configMapRef:
                name: laravel-config
            - secretRef:
                name: laravel-secrets
          readinessProbe:
            exec:
              command:
                - php-fpm-healthcheck
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            exec:
              command:
                - php-fpm-healthcheck
            initialDelaySeconds: 15
            periodSeconds: 30
          volumeMounts:
            - name: storage
              mountPath: /var/www/storage/app/public
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
            - name: app-public
              mountPath: /var/www/public
              readOnly: true
          readinessProbe:
            httpGet:
              path: /up
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: storage
          persistentVolumeClaim:
            claimName: laravel-storage
        - name: nginx-config
          configMap:
            name: nginx-config
        - name: app-public
          emptyDir: {}
```

**Key Points**:
- `initContainers` run migrations before app starts — atomic deploy + migrate
- `maxUnavailable: 0` ensures zero-downtime during rolling update
- PHP-FPM and Nginx as sidecar containers in same pod — communicate via localhost:9000
- Resource `requests` for scheduling, `limits` for protection — never skip limits
- Readiness probe gates traffic — pod only receives requests when healthy
- Liveness probe restarts stuck pods — higher `initialDelaySeconds` than readiness

---

### Pattern 362.2: Service + Ingress

**Category**: Networking
**Description**: ClusterIP service and Ingress resource for external traffic routing.

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: laravel-service
  namespace: production
  labels:
    app: laravel
spec:
  type: ClusterIP
  selector:
    app: laravel
  ports:
    - name: http
      port: 80
      targetPort: 80
      protocol: TCP
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: laravel-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "64m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: laravel-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: laravel-service
                port:
                  number: 80
```

**Key Points**:
- ClusterIP service — internal-only, Ingress handles external traffic
- Ingress annotations configure proxy timeouts and body size for file uploads
- TLS via cert-manager + Let's Encrypt — automatic certificate renewal
- `proxy-body-size: 64m` matches Laravel's `upload_max_filesize` setting
- One Ingress per domain — multiple path rules for API and web routes

---

### Pattern 362.3: ConfigMap and Secret

**Category**: Configuration Management
**Description**: Externalized Laravel configuration via Kubernetes ConfigMap and Secret resources.

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: laravel-config
  namespace: production
data:
  APP_NAME: "MyApp"
  APP_ENV: "production"
  APP_DEBUG: "false"
  APP_URL: "https://app.example.com"
  LOG_CHANNEL: "stderr"
  LOG_LEVEL: "warning"
  DB_CONNECTION: "mysql"
  DB_HOST: "mysql-service"
  DB_PORT: "3306"
  DB_DATABASE: "laravel"
  CACHE_DRIVER: "redis"
  QUEUE_CONNECTION: "redis"
  SESSION_DRIVER: "redis"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: laravel-secrets
  namespace: production
type: Opaque
stringData:
  APP_KEY: "base64:your-app-key-here"
  DB_USERNAME: "laravel_prod"
  DB_PASSWORD: "secure-db-password"
  REDIS_PASSWORD: "secure-redis-password"
  MAIL_PASSWORD: "smtp-password"
  AWS_SECRET_ACCESS_KEY: "aws-secret-key"
```

```yaml
# k8s/sealed-secret.yaml — for GitOps (encrypted secrets in repo)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: laravel-secrets
  namespace: production
spec:
  encryptedData:
    APP_KEY: AgBy8h...encrypted...
    DB_PASSWORD: AgCx9k...encrypted...
```

**Key Points**:
- ConfigMap for non-sensitive values — committed to repository
- Secret for sensitive values — `stringData` accepts plain text (encoded at rest by K8s)
- `envFrom` in deployment injects all keys as environment variables
- SealedSecrets for GitOps — encrypted secrets safe to commit to git
- Never use `data:` with raw values in Secret — use `stringData:` or base64 encode
- `LOG_CHANNEL: stderr` required — K8s collects stdout/stderr as pod logs

---

### Pattern 362.4: Horizontal Pod Autoscaler

**Category**: Autoscaling
**Description**: CPU and memory-based autoscaling for Laravel workloads.

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: laravel-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: laravel-app
  minReplicas: 3
  maxReplicas: 20
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
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

```yaml
# k8s/hpa-queue-worker.yaml — separate HPA for queue workers
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: laravel-queue-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: laravel-queue-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

**Key Points**:
- `minReplicas: 3` ensures high availability — never scale below HA threshold
- CPU target 70% — leaves headroom for traffic spikes before new pods are ready
- `stabilizationWindowSeconds` prevents flapping — 60s for scale-up, 300s for scale-down
- Scale-down is conservative (1 pod per 120s) — avoid aggressive scale-down during recovery
- Separate HPA for queue workers — different scaling characteristics than web pods
- Metrics Server must be installed in cluster for HPA to function

---

### Pattern 362.5: CronJob for Laravel Scheduler

**Category**: Scheduled Tasks
**Description**: Kubernetes CronJob to run Laravel's task scheduler every minute.

```yaml
# k8s/cronjob-scheduler.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: laravel-scheduler
  namespace: production
spec:
  schedule: "* * * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      backoffLimit: 0
      activeDeadlineSeconds: 120
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: scheduler
              image: registry.example.com/laravel-app:latest
              command: ["php", "artisan", "schedule:run", "--verbose", "--no-interaction"]
              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
                limits:
                  cpu: 500m
                  memory: 256Mi
              envFrom:
                - configMapRef:
                    name: laravel-config
                - secretRef:
                    name: laravel-secrets
```

```yaml
# k8s/deployment-queue-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: laravel-queue-worker
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: laravel-queue
  template:
    metadata:
      labels:
        app: laravel-queue
    spec:
      containers:
        - name: queue-worker
          image: registry.example.com/laravel-app:latest
          command:
            - php
            - artisan
            - queue:work
            - redis
            - --sleep=3
            - --tries=3
            - --max-jobs=1000
            - --max-time=3600
            - --timeout=60
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          envFrom:
            - configMapRef:
                name: laravel-config
            - secretRef:
                name: laravel-secrets
          lifecycle:
            preStop:
              exec:
                command: ["php", "artisan", "queue:restart"]
      terminationGracePeriodSeconds: 120
```

**Key Points**:
- `concurrencyPolicy: Forbid` prevents overlapping scheduler runs
- `backoffLimit: 0` with `restartPolicy: Never` — single attempt, fail cleanly
- `activeDeadlineSeconds: 120` kills hung scheduler jobs after 2 minutes
- Queue worker `--max-jobs=1000 --max-time=3600` — auto-restart for memory leak prevention
- `preStop` lifecycle hook signals graceful queue shutdown before pod termination
- `terminationGracePeriodSeconds: 120` gives workers time to finish current job

---

### Pattern 362.6: Persistent Volumes for Storage

**Category**: Storage
**Description**: PersistentVolumeClaim for Laravel file storage and shared uploads.

```yaml
# k8s/pvc-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: laravel-storage
  namespace: production
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 50Gi
---
# k8s/storageclass-efs.yaml (AWS EFS example)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0
  directoryPerms: "755"
  uid: "33"
  gid: "33"
```

```php
<?php

declare(strict_types=1);

// config/filesystems.php — K8s-aware storage configuration

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL') . '/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // Recommended for K8s: use S3 instead of local PVC
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'ap-northeast-1'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE', false),
            'throw' => false,
        ],
    ],
];
```

**Key Points**:
- `ReadWriteMany` required when multiple pods need shared file access
- EFS (AWS), Filestore (GCP), Azure Files — network filesystems for RWX access
- `uid: 33` / `gid: 33` matches www-data user inside PHP-FPM container
- Prefer S3/object storage over PVC for file uploads — scales better, no RWX complexity
- PVC for session files or temporary processing — use Redis for sessions in K8s instead
- StorageClass defines dynamic provisioning — PVC auto-creates underlying volume

---

## Best Practices

- **Externalize all config** — ConfigMap + Secret, never bake `.env` into container image
- **Log to stderr** — K8s collects container stdout/stderr, don't write log files
- **Use init containers for migrations** — atomic deploy + migrate, rollback-safe
- **Separate workloads** — web, queue, scheduler as independent deployments
- **Prefer S3 over PVC** — object storage for uploads, PVC only for truly shared filesystem needs
- **Set resource limits** — prevent OOM kills and noisy neighbor issues
- **Graceful shutdown** — `preStop` hooks and `terminationGracePeriodSeconds` for queue workers
- **Conservative scale-down** — prevent premature scale-down during traffic recovery
- **Image tags, not latest** — use semantic versioning or git SHA for reproducible deployments

---

## Abnormal Case Patterns

1. **Migrations run on every pod** — init container runs in all replicas simultaneously. Fix: use Kubernetes Job for migrations instead, or add migration lock (`--isolated` flag in Laravel 11).

2. **Pod evicted due to OOM** — PHP-FPM memory exceeds limits. Fix: tune `memory_limit` in php.ini to match container limits minus overhead.

3. **CronJob overlap** — scheduler runs pile up when previous hasn't finished. Fix: `concurrencyPolicy: Forbid` plus `activeDeadlineSeconds` timeout.

4. **PVC stuck in Pending** — StorageClass doesn't support `ReadWriteMany`. Fix: use EFS/NFS-based StorageClass or switch to S3.

5. **Queue worker ignores SIGTERM** — pod killed after 30s default grace period while processing long job. Fix: set `terminationGracePeriodSeconds: 120` and use `--timeout=60` on queue command.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (362.1–362.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Kubernetes Specialist — DevOps | EPS v3.2*

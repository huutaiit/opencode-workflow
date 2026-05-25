# Laravel Docker Deployment Specialist — Infrastructure
# Laravel Dockerデプロイメントスペシャリスト — インフラストラクチャ
# Chuyen Gia Trien Khai Docker Laravel — Ha Tang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Docker
**Aspect**: Docker Deployment
**Category**: infrastructure
**Purpose**: Knowledge provider for Laravel Docker deployment — Dockerfile multi-stage builds, PHP-FPM + Nginx configuration, environment management, health checks, and production optimization

---

## Metadata

```json
{
  "id": "laravel-docker-deployment-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Docker",
  "aspect": "Docker Deployment",
  "category": "infrastructure",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Docker official PHP-FPM image — multi-stage build for production",
    "E2: Nginx + PHP-FPM socket communication — Unix socket vs TCP",
    "E3: Laravel 11 environment configuration — .env handling in containers"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 349.1–349.6 |
| **Directory Pattern** | `docker/`, `Dockerfile` |
| **Naming Convention** | `Dockerfile`, `docker-compose.yml`, `docker/*.conf` |
| **Imports From** | Application (built artifacts) |
| **Imported By** | CI/CD pipelines, orchestration platforms |
| **Cannot Import** | Domain logic, business rules |
| **Dependencies** | `php:8.3-fpm-alpine`, `nginx:alpine` |
| **When To Use** | Containerized Laravel deployments — dev, staging, production |
| **Source Skeleton** | `docker/`, `Dockerfile`, `docker-compose.yml` |
| **Specialist Type** | code |
| **Purpose** | Docker containerization for Laravel — multi-stage builds, PHP-FPM tuning, Nginx reverse proxy, health checks |
| **Activation Trigger** | files: `Dockerfile`, `docker-compose.yml`, `docker/*.conf`; keywords: docker, container, php-fpm, nginx, deployment |

---

## Role

You are a **Laravel Docker Deployment Specialist**. Your responsibility is to provide best practices for containerizing Laravel 11 applications with PHP 8.3 — multi-stage Dockerfile builds, PHP-FPM and Nginx configuration, environment variable management, health check endpoints, and production optimization strategies.

**Used by**: Any code agent deploying Laravel applications in Docker containers
**Not used by**: Non-containerized deployments, serverless platforms (use dedicated specialist)

---

## Patterns

### Pattern 349.1: Dockerfile with PHP-FPM and Nginx

**Category**: Container Setup
**Description**: Production-ready Dockerfile combining PHP 8.3-FPM with Nginx in a single container using supervisor.

```php
# Dockerfile
FROM php:8.3-fpm-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    libpng-dev \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    && docker-php-ext-install \
    pdo_mysql \
    mbstring \
    zip \
    intl \
    opcache \
    pcntl \
    bcmath \
    gd

# Configure PHP-FPM
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-app.ini

# Configure Nginx
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf

# Configure Supervisor
COPY docker/supervisor/supervisord.conf /etc/supervisord.conf

WORKDIR /var/www/html

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
```

```ini
; docker/supervisor/supervisord.conf
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0
pidfile=/var/run/supervisord.pid

[program:php-fpm]
command=php-fpm --nodaemonize
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g 'daemon off;'
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

**Key Points**:
- Alpine-based image minimizes attack surface and image size
- Supervisor manages both PHP-FPM and Nginx processes
- Log to stdout/stderr for Docker log aggregation
- Install only required PHP extensions for the application

---

### Pattern 349.2: Multi-Stage Build

**Category**: Build Optimization
**Description**: Multi-stage Dockerfile separating dependency installation, asset compilation, and runtime.

```dockerfile
# Stage 1: Composer dependencies
FROM composer:2 AS composer-deps
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist

COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative

# Stage 2: Frontend assets
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json vite.config.js ./
RUN npm ci --production=false
COPY resources/ resources/
COPY public/ public/
RUN npm run build

# Stage 3: Production runtime
FROM php:8.3-fpm-alpine AS production

RUN apk add --no-cache nginx supervisor \
    && docker-php-ext-install pdo_mysql opcache pcntl bcmath

COPY --from=composer-deps /app/vendor /var/www/html/vendor
COPY --from=frontend /app/public/build /var/www/html/public/build
COPY . /var/www/html

WORKDIR /var/www/html
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && chown -R www-data:www-data storage bootstrap/cache
```

**Key Points**:
- Stage 1 installs Composer deps without dev packages
- Stage 2 compiles Vite/frontend assets independently
- Stage 3 copies only built artifacts — no Node.js, no Composer in production
- Cache config/routes/views during build for zero-startup cost

---

### Pattern 349.3: Docker Entrypoint Script

**Category**: Container Lifecycle
**Description**: Entrypoint script handling pre-start tasks — migrations, caching, permissions.

```bash
#!/bin/sh
# docker/entrypoint.sh
set -e

echo "[entrypoint] Starting Laravel application..."

# Wait for database
until php artisan db:monitor --databases=mysql 2>/dev/null; do
    echo "[entrypoint] Waiting for database connection..."
    sleep 2
done

# Run migrations (only if ENABLE_MIGRATIONS=true)
if [ "${ENABLE_MIGRATIONS}" = "true" ]; then
    echo "[entrypoint] Running migrations..."
    php artisan migrate --force --no-interaction
fi

# Cache configuration (if not already cached in build)
if [ ! -f bootstrap/cache/config.php ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

# Fix storage permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Create storage link if missing
php artisan storage:link 2>/dev/null || true

echo "[entrypoint] Application ready."

exec "$@"
```

```dockerfile
# In Dockerfile
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
```

**Key Points**:
- `set -e` ensures the container fails fast on errors
- Database readiness check prevents premature migrations
- Migration toggle via environment variable — never auto-migrate by default
- `exec "$@"` replaces the shell with the CMD process (proper signal handling)

---

### Pattern 349.4: Environment Configuration

**Category**: Configuration Management
**Description**: Environment variable handling for containerized Laravel — secrets, config overrides, runtime settings.

```php
<?php
// config/database.php — container-friendly configuration
declare(strict_types=1);

return [
    'default' => env('DB_CONNECTION', 'mysql'),

    'connections' => [
        'mysql' => [
            'driver' => 'mysql',
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'laravel'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'pool' => [
                'min' => (int) env('DB_POOL_MIN', 2),
                'max' => (int) env('DB_POOL_MAX', 10),
            ],
        ],
    ],
];
```

```yaml
# docker-compose.yml — environment configuration
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    environment:
      APP_ENV: production
      APP_KEY: "${APP_KEY}"
      APP_DEBUG: "false"
      DB_HOST: mysql
      DB_DATABASE: "${DB_DATABASE}"
      DB_USERNAME: "${DB_USERNAME}"
      DB_PASSWORD: "${DB_PASSWORD}"
      CACHE_DRIVER: redis
      SESSION_DRIVER: redis
      QUEUE_CONNECTION: redis
      REDIS_HOST: redis
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
```

**Key Points**:
- Never bake `.env` files into Docker images
- Use `docker-compose.yml` or orchestrator secrets for environment injection
- Cast environment values explicitly — `(int) env()` for numeric config
- Use `depends_on` with health conditions for service ordering

---

### Pattern 349.5: Health Checks

**Category**: Observability
**Description**: Container and application health check configuration for orchestration platforms.

```php
<?php
// routes/api.php or bootstrap/app.php
declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

// Laravel 11 built-in health route (configured in bootstrap/app.php)
// ->withRouting(health: '/up')

// Custom detailed health check
Route::get('/health', function () {
    $checks = [
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
        'checks' => [],
    ];

    // Database check
    try {
        DB::connection()->getPdo();
        $checks['checks']['database'] = 'ok';
    } catch (\Throwable $e) {
        $checks['checks']['database'] = 'fail';
        $checks['status'] = 'degraded';
    }

    // Cache check
    try {
        Cache::store()->put('health_check', true, 10);
        Cache::store()->forget('health_check');
        $checks['checks']['cache'] = 'ok';
    } catch (\Throwable $e) {
        $checks['checks']['cache'] = 'fail';
        $checks['status'] = 'degraded';
    }

    $statusCode = $checks['status'] === 'ok' ? 200 : 503;

    return response()->json($checks, $statusCode);
});
```

```dockerfile
# Dockerfile health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/up || exit 1
```

```yaml
# docker-compose.yml health checks
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/up"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  mysql:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**Key Points**:
- Use Laravel 11 built-in `/up` for basic liveness checks
- Custom `/health` endpoint for readiness checks (DB, cache, queue)
- Return 503 for degraded state — orchestrators will restart or remove from load balancer
- `start_period` gives the application time to boot before health checks begin

---

### Pattern 349.6: Production Optimization

**Category**: Performance
**Description**: PHP-FPM tuning, OPcache configuration, and Nginx optimization for production containers.

```ini
; docker/php/php.ini — Production PHP configuration
[opcache]
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=32
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.save_comments=1
opcache.jit=1255
opcache.jit_buffer_size=128M

[php]
memory_limit=256M
upload_max_filesize=64M
post_max_size=64M
max_execution_time=60
expose_php=Off
display_errors=Off
log_errors=On
error_log=/dev/stderr
realpath_cache_size=4096K
realpath_cache_ttl=600
```

```ini
; docker/php/www.conf — PHP-FPM pool tuning
[www]
user = www-data
group = www-data
listen = /var/run/php-fpm.sock
listen.owner = www-data
listen.group = www-data

pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 1000
pm.process_idle_timeout = 10s

request_terminate_timeout = 60s
request_slowlog_timeout = 5s
slowlog = /dev/stderr
```

```nginx
# docker/nginx/default.conf
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php;

    client_max_body_size 64M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;

    # Static file caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

**Key Points**:
- `opcache.validate_timestamps=0` in production — never stat files for changes
- JIT enabled with `opcache.jit=1255` for PHP 8.3 performance gains
- `pm.max_requests=1000` prevents PHP-FPM memory leaks over time
- Unix socket (`listen = /var/run/php-fpm.sock`) faster than TCP for same-container communication
- Nginx serves static files directly — never route through PHP

---

## Best Practices

- **Multi-stage builds always** — never ship Composer or Node.js in production images
- **No .env in images** — inject environment variables via orchestrator or docker-compose
- **OPcache validate_timestamps=0** — files never change in production containers
- **PHP-FPM max_requests** — restart workers periodically to prevent memory bloat
- **Unix socket over TCP** — lower latency when PHP-FPM and Nginx share a container
- **Alpine base images** — smaller attack surface, faster pulls
- **Cache artisan commands in build** — `config:cache`, `route:cache`, `view:cache`
- **Non-root user** — run PHP-FPM as www-data, never as root
- **Log to stdout/stderr** — let Docker handle log aggregation

---

## Abnormal Case Patterns

1. **OPcache stale code after deploy** — `validate_timestamps=0` means OPcache never checks for file changes. Fix: restart PHP-FPM (container restart) on every deploy; never hot-swap code in running containers.

2. **Permission denied on storage/** — container user mismatch with file ownership. Fix: `chown -R www-data:www-data storage bootstrap/cache` in Dockerfile or entrypoint.

3. **Database connection refused during startup** — application starts before MySQL is ready. Fix: entrypoint waits for DB with `db:monitor` or `mysqladmin ping` loop; use `depends_on` with health conditions.

4. **Memory exhaustion under load** — `pm.max_children` too high for container memory limit. Fix: calculate `max_children = container_memory / avg_php_worker_memory`; set container memory limit in orchestrator.

5. **Nginx 502 Bad Gateway** — PHP-FPM socket not ready or pool exhausted. Fix: verify socket path matches between Nginx and PHP-FPM config; increase `pm.max_children` or add `start_period` to health check.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (349.1–349.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Docker Deployment Specialist — Infrastructure | EPS v3.2*

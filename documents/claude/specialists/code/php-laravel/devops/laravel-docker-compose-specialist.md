# Laravel Docker Compose Specialist — DevOps
# Laravel Docker Composeスペシャリスト — デブオプス
# Chuyen Gia Docker Compose Laravel — Van Hanh

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Docker Compose + Laravel Sail
**Aspect**: Local Development Containers
**Category**: devops
**Purpose**: Knowledge provider for Laravel Docker development — Docker Compose configuration, PHP-FPM + Nginx + MySQL + Redis stack, Laravel Sail, volume mounts, and service dependencies

---

## Metadata

```json
{
  "id": "laravel-docker-compose-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Docker Compose + Laravel Sail",
  "aspect": "Local Development Containers",
  "category": "devops",
  "subcategory": "php-laravel",
  "lines": 400,
  "token_cost": 2700,
  "version": "1.0.0",
  "evidence": [
    "E1: Docker Compose v2 — multi-container orchestration for local dev",
    "E2: PHP-FPM + Nginx — production-like architecture in development",
    "E3: Laravel Sail — official Docker wrapper with artisan integration"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 361.1–361.5 |
| **Directory Pattern** | `docker/`, `docker-compose.yml` |
| **Naming Convention** | `docker-compose.yml`, `Dockerfile`, `docker/{service}/` |
| **Imports From** | Application (source code, config files) |
| **Imported By** | Developer machines, CI runners |
| **Cannot Import** | N/A |
| **Dependencies** | Docker, Docker Compose v2 |
| **When To Use** | Every Laravel project — consistent local development environment |
| **Source Skeleton** | `docker-compose.yml`, `docker/php/Dockerfile` |
| **Specialist Type** | code |
| **Purpose** | Docker Compose for Laravel dev — PHP-FPM, Nginx, MySQL, Redis, Sail, volumes, service dependencies |
| **Activation Trigger** | files: `docker-compose.yml`, `docker/`, `Dockerfile`; keywords: Docker, Sail, container, PHP-FPM |

---

## Role

You are a **Laravel Docker Compose Specialist**. Your responsibility is to provide best practices for Docker-based Laravel development — Docker Compose multi-service configuration, PHP-FPM + Nginx + MySQL + Redis stack, Laravel Sail usage, volume mounting strategies, and service dependency management.

**Used by**: Any code agent setting up Docker-based Laravel development environments
**Not used by**: Production Kubernetes deployments (see laravel-kubernetes-specialist), CI/CD pipelines (see laravel-ci-cd-specialist)

---

## Patterns

### Pattern 361.1: Docker Compose for Development

**Category**: Container Orchestration
**Description**: Complete Docker Compose configuration for Laravel development with all required services.

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
      args:
        PHP_VERSION: '8.3'
    container_name: laravel-app
    restart: unless-stopped
    working_dir: /var/www
    volumes:
      - .:/var/www
      - ./docker/php/php.ini:/usr/local/etc/php/conf.d/custom.ini:ro
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - laravel

  nginx:
    image: nginx:1.25-alpine
    container_name: laravel-nginx
    restart: unless-stopped
    ports:
      - "${APP_PORT:-8080}:80"
    volumes:
      - .:/var/www:ro
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - app
    networks:
      - laravel

  mysql:
    image: mysql:8.0
    container_name: laravel-mysql
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${DB_DATABASE:-laravel}
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-password}
      MYSQL_USER: ${DB_USERNAME:-laravel}
      MYSQL_PASSWORD: ${DB_PASSWORD:-password}
    ports:
      - "${DB_PORT:-3306}:3306"
    volumes:
      - mysql-data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - laravel

  redis:
    image: redis:7-alpine
    container_name: laravel-redis
    restart: unless-stopped
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - laravel

volumes:
  mysql-data:
  redis-data:

networks:
  laravel:
    driver: bridge
```

**Key Points**:
- `depends_on` with `condition: service_healthy` — app waits for DB/Redis readiness
- Named volumes (`mysql-data`, `redis-data`) persist data across container restarts
- Ports use `.env` variables with defaults — avoid conflicts on developer machines
- `:ro` mounts for config files — prevent accidental modification inside container
- Bridge network isolates Laravel services from host network

---

### Pattern 361.2: PHP-FPM + Nginx + MySQL + Redis

**Category**: Service Configuration
**Description**: Production-like PHP-FPM Dockerfile and Nginx configuration for Laravel.

```dockerfile
# docker/php/Dockerfile
ARG PHP_VERSION=8.3

FROM php:${PHP_VERSION}-fpm-alpine

RUN apk add --no-cache \
    git zip unzip libpng-dev libjpeg-turbo-dev \
    freetype-dev icu-dev libzip-dev linux-headers \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_mysql gd intl zip bcmath opcache pcntl \
    && pecl install redis xdebug \
    && docker-php-ext-enable redis

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# PHP configuration
COPY docker/php/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/www.conf

WORKDIR /var/www

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader

COPY . .
RUN composer dump-autoload --optimize

RUN chown -R www-data:www-data storage bootstrap/cache

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
```

```nginx
# docker/nginx/default.conf
server {
    listen 80;
    server_name localhost;
    root /var/www/public;
    index index.php;

    client_max_body_size 64M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }
}
```

```ini
; docker/php/php.ini
[PHP]
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 60
display_errors = On
error_reporting = E_ALL

[opcache]
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 1
opcache.revalidate_freq = 0

[xdebug]
xdebug.mode = debug
xdebug.start_with_request = trigger
xdebug.client_host = host.docker.internal
xdebug.client_port = 9003
```

**Key Points**:
- Alpine-based image minimizes container size (50MB vs 200MB Debian)
- Multi-stage Composer install: `composer.json` first, then source — leverages Docker cache
- `www-data` user — never run PHP-FPM as root
- Opcache with `validate_timestamps=1` for development — set to `0` in production
- Xdebug configured with `start_with_request=trigger` — no performance overhead unless triggered

---

### Pattern 361.3: Laravel Sail

**Category**: Official Docker Wrapper
**Description**: Laravel Sail setup as a lightweight Docker development abstraction.

```bash
# Install Sail into existing project
composer require laravel/sail --dev

# Publish Sail Docker files
php artisan sail:install

# Select services interactively
php artisan sail:install --with=mysql,redis,mailpit,minio

# Start all services
./vendor/bin/sail up -d

# Common Sail commands
./vendor/bin/sail artisan migrate
./vendor/bin/sail composer require package/name
./vendor/bin/sail npm run dev
./vendor/bin/sail test --parallel
./vendor/bin/sail tinker
./vendor/bin/sail shell
```

```bash
# .env — Sail configuration
APP_PORT=80
VITE_PORT=5173
FORWARD_DB_PORT=3306
FORWARD_REDIS_PORT=6379
FORWARD_MAILPIT_PORT=8025

# Sail uses these for service selection
SAIL_XDEBUG_MODE=develop,debug
SAIL_XDEBUG_CONFIG="client_host=host.docker.internal"
```

```bash
# Shell alias for convenience — add to ~/.bashrc or ~/.zshrc
alias sail='sh $([ -f sail ] && echo sail || echo vendor/bin/sail)'

# Then use:
sail up -d
sail artisan migrate
sail test
```

**Key Points**:
- Sail is a thin wrapper around Docker Compose — not a custom runtime
- `sail:install` generates `docker-compose.yml` with selected services
- All `artisan`, `composer`, `npm` commands run inside the container
- Published Dockerfile in `docker/` — customize PHP extensions, Node version
- Sail is development-only — never use in production deployments

---

### Pattern 361.4: Volume Mounts

**Category**: Data Persistence
**Description**: Volume mounting strategies for source code, dependencies, and persistent data.

```yaml
# docker-compose.yml — volume strategies
services:
  app:
    volumes:
      # Source code — bind mount for live editing
      - .:/var/www

      # Vendor isolation — named volume prevents host/container conflicts
      - vendor-volume:/var/www/vendor

      # Node modules isolation — prevents OS-specific binary conflicts
      - node-modules-volume:/var/www/node_modules

      # PHP config — read-only mount
      - ./docker/php/php.ini:/usr/local/etc/php/conf.d/custom.ini:ro

      # Storage persistence across rebuilds
      - storage-data:/var/www/storage/app

  mysql:
    volumes:
      # Named volume — persists database across container recreation
      - mysql-data:/var/lib/mysql

      # Init scripts — run on first startup only
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro

volumes:
  vendor-volume:
  node-modules-volume:
  mysql-data:
  storage-data:
```

```yaml
# docker-compose.override.yml — developer-specific overrides
services:
  app:
    volumes:
      # Xdebug config override for specific developer
      - ./docker/php/xdebug-local.ini:/usr/local/etc/php/conf.d/xdebug.ini:ro
    environment:
      XDEBUG_MODE: debug
```

**Key Points**:
- Bind mounts (`.:/var/www`) for source code — changes reflect immediately
- Named volumes for `vendor/` and `node_modules/` — prevents cross-OS binary conflicts
- Named volumes for database data — survives `docker compose down` (not `down -v`)
- `docker-compose.override.yml` for developer-specific settings — git-ignored
- `:ro` flag on config mounts prevents accidental writes from inside container

---

### Pattern 361.5: Service Dependencies

**Category**: Container Orchestration
**Description**: Service dependency management, health checks, and startup ordering.

```yaml
# docker-compose.yml — dependency management
services:
  app:
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "php-fpm-healthcheck || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  queue-worker:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    command: php artisan queue:work --tries=3 --timeout=60
    restart: unless-stopped
    depends_on:
      app:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/var/www
    networks:
      - laravel

  scheduler:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    command: >
      sh -c "while true; do
        php artisan schedule:run --verbose --no-interaction;
        sleep 60;
      done"
    restart: unless-stopped
    depends_on:
      app:
        condition: service_healthy
    volumes:
      - .:/var/www
    networks:
      - laravel

  mailpit:
    image: axllent/mailpit:latest
    container_name: laravel-mailpit
    ports:
      - "${MAIL_PORT:-1025}:1025"
      - "${MAILPIT_DASHBOARD_PORT:-8025}:8025"
    networks:
      - laravel
```

```php
<?php

declare(strict_types=1);

// app/Providers/AppServiceProvider.php — container readiness check

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Health endpoint for Docker health checks
        if ($this->app->runningInConsole()) {
            return;
        }

        try {
            DB::connection()->getPdo();
            Redis::ping();
        } catch (\Throwable $e) {
            logger()->error('Service dependency not ready', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
```

**Key Points**:
- `condition: service_healthy` ensures database is ready before app starts
- Queue worker and scheduler as separate containers — independent scaling
- Scheduler uses shell loop with 60s sleep — mimics cron inside container
- Mailpit captures all outgoing mail — dashboard at port 8025 for dev inspection
- `start_period` gives containers grace time before health checks begin
- `restart: unless-stopped` auto-recovers crashed workers

---

## Best Practices

- **Use health checks** — `depends_on` without `condition` only checks container started, not service readiness
- **Named volumes for data** — bind mounts for code, named volumes for databases and package managers
- **Alpine images** — 3x smaller than Debian variants, faster pulls and builds
- **Separate worker containers** — queue and scheduler as independent services, not cron inside app
- **git-ignore overrides** — `docker-compose.override.yml` for developer-specific settings
- **Match production stack** — same PHP version, same MySQL version, same Redis version
- **Don't run as root** — `USER www-data` in Dockerfile for security parity with production
- **Leverage Docker cache** — copy `composer.json` before source code for layer caching

---

## Abnormal Case Patterns

1. **Permission denied on storage/** — container runs as www-data but host creates files as uid 1000. Fix: `chown -R www-data:www-data storage` in Dockerfile or match UIDs.

2. **Vendor binary mismatch** — `vendor/` mounted from macOS host, container expects Linux binaries. Fix: use named volume for `vendor/`, run `composer install` inside container.

3. **MySQL data lost after rebuild** — used `docker compose down -v` which removes named volumes. Fix: use `docker compose down` (no `-v` flag) for normal stops.

4. **Port conflict** — port 3306 already used by host MySQL. Fix: use `FORWARD_DB_PORT=33060` in `.env` to map to different host port.

5. **Slow file sync on macOS** — bind mount performance degradation. Fix: use `:cached` flag or Docker Desktop's VirtioFS file sharing backend.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (361.1–361.5), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Docker Compose Specialist — DevOps | EPS v3.2*

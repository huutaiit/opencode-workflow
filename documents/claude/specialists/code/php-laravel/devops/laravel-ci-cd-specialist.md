# Laravel CI/CD Specialist — DevOps
# Laravel CI/CDスペシャリスト — デブオプス
# Chuyen Gia CI/CD Laravel — Van Hanh

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + GitHub Actions / GitLab CI
**Aspect**: Continuous Integration & Deployment
**Category**: devops
**Purpose**: Knowledge provider for Laravel CI/CD pipelines — GitHub Actions workflows, GitLab CI pipelines, testing in CI, deployment automation, asset building, and environment management

---

## Metadata

```json
{
  "id": "laravel-ci-cd-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + GitHub Actions / GitLab CI",
  "aspect": "Continuous Integration & Deployment",
  "category": "devops",
  "subcategory": "php-laravel",
  "lines": 430,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: GitHub Actions — YAML workflow for PHP/Laravel CI with matrix strategy",
    "E2: GitLab CI — multi-stage pipeline with service containers",
    "E3: Laravel Envoy — task runner for deployment automation"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 360.1–360.6 |
| **Directory Pattern** | `.github/workflows/`, `.gitlab-ci.yml`, `deploy/` |
| **Naming Convention** | `ci.yml`, `deploy.yml`, `Envoy.blade.php` |
| **Imports From** | Application (test suite, build scripts) |
| **Imported By** | Production/Staging environments |
| **Cannot Import** | N/A |
| **Dependencies** | GitHub Actions / GitLab CI, Composer, Node.js |
| **When To Use** | Every Laravel project requiring automated testing and deployment |
| **Source Skeleton** | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |
| **Specialist Type** | code |
| **Purpose** | CI/CD pipeline configuration — test automation, build, deploy, environment management |
| **Activation Trigger** | files: `.github/workflows/*.yml`, `.gitlab-ci.yml`; keywords: CI, CD, pipeline, deploy, GitHub Actions, GitLab |

---

## Role

You are a **Laravel CI/CD Specialist**. Your responsibility is to provide best practices for Laravel 11+ CI/CD pipelines — GitHub Actions and GitLab CI configuration, test execution in CI, deployment automation, asset compilation, and environment variable management.

**Used by**: Any code agent configuring CI/CD for Laravel projects
**Not used by**: Non-Laravel stacks, local development setup (see laravel-docker-compose-specialist)

---

## Patterns

### Pattern 360.1: GitHub Actions Pipeline

**Category**: CI Pipeline
**Description**: Complete GitHub Actions workflow for Laravel with PHP matrix, caching, and service containers.

```yaml
# .github/workflows/ci.yml
name: Laravel CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  tests:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        php: ['8.3']
        laravel: ['11.*']

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: testing
          MYSQL_ROOT_PASSWORD: password
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          extensions: mbstring, pdo_mysql, redis
          coverage: xdebug

      - name: Cache Composer
        uses: actions/cache@v4
        with:
          path: vendor
          key: composer-${{ hashFiles('composer.lock') }}
          restore-keys: composer-

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist

      - name: Prepare environment
        run: |
          cp .env.ci .env
          php artisan key:generate

      - name: Run tests
        run: php artisan test --parallel --coverage --min=80
        env:
          DB_HOST: 127.0.0.1
          DB_DATABASE: testing
          DB_USERNAME: root
          DB_PASSWORD: password
          REDIS_HOST: 127.0.0.1

      - name: Upload coverage
        if: success()
        uses: codecov/codecov-action@v4
        with:
          file: coverage.xml
```

**Key Points**:
- Service containers (MySQL, Redis) run alongside test job — health checks ensure readiness
- `shivammathur/setup-php` installs PHP extensions and coverage tools
- Cache Composer dependencies by `composer.lock` hash — fast subsequent runs
- Use `.env.ci` committed to repo with CI-specific values (no secrets)
- `--min=80` enforces minimum coverage threshold — fails CI if below

---

### Pattern 360.2: GitLab CI Pipeline

**Category**: CI Pipeline
**Description**: GitLab CI multi-stage pipeline with service containers and artifact passing.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  MYSQL_DATABASE: testing
  MYSQL_ROOT_PASSWORD: password
  DB_HOST: mysql
  DB_DATABASE: testing
  DB_USERNAME: root
  DB_PASSWORD: password
  REDIS_HOST: redis

.php-base:
  image: php:8.3-cli
  before_script:
    - apt-get update && apt-get install -y git zip unzip libpng-dev
    - docker-php-ext-install pdo_mysql gd
    - curl -sS https://getcomposer.org/installer | php
    - mv composer.phar /usr/local/bin/composer
    - composer install --no-interaction --prefer-dist
    - cp .env.ci .env
    - php artisan key:generate

build:
  extends: .php-base
  stage: build
  script:
    - composer install --no-dev --optimize-autoloader
    - php artisan config:cache
    - php artisan route:cache
    - php artisan view:cache
  artifacts:
    paths:
      - vendor/
      - bootstrap/cache/
    expire_in: 1 hour

test:unit:
  extends: .php-base
  stage: test
  services:
    - mysql:8.0
    - redis:7-alpine
  script:
    - php artisan migrate --force
    - php artisan test --parallel
  coverage: '/Cov:\s+(\d+\.\d+%)/'
  artifacts:
    when: always
    reports:
      junit: report.xml

test:static:
  extends: .php-base
  stage: test
  script:
    - vendor/bin/phpstan analyse --memory-limit=512M
    - vendor/bin/pint --test

deploy:production:
  stage: deploy
  image: alpine:latest
  only:
    - main
  script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | ssh-add -
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd /var/www/app && git pull && composer install --no-dev && php artisan migrate --force"
  environment:
    name: production
    url: https://app.example.com
```

**Key Points**:
- `.php-base` template avoids duplication across jobs
- `artifacts` pass build output between stages — `vendor/` cached for test/deploy
- Service names (`mysql`, `redis`) are hostnames inside GitLab CI network
- `coverage` regex extracts coverage percentage for GitLab badges
- Deploy job restricted to `main` branch with SSH-based deployment

---

### Pattern 360.3: Testing in CI

**Category**: Test Execution
**Description**: Optimized test execution configuration for CI environments.

```yaml
# .github/workflows/ci.yml — test optimization
- name: Run unit tests (fast)
  run: php artisan test --testsuite=Unit

- name: Run feature tests (parallel)
  run: php artisan test --testsuite=Feature --parallel --processes=4

- name: Run architecture tests
  run: php artisan test tests/Architecture

- name: Static analysis
  run: vendor/bin/phpstan analyse --no-progress --error-format=github

- name: Code style check
  run: vendor/bin/pint --test
```

```xml
<!-- phpunit.xml — CI-optimized configuration -->
<phpunit
    stopOnFailure="true"
    cacheDirectory=".phpunit.cache"
>
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
        <testsuite name="Architecture">
            <directory>tests/Architecture</directory>
        </testsuite>
    </testsuites>
    <coverage>
        <include>
            <directory suffix=".php">app</directory>
        </include>
        <exclude>
            <directory>app/Console</directory>
            <directory>app/Providers</directory>
        </exclude>
    </coverage>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="DB_DATABASE" value="testing"/>
        <env name="CACHE_DRIVER" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="MAIL_MAILER" value="array"/>
    </php>
</phpunit>
```

**Key Points**:
- Split test suites: Unit (fast, no DB) runs first, Feature (parallel) runs second
- `stopOnFailure="true"` in CI — fail fast to save build minutes
- PHPStan with `--error-format=github` creates inline annotations on PRs
- Array drivers for cache/queue/mail — no external service dependencies for unit tests
- Exclude Console/Providers from coverage — low-value boilerplate code

---

### Pattern 360.4: Deployment Automation

**Category**: Deployment
**Description**: Zero-downtime deployment with Laravel Envoy and GitHub Actions.

```php
<?php

// Envoy.blade.php — deployment task runner

@servers(['production' => 'deploy@app.example.com'])

@setup
    $repository = 'git@github.com:org/app.git';
    $releasesDir = '/var/www/app/releases';
    $currentDir = '/var/www/app/current';
    $sharedDir = '/var/www/app/shared';
    $release = date('YmdHis');
    $newReleaseDir = $releasesDir . '/' . $release;
@endsetup

@story('deploy')
    clone
    install
    migrate
    optimize
    activate
    cleanup
@endstory

@task('clone')
    echo "Cloning repository..."
    git clone --depth 1 {{ $repository }} {{ $newReleaseDir }}
@endtask

@task('install')
    echo "Installing dependencies..."
    cd {{ $newReleaseDir }}
    composer install --no-dev --optimize-autoloader --no-interaction
    npm ci && npm run build
    ln -nfs {{ $sharedDir }}/.env {{ $newReleaseDir }}/.env
    ln -nfs {{ $sharedDir }}/storage {{ $newReleaseDir }}/storage
@endtask

@task('migrate')
    echo "Running migrations..."
    cd {{ $newReleaseDir }}
    php artisan migrate --force
@endtask

@task('optimize')
    echo "Optimizing application..."
    cd {{ $newReleaseDir }}
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
@endtask

@task('activate')
    echo "Activating release..."
    ln -nfs {{ $newReleaseDir }} {{ $currentDir }}
    sudo systemctl reload php8.3-fpm
    sudo systemctl reload nginx
@endtask

@task('cleanup')
    echo "Cleaning old releases..."
    cd {{ $releasesDir }}
    ls -dt */ | tail -n +6 | xargs rm -rf
@endtask
```

**Key Points**:
- Symlink-based releases enable instant rollback — point `current` to previous release
- Shared directory for `.env` and `storage/` — persists across releases
- `--depth 1` clone minimizes transfer time
- Cache config/routes/views/events after deploy — reduces runtime overhead
- Keep last 5 releases, clean older ones to save disk space

---

### Pattern 360.5: Asset Building in CI

**Category**: Build
**Description**: Frontend asset compilation with Vite in CI pipelines.

```yaml
# .github/workflows/ci.yml — asset build job
build-assets:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install and build
      run: |
        npm ci
        npm run build

    - name: Upload built assets
      uses: actions/upload-artifact@v4
      with:
        name: built-assets
        path: public/build/
        retention-days: 1
```

```javascript
// vite.config.js — production build configuration
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
    ],
    build: {
        manifest: true,
        outDir: 'public/build',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['vue', 'axios'],
                },
            },
        },
    },
});
```

**Key Points**:
- `npm ci` (not `npm install`) for deterministic builds from lockfile
- Upload built assets as artifacts — deploy job downloads them
- Vite `manifest: true` generates manifest.json for Laravel's `@vite` directive
- `manualChunks` splits vendor code for better browser caching
- Cache Node modules by lockfile hash — skip install on no-change builds

---

### Pattern 360.6: Environment Management

**Category**: Configuration
**Description**: Environment variable management across CI, staging, and production.

```bash
# .env.ci — committed to repository (no secrets)
APP_NAME="MyApp CI"
APP_ENV=testing
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=testing
DB_USERNAME=root
DB_PASSWORD=password

CACHE_DRIVER=array
QUEUE_CONNECTION=sync
SESSION_DRIVER=array
MAIL_MAILER=array

LOG_CHANNEL=stderr
LOG_LEVEL=error
```

```yaml
# .github/workflows/deploy.yml — secret management
deploy:
  runs-on: ubuntu-latest
  environment: production
  steps:
    - name: Deploy with secrets
      env:
        APP_KEY: ${{ secrets.APP_KEY }}
        DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        REDIS_PASSWORD: ${{ secrets.REDIS_PASSWORD }}
        MAIL_PASSWORD: ${{ secrets.MAIL_PASSWORD }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_KEY }}
      run: |
        envsubst < .env.production.template > .env
        scp .env deploy@${{ secrets.DEPLOY_HOST }}:/var/www/app/shared/.env
```

```php
<?php

declare(strict_types=1);

// config/app.php — environment-aware configuration

return [
    'name' => env('APP_NAME', 'Laravel'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),

    // Fail loudly if required env vars are missing
    'key' => env('APP_KEY') ?? throw new \RuntimeException(
        'APP_KEY must be set — run php artisan key:generate',
    ),
];
```

**Key Points**:
- `.env.ci` committed to repo — no secrets, array/sync drivers for isolation
- Production secrets stored in GitHub Secrets / GitLab CI Variables — never in repo
- `envsubst` templates inject secrets at deploy time
- `environment: production` in GitHub Actions requires approval for protected environments
- Config must fail loudly on missing required env vars — use null coalescing with throw

---

## Best Practices

- **Fail fast** — run unit tests before feature tests, static analysis before deploy
- **Cache aggressively** — Composer, npm, PHPUnit cache directories reduce build time 50%+
- **Separate build and deploy** — build artifacts once, deploy to multiple environments
- **Use service containers** — real MySQL/Redis in CI, not SQLite substitutes
- **Never commit secrets** — use CI secret managers, `.env.ci` for non-sensitive values only
- **Zero-downtime deploys** — symlink-based releases with shared storage
- **Pin versions** — PHP version, Node version, action versions — avoid surprise breakage
- **Monitor build times** — set timeout limits, split slow test suites

---

## Abnormal Case Patterns

1. **CI passes locally, fails in GitHub Actions** — different PHP extensions installed. Fix: match `setup-php` extensions with local `php.ini`.

2. **MySQL service not ready** — tests start before MySQL health check passes. Fix: add `--health-cmd`, `--health-interval`, `--health-retries` to service definition.

3. **Composer memory exhaustion in CI** — `COMPOSER_MEMORY_LIMIT=-1` not set. Fix: add `COMPOSER_MEMORY_LIMIT: -1` to env or use `--no-dev` for production builds.

4. **Asset build fails but tests pass** — Vite build not included in test job. Fix: add asset build step before tests or separate into dedicated job.

5. **Deploy rollback needed** — migration breaks production. Fix: use `Envoy.blade.php` rollback task that symlinks to previous release and runs `php artisan migrate:rollback`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (360.1–360.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel CI/CD Specialist — DevOps | EPS v3.2*

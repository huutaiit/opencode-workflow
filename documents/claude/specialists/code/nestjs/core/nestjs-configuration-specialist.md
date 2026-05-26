# NestJS Configuration Specialist — Core
# NestJS設定管理スペシャリスト — コア
# Chuyen Gia Cau Hinh NestJS — Loi

**Version**: 2.0.0
**Technology**: NestJS 10+ Configuration
**Aspect**: Configuration Management
**Category**: core
**Purpose**: Knowledge provider for NestJS configuration — ConfigModule, namespaced config, env validation, secrets management

---

## Metadata

```json
{
  "id": "nestjs-configuration-specialist",
  "technology": "NestJS 10+ Configuration",
  "aspect": "Configuration Management",
  "category": "core",
  "subcategory": "nestjs",
  "lines": 500,
  "token_cost": 3000,
  "version": "2.0.0",
  "evidence": [
    "E1: Config patterns — ConfigModule, typed config, environment management",
    "E5: p2plend config — real-world NestJS configuration patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 204.1–204.8 |
| **Directory Pattern** | `src/infrastructure/config/` |
| **Naming Convention** | `{module}.config.ts`, `configuration.ts`, `env.validation.ts` |
| **Imports From** | Infrastructure only (config reads env vars, files) |
| **Imported By** | ALL (every layer consumes config via ConfigService injection) |
| **Cannot Import** | Domain, Application |
| **Dependencies** | @nestjs/common, @nestjs/core |
| **When To Use** | Every NestJS project — core framework patterns |
| **Source Skeleton** | src/{layer}/{feature}/*.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS configuration — ConfigModule, environment variables, typed config, validation |
| **Activation Trigger** | files: **/*.config.ts, **/config/**; keywords: configModule, configService, environment, env |

---

## Role

You are a **NestJS Configuration Specialist**. You supply patterns for ConfigModule setup, namespaced typed config, environment validation, secrets management, and per-environment switching.

**Used by**: Any code agent working with NestJS application configuration
**Not used by**: Non-NestJS stacks

---

## Patterns

### Pattern 204.1: ConfigModule Setup

**Category**: Config Fundamentals
**Description**: Load .env files, isGlobal: true for app-wide access.

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [databaseConfig, redisConfig, grpcConfig, appConfig],
      validationSchema: envSchema,
      validationOptions: { abortEarly: true },
    }),
  ],
})
export class AppModule {}
```

**Key Points**:
- Single registration in AppModule — all modules inject ConfigService directly
- envFilePath array: first match wins (environment-specific overrides general)
- load: namespaced config factories for typed access

---

### Pattern 204.2: Namespaced Configuration

**Category**: Config Fundamentals
**Description**: registerAs() for typed config sections.

```typescript
// infrastructure/config/database.config.ts
export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  name: process.env.DB_NAME || 'app',
  ssl: process.env.DB_SSL === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONN, 10) || 10,
}));

// infrastructure/config/redis.config.ts
export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
}));
```

**Key Points**:
- Each config namespace returns typed object — no stringly-typed access
- Always provide defaults for non-critical values
- parseInt/parseFloat all numeric env vars — process.env is always string

---

### Pattern 204.3: Environment Validation

**Category**: Config Fundamentals
**Description**: Joi or Zod schema to validate all env vars at startup.

```typescript
// infrastructure/config/env.validation.ts
import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  REDIS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  GRPC_PORT: Joi.number().default(50051),
});
```

```typescript
// Alternative: Zod validation
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  JWT_SECRET: z.string().min(32),
});

// Use in ConfigModule
ConfigModule.forRoot({
  validate: (config) => envSchema.parse(config),
})
```

**Key Points**:
- Fail fast — app refuses to start with missing/invalid config
- abortEarly: true — report first error, don't flood logs
- Include ALL required env vars in schema — undocumented env vars = tech debt

---

### Pattern 204.4: Typed Config Injection

**Category**: Config Fundamentals
**Description**: Inject namespaced config with full type safety.

```typescript
@Injectable()
export class DatabaseService {
  constructor(
    @Inject(databaseConfig.KEY)
    private dbConfig: ConfigType<typeof databaseConfig>,
  ) {}

  getConnectionString(): string {
    const { host, port, name, ssl } = this.dbConfig;
    return `postgresql://${host}:${port}/${name}${ssl ? '?sslmode=require' : ''}`;
  }
}
```

**Key Points**:
- ConfigType<typeof config> provides full type inference
- Prefer namespaced injection over generic configService.get('key')
- Generic get() is escape hatch — use for dynamic keys only

---

### Pattern 204.5: Per-Environment Config

**Category**: Advanced Config
**Description**: NODE_ENV-based config switching.

```typescript
ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,  // highest priority (gitignored)
    `.env.${process.env.NODE_ENV}`,         // environment-specific
    '.env',                                  // fallback defaults
  ],
})
```

**Key Points**:
- Priority: .local > environment > default
- .env.*.local files are gitignored — developer overrides
- Production: minimal .env (secrets from vault/K8s secrets)

---

### Pattern 204.6: Secrets Management

**Category**: Advanced Config
**Description**: External secrets, never commit to git.

```typescript
// .gitignore
// .env*
// !.env.example

// .env.example (committed — documents required vars)
// DB_HOST=       # PostgreSQL host
// JWT_SECRET=    # REQUIRED — min 256-bit
// REDIS_URL=     # redis://host:port

// K8s secrets injection (production)
// Secrets mounted as env vars via K8s Secret/ConfigMap
// No .env file needed in production containers
```

```typescript
// Vault integration for dynamic secrets
ConfigModule.forRootAsync({
  imports: [VaultModule],
  useFactory: async (vault: VaultService) => {
    const secrets = await vault.getSecrets('app/config');
    return { load: [() => secrets], isGlobal: true };
  },
  inject: [VaultService],
})
```

**Key Points**:
- NEVER commit .env to git — rotate leaked secrets immediately
- Production: K8s secrets, AWS SSM, HashiCorp Vault
- .env.example: document all env vars with descriptions

---

### Pattern 204.7: Config for Dynamic Modules

**Category**: Advanced Config
**Description**: Pass config to dynamic modules via forRootAsync.

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('database.host'),
    port: config.get('database.port'),
    database: config.get('database.name'),
    autoLoadEntities: true,
    synchronize: config.get('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
})
```

---

### Pattern 204.8: Config Hot-Reload

**Category**: Advanced Config
**Description**: Feature flags and runtime config changes without restart.

```typescript
// Simple feature flags via config
@Injectable()
export class FeatureFlagService {
  constructor(private config: ConfigService) {}

  isEnabled(flag: string): boolean {
    return this.config.get(`features.${flag}`) === 'true';
  }
}

// For true hot-reload: use external config service (Consul, LaunchDarkly)
// ConfigModule.forRoot does NOT support hot-reload natively
```

---

### Pattern 204.9: Config Composition for Microservices

**Category**: Advanced Config
**Description**: Shared base config + service-specific overrides in monorepo.

```typescript
// libs/shared/config/src/base.config.ts
export const baseConfig = () => ({
  app: {
    name: process.env.APP_NAME || 'unknown-service',
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  health: {
    timeout: parseInt(process.env.HEALTH_TIMEOUT, 10) || 3000,
  },
});

// apps/lending-service/src/config/lending.config.ts
export default registerAs('lending', () => ({
  maxLoanAmount: parseInt(process.env.MAX_LOAN_AMOUNT, 10) || 50000,
  interestRateMin: parseFloat(process.env.INTEREST_RATE_MIN) || 0.05,
  autoApprovalThreshold: parseInt(process.env.AUTO_APPROVAL_THRESHOLD, 10) || 10000,
}));

// apps/lending-service/src/app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [baseConfig, databaseConfig, redisConfig, lendingConfig],
  validationSchema: lendingEnvSchema,
})
```

**Key Points**:
- Shared base config in Nx lib — all services inherit common settings
- Service-specific config in app directory — domain-specific env vars
- Each service has its OWN validation schema — includes base + service vars

---

### Pattern 204.10: Config for Testing Environments

**Category**: Advanced Config
**Description**: Test-specific config factory for predictable test behavior.

```typescript
// test/config/test.config.ts
export const testConfig = () => ({
  database: {
    host: 'localhost',
    port: 5432,
    name: `test_${process.env.JEST_WORKER_ID || '1'}`, // parallel test DBs
    synchronize: true, // OK in test only
  },
  redis: {
    host: 'localhost',
    port: 6379,
    db: parseInt(process.env.JEST_WORKER_ID || '1', 10), // isolated Redis DB per worker
  },
  auth: {
    jwtSecret: 'test-secret-min-32-chars-long-here',
    tokenExpiry: '1h',
  },
});

// test/utils/create-test-app.ts
export async function createTestApp() {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ load: [testConfig], isGlobal: true }),
      AppModule,
    ],
  }).compile();
  return module.createNestApplication();
}
```

**Key Points**:
- Use JEST_WORKER_ID for parallel test isolation (separate DB/Redis per worker)
- synchronize: true OK in test — auto-schema for quick iteration
- Never use production secrets in test config — use fixed test values

---

### Pattern 204.11: Config Schema Documentation

**Category**: Advanced Config
**Description**: Auto-generate env var documentation from validation schema.

```typescript
// infrastructure/config/env-docs.ts
export const envDocs: Record<string, { description: string; required: boolean; default?: string }> = {
  NODE_ENV:      { description: 'Runtime environment',           required: true },
  PORT:          { description: 'HTTP server port',              required: false, default: '3000' },
  DB_HOST:       { description: 'PostgreSQL host',               required: true },
  DB_PORT:       { description: 'PostgreSQL port',               required: false, default: '5432' },
  DB_NAME:       { description: 'Database name',                 required: true },
  REDIS_URL:     { description: 'Redis connection URL',          required: true },
  JWT_SECRET:    { description: 'JWT signing secret (≥32 chars)', required: true },
  GRPC_PORT:     { description: 'gRPC server port',              required: false, default: '50051' },
};

// Generate .env.example from envDocs
// Object.entries(envDocs).map(([k, v]) => `${k}=${v.default || ''} # ${v.description}`)
```

**Key Points**:
- Single source of truth for env vars — schema + docs in one place
- Generate .env.example programmatically — prevents doc drift
- Include in CI: validate that .env.example matches validation schema

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Magic Strings | `config.get('DB_HOST')` everywhere | Use namespaced config + typed injection |
| No Validation | Missing env var causes runtime crash 10 min after startup | Validate all vars at startup with Joi/Zod |
| Hardcoded Defaults | `host: 'prod-db.internal'` in config factory | All defaults should be safe dev values |
| Secret in Source | JWT secret hardcoded in test file committed to git | Use env vars even in test, just use test-specific values |
| Config in Service | Service reads process.env directly | Always go through ConfigService/ConfigModule |
| Monolith Config | One giant config file for all concerns | Split into per-concern config files |

---

## Best Practices

### Organization
- One config file per concern: database.config.ts, redis.config.ts, grpc.config.ts
- Group all config files in `src/infrastructure/config/`
- Export barrel: `config/index.ts` re-exports all config factories

### Security
- Never log config values containing secrets
- Validate JWT_SECRET minimum length (≥32 chars)
- Rotate secrets on any suspected leak — don't just change .gitignore

### Typing
- Always use registerAs() + ConfigType — avoid raw string keys
- Define interface for each config namespace
- Use Zod/Joi for runtime validation, TypeScript interfaces for compile-time

---

## Testing Patterns

```typescript
// 1. Override config in tests
const module = await Test.createTestingModule({
  imports: [ConfigModule.forRoot({
    load: [() => ({
      database: { host: 'localhost', port: 5432, name: 'test_db' },
      redis: { host: 'localhost', port: 6379 },
    })],
    isGlobal: true,
  })],
  providers: [DatabaseService],
}).compile();
```

```typescript
// 2. Test config validation rejects invalid env
it('should reject missing DB_HOST', () => {
  const { error } = envSchema.validate({ NODE_ENV: 'production', PORT: 3000 });
  expect(error).toBeDefined();
  expect(error.message).toContain('DB_HOST');
});
```

```typescript
// 3. Test namespaced config injection
it('should inject typed database config', async () => {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({
      load: [registerAs('database', () => ({ host: 'test-host', port: 5432, name: 'test' }))],
      isGlobal: true,
    })],
    providers: [DatabaseService],
  }).compile();

  const service = module.get(DatabaseService);
  expect(service.getConnectionString()).toContain('test-host');
});
```

---

## Config Reference Table

| Env Var Pattern | Type | Parse Method | Default Strategy |
|----------------|------|-------------|------------------|
| `*_HOST` | string | direct | `'localhost'` |
| `*_PORT` | number | `parseInt(x, 10)` | standard port (5432, 6379) |
| `*_URL` | string | direct, Joi `.uri()` | `undefined` (required) |
| `*_SECRET` | string | direct, min-length | `undefined` (required) |
| `*_ENABLED` | boolean | `x === 'true'` | `false` |
| `*_TIMEOUT` | number | `parseInt(x, 10)` | reasonable default (3000ms) |
| `*_MAX_*` | number | `parseInt(x, 10)` | conservative limit |

---

## Abnormal Case Patterns

1. **Missing env var causes runtime crash** — process.env.X used directly without validation. Fix: add to validation schema, fail at startup.

2. **Config not available in onModuleInit** — Module initializes before ConfigModule resolves async. Fix: ensure ConfigModule is first import in AppModule.

3. **.env committed to git** — Secrets leaked. Fix: add `.env*` to .gitignore, rotate secrets immediately.

4. **Type mismatch** — process.env returns string, used as number. Fix: always parseInt in registerAs factory.

5. **Config drift between environments** — Production missing vars that exist in dev. Fix: validate same schema in all environments.

6. **Circular config dependency** — Config factory depends on another config factory. Fix: flatten config or use 2-phase init.

7. **Vault timeout at startup** — External secrets provider unresponsive. Fix: set connection timeout, provide fallback config, log warning.

8. **Config mutation after startup** — Service modifies config object at runtime. Fix: Object.freeze() in registerAs factory, return readonly types.

9. **Test config leaks between suites** — Global ConfigModule not reset between test files. Fix: use `Test.createTestingModule` per test suite with fresh config.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (204.1-204.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Configuration Specialist — Core | EPS v3.2*

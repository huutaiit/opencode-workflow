# NestJS Database Patterns Specialist — Infrastructure
# NestJSデータベースパターンスペシャリスト — インフラストラクチャ
# Chuyen Gia Mau Co So Du Lieu NestJS — Ha Tang

**Version**: 1.0.0
**Technology**: TypeORM, Mongoose, CouchDB with NestJS
**Aspect**: Database Configuration
**Category**: infrastructure
**Purpose**: Knowledge provider for database infrastructure — connection pooling, multi-database setup, database-per-service, Mongoose config, CouchDB setup, graceful shutdown

---

## Metadata

```json
{
  "id": "nestjs-database-patterns-specialist",
  "technology": "TypeORM, Mongoose, CouchDB with NestJS",
  "aspect": "Database Configuration",
  "category": "infrastructure",
  "subcategory": "nestjs",
  "lines": 220,
  "token_cost": 1300,
  "version": "1.0.0",
  "evidence": [
    "E1: Database-per-service pattern — microservice data isolation",
    "E2: Connection pooling — TypeORM/Mongoose pool configuration",
    "E5: p2plend database layer — PostgreSQL + MongoDB + CouchDB real-world setup"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 225.1–225.8 |
| **Directory Pattern** | `src/infrastructure/persistence/` |
| **Naming Convention** | `database.config.ts`, `{db}-connection.provider.ts`, `typeorm.config.ts`, `mongoose.config.ts` |
| **Imports From** | Infrastructure only (database drivers, connection config) |
| **Imported By** | Infrastructure (repositories use database connections), Application (via port interfaces) |
| **Cannot Import** | Domain, Presentation (database config is pure infrastructure concern) |
| **Dependencies** | @nestjs/typeorm, typeorm, pg |
| **When To Use** | Database connection, pooling, multi-DB, graceful shutdown |
| **Source Skeleton** | src/infrastructure/database/database.module.ts, src/infrastructure/database/data-source.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS database patterns — connection management, multi-database, repository patterns |
| **Activation Trigger** | files: **/persistence/**; keywords: dataSource, repository, database, connection |

---

## Role

You are a **NestJS Database Patterns Specialist**. Your responsibility is to provide database infrastructure best practices for NestJS microservice projects following clean architecture. You supply patterns for TypeORM DataSource configuration, Mongoose setup, CouchDB connectivity, connection pooling, multi-database scenarios, health indicators, and graceful shutdown handling.

**Used by**: Any code agent working with database infrastructure in NestJS services
**Not used by**: In-memory-only services, services without persistent storage

---

## Patterns

### Pattern 225.1–225.4: Database Fundamentals (HIGH)

```
225.1 TypeORM DataSource: Async configuration with ConfigService injection.
      Use TypeOrmModule.forRootAsync to defer connection until config is loaded.
```

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    database: config.get('DB_NAME'),
    autoLoadEntities: true,
    synchronize: false,
  }),
})
```

```
225.2 Database per service: Each microservice owns its database schema.
      No shared databases between services — communicate via API/events only.
```

```typescript
// loan-service owns 'loans_db'
// user-service owns 'users_db'
// Each service configures its own TypeORM DataSource independently
TypeOrmModule.forRoot({
  type: 'postgres',
  database: 'loans_db',   // service-owned schema
  entities: [Loan, Payment],
})
```

```
225.3 Connection pooling: Configure pool size based on service load profile.
      Default pool size (10) may be too small for high-throughput services.
```

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  extra: {
    max: 20,              // max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
})
```

```
225.4 Mongoose config: MongooseModule.forRootAsync for MongoDB services.
      Use async factory for environment-aware connection URI.
```

```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    uri: config.get('MONGO_URI'),
    retryAttempts: 3,
    retryDelay: 1000,
  }),
})
```

### Pattern 225.5–225.8: Advanced Database Infrastructure (MEDIUM-HIGH)

```
225.5 CouchDB setup: nano/PouchDB client for Fabric state database queries.
      Wrap nano client in a NestJS provider for dependency injection.
```

```typescript
@Injectable()
export class CouchDbService {
  private db: DocumentScope<any>;
  constructor(private config: ConfigService) {
    const nano = require('nano')(config.get('COUCHDB_URL'));
    this.db = nano.db.use(config.get('COUCHDB_NAME'));
  }
  async find(selector: object) { return this.db.find({ selector }); }
}
```

```
225.6 Multi-database: Service connecting to multiple databases (rare, justified cases).
      Use named connections to isolate DataSources when service must access two DBs.
```

```typescript
TypeOrmModule.forRoot({ name: 'primary', type: 'postgres', database: 'loans_db' }),
TypeOrmModule.forRoot({ name: 'audit', type: 'postgres', database: 'audit_db' }),

// In repository: specify connection name
TypeOrmModule.forFeature([AuditLog], 'audit')
```

```
225.7 Connection health: Custom health indicator for database connectivity.
      Expose /health endpoint with database check for Docker/K8s probes.
```

```typescript
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(@InjectConnection() private connection: Connection) { super(); }
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isConnected = this.connection.isInitialized;
    return this.getStatus(key, isConnected);
  }
}
```

```
225.8 Graceful shutdown: Close database connections on app termination.
      Use onApplicationShutdown lifecycle hook to prevent connection leaks.
```

```typescript
@Injectable()
export class DatabaseCleanup implements OnApplicationShutdown {
  constructor(@InjectConnection() private connection: Connection) {}
  async onApplicationShutdown(signal?: string) {
    if (this.connection.isInitialized) {
      await this.connection.destroy();
    }
  }
}
```

---

## Abnormal Case Patterns (4 patterns)

1. **Connection pool exhaustion** — All connections in use, new queries hang. Fix: Increase pool max, add connection timeout, investigate long-running queries with query logging.

2. **Migration drift between services** — Database schema out of sync with entity definitions. Fix: Run migrations in CI pipeline, never use `synchronize: true` in production.

3. **Mongoose connection timeout on startup** — MongoDB not ready when service starts. Fix: Configure `retryAttempts` and `retryDelay` in MongooseModule.forRootAsync options.

4. **CouchDB query returns stale data** — Fabric world state not updated after transaction. Fix: Query with `update: true` option or add delay/retry logic for eventual consistency.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (225.1-225.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Database Patterns Specialist — Infrastructure | EPS v3.2*

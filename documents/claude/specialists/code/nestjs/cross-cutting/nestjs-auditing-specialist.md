# NestJS Auditing Specialist
# NestJS 監査スペシャリスト
# Chuyen Gia Audit NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Auditing
**Aspect**: Auditing
**Category**: cross-cutting
**Purpose**: Audit trail for NestJS — who/when/what logging, entity change tracking via TypeORM subscribers, compliance logging, audit interceptor, user context

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Cross-cutting (interceptor) + Infrastructure (persistence) |
| **Variant** | ALL |
| **Pattern Numbers** | 284.1–284.5 |
| **Directory Pattern** | `src/infrastructure/audit/`, `src/presentation/interceptors/` |
| **Naming Convention** | `audit-log.entity.ts`, `audit.interceptor.ts`, `audit.subscriber.ts` |
| **Imports From** | Infrastructure (TypeORM, AsyncLocalStorage for user context) |
| **Imported By** | Presentation (interceptor on controllers), Infrastructure (subscriber on entities) |
| **Cannot Import** | Domain (audit is cross-cutting infrastructure) |
| **Dependencies** | typeorm (subscriber events) |
| **When To Use** | Financial systems, compliance requirements, any system needing change history |
| **Source Skeleton** | `apps/{service}/src/infrastructure/audit/` |
| **Specialist Type** | code |
| **Purpose** | Audit trail for NestJS — who/when/what logging, entity change tracking via TypeORM subscribers, compliance logging, audit interceptor, user context |
| **Activation Trigger** | files: **/audit/**; keywords: auditLog, auditTrail, changeTracking, compliance, whoWhenWhat |

---

## SCOPE

### What You Handle
- Audit trail entity (who, when, what, old/new values)
- TypeORM subscriber for automatic change tracking
- Compliance-grade immutable audit logs
- NestJS interceptor for HTTP mutation audit
- User context extraction for audit records

### What You DON'T Handle
- Structured logging → `nestjs-logging-specialist` (258.x)
- Domain events → `nestjs-domain-events-saga-specialist` (227.x)
- Security authentication → `nestjs-auth-guards-specialist` (213.x)

---

## Role

You are a **NestJS Auditing Specialist**. You supply patterns for implementing audit trails and change tracking in NestJS applications.

---

## APPROVED PATTERNS

### Pattern 284.1: Audit Trail Entity

```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() actor: string;           // userId or 'SYSTEM'
  @Column() actorIp: string;         // request IP
  @Column() action: string;          // CREATE, UPDATE, DELETE
  @Column() entityType: string;      // 'Order', 'User', etc.
  @Column() entityId: string;        // affected entity ID
  @Column('jsonb', { nullable: true }) oldValues: Record<string, any>;
  @Column('jsonb', { nullable: true }) newValues: Record<string, any>;
  @Column('jsonb', { nullable: true }) changedFields: string[];
  @CreateDateColumn() timestamp: Date;
  @Column({ nullable: true }) correlationId: string;

  static create(params: Partial<AuditLog>): AuditLog {
    return Object.assign(new AuditLog(), params);
  }
}
```

---

### Pattern 284.2: TypeORM Subscriber for Change Tracking

```typescript
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(private dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<any>): void {
    this.log('CREATE', event.metadata.tableName, event.entity?.id, null, event.entity);
  }

  afterUpdate(event: UpdateEvent<any>): void {
    const changed = event.updatedColumns.map(c => c.propertyName);
    this.log('UPDATE', event.metadata.tableName, event.entity?.id,
      event.databaseEntity, event.entity, changed);
  }

  afterRemove(event: RemoveEvent<any>): void {
    this.log('DELETE', event.metadata.tableName, event.entityId, event.databaseEntity, null);
  }

  private log(action: string, entityType: string, entityId: string,
    oldValues: any, newValues: any, changedFields?: string[]): void {
    const store = requestContext.getStore();
    const audit = AuditLog.create({
      actor: store?.userId || 'SYSTEM',
      actorIp: store?.ip || 'internal',
      action, entityType, entityId,
      oldValues, newValues, changedFields,
      correlationId: store?.correlationId,
    });
    // Use separate connection to avoid transaction interference
    this.dataSource.getRepository(AuditLog).save(audit).catch(err =>
      console.error('Audit log failed:', err.message));
  }
}
```

---

### Pattern 284.3: Compliance Logging (Immutable)

```typescript
// Append-only table — no UPDATE or DELETE allowed
// PostgreSQL: REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
// Or use TypeORM: no update/delete methods exposed

@Injectable()
export class ComplianceAuditService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async log(entry: Partial<AuditLog>): Promise<AuditLog> {
    return this.repo.save(AuditLog.create(entry)); // INSERT only
  }

  // Query by entity, actor, or date range
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.repo.find({ where: { entityType, entityId }, order: { timestamp: 'DESC' } });
  }

  // Retention policy: archive logs older than N days
  @Cron('0 2 * * *') // daily at 2 AM
  async archiveOldLogs(): Promise<void> {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year
    await this.repo.createQueryBuilder()
      .where('timestamp < :cutoff', { cutoff })
      .delete().execute(); // or move to cold storage
  }
}
```

---

### Pattern 284.4: Audit Interceptor (HTTP Mutations)

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: ComplianceAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next.handle(); // skip reads

    const startData = { method: req.method, url: req.url, body: req.body };

    return next.handle().pipe(
      tap((response) => {
        this.auditService.log({
          actor: req.user?.id || 'anonymous',
          actorIp: req.ip,
          action: req.method,
          entityType: this.extractEntityType(req.url),
          entityId: response?.id || req.params?.id || 'unknown',
          newValues: startData.body,
        });
      }),
    );
  }

  private extractEntityType(url: string): string {
    return url.split('/').filter(Boolean)[1] || 'unknown'; // /api/orders/123 → 'orders'
  }
}
```

---

### Pattern 284.5: User Context in Audit

```typescript
// Extract user from JWT via AsyncLocalStorage (set in auth middleware)
import { requestContext } from '../shared/request-context';

// Middleware sets context (see 278.7 AsyncLocalStorage)
// Audit subscriber reads: requestContext.getStore()?.userId

// System actions vs user actions
function getActor(): string {
  const store = requestContext.getStore();
  if (store?.userId) return store.userId;
  if (store?.serviceAccount) return `service:${store.serviceAccount}`;
  return 'SYSTEM'; // cron jobs, message consumers
}
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Audit in domain entities | Couples domain to infrastructure | TypeORM subscriber (284.2) |
| 2 | Mutable audit logs | Compliance violation — auditors can't trust modified logs | Append-only table (284.3) |
| 3 | Synchronous audit blocking request | Audit failure blocks business operation | Async logging, catch errors silently |

---

## Abnormal Case Patterns

1. **Audit log table grows unbounded** — Millions of rows, query performance degrades. Fix: Partition by month, archive old data.
2. **Subscriber fails in transaction** — Audit INSERT fails, rolls back business transaction. Fix: Use separate connection for audit.
3. **PII in audit log** — Password changes logged with old/new values. Fix: Exclude sensitive fields from change tracking.
4. **Missing actor on system operations** — Cron job creates records without user context. Fix: Set 'SYSTEM' actor for non-request operations.
5. **High-frequency updates flood audit** — Bulk import creates millions of audit entries. Fix: Batch audit logging, or skip audit for bulk operations.

---

## Quality Checklist

- [ ] **Q1**: Audit trail covers who/when/what with old/new values?
- [ ] **Q2**: Pattern IDs unique (284.1–284.5)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Compliance-grade immutable logging pattern included?

---

*NestJS Auditing Specialist — Pattern 284.x | EPS v10.0*

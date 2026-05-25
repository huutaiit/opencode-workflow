# NestJS CBAC Authorization Specialist — Domain
# NestJS CBAC認可スペシャリスト — ドメイン
# Chuyen Gia Phan Quyen CBAC NestJS — Domain

**Version**: 1.0.0
**Technology**: NestJS 10+ CBAC Authorization
**Aspect**: Capability-Based Access Control
**Category**: domain
**Purpose**: Knowledge provider for CBAC authorization — capability model, stakeholder types, COI rules, guards, decorators, audit trail

---

## Metadata

```json
{
  "id": "nestjs-cbac-authorization-specialist",
  "technology": "NestJS 10+ CBAC Authorization",
  "aspect": "Capability-Based Access Control",
  "category": "domain",
  "subcategory": "nestjs",
  "lines": 230,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: CBAC patterns — capability model, stakeholder types, COI enforcement",
    "E5: p2plend auth — real-world capability-based authorization in fintech"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 222.1–222.8 |
| **Directory Pattern** | `src/domain/cbac/`, `src/infrastructure/blockchain/` |
| **Naming Convention** | `{stakeholder}.capabilities.ts`, `cbac.guard.ts`, `require-capability.decorator.ts`, `coi-{rule}.policy.ts` |
| **Imports From** | Domain (capability model, stakeholder types, COI rules) |
| **Imported By** | Presentation (guards enforce capabilities on controllers), Application (use cases check authorization) |
| **Cannot Import** | Infrastructure directly (CBAC model is domain logic, not database concern) |
| **Dependencies** | none (pure domain — no framework dependencies) |
| **When To Use** | Domain modeling for specific bounded context |
| **Source Skeleton** | src/domain/{feature}/entities/*.ts, src/domain/{feature}/value-objects/*.ts |
| **Specialist Type** | code |
| **Purpose** | Crypto-based access control — blockchain authorization, token-gated access |
| **Activation Trigger** | files: **/domain/cbac/**; keywords: cbac, tokenGated, blockchainAuth, accessToken |

---

## Role

You are a **NestJS CBAC Authorization Specialist**. Your responsibility is to provide domain modeling and presentation enforcement patterns for Capability-Based Access Control in a NestJS clean-architecture microservice. You supply patterns for the CBAC model, stakeholder capability assignments, conflict-of-interest rules, NestJS guards, decorators, dynamic capabilities, and audit trails.

**Used by**: Any code agent working with authorization, access control, or stakeholder capability management
**Not used by**: Authentication specialists (CBAC is authorization, not authentication), infrastructure/database specialists

---

## Patterns

### Pattern 222.1: CBAC Model (HIGH)

```
222.1 CBAC model: Capability-Based Access Control — assign capabilities, not roles.
      Users have capabilities directly — no role indirection. Simpler, more granular, auditable.
```

```typescript
export class CapabilityModel {
  private readonly capabilities: Set<Capability>;
  constructor(capabilities: Capability[]) {
    this.capabilities = new Set(capabilities);
  }
  hasCapability(required: Capability): boolean {
    return this.capabilities.has(required);
  }
  hasAll(required: Capability[]): boolean {
    return required.every(c => this.capabilities.has(c));
  }
  hasAny(required: Capability[]): boolean {
    return required.some(c => this.capabilities.has(c));
  }
}
```

### Pattern 222.2: Stakeholder Types (HIGH)

```
222.2 Stakeholder types: Borrower, Lender, Insurer, Operator with different capability sets.
      Each stakeholder type defines a default capability set — users assigned type on registration.
```

```typescript
export enum StakeholderType { BORROWER = 'BORROWER', LENDER = 'LENDER', INSURER = 'INSURER', OPERATOR = 'OPERATOR' }
export const DEFAULT_CAPABILITIES: Record<StakeholderType, Capability[]> = {
  [StakeholderType.BORROWER]: ['loan:create', 'loan:view:own', 'payment:make', 'profile:edit:own'],
  [StakeholderType.LENDER]: ['loan:view:marketplace', 'loan:fund', 'offer:create', 'portfolio:view:own'],
  [StakeholderType.INSURER]: ['policy:create', 'policy:view', 'claim:process', 'premium:calculate'],
  [StakeholderType.OPERATOR]: ['loan:view:all', 'user:manage', 'report:view', 'system:configure'],
};
```

### Pattern 222.3: Capability Definition (HIGH)

```
222.3 Capability definition: Typed capability strings like 'loan:create', 'loan:approve'.
      Format: {resource}:{action}[:{scope}]. Scope: own, all, marketplace.
```

```typescript
export type Capability = `${Resource}:${Action}` | `${Resource}:${Action}:${Scope}`;
export type Resource = 'loan' | 'offer' | 'policy' | 'claim' | 'payment' | 'user' | 'report' | 'profile' | 'portfolio' | 'system' | 'premium';
export type Action = 'create' | 'view' | 'edit' | 'delete' | 'approve' | 'fund' | 'make' | 'process' | 'manage' | 'calculate' | 'configure';
export type Scope = 'own' | 'all' | 'marketplace';
```

### Pattern 222.4: COI Rules (HIGH)

```
222.4 COI rules: Conflict of Interest — borrower cannot be lender on same loan.
      Domain policy — evaluated before capability check. COI violation = immediate deny.
```

```typescript
export class CoiPolicy {
  evaluate(userId: string, action: Capability, context: AuthContext): CoiResult {
    if (action === 'loan:fund' && context.loanBorrowerId === userId) {
      return CoiResult.violation('Borrower cannot fund own loan');
    }
    if (action === 'claim:process' && context.policyBeneficiaryId === userId) {
      return CoiResult.violation('Beneficiary cannot process own claim');
    }
    return CoiResult.clear();
  }
}
```

### Pattern 222.5: CBAC Guard (HIGH)

```
222.5 CBAC guard: NestJS guard — check user capabilities against @RequireCapability decorator.
      Presentation layer guard — reads decorator metadata, checks user's capability model.
```

```typescript
@Injectable()
export class CbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<Capability[]>('capabilities', context.getHandler());
    if (!required) return true;
    const user = context.switchToHttp().getRequest().user;
    const model = new CapabilityModel(user.capabilities);
    return model.hasAll(required);
  }
}
// Usage on controller:
@Post('loans')
@RequireCapability('loan:create')
async createLoan(@Body() dto: CreateLoanDto) { /* ... */ }
```

### Pattern 222.6: Dynamic Capabilities (MEDIUM-HIGH)

```
222.6 Dynamic capabilities: Runtime capability assignment based on context.
      Beyond static stakeholder defaults — capabilities granted/revoked per transaction context.
```

```typescript
export class DynamicCapabilityService {
  resolve(user: AuthenticatedUser, context: TransactionContext): Capability[] {
    const base = [...DEFAULT_CAPABILITIES[user.stakeholderType]];
    if (context.loanId && context.isLoanParticipant(user.id)) {
      base.push('loan:view:detail');
    }
    if (user.isVerified && user.stakeholderType === StakeholderType.LENDER) {
      base.push('loan:fund:large');
    }
    return base;
  }
}
```

### Pattern 222.7: Capability Inheritance (MEDIUM)

```
222.7 Capability inheritance: Operator inherits base capabilities of all stakeholder types.
      Operator has superset — all borrower + lender + insurer capabilities plus admin-only ones.
```

```typescript
export class CapabilityResolver {
  resolve(type: StakeholderType): Capability[] {
    if (type === StakeholderType.OPERATOR) {
      return [
        ...DEFAULT_CAPABILITIES[StakeholderType.BORROWER],
        ...DEFAULT_CAPABILITIES[StakeholderType.LENDER],
        ...DEFAULT_CAPABILITIES[StakeholderType.INSURER],
        ...DEFAULT_CAPABILITIES[StakeholderType.OPERATOR],
      ];
    }
    return DEFAULT_CAPABILITIES[type];
  }
}
```

### Pattern 222.8: Audit Trail (HIGH)

```
222.8 Audit trail: Log all capability checks for compliance.
      Every authorization decision logged — who, what capability, granted/denied, timestamp.
```

```typescript
export class AuthorizationAuditService {
  constructor(private readonly auditRepo: AuditRepositoryPort) {}
  async log(decision: AuthorizationDecision): Promise<void> {
    await this.auditRepo.save({
      userId: decision.userId,
      capability: decision.capability,
      granted: decision.granted,
      reason: decision.reason,
      resourceId: decision.resourceId,
      timestamp: new Date(),
    });
  }
}
export interface AuthorizationDecision {
  userId: string; capability: Capability; granted: boolean;
  reason: string; resourceId?: string;
}
```

---

## Best Practices

### CBAC Design
- Capabilities derived from stakeholder type at RUNTIME — never stored as editable DB list
- COI (Conflict of Interest) checks are per-TRANSACTION, not per-user
- Defense in depth: guard at controller + check at use-case level
- Operator role has all capabilities BUT is still subject to COI rules

### Audit & Compliance
- Log every authorization DECISION (granted/denied) — not every API call
- Include: userId, capability, granted/denied, reason, resourceId, timestamp
- Audit logs are append-only — never delete, archive to cold storage after 90 days
- Regulatory requirement: audit trail queryable for 7 years

### Multi-Transport
- HTTP: @UseGuards(CbacGuard) on controllers
- gRPC: CbacInterceptor reads capabilities from metadata
- Message consumer: check capabilities in handler (no guard available)
- Use-case level check as fallback for all transports

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Editable Capabilities | DB-stored capability list, attackable | Derive from stakeholder type at runtime |
| COI per User Type | Borrower+lender same user bypasses COI | COI check per transaction context |
| HTTP-Only Guard | gRPC/queue handlers unprotected | CbacInterceptor for all transports |
| Log Everything | Every API call → disk full | Log decisions only, structured format |
| Hardcoded Capabilities | `if (user.role === 'admin')` | Use Capability enum + CbacGuard |

---

## Testing Patterns

```typescript
// 1. Test CBAC guard
describe('CbacGuard', () => {
  it('should allow user with required capability', async () => {
    const context = createMockContext({
      user: { stakeholderType: StakeholderType.LENDER },
      requiredCapability: Capability.VIEW_MARKETPLACE,
    });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should deny user without capability', async () => {
    const context = createMockContext({
      user: { stakeholderType: StakeholderType.BORROWER },
      requiredCapability: Capability.MANAGE_POLICIES,
    });
    expect(await guard.canActivate(context)).toBe(false);
  });
});
```

```typescript
// 2. Test COI policy
describe('CoiPolicy', () => {
  it('should block lender from funding own loan', () => {
    const result = coiPolicy.check({
      userId: 'user-1',
      capability: Capability.FUND_LOAN,
      resourceOwnerId: 'user-1', // same user
    });
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('conflict of interest');
  });

  it('should allow lender to fund other borrower loan', () => {
    const result = coiPolicy.check({
      userId: 'user-1',
      capability: Capability.FUND_LOAN,
      resourceOwnerId: 'user-2',
    });
    expect(result.blocked).toBe(false);
  });
});
```

```typescript
// 3. Test audit logging
describe('AuthorizationAuditService', () => {
  it('should log granted decision', async () => {
    await auditService.log({ userId: 'u1', capability: Capability.VIEW_LOANS, granted: true, reason: 'has capability' });
    expect(mockAuditRepo.save).toHaveBeenCalledWith(expect.objectContaining({ granted: true }));
  });
});
```

---

## Capability Matrix Reference

| Stakeholder | CREATE_LOAN | FUND_LOAN | VIEW_MARKETPLACE | MANAGE_POLICIES | FILE_CLAIM | MANAGE_USERS |
|-------------|:-----------:|:---------:|:----------------:|:--------------:|:----------:|:------------:|
| BORROWER | Yes | — | Yes | — | Yes | — |
| LENDER | — | Yes | Yes | — | — | — |
| INSURER | — | — | — | Yes | Yes | — |
| OPERATOR | Yes | Yes | Yes | Yes | Yes | Yes |

*Operator has all capabilities but COI rules still apply per transaction.*

---

## Abnormal Case Patterns

1. **Capability escalation via DB manipulation** — Fix: derive capabilities at runtime from stakeholder type.

2. **COI bypassed with multiple roles** — Fix: COI check per-transaction context, not per-user type.

3. **Guard only on HTTP** — gRPC/message handler unprotected. Fix: CbacInterceptor for all transports + use-case level check.

4. **Audit log overwhelms storage** — Fix: log decisions only, structured logging, rotation + archival.

5. **Capability check cached stale** — User's stakeholder type changed but cache still has old capabilities. Fix: invalidate capability cache on stakeholder type change event.

6. **Admin backdoor** — Hidden capability bypass for "testing". Fix: no bypasses in production, feature flag with audit.

7. **Missing capability on new endpoint** — New controller endpoint has no @RequireCapability decorator. Fix: default-deny — middleware rejects requests without capability annotation.

8. **Cross-service capability drift** — Different services have different capability lists. Fix: shared capability enum in Nx lib, all services reference same source.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (222.1-222.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS CBAC Authorization Specialist — Domain | EPS v3.2*

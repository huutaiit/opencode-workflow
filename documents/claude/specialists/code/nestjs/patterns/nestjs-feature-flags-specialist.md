# NestJS Feature Flags Specialist
# NestJS フィーチャーフラグスペシャリスト
# Chuyen Gia Feature Flag NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Feature Flags
**Aspect**: Feature Flags
**Category**: patterns
**Purpose**: Feature flag patterns for NestJS — LaunchDarkly/Unleash integration, toggle types, gradual rollout, testing with flags

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (guard) + Application (toggle evaluation) + Infrastructure (SDK) |
| **Variant** | ALL |
| **Pattern Numbers** | 289.1–289.5 |
| **Directory Pattern** | `src/infrastructure/feature-flags/` |
| **Naming Convention** | `feature-flag.service.ts`, `feature-flag.guard.ts` |
| **Imports From** | Infrastructure (flag SDK client) |
| **Imported By** | Presentation (guards), Application (use cases check flags) |
| **Cannot Import** | Domain (feature flags are infrastructure concern) |
| **Dependencies** | launchdarkly-node-server-sdk or unleash-client |
| **When To Use** | Gradual rollouts, A/B testing, kill switches, canary releases |
| **Source Skeleton** | `apps/{service}/src/infrastructure/feature-flags/` |
| **Specialist Type** | code |
| **Purpose** | Feature flag patterns for NestJS — LaunchDarkly/Unleash integration, toggle types, gradual rollout, testing with flags |
| **Activation Trigger** | files: **/feature-flags/**; keywords: featureFlag, launchDarkly, unleash, toggle, rollout, abTest |

---

## SCOPE

### What You Handle
- LaunchDarkly SDK integration with NestJS
- Unleash SDK integration with NestJS
- Toggle type taxonomy (release, ops, experiment, permission)
- Gradual rollout strategies
- Testing with feature flags (both states)

### What You DON'T Handle
- Configuration management → `nestjs-configuration-advanced-specialist` (283.x)
- State machine → `nestjs-state-machine-specialist` (287.x)
- A/B test analytics → `nestjs-analytics-specialist` (296.x)

---

## Role

You are a **NestJS Feature Flags Specialist**. You supply patterns for implementing feature flag systems in NestJS applications.

---

## APPROVED PATTERNS

### Pattern 289.1: LaunchDarkly Integration

```typescript
import * as LaunchDarkly from 'launchdarkly-node-server-sdk';

@Module({
  providers: [{
    provide: 'LAUNCH_DARKLY',
    useFactory: async () => {
      const client = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY);
      await client.waitForInitialization();
      return client;
    },
  }, FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}

@Injectable()
export class FeatureFlagService {
  constructor(@Inject('LAUNCH_DARKLY') private ld: LaunchDarkly.LDClient) {}

  async isEnabled(flagKey: string, user: FlagUser, defaultValue = false): Promise<boolean> {
    const ldUser = { key: user.id, email: user.email, custom: { plan: user.plan, tenant: user.tenantId } };
    return this.ld.variation(flagKey, ldUser, defaultValue);
  }

  async getVariation<T>(flagKey: string, user: FlagUser, defaultValue: T): Promise<T> {
    const ldUser = { key: user.id, custom: { plan: user.plan } };
    return this.ld.variation(flagKey, ldUser, defaultValue);
  }
}
```

---

### Pattern 289.2: Unleash Integration

```typescript
import { Unleash, startUnleash } from 'unleash-client';

@Injectable()
export class UnleashFeatureFlagService implements OnModuleInit, OnModuleDestroy {
  private unleash: Unleash;

  async onModuleInit(): Promise<void> {
    this.unleash = await startUnleash({
      url: process.env.UNLEASH_URL,
      appName: process.env.SERVICE_NAME,
      customHeaders: { Authorization: process.env.UNLEASH_API_TOKEN },
    });
  }

  isEnabled(toggleName: string, context?: { userId?: string; tenantId?: string }): boolean {
    return this.unleash.isEnabled(toggleName, {
      userId: context?.userId,
      properties: { tenantId: context?.tenantId },
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.unleash.destroy();
  }
}
```

---

### Pattern 289.3: Toggle Types

```typescript
// 4 toggle types — each has different lifecycle and cleanup strategy
enum ToggleType {
  RELEASE = 'release',       // Temporary: remove after full rollout (days/weeks)
  OPS = 'ops',               // Permanent: kill switch for production incidents
  EXPERIMENT = 'experiment',  // Temporary: A/B test, remove after decision (weeks)
  PERMISSION = 'permission',  // Permanent: role/plan-based feature access
}

// Guard decorator for controller-level flag check
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private flagService: FeatureFlagService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagKey = this.reflector.get<string>('feature-flag', context.getHandler());
    if (!flagKey) return true; // no flag required

    const user = context.switchToHttp().getRequest().user;
    const enabled = await this.flagService.isEnabled(flagKey, user);
    if (!enabled) throw new ForbiddenException('Feature not available');
    return true;
  }
}

// Custom decorator
export const RequireFeatureFlag = (flagKey: string) => SetMetadata('feature-flag', flagKey);

// Usage
@RequireFeatureFlag('new-payment-flow')
@Post('pay')
async processPayment(@Body() dto: PaymentDto) { ... }
```

---

### Pattern 289.4: Gradual Rollout

```typescript
// Percentage-based rollout — LaunchDarkly targeting rules
// Dashboard config: flag "new-checkout" → 10% → 25% → 50% → 100%

// User segment targeting — code-side evaluation
async shouldUseNewCheckout(user: FlagUser): Promise<boolean> {
  // LaunchDarkly evaluates targeting rules server-side
  return this.flagService.isEnabled('new-checkout', user);
}

// Canary release with feature flags
// Deploy new code to ALL instances, but feature gated:
// 1. Deploy code with flag OFF (100% old behavior)
// 2. Enable flag for internal users (dogfooding)
// 3. Enable for 5% of users (canary)
// 4. Monitor metrics — if OK, increase to 25%, 50%, 100%
// 5. Remove flag code after 100% rollout

// Rollback: disable flag → instant rollback without deployment
```

---

### Pattern 289.5: Testing with Feature Flags

```typescript
// Unit test: mock flag service for BOTH states
describe('PaymentUseCase', () => {
  let flagService: jest.Mocked<FeatureFlagService>;

  beforeEach(async () => {
    flagService = { isEnabled: jest.fn(), getVariation: jest.fn() } as any;
    // ... setup test module
  });

  it('should use new payment flow when flag ON', async () => {
    flagService.isEnabled.mockResolvedValue(true);
    const result = await useCase.execute(dto);
    expect(result.flow).toBe('new');
  });

  it('should use legacy flow when flag OFF', async () => {
    flagService.isEnabled.mockResolvedValue(false);
    const result = await useCase.execute(dto);
    expect(result.flow).toBe('legacy');
  });
});

// Integration test: override flag provider
const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(FeatureFlagService)
  .useValue({ isEnabled: () => true }) // force all flags ON
  .compile();
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Config file flags (`features.json`) | No per-user targeting, no gradual rollout | LaunchDarkly/Unleash (289.1/289.2) |
| 2 | Permanent release toggles | Code debt accumulates, dead branches | Remove flag after 100% rollout |
| 3 | Nested flag checks (`if flagA && flagB && flagC`) | Combinatorial explosion, untestable | Simplify to single flag or use multi-variate |

---

## Abnormal Case Patterns

1. **Flag service unavailable** — SDK can't reach LaunchDarkly. Fix: SDK caches last known values, use default fallback.
2. **Flag evaluation inconsistency** — Same user sees different state across requests. Fix: Ensure user key is stable (use userId, not session).
3. **Release flag never removed** — Dead code accumulates. Fix: Set expiry date, alert on flags older than 30 days.
4. **A/B test pollution** — User switches between groups. Fix: Hash-based bucketing (deterministic assignment).
5. **Flag check in hot path** — Flag evaluated 1000x per request. Fix: Cache flag value per request (request-scoped).

---

## Quality Checklist

- [ ] **Q1**: LaunchDarkly + Unleash integration patterns provided?
- [ ] **Q2**: Pattern IDs unique (289.1–289.5)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Testing patterns for both flag states included?

---

*NestJS Feature Flags Specialist — Pattern 289.x | EPS v10.0*

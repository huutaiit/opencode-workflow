# NestJS Auth Guards Specialist — Security
# NestJS認証ガードスペシャリスト — セキュリティ
# Chuyen Gia Auth Guards NestJS — Bao Mat

**Version**: 1.0.0
**Technology**: NestJS 10+ Authentication & Guards
**Aspect**: Auth Guards
**Category**: security
**Purpose**: Knowledge provider for NestJS authentication guards — JWT strategies, CBAC guards, Passport integration, role decorators, multi-strategy auth

---

## Metadata

```json
{
  "id": "nestjs-auth-guards-specialist",
  "technology": "NestJS 10+ Authentication & Guards",
  "aspect": "Auth Guards",
  "category": "security",
  "subcategory": "nestjs",
  "lines": 280,
  "token_cost": 1700,
  "version": "1.0.0",
  "evidence": [
    "E1: 6 architecture rules — guards at presentation boundary, domain auth logic separate",
    "E2: Clean architecture — guards delegate to application use cases, never access DB directly",
    "E5: p2plend auth — JWT + CBAC guard patterns across microservices"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Domain |
| **Variant** | ALL |
| **Pattern Numbers** | 213.1–213.10 |
| **Directory Pattern** | `src/presentation/guards/`, `src/infrastructure/auth/` |
| **Naming Convention** | `{Name}.guard.ts`, `{Name}.strategy.ts`, `{name}.decorator.ts`, `jwt-auth.guard.ts` |
| **Imports From** | Domain (CBAC capability model, user entity interfaces), Application (auth use cases) |
| **Imported By** | Presentation (controllers apply guards via decorators) |
| **Cannot Import** | Infrastructure directly (guards should not access DB — delegate to Application layer) |
| **Dependencies** | @nestjs/passport, @nestjs/jwt, passport-jwt |
| **When To Use** | JWT authentication, guards, strategies, role-based access |
| **Source Skeleton** | src/presentation/guards/{strategy}.guard.ts, src/infrastructure/auth/{strategy}.strategy.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS authentication — guards, strategies, JWT, session, role-based access |
| **Activation Trigger** | files: **/*.guard.ts, **/*.strategy.ts; keywords: canActivate, authGuard, passport, jwt |

---

## Role

You are a **NestJS Auth Guards Specialist**. Your responsibility is to provide authentication and authorization guard patterns for NestJS microservice projects following clean architecture. You supply patterns for JWT strategies, custom guards, capability-based access control, public route handling, multi-strategy authentication, and inter-service auth.

**Used by**: Any code agent working with NestJS authentication and authorization
**Not used by**: Non-NestJS stacks, frontend-only auth (React auth context)

---

## Patterns

### Pattern 213.1–213.4: Auth Guard Fundamentals (HIGH)

```
213.1 JWT Strategy: @Injectable() extends PassportStrategy(Strategy), validate(payload).
      Extracts and validates JWT token, returns user payload to request context.
```

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }
  async validate(payload: JwtPayload): Promise<AuthUser> {
    return { userId: payload.sub, roles: payload.roles };
  }
}
```

```
213.2 Auth Guard: @UseGuards(JwtAuthGuard) on controller/route.
      Apply guard at controller level for all routes, or per-route for granular control.
```

```typescript
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.orderService.findByUser(user.userId);
  }
}
```

```
213.3 Custom guard: canActivate(context: ExecutionContext) returns boolean|Promise<boolean>.
      Access request, handler metadata, and class metadata via ExecutionContext.
```

```typescript
@Injectable()
export class CustomAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;
    return this.validateToken(token);
  }
}
```

```
213.4 Role guard: Check user roles from JWT payload against required roles.
      Use @Roles() decorator to set metadata, RolesGuard reads via Reflector.
```

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY, [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### Pattern 213.5–213.7: Advanced Auth Patterns (MEDIUM-HIGH)

```
213.5 Capability-based: @RequireCapability('loan:approve') decorator + guard.
      CBAC provides fine-grained permissions beyond simple role checks.
```

```typescript
export const RequireCapability = (...caps: string[]) =>
  SetMetadata('capabilities', caps);

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>('capabilities', context.getHandler());
    if (!required) return true;
    const { user } = context.switchToHttp().getRequest();
    return required.every((cap) => user.capabilities?.includes(cap));
  }
}
```

```
213.6 Public routes: @Public() decorator + global guard with Reflector.getAllAndOverride.
      Mark specific routes as public to bypass global JWT guard.
```

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY, [context.getHandler(), context.getClass()],
    );
    return isPublic ? true : super.canActivate(context);
  }
}
```

```
213.7 Multi-strategy: Combine JWT + API key strategies with OR logic.
      Use custom guard that attempts multiple strategies, passes if any succeed.
```

```typescript
@Injectable()
export class CompositeAuthGuard implements CanActivate {
  constructor(
    private jwtGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyGuard,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try { return await this.jwtGuard.canActivate(context) as boolean; }
    catch { return this.apiKeyGuard.canActivate(context) as boolean; }
  }
}
```

### Pattern 213.8–213.10: Infrastructure Auth Patterns (MEDIUM)

```
213.8 Guard execution order: Global -> Controller -> Route level.
      Global guards run first, then controller-scoped, then route-scoped. Order matters.
```

```typescript
// main.ts — global guard
app.useGlobalGuards(new JwtAuthGuard(new Reflector()));

// Controller-level — runs after global
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  @UseGuards(CapabilityGuard) // Route-level — runs last
  @Post('approve')
  approve() { /* ... */ }
}
```

```
213.9 Token refresh: Refresh token rotation with Redis blacklist.
      Short-lived access tokens + long-lived refresh tokens, rotate on each refresh.
```

```typescript
@Injectable()
export class RefreshTokenService {
  constructor(
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}
  async rotate(oldRefreshToken: string): Promise<TokenPair> {
    await this.redis.set(`blacklist:${oldRefreshToken}`, '1', 'EX', 86400);
    const payload = this.jwtService.verify(oldRefreshToken);
    return this.generateTokenPair(payload.sub);
  }
}
```

```
213.10 gRPC auth: Metadata-based authentication for inter-service calls.
       Extract auth token from gRPC metadata instead of HTTP headers.
```

```typescript
@Injectable()
export class GrpcAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const metadata = context.switchToRpc().getContext<Metadata>();
    const token = metadata.get('authorization')[0] as string;
    return this.validateServiceToken(token);
  }
}
```

---

## Abnormal Case Patterns (4 patterns)

1. **Guard returns false but no error thrown** — Client receives generic 403 without context. Fix: Throw specific `UnauthorizedException` or `ForbiddenException` with descriptive message inside guard.

2. **Passport strategy validate() not called** — Token extraction fails silently due to wrong `jwtFromRequest` config. Fix: Verify token format matches extraction strategy (Bearer vs cookie vs query param).

3. **Global guard blocks health check endpoints** — Health/readiness probes fail auth. Fix: Apply `@Public()` decorator to health controller, ensure global guard checks `IS_PUBLIC_KEY` metadata.

4. **Circular dependency between AuthModule and UserModule** — Guard needs UserService, UserModule needs AuthModule. Fix: Extract `IUserRepository` port to domain layer, guard uses application use case that depends on port.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (213.1-213.10), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Auth Guards Specialist — Security | EPS v3.2*

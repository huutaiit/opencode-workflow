# NestJS OAuth2 & OIDC Specialist — Security
# NestJS OAuth2 & OIDCスペシャリスト — セキュリティ
# Chuyen Gia OAuth2 va OIDC NestJS — Bao Mat

**Version**: 1.0.0
**Technology**: NestJS 10+ OAuth2/OIDC (Passport, Keycloak)
**Aspect**: OAuth2 & OpenID Connect
**Category**: security
**Purpose**: Knowledge provider for NestJS OAuth2/OIDC — Passport strategies, JWT validation, OIDC flows, Keycloak integration, token refresh, social login

---

## Metadata

```json
{
  "id": "nestjs-oauth2-oidc-specialist",
  "technology": "NestJS 10+ OAuth2/OIDC",
  "aspect": "OAuth2 & OpenID Connect",
  "category": "security",
  "subcategory": "nestjs",
  "lines": 320,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Passport.js — OAuth2, OIDC strategy for NestJS",
    "E2: Keycloak — enterprise SSO with NestJS integration",
    "E3: OAuth2 flows — authorization code, client credentials, token refresh"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 264.1–264.6 |
| **Directory Pattern** | `src/infrastructure/auth/` |
| **Dependencies** | @nestjs/passport, passport-oauth2, jwks-rsa |
| **When To Use** | OAuth2/OIDC integration with Keycloak or external IdP |
| **Source Skeleton** | src/infrastructure/auth/oauth2.strategy.ts, src/infrastructure/auth/jwks.service.ts |
| **Specialist Type** | code |
| **Purpose** | OAuth2/OIDC integration — OpenID Connect, token management, SSO |
| **Activation Trigger** | files: **/auth/**; keywords: oauth2, oidc, openid, tokenEndpoint, sso |

---

## Patterns

### Pattern 264.1: JWT Validation Strategy

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (request, rawToken, done) => {
        // OIDC: validate against issuer's JWKS
        const jwksClient = new JwksRsa.JwksClient({
          jwksUri: config.get('OIDC_JWKS_URI'),
          cache: true,
          rateLimit: true,
        });
        const decoded = jwt.decode(rawToken, { complete: true });
        jwksClient.getSigningKey(decoded.header.kid, (err, key) => {
          done(err, key?.getPublicKey());
        });
      },
      algorithms: ['RS256'],
      issuer: config.get('OIDC_ISSUER'),
      audience: config.get('OIDC_AUDIENCE'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, roles: payload.realm_access?.roles || [] };
  }
}
```

### Pattern 264.2: Keycloak Integration

```typescript
// Module setup
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'), // for self-issued tokens
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, KeycloakAuthGuard],
  exports: [PassportModule],
})
export class AuthModule {}

// Guard
@Injectable()
export class KeycloakAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) throw new UnauthorizedException(info?.message || 'Unauthorized');
    return user;
  }
}
```

### Pattern 264.3: OAuth2 Authorization Code Flow

```typescript
@Controller('auth')
export class AuthController {
  @Get('login')
  @UseGuards(AuthGuard('oauth2'))
  login() {} // redirects to OAuth2 provider

  @Get('callback')
  @UseGuards(AuthGuard('oauth2'))
  callback(@Req() req: Request) {
    // User authenticated — req.user populated by Passport
    const token = this.authService.generateJwt(req.user);
    return { access_token: token };
  }
}
```

### Pattern 264.4: Token Refresh

```typescript
@Post('refresh')
async refresh(@Body() dto: RefreshTokenDto) {
  const payload = await this.authService.verifyRefreshToken(dto.refreshToken);
  const newAccessToken = this.jwtService.sign({ sub: payload.userId, roles: payload.roles });
  const newRefreshToken = this.authService.generateRefreshToken(payload.userId);
  return { access_token: newAccessToken, refresh_token: newRefreshToken };
}
```

### Pattern 264.5: Client Credentials (Service-to-Service)

```typescript
@Injectable()
export class ServiceAuthClient {
  private cachedToken: { token: string; expiry: number } | null = null;

  async getServiceToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiry > Date.now()) {
      return this.cachedToken.token;
    }
    const response = await this.httpService.post(this.config.get('OIDC_TOKEN_URL'), {
      grant_type: 'client_credentials',
      client_id: this.config.get('SERVICE_CLIENT_ID'),
      client_secret: this.config.get('SERVICE_CLIENT_SECRET'),
      scope: 'openid',
    });
    this.cachedToken = {
      token: response.data.access_token,
      expiry: Date.now() + (response.data.expires_in - 60) * 1000,
    };
    return this.cachedToken.token;
  }
}
```

---

## Best Practices

- Validate JWT with JWKS (public key rotation) — not hardcoded secret
- Access token: short-lived (15 min), refresh token: long-lived (7 days)
- Client credentials for service-to-service — cache token until near expiry
- Always validate issuer and audience claims

---

## Abnormal Case Patterns

1. **JWKS key rotation** — Old key used for validation. Fix: JWKS client with cache + fallback to refetch.
2. **Token expired between requests** — 401 on second API call. Fix: client-side token refresh before expiry.
3. **Refresh token stolen** — Attacker gets long-lived token. Fix: rotate refresh tokens on use (one-time use).
4. **Service token not cached** — Token endpoint called per request. Fix: cache with TTL = expires_in - 60s.

---

*NestJS OAuth2 & OIDC Specialist — Security | EPS v3.2*

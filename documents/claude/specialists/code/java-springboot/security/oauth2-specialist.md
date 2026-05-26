# OAuth2 Provider Specialist
# OAuth2プロバイダー スペシャリスト
# Chuyên Gia Nhà Cung Cấp OAuth2

**Role**: OAuth2 Multi-Provider Integration Expert
**Technology Stack**: Spring WebFlux, Spring Security OAuth2 Client, WebClient
**Integration**: Core module / API Gateway OAuth2 flow
**Version**: Spring Boot 3.4.4, Spring Security 6.x

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application + Infrastructure |
| **Package** | `{rootPackage}.application.service.oauth2`, `{rootPackage}.infrastructure.config`, `{rootPackage}.rest` |
| **Maven Module** | `common` + `core-manager` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 39.1–39.4 |
| **Source Paths** | `{sourceRoot}/application/service/oauth2/`, `{sourceRoot}/rest/` |
| **File Count** | ~10 OAuth2 files |
| **Naming Convention** | `OAuth2*Service.java`, `OAuth2*Controller.java`, `*ProviderService.java` |
| **Base Class** | `OAuth2ProviderService` (interface) |
| **Imports From** | Application (Services), Domain (Entities), Infrastructure (Config) |
| **Cannot Import** | N/A (cross-cutting OAuth2 spans layers) |
| **Dependencies** | org.springframework.boot:spring-boot-starter-oauth2-client, spring-boot-starter-oauth2-resource-server |
| **When To Use** | OAuth2/OIDC authentication, JWT resource server, multi-provider |
| **Source Skeleton** | `{sourceRoot}/infrastructure/security/OAuth2SecurityConfig.java`, `{sourceRoot}/infrastructure/security/OAuth2LoginSuccessHandler.java` |
| **Specialist Type** | code |
| **Purpose** | Generate OAuth2 multi-provider integration — provider service, token exchange, refresh, revocation |
| **Activation Trigger** | files: **/security/**/*OAuth2*.java, **/oauth2/**/*.java; keywords: oauth2, oidc, tokenExchange, multiProvider |

---

## Expertise Areas

1. **Service Locator Pattern**: Map<String, OAuth2ProviderService> for multi-provider support
2. **Supported Providers**: Google, Outlook, Gmail, Microsoft (Azure AD)
3. **OAuth2 Flow**: /api/oauth/connect → redirect → /api/oauth/callback → token exchange
4. **Token Management**: Access token storage, refresh token rotation, revocation detection
5. **Reactive Implementation**: All operations return Mono/Flux

---

## Pattern Index

- [Pattern 39.1: OAuth2ProviderService Interface & Service Locator](#pattern-391-oauth2providerservice-interface--service-locator)
- [Pattern 39.2: Google OAuth2 Provider Implementation](#pattern-392-google-oauth2-provider-implementation)
- [Pattern 39.3: OAuth2 Flow Controller (Connect & Callback)](#pattern-393-oauth2-flow-controller-connect--callback)
- [Pattern 39.4: Token Refresh & Revocation Handling](#pattern-394-token-refresh--revocation-handling)

---

## Pattern 39.1: OAuth2ProviderService Interface & Service Locator

**Use Case**: Support multiple OAuth2 providers via a unified interface and bean-name lookup.

#### Reactive
```java
public interface OAuth2ProviderService {
    String providerName();
    String buildAuthorizationUrl(String tenantId, String userId, String state);
    Mono<OAuth2TokenResponse> exchangeCode(String code, String redirectUri);
    Mono<OAuth2TokenResponse> refreshToken(String refreshToken);
    Mono<Void> revokeToken(String accessToken);
}
```

#### Clean-Modulith / Standard
```java
public interface OAuth2ProviderService {
    String providerName();
    String buildAuthorizationUrl(String tenantId, String userId, String state);
    OAuth2TokenResponse exchangeCode(String code, String redirectUri);
    OAuth2TokenResponse refreshToken(String refreshToken);
    void revokeToken(String accessToken);
}

// oauth2/OAuth2ProviderRegistry.java
@Component
public class OAuth2ProviderRegistry {

    // Spring injects all OAuth2ProviderService beans
    private final Map<String, OAuth2ProviderService> providers;

    public OAuth2ProviderRegistry(List<OAuth2ProviderService> providerList) {
        this.providers = providerList.stream()
            .collect(Collectors.toMap(
                OAuth2ProviderService::providerName,
                p -> p
            ));
    }

    public OAuth2ProviderService getProvider(String providerName) {
        var provider = providers.get(providerName.toLowerCase());
        if (provider == null) {
            throw new UnsupportedOAuth2ProviderException(
                "Unsupported OAuth2 provider: " + providerName +
                ". Supported: " + providers.keySet()
            );
        }
        return provider;
    }
}
```

---

## Pattern 39.2: Google OAuth2 Provider Implementation

**Use Case**: Google OAuth2 PKCE flow implementation.

#### Reactive
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleOAuth2ProviderService implements OAuth2ProviderService {

    private final WebClient webClient;

    @Value("${oauth2.google.client-id}")  private String clientId;
    @Value("${oauth2.google.client-secret}")  private String clientSecret;
    @Value("${oauth2.google.redirect-uri}")  private String redirectUri;

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String REVOKE_URL = "https://oauth2.googleapis.com/revoke";

    @Override public String providerName() { return "google"; }

    @Override
    public Mono<OAuth2TokenResponse> exchangeCode(String code, String callbackRedirectUri) {
        return webClient.post().uri(TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .bodyValue(buildTokenExchangeBody(code, callbackRedirectUri))
            .retrieve()
            .bodyToMono(GoogleTokenResponse.class)
            .map(this::toOAuth2TokenResponse);
    }

    @Override
    public Mono<OAuth2TokenResponse> refreshToken(String refreshToken) {
        return webClient.post().uri(TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .bodyValue("client_id=" + clientId + "&client_secret=" + clientSecret
                + "&refresh_token=" + refreshToken + "&grant_type=refresh_token")
            .retrieve()
            .bodyToMono(GoogleTokenResponse.class)
            .map(this::toOAuth2TokenResponse);
    }

    @Override
    public Mono<Void> revokeToken(String accessToken) {
        return webClient.post().uri(REVOKE_URL + "?token=" + accessToken)
            .retrieve().bodyToMono(Void.class);
    }
    // buildAuthorizationUrl(), buildTokenExchangeBody(), toOAuth2TokenResponse() — same for all variants
}
```

#### Clean-Modulith / Standard
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleOAuth2ProviderService implements OAuth2ProviderService {

    private final RestClient restClient;

    @Value("${oauth2.google.client-id}")  private String clientId;
    @Value("${oauth2.google.client-secret}")  private String clientSecret;
    @Value("${oauth2.google.redirect-uri}")  private String redirectUri;

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String REVOKE_URL = "https://oauth2.googleapis.com/revoke";

    @Override public String providerName() { return "google"; }

    @Override
    public OAuth2TokenResponse exchangeCode(String code, String callbackRedirectUri) {
        var response = restClient.post().uri(TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(buildTokenExchangeBody(code, callbackRedirectUri))
            .retrieve()
            .body(GoogleTokenResponse.class);
        return toOAuth2TokenResponse(response);
    }

    @Override
    public OAuth2TokenResponse refreshToken(String refreshToken) {
        var response = restClient.post().uri(TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body("client_id=" + clientId + "&client_secret=" + clientSecret
                + "&refresh_token=" + refreshToken + "&grant_type=refresh_token")
            .retrieve()
            .body(GoogleTokenResponse.class);
        return toOAuth2TokenResponse(response);
    }

    @Override
    public void revokeToken(String accessToken) {
        restClient.post().uri(REVOKE_URL + "?token=" + accessToken)
            .retrieve().toBodilessEntity();
    }
    // buildAuthorizationUrl(), buildTokenExchangeBody(), toOAuth2TokenResponse() — same for all variants
}
```

---

## Pattern 39.3: OAuth2 Flow Controller (Connect & Callback)

**Use Case**: Initiate OAuth2 flow and handle authorization code callback.

#### Reactive
```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/oauth")
@Slf4j
public class OAuth2Controller {

    private final OAuth2ProviderRegistry providerRegistry;
    private final OAuth2StateService stateService;
    private final OAuth2TokenStore tokenStore;

    @GetMapping("/connect")
    public Mono<RedirectResponse> connect(
            @RequestParam String provider, @AuthenticationPrincipal Jwt jwt) {
        return stateService.generateState(jwt.getSubject(), jwt.getClaimAsString("tenantId"), provider)
            .map(state -> new RedirectResponse(
                providerRegistry.getProvider(provider)
                    .buildAuthorizationUrl(jwt.getClaimAsString("tenantId"), jwt.getSubject(), state)));
    }

    @GetMapping("/callback")
    public Mono<OAuth2ConnectResult> callback(@RequestParam String code, @RequestParam String state) {
        return stateService.validateAndConsumeState(state)
            .flatMap(sd -> providerRegistry.getProvider(sd.getProvider())
                .exchangeCode(code, "/api/oauth/callback")
                .flatMap(tokens -> tokenStore.store(sd.getUserId(), sd.getTenantId(), sd.getProvider(), tokens))
                .thenReturn(OAuth2ConnectResult.success(sd.getProvider())))
            .onErrorResume(ex -> Mono.just(OAuth2ConnectResult.failed(ex.getMessage())));
    }

    @DeleteMapping("/disconnect")
    public Mono<Void> disconnect(@RequestParam String provider, @AuthenticationPrincipal Jwt jwt) {
        return tokenStore.getAccessToken(jwt.getSubject(), provider)
            .flatMap(token -> providerRegistry.getProvider(provider).revokeToken(token))
            .then(tokenStore.delete(jwt.getSubject(), provider));
    }
}
```

#### Clean-Modulith / Standard
```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/oauth")
@Slf4j
public class OAuth2Controller {

    private final OAuth2ProviderRegistry providerRegistry;
    private final OAuth2StateService stateService;
    private final OAuth2TokenStore tokenStore;

    @GetMapping("/connect")
    public RedirectResponse connect(
            @RequestParam String provider, @AuthenticationPrincipal Jwt jwt) {
        var state = stateService.generateState(jwt.getSubject(), jwt.getClaimAsString("tenantId"), provider);
        var authUrl = providerRegistry.getProvider(provider)
            .buildAuthorizationUrl(jwt.getClaimAsString("tenantId"), jwt.getSubject(), state);
        return new RedirectResponse(authUrl);
    }

    @GetMapping("/callback")
    public OAuth2ConnectResult callback(@RequestParam String code, @RequestParam String state) {
        try {
            var sd = stateService.validateAndConsumeState(state);
            var tokens = providerRegistry.getProvider(sd.getProvider())
                .exchangeCode(code, "/api/oauth/callback");
            tokenStore.store(sd.getUserId(), sd.getTenantId(), sd.getProvider(), tokens);
            return OAuth2ConnectResult.success(sd.getProvider());
        } catch (Exception ex) {
            log.error("OAuth2 callback failed: state={}", state, ex);
            return OAuth2ConnectResult.failed(ex.getMessage());
        }
    }

    @DeleteMapping("/disconnect")
    public void disconnect(@RequestParam String provider, @AuthenticationPrincipal Jwt jwt) {
        var token = tokenStore.getAccessToken(jwt.getSubject(), provider);
        providerRegistry.getProvider(provider).revokeToken(token);
        tokenStore.delete(jwt.getSubject(), provider);
    }
}
```

---

## Pattern 39.4: Token Refresh & Revocation Handling

**Use Case**: Transparently refresh expired tokens; detect and handle revocation.

#### Reactive
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2TokenRefreshService {

    private final OAuth2ProviderRegistry providerRegistry;
    private final OAuth2TokenStore tokenStore;

    public Mono<String> getValidAccessToken(String userId, String tenantId, String provider) {
        return tokenStore.getTokenData(userId, provider)
            .flatMap(tokenData -> {
                if (!tokenData.isExpired()) {
                    return Mono.just(tokenData.getAccessToken());
                }
                return providerRegistry.getProvider(provider)
                    .refreshToken(tokenData.getRefreshToken())
                    .flatMap(newTokens -> tokenStore.updateTokens(userId, provider, newTokens)
                        .thenReturn(newTokens.getAccessToken()))
                    .onErrorResume(OAuth2TokenRevokedException.class, ex -> {
                        log.warn("Token revoked for userId={}, provider={}", userId, provider);
                        return tokenStore.delete(userId, provider)
                            .then(Mono.error(new OAuth2ReconnectRequiredException(provider)));
                    });
            });
    }
}
```

#### Clean-Modulith / Standard
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2TokenRefreshService {

    private final OAuth2ProviderRegistry providerRegistry;
    private final OAuth2TokenStore tokenStore;

    public String getValidAccessToken(String userId, String tenantId, String provider) {
        var tokenData = tokenStore.getTokenData(userId, provider);
        if (!tokenData.isExpired()) {
            return tokenData.getAccessToken();
        }
        try {
            var newTokens = providerRegistry.getProvider(provider)
                .refreshToken(tokenData.getRefreshToken());
            tokenStore.updateTokens(userId, provider, newTokens);
            return newTokens.getAccessToken();
        } catch (OAuth2TokenRevokedException ex) {
            log.warn("Token revoked for userId={}, provider={}", userId, provider);
            tokenStore.delete(userId, provider);
            throw new OAuth2ReconnectRequiredException(provider);
        }
    }
}
```

---

## Anti-Patterns

- NO storing OAuth2 tokens in browser cookies — use server-side token store (Redis/DB)
- NO returning access tokens in API responses — clients request data through your API, not directly
- NO reusing state parameter across multiple OAuth2 flows — generate unique state per initiation
- NO skipping refresh token rotation — update stored refresh token after each refresh

---

## Related Specialists

- `cache/cache-specialist.md` - Redis-based token store for short-lived access tokens
- `gateway/gateway-specialist.md` - Gateway extracts JWT and forwards to downstream services
- `security/java-security-specialist.md` - Integration with Spring Security OAuth2 resource server
- `multitenancy/multitenancy-specialist.md` - tenantId in JWT state payload for callback routing

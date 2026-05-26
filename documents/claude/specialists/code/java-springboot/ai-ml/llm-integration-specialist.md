# LLM Integration Specialist
# LLM統合スペシャリスト
# Chuyen Gia Tich Hop LLM cho Java

**Created**: 2026-04-07
**Version**: 1.0
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: ALL
**Technology**: WebClient + Claude/OpenAI API + Resilience4j
**Aspect**: AI/ML Integration Layer
**Purpose**: Consultation agent for /plan command (Agent-03)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Package** | `{rootPackage}.infrastructure.ai.{provider}` |
| **Maven Module** | `common` |
| **Variant** | ALL |
| **Pattern Numbers** | 99.1–99.8 |
| **Source Paths** | `{sourceRoot}/infrastructure/ai/`, `{sourceRoot}/infrastructure/config/ai/` |
| **File Count** | ~10-18 AI integration components |
| **Naming Convention** | `LlmClient.java`, `{Provider}LlmClient.java`, `LlmFallbackChain.java`, `PromptTemplate.java`, `TokenBudgetManager.java`, `LlmProperties.java` |
| **Base Class** | `LlmClient` (interface) |
| **Imports From** | Domain (entity types for context), Infrastructure (config, WebClient) |
| **Imported By** | Application services (NlSqlService, SummarizationService — via LlmClient interface injection) |
| **Cannot Import** | Presentation (inversion of dependency), Application (Infrastructure must not depend on Application) |
| **Dependencies** | io.github.resilience4j:resilience4j-spring-boot3, io.github.resilience4j:resilience4j-reactor |
| **When To Use** | LLM API integration (Claude, OpenAI, local models), streaming responses, token management, multi-provider fallback with circuit breaker |
| **Source Skeleton** | `{sourceRoot}/infrastructure/ai/LlmClient.java`, `{sourceRoot}/infrastructure/ai/claude/ClaudeLlmClient.java`, `{sourceRoot}/infrastructure/ai/openai/OpenAiLlmClient.java`, `{sourceRoot}/infrastructure/ai/LlmFallbackChain.java`, `{sourceRoot}/infrastructure/config/ai/LlmProperties.java`, `{sourceRoot}/infrastructure/config/ai/LlmWebClientConfig.java` |
| **Specialist Type** | code |
| **Purpose** | Generate LLM API integration components for Spring Boot — multi-provider clients, fallback chain with circuit breaker, streaming support, token management, and prompt templates |
| **Activation Trigger** | files: **/infrastructure/ai/**/*.java, **/config/ai/**/*.java; keywords: llm, aiIntegration, claude, openai, ollama, promptTemplate, tokenManagement, streaming, llmFallback |

---

## ROLE

You are an **LLM Integration Specialist** for Java Spring Boot applications.

**Your ONLY responsibility**: Provide guidance on integrating LLM APIs (Claude, OpenAI, local models) into Spring Boot applications with proper fallback chains, streaming support, token management, and resilience patterns.

**Used by**: Agent-03 (Context Engineering) during /plan command execution

---

## SCOPE

### What You Handle

- LLM API client abstraction (multi-provider: Claude, OpenAI, Ollama/local)
- Streaming responses (SSE/Server-Sent Events via Flux<String>)
- Token budget management (input/output token counting, cost tracking)
- Prompt template management (reusable, parameterized templates)
- Retry and fallback chain (provider failover, circuit breaker)
- Rate limiting (per-provider, per-tenant)
- Response parsing (structured output extraction, JSON mode)
- Configuration management (API keys, endpoints, model selection)

### What You DON'T Handle

- NL-to-SQL prompt design -> Delegate to `nl-to-sql-specialist`
- BI/Analytics queries -> Delegate to `bi-analytics-specialist`
- HTTP client low-level patterns -> Delegate to `http-client-patterns-specialist`
- Caching -> Delegate to `cache-specialist`

---

## CRITICAL: FALLBACK ARCHITECTURE

```
                    +-----------------+
                    |  Application    |
                    |  Service Layer  |
                    +--------+--------+
                             |
                    +--------v--------+
                    |   LlmClient     |  <-- Single interface
                    |   (interface)    |
                    +--------+--------+
                             |
                    +--------v--------+
                    | LlmFallbackChain|  <-- Orchestrates fallback
                    +--------+--------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v--------+
     | Claude API |  | OpenAI API  |  | Ollama      |
     | (Primary)  |  | (Secondary) |  | (Local/Last)|
     +-----+------+  +------+------+  +------+------+
           |                |                |
     Circuit Breaker  Circuit Breaker  Always available
     (Resilience4j)   (Resilience4j)   (degraded quality)
```

### Fallback Principle: "AI as Enhancement, Not Dependency"

App MUST function without external LLM APIs. Fallback layers:

| Layer | Strategy | When |
|-------|----------|------|
| L1 | **Multi-provider failover** | Claude timeout/error -> try OpenAI -> try Ollama |
| L2 | **Circuit breaker** | Provider consistently failing -> skip, go next |
| L3 | **Response cache** | Same prompt recently answered -> serve cached |
| L4 | **Graceful degradation** | All providers down -> rule-based/template fallback |
| L5 | **Queue & retry** | Non-critical requests -> queue for async processing |

---

## PROJECT STANDARDS

### Pattern 99.1: LLM Client Interface

```java
/**
 * Provider-agnostic LLM client interface
 *
 * Key principles:
 * - Single interface for ALL LLM providers
 * - Supports both blocking (Mono) and streaming (Flux) responses
 * - Provider-specific implementations behind this interface
 * - Application services ONLY depend on this interface
 */

public interface LlmClient {

    /** Single completion (request -> full response) */
    Mono<LlmResponse> complete(LlmRequest request);

    /** Streaming completion (request -> token stream) */
    Flux<String> stream(LlmRequest request);

    /** Check provider health */
    Mono<Boolean> isAvailable();

    /** Provider identifier */
    String providerName();
}

@Builder
public record LlmRequest(
    String systemPrompt,
    String userMessage,
    String model,           // nullable = use default
    int maxTokens,
    double temperature,
    Map<String, Object> metadata
) {
    public LlmRequest {
        if (maxTokens <= 0) maxTokens = 4096;
        if (temperature < 0) temperature = 0.0;
    }
}

@Builder
public record LlmResponse(
    String content,
    String model,
    String provider,
    TokenUsage tokenUsage,
    Duration latency,
    boolean fromCache
) {}

public record TokenUsage(int inputTokens, int outputTokens, int totalTokens) {}
```

**Why Approved**:
- Clean interface segregation (application depends on interface, not provider)
- Record-based DTOs (immutable, compact)
- Supports both Mono and Flux patterns
- Health check for circuit breaker integration

---

### Pattern 99.2: Claude API Client

```java
/**
 * Claude (Anthropic) API client implementation
 *
 * Key principles:
 * - WebClient for non-blocking HTTP
 * - Proper error handling (rate limit, auth, server errors)
 * - Token usage tracking
 * - Streaming via SSE
 */

@Component
@RequiredArgsConstructor
@Slf4j
public class ClaudeLlmClient implements LlmClient {

    private final WebClient claudeWebClient;
    private final LlmProperties properties;

    @Override
    public Mono<LlmResponse> complete(LlmRequest request) {
        long startTime = System.nanoTime();

        return claudeWebClient.post()
            .uri("/v1/messages")
            .bodyValue(buildRequestBody(request))
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, this::handle4xx)
            .onStatus(HttpStatusCode::is5xxServerError, this::handle5xx)
            .bodyToMono(ClaudeApiResponse.class)
            .map(response -> mapToLlmResponse(response, startTime))
            .doOnError(e -> log.error("Claude API error: {}", e.getMessage()));
    }

    @Override
    public Flux<String> stream(LlmRequest request) {
        Map<String, Object> body = buildRequestBody(request);
        body.put("stream", true);

        return claudeWebClient.post()
            .uri("/v1/messages")
            .bodyValue(body)
            .retrieve()
            .bodyToFlux(String.class)
            .filter(line -> line.startsWith("data: "))
            .map(line -> line.substring(6))
            .filter(data -> !data.equals("[DONE]"))
            .map(this::extractContentDelta)
            .filter(Objects::nonNull);
    }

    @Override
    public Mono<Boolean> isAvailable() {
        return claudeWebClient.get()
            .uri("/v1/messages")  // lightweight check
            .retrieve()
            .toBodilessEntity()
            .map(r -> true)
            .onErrorReturn(false)
            .timeout(Duration.ofSeconds(3), Mono.just(false));
    }

    @Override
    public String providerName() { return "claude"; }

    private Map<String, Object> buildRequestBody(LlmRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", request.model() != null
            ? request.model() : properties.getClaude().getDefaultModel());
        body.put("max_tokens", request.maxTokens());
        body.put("messages", List.of(
            Map.of("role", "user", "content", request.userMessage())
        ));
        if (request.systemPrompt() != null) {
            body.put("system", request.systemPrompt());
        }
        return body;
    }

    private Mono<? extends Throwable> handle4xx(ClientResponse response) {
        return response.bodyToMono(String.class)
            .flatMap(body -> {
                if (response.statusCode().value() == 429) {
                    return Mono.error(new LlmRateLimitException("Claude rate limited", body));
                }
                return Mono.error(new LlmClientException("Claude 4xx: " + body));
            });
    }

    private Mono<? extends Throwable> handle5xx(ClientResponse response) {
        return Mono.error(new LlmProviderException("Claude server error"));
    }
}
```

**Why Approved**:
- WebClient for non-blocking I/O
- Proper HTTP error classification (4xx vs 5xx, rate limit detection)
- SSE streaming support
- Health check with timeout
- Configurable model via properties

---

### Pattern 99.3: WebClient Configuration

```java
/**
 * WebClient beans per LLM provider
 *
 * Key principles:
 * - Separate WebClient per provider (different base URLs, headers)
 * - Timeout configuration
 * - API key from properties (NOT hardcoded)
 */

@Configuration
public class LlmWebClientConfig {

    @Bean
    @Qualifier("claudeWebClient")
    public WebClient claudeWebClient(LlmProperties props) {
        return WebClient.builder()
            .baseUrl(props.getClaude().getBaseUrl())
            .defaultHeader("x-api-key", props.getClaude().getApiKey())
            .defaultHeader("anthropic-version", props.getClaude().getApiVersion())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .codecs(configurer -> configurer.defaultCodecs()
                .maxInMemorySize(1024 * 1024)) // 1MB for large responses
            .build();
    }

    @Bean
    @Qualifier("openAiWebClient")
    public WebClient openAiWebClient(LlmProperties props) {
        return WebClient.builder()
            .baseUrl(props.getOpenai().getBaseUrl())
            .defaultHeader(HttpHeaders.AUTHORIZATION,
                "Bearer " + props.getOpenai().getApiKey())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    @Bean
    @Qualifier("ollamaWebClient")
    public WebClient ollamaWebClient(LlmProperties props) {
        return WebClient.builder()
            .baseUrl(props.getOllama().getBaseUrl())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }
}
```

**Why Approved**:
- @Qualifier for provider-specific injection
- API keys from properties (12-factor app)
- Content type and version headers
- Memory limit for large responses

---

### Pattern 99.4: Configuration Properties

```java
/**
 * Externalized LLM configuration
 *
 * Key principles:
 * - @ConfigurationProperties for type-safe config
 * - Per-provider settings (API key, model, timeout, etc.)
 * - Fallback order configurable
 */

@ConfigurationProperties(prefix = "app.llm")
@Validated
@Data
public class LlmProperties {

    /** Provider fallback order (first = primary) */
    private List<String> fallbackOrder = List.of("claude", "openai", "ollama");

    /** Enable/disable LLM features globally */
    private boolean enabled = true;

    private ProviderConfig claude = new ProviderConfig();
    private ProviderConfig openai = new ProviderConfig();
    private ProviderConfig ollama = new ProviderConfig();

    @Data
    public static class ProviderConfig {
        private boolean enabled = true;
        private String baseUrl;
        private String apiKey;
        private String apiVersion;
        private String defaultModel;
        private int maxTokens = 4096;
        private int timeoutSeconds = 30;
        private int maxRetries = 2;

        /** Circuit breaker config */
        private int failureRateThreshold = 50;        // percentage
        private int slowCallRateThreshold = 80;        // percentage
        private int slowCallDurationSeconds = 10;
        private int waitDurationInOpenStateSeconds = 60;
        private int slidingWindowSize = 10;
    }
}
```

```yaml
# application.yml
app:
  llm:
    enabled: true
    fallback-order: claude, openai, ollama
    claude:
      enabled: true
      base-url: https://api.anthropic.com
      api-key: ${CLAUDE_API_KEY}
      api-version: "2023-06-01"
      default-model: claude-sonnet-4-20250514
      max-tokens: 4096
      timeout-seconds: 30
    openai:
      enabled: true
      base-url: https://api.openai.com
      api-key: ${OPENAI_API_KEY}
      default-model: gpt-4o
      timeout-seconds: 30
    ollama:
      enabled: true
      base-url: http://localhost:11434
      default-model: llama3
      timeout-seconds: 60
```

**Why Approved**:
- @ConfigurationProperties for type-safe binding
- Environment variable references for secrets
- Configurable fallback order
- Per-provider circuit breaker thresholds
- Global enable/disable toggle

---

### Pattern 99.5: Fallback Chain with Circuit Breaker

```java
/**
 * Multi-provider fallback chain with Resilience4j circuit breaker
 *
 * This is the CORE pattern for runtime resilience.
 *
 * Fallback order: Claude -> OpenAI -> Ollama -> Cache -> Degraded
 *
 * Key principles:
 * - Circuit breaker per provider (independent failure tracking)
 * - Automatic failover to next provider on failure/timeout
 * - Cache layer before complete degradation
 * - Application receives response transparently (doesn't know which provider)
 */

@Service
@Slf4j
public class LlmFallbackChain implements LlmClient {

    private final List<LlmClientWithBreaker> providerChain;
    private final LlmResponseCache responseCache;
    private final LlmProperties properties;

    public LlmFallbackChain(
            List<LlmClient> providers,
            CircuitBreakerRegistry circuitBreakerRegistry,
            LlmResponseCache responseCache,
            LlmProperties properties) {
        this.responseCache = responseCache;
        this.properties = properties;

        // Build ordered chain based on config
        this.providerChain = properties.getFallbackOrder().stream()
            .map(name -> providers.stream()
                .filter(p -> p.providerName().equals(name))
                .findFirst()
                .orElse(null))
            .filter(Objects::nonNull)
            .map(provider -> new LlmClientWithBreaker(
                provider,
                circuitBreakerRegistry.circuitBreaker(
                    "llm-" + provider.providerName(),
                    buildCBConfig(properties, provider.providerName()))
            ))
            .toList();
    }

    @Override
    public Mono<LlmResponse> complete(LlmRequest request) {
        // Layer 3: Check cache first
        return responseCache.get(request)
            .switchIfEmpty(Mono.defer(() -> tryProviderChain(request, 0)))
            .doOnNext(response -> {
                if (!response.fromCache()) {
                    responseCache.put(request, response).subscribe();
                }
            });
    }

    private Mono<LlmResponse> tryProviderChain(LlmRequest request, int index) {
        if (index >= providerChain.size()) {
            // Layer 4: All providers exhausted
            return Mono.error(new LlmUnavailableException(
                "All LLM providers unavailable"));
        }

        LlmClientWithBreaker current = providerChain.get(index);
        String providerName = current.client().providerName();

        // Layer 2: Circuit breaker check
        if (current.breaker().getState() == CircuitBreaker.State.OPEN) {
            log.info("Circuit breaker OPEN for {}, skipping to next", providerName);
            return tryProviderChain(request, index + 1);
        }

        return current.breaker()
            .executePublisher(Mono.defer(() -> current.client().complete(request)))
            .next()
            .doOnNext(r -> log.info("LLM response from provider: {}", providerName))
            .onErrorResume(e -> {
                log.warn("Provider {} failed: {}, trying next",
                    providerName, e.getMessage());
                return tryProviderChain(request, index + 1);
            });
    }

    @Override
    public Flux<String> stream(LlmRequest request) {
        // Streaming: try providers in order, no cache
        return tryStreamChain(request, 0);
    }

    private Flux<String> tryStreamChain(LlmRequest request, int index) {
        if (index >= providerChain.size()) {
            return Flux.error(new LlmUnavailableException(
                "All LLM providers unavailable for streaming"));
        }

        LlmClientWithBreaker current = providerChain.get(index);

        if (current.breaker().getState() == CircuitBreaker.State.OPEN) {
            return tryStreamChain(request, index + 1);
        }

        return Flux.from(current.breaker()
            .executePublisher(current.client().stream(request)))
            .onErrorResume(e -> {
                log.warn("Stream provider {} failed, trying next",
                    current.client().providerName());
                return tryStreamChain(request, index + 1);
            });
    }

    @Override
    public Mono<Boolean> isAvailable() {
        return Flux.fromIterable(providerChain)
            .flatMap(p -> p.client().isAvailable())
            .any(Boolean::booleanValue); // at least one available
    }

    @Override
    public String providerName() { return "fallback-chain"; }

    private CircuitBreakerConfig buildCBConfig(LlmProperties props, String provider) {
        LlmProperties.ProviderConfig cfg = switch (provider) {
            case "claude" -> props.getClaude();
            case "openai" -> props.getOpenai();
            default -> props.getOllama();
        };
        return CircuitBreakerConfig.custom()
            .failureRateThreshold(cfg.getFailureRateThreshold())
            .slowCallRateThreshold(cfg.getSlowCallRateThreshold())
            .slowCallDurationThreshold(Duration.ofSeconds(cfg.getSlowCallDurationSeconds()))
            .waitDurationInOpenState(Duration.ofSeconds(cfg.getWaitDurationInOpenStateSeconds()))
            .slidingWindowSize(cfg.getSlidingWindowSize())
            .build();
    }

    private record LlmClientWithBreaker(LlmClient client, CircuitBreaker breaker) {}
}
```

**Why Approved**:
- Circuit breaker per provider (Resilience4j)
- Automatic failover (Claude -> OpenAI -> Ollama)
- Cache layer before total failure
- OPEN breaker = skip immediately (no wasted timeout)
- Streaming fallback support
- Config-driven provider order

---

### Pattern 99.6: Response Cache

```java
/**
 * LLM response cache for repeated/similar prompts
 *
 * Key principles:
 * - Cache key = hash of (systemPrompt + userMessage + model)
 * - TTL-based expiration (configurable)
 * - Serve stale cache when all providers down
 */

@Service
@RequiredArgsConstructor
public class LlmResponseCache {

    private final ReactiveRedisTemplate<String, LlmResponse> redisTemplate;
    private static final Duration DEFAULT_TTL = Duration.ofHours(1);
    private static final String KEY_PREFIX = "llm:cache:";

    public Mono<LlmResponse> get(LlmRequest request) {
        String key = buildKey(request);
        return redisTemplate.opsForValue().get(key)
            .map(cached -> LlmResponse.builder()
                .content(cached.content())
                .model(cached.model())
                .provider(cached.provider())
                .tokenUsage(cached.tokenUsage())
                .latency(Duration.ZERO)
                .fromCache(true)
                .build());
    }

    public Mono<Void> put(LlmRequest request, LlmResponse response) {
        String key = buildKey(request);
        return redisTemplate.opsForValue()
            .set(key, response, DEFAULT_TTL)
            .then();
    }

    private String buildKey(LlmRequest request) {
        String raw = request.systemPrompt() + "|" +
                     request.userMessage() + "|" +
                     request.model();
        return KEY_PREFIX + DigestUtils.sha256Hex(raw);
    }
}
```

**Why Approved**:
- SHA-256 cache key (deterministic, collision-resistant)
- TTL-based expiration
- fromCache flag for transparency
- Redis for distributed cache (works across instances)

---

### Pattern 99.7: Token Budget Manager

```java
/**
 * Token counting and budget management
 *
 * Key principles:
 * - Estimate input tokens before sending (avoid API rejection)
 * - Track token usage per request and per tenant
 * - Truncate/summarize context when exceeding budget
 */

@Service
@Slf4j
public class TokenBudgetManager {

    // Approximate: 1 token ~= 4 chars for English, ~2 chars for CJK
    private static final double CHARS_PER_TOKEN_EN = 4.0;
    private static final double CHARS_PER_TOKEN_CJK = 2.0;

    public int estimateTokens(String text) {
        if (text == null || text.isEmpty()) return 0;

        long cjkChars = text.codePoints()
            .filter(cp -> Character.UnicodeScript.of(cp) == Character.UnicodeScript.HAN
                || Character.UnicodeScript.of(cp) == Character.UnicodeScript.HIRAGANA
                || Character.UnicodeScript.of(cp) == Character.UnicodeScript.KATAKANA)
            .count();
        long otherChars = text.length() - cjkChars;

        return (int) Math.ceil(
            cjkChars / CHARS_PER_TOKEN_CJK + otherChars / CHARS_PER_TOKEN_EN);
    }

    public LlmRequest fitWithinBudget(LlmRequest request, int maxInputTokens) {
        int systemTokens = estimateTokens(request.systemPrompt());
        int userTokens = estimateTokens(request.userMessage());
        int totalInput = systemTokens + userTokens;

        if (totalInput <= maxInputTokens) {
            return request; // fits within budget
        }

        // Truncate user message to fit (keep full system prompt)
        int availableForUser = maxInputTokens - systemTokens;
        if (availableForUser <= 0) {
            log.warn("System prompt alone exceeds budget: {} > {}",
                systemTokens, maxInputTokens);
            return request;
        }

        int maxChars = (int) (availableForUser * CHARS_PER_TOKEN_EN);
        String truncatedMessage = request.userMessage().substring(0,
            Math.min(maxChars, request.userMessage().length()));

        log.info("Truncated user message from {} to {} estimated tokens",
            userTokens, estimateTokens(truncatedMessage));

        return LlmRequest.builder()
            .systemPrompt(request.systemPrompt())
            .userMessage(truncatedMessage)
            .model(request.model())
            .maxTokens(request.maxTokens())
            .temperature(request.temperature())
            .metadata(request.metadata())
            .build();
    }
}
```

**Why Approved**:
- CJK-aware token estimation (critical for Japanese clients)
- Budget enforcement before API call (avoids wasted requests)
- System prompt prioritized over user message
- Logging for observability

---

### Pattern 99.8: Prompt Template

```java
/**
 * Reusable prompt templates with parameter substitution
 *
 * Key principles:
 * - Named parameters ({{paramName}})
 * - Templates stored as resources or database records
 * - Validation: all parameters must be provided
 */

@Component
public class PromptTemplateRegistry {

    private final Map<String, PromptTemplate> templates = new ConcurrentHashMap<>();

    @PostConstruct
    void loadBuiltInTemplates() {
        register("summarize", PromptTemplate.of(
            "Summarize the following text in {{language}}:\n\n{{text}}",
            Set.of("language", "text")));

        register("classify", PromptTemplate.of(
            "Classify the following into one of [{{categories}}]:\n\n{{input}}",
            Set.of("categories", "input")));

        register("translate", PromptTemplate.of(
            "Translate from {{sourceLang}} to {{targetLang}}:\n\n{{text}}",
            Set.of("sourceLang", "targetLang", "text")));
    }

    public void register(String name, PromptTemplate template) {
        templates.put(name, template);
    }

    public String render(String templateName, Map<String, String> params) {
        PromptTemplate template = templates.get(templateName);
        if (template == null) {
            throw new IllegalArgumentException("Unknown template: " + templateName);
        }

        // Validate all required params present
        Set<String> missing = new HashSet<>(template.requiredParams());
        missing.removeAll(params.keySet());
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException(
                "Missing template params: " + missing);
        }

        String result = template.template();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return result;
    }
}

public record PromptTemplate(String template, Set<String> requiredParams) {
    public static PromptTemplate of(String template, Set<String> params) {
        return new PromptTemplate(template, params);
    }
}
```

**Why Approved**:
- Named parameter substitution (readable, maintainable)
- Validation of required parameters
- Registry pattern for centralized management
- Extensible (add templates at runtime)

---

### REJECTED Pattern 1: Direct API Call Without Fallback

```java
// DON'T: Single provider, no fallback, no circuit breaker
@Service
public class AiService {
    private final WebClient webClient;

    public Mono<String> ask(String question) {
        return webClient.post()
            .uri("https://api.anthropic.com/v1/messages")
            .bodyValue(Map.of("messages", List.of(Map.of("role", "user", "content", question))))
            .retrieve()
            .bodyToMono(Map.class)
            .map(r -> r.get("content").toString());
    }
}
```

**Why Rejected**:
- Single provider = single point of failure
- No circuit breaker (keeps hammering failing API)
- No timeout, no retry
- Hardcoded URL (not configurable)
- Raw Map response handling (fragile)

**Solution**: LlmClient interface + LlmFallbackChain (Patterns 99.1 + 99.5)

---

### REJECTED Pattern 2: Blocking LLM Call

```java
// DON'T: Blocking HTTP call in reactive stack
public String ask(String question) {
    RestTemplate restTemplate = new RestTemplate();
    ResponseEntity<Map> response = restTemplate.postForEntity(
        "https://api.openai.com/v1/chat/completions",
        requestBody, Map.class);  // BLOCKS thread
    return response.getBody().get("choices").toString();
}
```

**Why Rejected**:
- RestTemplate is blocking (kills reactive performance)
- Creates new RestTemplate per call (no connection pooling)
- No error handling, no timeout
- Blocks event loop thread in WebFlux

**Solution**: WebClient with reactive chain (Pattern 99.2)

---

### REJECTED Pattern 3: API Key in Source Code

```java
// DON'T: Hardcoded secrets
private static final String API_KEY = "sk-ant-api03-xxxxx";
```

**Why Rejected**:
- Secret exposed in source code / git history
- Cannot rotate without code change
- Security vulnerability

**Solution**: Environment variables via @ConfigurationProperties (Pattern 99.4)

---

## FALLBACK DECISION MATRIX

Per-feature fallback strategy when ALL LLM providers are down:

| Feature | Fallback Strategy | Quality Impact |
|---------|-------------------|----------------|
| NL-to-SQL | Template-based query matching (Pattern 98.6) | Covers ~60-80% common queries |
| Summarization | Return truncated raw data | Low quality, still functional |
| Classification | Rule-based / keyword matching | Lower accuracy, deterministic |
| Translation | Return original text with "translation unavailable" | Feature disabled gracefully |
| Recommendation | Popularity-based / history-based | Less personalized |
| Content generation | Return placeholder / template-based content | Feature degraded |

---

## DECISION TREE

```
Is this question about LLM / AI integration?
+-- YES -> Continue consultation
|   |
|   +-- Need multi-provider setup?
|   |   -> RECOMMEND: Pattern 99.1 (Interface) + 99.2 (Claude) + 99.3 (Config)
|   |
|   +-- Need fallback / resilience?
|   |   -> RECOMMEND: Pattern 99.5 (Fallback Chain with Circuit Breaker)
|   |
|   +-- Need response caching?
|   |   -> RECOMMEND: Pattern 99.6 (Response Cache)
|   |
|   +-- Need token management?
|   |   -> RECOMMEND: Pattern 99.7 (Token Budget Manager)
|   |
|   +-- Need prompt templates?
|   |   -> RECOMMEND: Pattern 99.8 (Prompt Template)
|   |
|   +-- Need configuration?
|   |   -> RECOMMEND: Pattern 99.4 (Configuration Properties)
|   |
|   +-- Need NL-to-SQL specifically?
|       -> DELEGATE: nl-to-sql-specialist
|
+-- NO -> Delegate to appropriate specialist
    +-- HTTP clients? -> http-client-patterns-specialist
    +-- Caching? -> cache-specialist
    +-- Analytics? -> bi-analytics-specialist
```

---

## KEYWORDS

Trigger this specialist when step description contains:

- "LLM"
- "AI integration"
- "Claude API"
- "OpenAI API"
- "Ollama"
- "prompt template"
- "token management"
- "streaming response"
- "LLM fallback"
- "circuit breaker" (in AI context)
- "multi-provider"
- "AI service"

---

## VERSION HISTORY

- **v1.0.0** (2026-04-07): Initial version
  - 8 approved patterns: LLM client interface, Claude client, WebClient config, properties, fallback chain, response cache, token budget, prompt templates
  - 3 rejected patterns: no fallback, blocking calls, hardcoded secrets
  - Fallback architecture: 5-layer resilience (provider failover -> circuit breaker -> cache -> degradation -> queue)
  - CJK-aware token estimation

---

*LLM Integration Specialist v1.0 — Java Spring Boot*
*Location: `specialists/code/java-springboot/ai-ml/llm-integration-specialist.md`*

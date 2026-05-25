# NestJS LLM Integration Specialist
# NestJS LLM統合スペシャリスト
# Chuyen Gia Tich Hop LLM NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ LLM Integration
**Aspect**: LLM Integration
**Category**: ai-ml
**Purpose**: LLM integration for NestJS — service abstraction via port/adapter, prompt management, streaming responses, RAG pipeline, token budget, error handling/fallback, structured output

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain (port) + Infrastructure (LLM client) + Application (use case) |
| **Variant** | ALL |
| **Pattern Numbers** | 292.1–292.7 |
| **Directory Pattern** | `src/infrastructure/ai/`, `src/domain/ports/llm.port.ts` |
| **Naming Convention** | `llm.port.ts`, `openai.adapter.ts`, `anthropic.adapter.ts` |
| **Imports From** | Domain (port interface), Infrastructure (SDK clients) |
| **Imported By** | Application (use cases call LLM via port) |
| **Cannot Import** | Presentation (AI is infrastructure + domain concern) |
| **Dependencies** | openai, @anthropic-ai/sdk, langchain (optional) |
| **When To Use** | AI-powered features — chat, summarization, code generation, NL-to-SQL, risk scoring |
| **Source Skeleton** | `apps/{service}/src/infrastructure/ai/` |
| **Specialist Type** | code |
| **Purpose** | LLM integration for NestJS — service abstraction via port/adapter, prompt management, streaming responses, RAG pipeline, token budget, error handling/fallback, structured output |
| **Activation Trigger** | files: **/ai/**, **/llm/**; keywords: openai, anthropic, llm, prompt, completion, embedding, rag |

---

## SCOPE

### What You Handle
- LLM service abstraction (port/adapter for OpenAI, Anthropic, local models)
- Prompt template management and versioning
- Streaming token responses via SSE
- RAG pipeline (embed → vector search → augment → generate)
- Token budget estimation and cost tracking
- Error handling, retry, model fallback chain
- Structured output (JSON mode, function calling, Zod validation)

### What You DON'T Handle
- NL-to-SQL query generation → `nestjs-nl-to-sql-specialist` (297.x)
- SSE endpoint patterns → `nestjs-sse-specialist` (288.x)
- Vector database setup → infrastructure concern (Qdrant/Pinecone docs)

---

## Role

You are a **NestJS LLM Integration Specialist**. You supply patterns for integrating large language models into NestJS applications using Clean Architecture principles.

---

## APPROVED PATTERNS

### Pattern 292.1: LLM Service Abstraction (Port/Adapter)

```typescript
// Domain port — model-agnostic
export interface LlmPort {
  complete(prompt: string, options?: LlmOptions): Promise<string>;
  completeStream(prompt: string, options?: LlmOptions): AsyncGenerator<string>;
  embed(text: string): Promise<number[]>;
}

export interface LlmOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export const LLM_PORT = Symbol('LLM_PORT');

// Infrastructure: OpenAI adapter
@Injectable()
export class OpenAiAdapter implements LlmPort {
  private client: OpenAI;
  constructor() { this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

  async complete(prompt: string, options?: LlmOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      messages: [
        ...(options?.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature ?? 0.7,
      ...(options?.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
    });
    return response.choices[0].message.content || '';
  }

  async *completeStream(prompt: string, options?: LlmOptions): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({ model: 'text-embedding-3-small', input: text });
    return response.data[0].embedding;
  }
}

// Module wiring: swap adapter via config
{ provide: LLM_PORT, useClass: process.env.LLM_PROVIDER === 'anthropic' ? AnthropicAdapter : OpenAiAdapter }
```

---

### Pattern 292.2: Prompt Management

```typescript
@Injectable()
export class PromptTemplateService {
  private templates = new Map<string, { version: string; template: string }>();

  register(name: string, version: string, template: string): void {
    this.templates.set(`${name}:${version}`, { version, template });
    this.templates.set(`${name}:latest`, { version, template });
  }

  render(name: string, variables: Record<string, string>, version = 'latest'): string {
    const tmpl = this.templates.get(`${name}:${version}`);
    if (!tmpl) throw new PromptNotFoundException(name, version);
    return tmpl.template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
  }
}

// Usage
this.prompts.register('risk-assessment', 'v2', `
You are a credit risk analyst. Analyze the following loan application:

Applicant: {{applicantName}}
Income: {{monthlyIncome}}
Requested Amount: {{loanAmount}}
Credit Score: {{creditScore}}

Provide risk assessment as JSON: { "riskLevel": "LOW|MEDIUM|HIGH", "score": 0-100, "reasons": [] }
`);

const prompt = this.prompts.render('risk-assessment', { applicantName: 'John', monthlyIncome: '5000', ... });
const result = await this.llm.complete(prompt, { responseFormat: 'json' });
```

---

### Pattern 292.3: Streaming Responses via SSE

```typescript
// Controller: stream LLM tokens to client via SSE
@Sse('chat/stream')
chatStream(@Query('prompt') prompt: string): Observable<MessageEvent> {
  const generator = this.llm.completeStream(prompt);

  return new Observable<MessageEvent>((subscriber) => {
    (async () => {
      for await (const token of generator) {
        subscriber.next({ data: JSON.stringify({ token }) } as MessageEvent);
      }
      subscriber.next({ data: JSON.stringify({ done: true }) } as MessageEvent);
      subscriber.complete();
    })().catch((err) => subscriber.error(err));
  });
}
```

---

### Pattern 292.4: RAG Pipeline

```typescript
@Injectable()
export class RagPipelineService {
  constructor(
    @Inject(LLM_PORT) private llm: LlmPort,
    private vectorStore: VectorStoreService,
  ) {}

  async query(question: string, options?: { topK?: number }): Promise<RagResult> {
    // 1. Embed the question
    const embedding = await this.llm.embed(question);

    // 2. Search vector store for relevant chunks
    const chunks = await this.vectorStore.similaritySearch(embedding, options?.topK || 5);

    // 3. Augment prompt with retrieved context
    const context = chunks.map(c => c.content).join('\n---\n');
    const augmentedPrompt = `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer based on the context above:`;

    // 4. Generate answer
    const answer = await this.llm.complete(augmentedPrompt);

    return { answer, sources: chunks.map(c => ({ id: c.id, score: c.score })) };
  }
}
```

---

### Pattern 292.5: Token Budget Management

```typescript
@Injectable()
export class TokenBudgetService {
  // Rough estimation: 1 token ≈ 4 characters for English
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Chunk long documents to fit context window
  chunkText(text: string, maxTokens: number): string[] {
    const chunks: string[] = [];
    const words = text.split(' ');
    let current = '';
    for (const word of words) {
      if (this.estimateTokens(current + ' ' + word) > maxTokens) {
        chunks.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  // Cost tracking per request
  async trackUsage(model: string, inputTokens: number, outputTokens: number, userId: string): Promise<void> {
    await this.usageRepo.save({ model, inputTokens, outputTokens, userId, timestamp: new Date() });
  }
}
```

---

### Pattern 292.6: Error Handling & Fallback Chain

```typescript
@Injectable()
export class ResilientLlmService {
  constructor(
    @Inject('OPENAI') private openai: LlmPort,
    @Inject('ANTHROPIC') private anthropic: LlmPort,
    private cache: CacheService,
  ) {}

  async complete(prompt: string, options?: LlmOptions): Promise<string> {
    // Fallback chain: primary → secondary → cache
    const strategies = [
      { name: 'openai-gpt4o', fn: () => this.openai.complete(prompt, { ...options, model: 'gpt-4o' }) },
      { name: 'anthropic-sonnet', fn: () => this.anthropic.complete(prompt, { ...options, model: 'claude-sonnet-4-20250514' }) },
      { name: 'cache', fn: () => this.cache.getSimilar(prompt) },
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy.fn();
        this.logger.log(`LLM: ${strategy.name} succeeded`);
        return result;
      } catch (err) {
        if (err.status === 429) {
          this.logger.warn(`LLM: ${strategy.name} rate limited, trying next`);
          await new Promise(r => setTimeout(r, 2000)); // brief delay before fallback
        } else {
          this.logger.warn(`LLM: ${strategy.name} failed: ${err.message}`);
        }
      }
    }
    throw new ServiceUnavailableException('All LLM providers unavailable');
  }
}
```

---

### Pattern 292.7: Structured Output

```typescript
import { z } from 'zod';

// Define expected output schema
const riskAssessmentSchema = z.object({
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  recommendedAction: z.string(),
});

type RiskAssessment = z.infer<typeof riskAssessmentSchema>;

@Injectable()
export class StructuredLlmService {
  async getStructuredOutput<T>(prompt: string, schema: z.ZodSchema<T>, maxRetries = 2): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await this.llm.complete(prompt, { responseFormat: 'json' });
      try {
        const parsed = JSON.parse(response);
        return schema.parse(parsed); // Zod validates structure
      } catch (err) {
        if (attempt === maxRetries) throw new LlmOutputValidationException(err.message);
        this.logger.warn(`Structured output validation failed, retry ${attempt + 1}`);
        // Retry with validation error feedback in prompt
      }
    }
  }
}
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Direct OpenAI SDK call in use case | Couples application to specific provider | Port/adapter (292.1) |
| 2 | Hardcoded prompts in code | No versioning, can't A/B test | Prompt templates (292.2) |
| 3 | Trust LLM JSON output without validation | LLM output is non-deterministic | Zod schema validation (292.7) |

---

## Abnormal Case Patterns

1. **Rate limited (429)** — Too many requests to LLM API. Fix: Implement retry with exponential backoff + model fallback.
2. **Context window exceeded** — Prompt + context > model limit. Fix: Chunk documents, summarize context.
3. **Hallucinated JSON structure** — LLM returns invalid JSON. Fix: Zod validation + retry with error feedback.
4. **Streaming connection drops** — Network interruption mid-stream. Fix: Client-side reconnection with partial response caching.
5. **Cost explosion** — Developer loop calling GPT-4 1000x. Fix: Per-user token budget limits, development mode with cheaper model.
6. **Embedding dimension mismatch** — Model changed, embeddings incompatible. Fix: Version embeddings, re-index on model change.
7. **Prompt injection** — User input contains "ignore previous instructions". Fix: Separate system prompt, sanitize user input, output validation.

---

## Quality Checklist

- [ ] **Q1**: Port/adapter, prompts, streaming, RAG, budget, fallback, structured output covered?
- [ ] **Q2**: Pattern IDs unique (292.1–292.7)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Clean Architecture respected (LLM accessed via domain port)?

---

*NestJS LLM Integration Specialist — Pattern 292.x | EPS v10.0*

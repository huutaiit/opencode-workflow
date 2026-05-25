# FastAPI Anthropic Claude Specialist
# FastAPI Anthropic Claudeスペシャリスト
# Chuyen Gia Anthropic Claude FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/llm/`, `src/ai/anthropic_client.py` |
| **Variant** | ALL |
| **Naming Convention** | `anthropic_client.py`, `claude_service.py` |
| **Imports From** | Domain (schemas), Infrastructure (config) |
| **Cannot Import** | Presentation |
| **Dependencies** | `anthropic>=0.30` |
| **When To Use** | Claude API integration, streaming, tool use, prompt caching |
| **Source Skeleton** | `src/llm/anthropic_client.py`, `src/llm/router.py` |
| **Pattern Numbers** | 51.1–51.7 |
| **Source Paths** | `**/llm/**/*.py`, `**/ai/anthropic*.py` |
| **File Count** | 1-2 per project |
| **Imported By** | Application (services) |
| **Specialist Type** | code |
| **Purpose** | Claude SDK async client, Messages API, streaming, tool use, prompt engineering, prompt caching, message batches |
| **Activation Trigger** | anthropic, claude, messages.create, tool_use, claude-sonnet, claude-opus |

---

## Purpose

Define Anthropic Claude integration patterns for FastAPI: async client setup, Messages API with model selection, streaming responses, tool use with input schemas, Claude-specific prompt engineering, prompt caching for cost reduction, and message batches API for bulk processing.

---

## Pattern 51.1: Client Setup

```python
import anthropic

from src.core.config import settings

# Module-level singleton
client = anthropic.AsyncAnthropic(
    api_key=settings.ANTHROPIC_API_KEY,
    timeout=30.0,
    max_retries=2,
)
```

**Key rules**:
- Use `AsyncAnthropic` (not sync `Anthropic`) in async FastAPI
- API key from `ANTHROPIC_API_KEY` env var (auto-detected if set)
- Set explicit timeout for web request contexts

> Source: Anthropic SKILL.md (Mindrally)

---

## Pattern 51.2: Messages API

```python
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 1024
    temperature: float = 0.7


async def chat(request: ChatRequest) -> dict:
    response = await client.messages.create(
        model=request.model,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        messages=[
            {"role": "user", "content": request.message},
        ],
    )

    return {
        "content": response.content[0].text,
        "model": response.model,
        "usage": {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        },
        "stop_reason": response.stop_reason,
    }
```

**Model selection guide**:

| Model | Best For | Speed | Cost |
|-------|----------|-------|------|
| claude-opus-4-20250514 | Complex reasoning, coding | Slower | $$$$ |
| claude-sonnet-4-20250514 | Balanced quality/speed | Medium | $$ |
| claude-haiku-3-5-20241022 | Fast, cheap, simple tasks | Fast | $ |

**Key rule**: `max_tokens` is REQUIRED (unlike OpenAI). Always set it explicitly.

> Source: Anthropic SKILL.md

---

## Pattern 51.3: Streaming

```python
from collections.abc import AsyncGenerator
from fastapi.sse import EventSourceResponse, ServerSentEvent


async def stream_claude(
    message: str,
    model: str = "claude-sonnet-4-20250514",
) -> AsyncGenerator[ServerSentEvent, None]:
    """Stream Claude response tokens via SSE."""
    async with client.messages.stream(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": message}],
    ) as stream:
        async for text in stream.text_stream:
            yield ServerSentEvent(data=text, event="token")

    # After stream completes, get final message for usage
    final = await stream.get_final_message()
    yield ServerSentEvent(
        data=f'{{"input_tokens": {final.usage.input_tokens}, '
        f'"output_tokens": {final.usage.output_tokens}}}',
        event="usage",
    )
    yield ServerSentEvent(data="[DONE]", event="done")


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    return EventSourceResponse(stream_claude(request.message, request.model))
```

**Key rules**:
- Use `client.messages.stream()` context manager (not `stream=True` param)
- `stream.text_stream` yields text chunks
- Call `stream.get_final_message()` after iteration for usage stats

> Source: Anthropic SKILL.md

---

## Pattern 51.4: Tool Use

```python
import json


tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a location. Use this when user asks about weather.",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name, e.g. 'San Francisco'",
                },
            },
            "required": ["location"],
        },
    },
]


async def chat_with_tools(message: str) -> str:
    """Chat with tool use — Claude's function calling."""
    messages = [{"role": "user", "content": message}]

    # First call — Claude may request tool use
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=messages,
        tools=tools,
    )

    # If Claude wants to use a tool
    if response.stop_reason == "tool_use":
        # Extract tool use blocks
        tool_uses = [
            block for block in response.content
            if block.type == "tool_use"
        ]

        # Build tool results
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for tool_use in tool_uses:
            result = await execute_tool(tool_use.name, tool_use.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use.id,
                "content": json.dumps(result),
            })

        messages.append({"role": "user", "content": tool_results})

        # Second call — Claude generates response with tool results
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=messages,
            tools=tools,
        )

    # Extract text from response
    text_blocks = [b.text for b in response.content if b.type == "text"]
    return " ".join(text_blocks)
```

**Key differences from OpenAI**:
- Claude uses `input_schema` (not `parameters`)
- Check `stop_reason == "tool_use"` (not `finish_reason == "tool_calls"`)
- Tool results sent as `"role": "user"` with `"type": "tool_result"`
- Must include `tool_use_id` in results

> Source: Anthropic SKILL.md

---

## Pattern 51.5: Prompt Engineering for Claude

```python
# Claude-specific prompt techniques

# 1. XML tags for structure (Claude responds best to XML)
SYSTEM_PROMPT = """You are a data extraction assistant.

<instructions>
Extract structured data from the user's text.
Return ONLY valid JSON matching the schema.
</instructions>

<output_schema>
{"name": "string", "age": "integer", "skills": ["string"]}
</output_schema>
"""

# 2. Few-shot examples in XML
FEW_SHOT = """
<examples>
<example>
<input>John is a 30-year-old Python developer</input>
<output>{"name": "John", "age": 30, "skills": ["Python"]}</output>
</example>
</examples>
"""

# 3. Chain of Thought
COT_PROMPT = """Think through this step-by-step:
<thinking>
1. First, identify...
2. Then, analyze...
3. Finally, conclude...
</thinking>

Now provide your answer:"""

# 4. Role assignment
response = await client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system="You are a senior Python developer reviewing code for security issues.",
    messages=[{"role": "user", "content": code_to_review}],
)
```

**Key rules**:
- Use XML tags for structure — Claude was trained on XML-heavy data
- Put static content in `system` parameter (benefits from caching)
- Use `<thinking>` tags for chain-of-thought
- Be explicit about output format

> Source: Anthropic SKILL.md

---

## Pattern 51.6: Prompt Caching

```python
# Prompt caching — 90% cost reduction on cached content

response = await client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "You are a legal document analyzer...",  # Static system prompt
        },
        {
            "type": "text",
            "text": large_reference_document,  # Large static context
            "cache_control": {"type": "ephemeral"},  # Mark for caching
        },
    ],
    messages=[
        {"role": "user", "content": "Summarize section 3"},
    ],
)

# Check cache usage
print(response.usage.cache_creation_input_tokens)  # First call: tokens cached
print(response.usage.cache_read_input_tokens)       # Subsequent: tokens read from cache
```

**Caching rules**:
- Minimum 1,024 tokens to cache (2,048 for Haiku)
- Place static content FIRST, dynamic content LAST
- Cache lives for 5 minutes (refreshed on each hit)
- Cost: cache write = 1.25x, cache read = 0.1x (90% saving)

**Best candidates for caching**:
- Large system prompts
- Reference documents (legal, medical, technical)
- Few-shot example collections
- Tool definitions

> Source: Anthropic SKILL.md

---

## Pattern 51.7: Message Batches API

```python
# Batch API — 50% cost reduction, 24h processing window

batch = await client.messages.batches.create(
    requests=[
        {
            "custom_id": f"request-{i}",
            "params": {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "messages": [
                    {"role": "user", "content": text},
                ],
            },
        }
        for i, text in enumerate(texts_to_process)
    ]
)

# Check batch status
batch_status = await client.messages.batches.retrieve(batch.id)
print(batch_status.processing_status)  # in_progress, ended

# Get results when done
if batch_status.processing_status == "ended":
    async for result in client.messages.batches.results(batch.id):
        print(result.custom_id, result.result.message.content[0].text)
```

**When to use batches**:
- Non-time-sensitive processing (content moderation, data extraction)
- Large-scale document processing
- Cost-sensitive bulk operations (50% cheaper)
- 24-hour processing window acceptable

---

## MUST DO

- Use `AsyncAnthropic` in async FastAPI
- Always set `max_tokens` (required parameter)
- Use `client.messages.stream()` context manager for streaming
- Use XML tags in prompts for Claude
- Cache static content with `cache_control: {"type": "ephemeral"}`
- Handle `stop_reason == "tool_use"` for tool calling

## MUST NOT DO

- Use sync `Anthropic` in `async def` routes
- Forget `max_tokens` (API will reject)
- Use OpenAI-style `stream=True` (Claude uses `.stream()` method)
- Skip `tool_use_id` in tool results
- Cache dynamic/user-specific content (waste)
- Send `system` as a message (use `system` parameter)

---

## References

- [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python)
- [Claude Messages API](https://docs.anthropic.com/en/api/messages)
- [Claude Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

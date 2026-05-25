# FastAPI OpenAI LLM Specialist
# FastAPI OpenAI LLMスペシャリスト
# Chuyen Gia OpenAI LLM FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/llm/`, `src/ai/openai_client.py` |
| **Variant** | ALL |
| **Naming Convention** | `openai_client.py`, `llm_service.py` |
| **Imports From** | Domain (schemas), Infrastructure (config) |
| **Cannot Import** | Presentation |
| **Dependencies** | `openai>=1.40` |
| **When To Use** | OpenAI API integration, chat completions, function calling, structured output |
| **Source Skeleton** | `src/llm/openai_client.py`, `src/llm/router.py` |
| **Pattern Numbers** | 50.1–50.7 |
| **Source Paths** | `**/llm/**/*.py`, `**/ai/openai*.py` |
| **File Count** | 1-2 per project |
| **Imported By** | Application (services) |
| **Specialist Type** | code |
| **Purpose** | OpenAI SDK async client, GPT chat completions, streaming responses, function calling/tool use, structured output, error handling, cost optimization |
| **Activation Trigger** | openai, gpt, ChatCompletion, function_calling, tool_calls |

---

## Purpose

Define OpenAI integration patterns for FastAPI: async client singleton, chat completions with model selection, SSE streaming responses, function calling/tool use, structured JSON output, retry with backoff for rate limits, and cost optimization strategies.

---

## Pattern 50.1: Client Singleton (Lifespan)

```python
from openai import AsyncOpenAI
from src.core.config import settings


# Module-level singleton — initialized once
client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    timeout=30.0,
    max_retries=2,
)


# Or via FastAPI dependency
async def get_openai_client() -> AsyncOpenAI:
    return client
```

**Key rules**:
- Always use `AsyncOpenAI` (not sync `OpenAI`) in async FastAPI
- API key from environment: `OPENAI_API_KEY` (auto-detected if set)
- Set explicit `timeout` (default is 10 min — too long for web requests)

> Source: OpenAI .mdc rules (sanjeed5/awesome-cursor-rules-mdc)

---

## Pattern 50.2: Chat Completions

```python
from openai import AsyncOpenAI
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 1024


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict


async def chat(request: ChatRequest) -> ChatResponse:
    response = await client.chat.completions.create(
        model=request.model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": request.message},
        ],
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    )

    choice = response.choices[0]
    return ChatResponse(
        content=choice.message.content,
        model=response.model,
        usage={
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        },
    )
```

**Model selection guide**:

| Model | Best For | Speed | Cost |
|-------|----------|-------|------|
| gpt-4o | Complex reasoning, multi-modal | Medium | $$$ |
| gpt-4o-mini | Fast, cheap, good quality | Fast | $ |
| o1 | Math, code, deep reasoning | Slow | $$$$ |
| o3-mini | Reasoning with lower cost | Medium | $$ |

> Source: OpenAI SKILL.md (Mindrally)

---

## Pattern 50.3: Streaming Responses (SSE)

```python
from collections.abc import AsyncGenerator
from fastapi import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent

router = APIRouter(prefix="/chat", tags=["chat"])


async def stream_completion(
    message: str,
    model: str = "gpt-4o",
) -> AsyncGenerator[ServerSentEvent, None]:
    """Stream OpenAI response tokens via SSE."""
    stream = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": message}],
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield ServerSentEvent(data=delta.content, event="token")

        # Check for finish reason
        if chunk.choices[0].finish_reason:
            yield ServerSentEvent(
                data=chunk.choices[0].finish_reason,
                event="done",
            )


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    return EventSourceResponse(
        stream_completion(request.message, request.model)
    )
```

**Key rules**:
- Use `stream=True` parameter
- Check `delta.content` (can be `None` for function call chunks)
- Always send a "done" event so client knows stream is complete

---

## Pattern 50.4: Function Calling / Tool Use

```python
import json


tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, e.g. 'San Francisco'",
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                    },
                },
                "required": ["location"],
            },
        },
    },
]


async def chat_with_tools(message: str) -> str:
    """Chat with automatic function calling."""
    messages = [{"role": "user", "content": message}]

    # First call — model may request tool use
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
        tool_choice="auto",
    )

    choice = response.choices[0]

    # If model wants to call a function
    if choice.finish_reason == "tool_calls":
        messages.append(choice.message)

        for tool_call in choice.message.tool_calls:
            args = json.loads(tool_call.function.arguments)
            # Execute the function
            result = await execute_function(
                tool_call.function.name, args
            )
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result),
            })

        # Second call — model generates final response
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
        )

    return response.choices[0].message.content


async def execute_function(name: str, args: dict) -> dict:
    """Dispatch function call to handler."""
    handlers = {
        "get_weather": get_weather_handler,
    }
    handler = handlers.get(name)
    if not handler:
        return {"error": f"Unknown function: {name}"}
    return await handler(**args)
```

> Source: OpenAI .mdc rules

---

## Pattern 50.5: Structured Output

```python
from pydantic import BaseModel


class ExtractedInfo(BaseModel):
    name: str
    age: int
    occupation: str
    skills: list[str]


async def extract_structured(text: str) -> ExtractedInfo:
    """Force JSON output matching Pydantic schema."""
    response = await client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "Extract structured information from text.",
            },
            {"role": "user", "content": text},
        ],
        response_format=ExtractedInfo,
    )

    return response.choices[0].message.parsed
```

**Alternative — JSON mode** (less strict):
```python
response = await client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    response_format={"type": "json_object"},
)
data = json.loads(response.choices[0].message.content)
```

**Key rule**: Prefer `beta.chat.completions.parse` with Pydantic model for guaranteed schema compliance. Fallback to `json_object` mode if schema is dynamic.

---

## Pattern 50.6: Error Handling

```python
from openai import (
    APIError,
    APIConnectionError,
    RateLimitError,
    APITimeoutError,
)
import asyncio


async def chat_with_retry(
    messages: list[dict],
    max_retries: int = 3,
) -> str:
    """Chat with exponential backoff for rate limits."""
    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
            )
            return response.choices[0].message.content

        except RateLimitError:
            if attempt < max_retries - 1:
                wait = 2 ** attempt  # 1, 2, 4 seconds
                await asyncio.sleep(wait)
                continue
            raise

        except APITimeoutError:
            if attempt < max_retries - 1:
                continue
            raise

        except APIConnectionError:
            # Network issue — retry
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            raise

        except APIError as e:
            # 5xx server error — retry
            if e.status_code and e.status_code >= 500:
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
            raise
```

> Source: OpenAI SKILL.md

---

## Pattern 50.7: Cost Optimization

```python
import tiktoken


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """Count tokens for cost estimation."""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))


# Cost per 1M tokens (approximate, check openai.com/pricing)
COSTS = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "o1": {"input": 15.00, "output": 60.00},
}


def estimate_cost(
    input_tokens: int,
    output_tokens: int,
    model: str = "gpt-4o",
) -> float:
    """Estimate API call cost in USD."""
    costs = COSTS.get(model, COSTS["gpt-4o"])
    return (
        input_tokens * costs["input"] / 1_000_000
        + output_tokens * costs["output"] / 1_000_000
    )
```

**Cost optimization strategies**:
1. **Model selection**: Use `gpt-4o-mini` for simple tasks (17x cheaper than `gpt-4o`)
2. **Prompt caching**: Reuse static system prompts (auto-cached by OpenAI)
3. **Batch API**: 50% discount for non-time-sensitive requests
4. **Token counting**: Estimate before calling, set `max_tokens` to cap output
5. **Response caching**: Cache identical prompts (Redis, semantic similarity)

---

## MUST DO

- Use `AsyncOpenAI` in async FastAPI (never sync `OpenAI`)
- Set explicit timeout on client (default 10 min is too long)
- Implement exponential backoff for `RateLimitError`
- Use structured output (`parse`) for schema-guaranteed JSON
- Count tokens before and after for cost tracking
- Store API key in environment variable (never hardcode)

## MUST NOT DO

- Create new client instance per request
- Use sync `OpenAI` in `async def` routes
- Ignore `RateLimitError` (will get 429 cascade)
- Trust raw `json_object` mode without validation
- Send PII in prompts without user consent
- Hardcode model names (use config/constants)

---

## References

- [OpenAI Python SDK](https://github.com/openai/openai-python)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [tiktoken](https://github.com/openai/tiktoken)

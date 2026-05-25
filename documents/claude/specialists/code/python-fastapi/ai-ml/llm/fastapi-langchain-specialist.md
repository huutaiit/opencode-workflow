# FastAPI LangChain Specialist
# FastAPI LangChainスペシャリスト
# Chuyen Gia LangChain FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/chains/`, `src/ai/langchain/` |
| **Variant** | ALL |
| **Naming Convention** | `chain.py`, `agent.py`, `tools.py`, `prompts.py` |
| **Imports From** | Domain (schemas), Infrastructure (vector stores, LLM clients) |
| **Cannot Import** | Presentation |
| **Dependencies** | `langchain>=0.3`, `langchain-openai`, `langchain-anthropic`, `langsmith` |
| **When To Use** | LLM chain orchestration, LCEL pipes, structured output, tools |
| **Source Skeleton** | `src/llm/chains.py`, `src/llm/tools.py`, `src/llm/router.py` |
| **Pattern Numbers** | 52.1–52.8 |
| **Source Paths** | `**/chains/**/*.py`, `**/agents/**/*.py`, `**/ai/langchain/**/*.py` |
| **File Count** | 3-6 per AI feature |
| **Imported By** | Application (services) |
| **Specialist Type** | code |
| **Purpose** | LangChain LCEL chains, invoke/batch/stream, structured output, custom tools, memory, fallback chains, LangSmith tracing, project organization |
| **Activation Trigger** | langchain, LCEL, chain, agent, tool, LangSmith, RunnableSequence |

---

## Purpose

Define LangChain integration patterns for FastAPI: LCEL pipe operator for composable chains, invoke/batch/stream execution modes, structured output with Pydantic, custom tools with decorators, conversation memory, error handling with fallbacks, LangSmith observability, and project organization conventions.

---

## Pattern 52.1: LCEL Pipe Operator

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

# LCEL: prompt | llm | parser
llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant specialized in {topic}."),
    ("user", "{question}"),
])

# Chain composition with pipe operator
chain = prompt | llm | StrOutputParser()

# Execute
result = await chain.ainvoke({
    "topic": "Python",
    "question": "What are the best practices for async programming?",
})
```

**LCEL key concept**: Each component is a `Runnable` with standardized interface:
- `.ainvoke()` — single input
- `.abatch()` — multiple inputs
- `.astream()` — streaming output

**Chain = Runnable | Runnable | Runnable** (left-to-right composition)

> Source: LangChain .mdc rules (sanjeed5/awesome-cursor-rules-mdc)

---

## Pattern 52.2: invoke / batch / stream

```python
# Single invocation
result = await chain.ainvoke({"topic": "Python", "question": "..."})

# Batch — parallel execution, up to max_concurrency
results = await chain.abatch(
    [
        {"topic": "Python", "question": "What is asyncio?"},
        {"topic": "Python", "question": "What is GIL?"},
        {"topic": "Python", "question": "What is typing?"},
    ],
    config={"max_concurrency": 5},
)

# Stream — real-time token output
async for chunk in chain.astream({"topic": "Python", "question": "..."}):
    print(chunk, end="", flush=True)

# Stream events (detailed: includes intermediaries)
async for event in chain.astream_events(
    {"topic": "Python", "question": "..."},
    version="v2",
):
    if event["event"] == "on_chat_model_stream":
        print(event["data"]["chunk"].content, end="")
```

**FastAPI SSE integration**:
```python
from fastapi.sse import EventSourceResponse, ServerSentEvent


async def stream_chain(question: str):
    async for chunk in chain.astream({"topic": "Python", "question": question}):
        yield ServerSentEvent(data=chunk, event="token")
    yield ServerSentEvent(data="[DONE]", event="done")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    return EventSourceResponse(stream_chain(request.question))
```

> Source: LangChain SKILL.md (Mindrally)

---

## Pattern 52.3: Structured Output

```python
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI


class MovieReview(BaseModel):
    """Structured movie review extraction."""
    title: str = Field(description="Movie title")
    rating: float = Field(description="Rating 1-10", ge=1, le=10)
    sentiment: str = Field(description="positive, negative, or mixed")
    key_points: list[str] = Field(description="Main review points")


llm = ChatOpenAI(model="gpt-4o")

# with_structured_output — guaranteed schema compliance
structured_llm = llm.with_structured_output(MovieReview)

review = await structured_llm.ainvoke(
    "Review: The movie was amazing! Great acting, "
    "beautiful cinematography, but the ending was weak."
)
# review is a MovieReview instance
print(review.title, review.rating, review.sentiment)
```

**Key rule**: Always use `.with_structured_output(PydanticModel)` instead of manual JSON parsing. Supported by OpenAI, Anthropic, Google models.

> Source: LangChain .mdc rules

---

## Pattern 52.4: Custom Tools

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI


@tool
async def search_database(query: str, limit: int = 10) -> list[dict]:
    """Search the product database.

    Args:
        query: Search query string
        limit: Maximum results to return
    """
    # Docstring becomes tool description for the LLM
    results = await product_repo.search(query, limit=limit)
    return [r.model_dump() for r in results]


@tool
async def get_user_profile(user_id: str) -> dict:
    """Get user profile by ID.

    Args:
        user_id: The user's unique identifier
    """
    user = await user_service.get(user_id)
    return user.model_dump()


# Bind tools to LLM
llm = ChatOpenAI(model="gpt-4o")
llm_with_tools = llm.bind_tools([search_database, get_user_profile])
```

**Key rules**:
- Use `@tool` decorator (not manual dict definition)
- Docstring = tool description (LLM reads this to decide when to use)
- Type hints = parameter schema
- Use `async def` for async tools

> Source: LangChain SKILL.md

---

## Pattern 52.5: Memory

```python
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# Store per-session
store: dict[str, InMemoryChatMessageHistory] = {}


def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]


# Wrap chain with message history
chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="question",
    history_messages_key="history",
)

# Invoke with session config
result = await chain_with_history.ainvoke(
    {"question": "What is Python?"},
    config={"configurable": {"session_id": "user-123"}},
)

# Follow-up — history is automatically included
result = await chain_with_history.ainvoke(
    {"question": "Tell me more about its async features"},
    config={"configurable": {"session_id": "user-123"}},
)
```

**Production memory** (persistent):
```python
# Redis-backed chat history
from langchain_redis import RedisChatMessageHistory

def get_session_history(session_id: str):
    return RedisChatMessageHistory(
        session_id=session_id,
        redis_url="redis://localhost:6379",
    )
```

---

## Pattern 52.6: Error Handling (Fallback Chains)

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# Primary model
primary = ChatOpenAI(model="gpt-4o")

# Fallback model (different provider)
fallback = ChatAnthropic(model="claude-sonnet-4-20250514")

# Chain with automatic fallback
robust_llm = primary.with_fallbacks([fallback])

# If GPT-4o fails (rate limit, timeout), auto-switches to Claude
chain = prompt | robust_llm | StrOutputParser()
```

**Retry with backoff**:
```python
from langchain_core.runnables import RunnableConfig

# Built-in retry
chain_with_retry = chain.with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True,
)
```

> Source: LangChain SKILL.md (chain.with_fallbacks)

---

## Pattern 52.7: LangSmith Integration

```python
import os

# Enable LangSmith tracing (set env vars)
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "ls__..."
os.environ["LANGCHAIN_PROJECT"] = "my-fastapi-app"

# Traces are automatic — every chain invocation is logged

# Add metadata and tags for filtering
result = await chain.ainvoke(
    {"question": "..."},
    config={
        "metadata": {"user_id": "123", "feature": "chat"},
        "tags": ["production", "v2"],
    },
)
```

**Key rule**: Set `LANGCHAIN_TRACING_V2=true` and LangSmith auto-captures all chain/agent invocations with latency, token usage, and intermediate steps.

> Source: LangChain SKILL.md

---

## Pattern 52.8: Code Organization

```
src/ai/
├── agents/          # Agent definitions
│   ├── research_agent.py
│   └── support_agent.py
├── chains/          # LCEL chains
│   ├── summarize.py
│   └── extract.py
├── models/          # LLM configurations
│   └── llm_factory.py
├── prompts/         # Prompt templates
│   ├── system.py
│   └── templates/
├── tools/           # Custom tools
│   ├── search.py
│   └── database.py
├── memory/          # Memory backends
│   └── redis_history.py
└── config.py        # AI-specific settings
```

**Key rules**:
- Separate prompts from chain logic (prompts change more often)
- Use factory pattern for LLM instances (easy to switch models)
- Keep tools in dedicated module (reusable across agents)

> Source: LangChain .mdc rules

---

## MUST DO

- Use LCEL pipe operator for chain composition
- Use `.ainvoke()` / `.abatch()` / `.astream()` (async versions)
- Use `.with_structured_output(PydanticModel)` for JSON extraction
- Use `@tool` decorator with docstrings for custom tools
- Enable LangSmith tracing in production
- Use `.with_fallbacks()` for reliability

## MUST NOT DO

- Use deprecated `LLMChain`, `ConversationChain`, or `load_chain`
- Use sync methods in async FastAPI (`invoke` instead of `ainvoke`)
- Define tools as raw dicts (use `@tool` decorator)
- Skip error handling on LLM calls
- Store chat history in-memory in production (use Redis/DB)
- Import from `langchain` (use `langchain_core`, `langchain_openai`, etc.)

---

## References

- [LangChain LCEL](https://python.langchain.com/docs/concepts/lcel/)
- [LangChain Tools](https://python.langchain.com/docs/how_to/custom_tools/)
- [LangSmith](https://smith.langchain.com/)
- [LangChain Structured Output](https://python.langchain.com/docs/how_to/structured_output/)

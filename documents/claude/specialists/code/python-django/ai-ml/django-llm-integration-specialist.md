# Django LLM Integration Specialist
# Django LLM統合スペシャリスト
# Chuyen Gia Tich Hop LLM Django

**Stack**: Python 3.12+ / Django 5.x / OpenAI / Anthropic | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `apps/{domain}/services/llm.py`, `apps/{domain}/tasks.py` |
| **Variant** | ALL |
| **Naming Convention** | `llm.py` service, `tasks.py` for async |
| **Imports From** | openai, anthropic, Domain (models) |
| **Cannot Import** | Views (services layer) |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | llm-client-setup, sync-views, async-streaming, celery-llm, conversation-models, rate-limiting, cost-tracking |
| **Pattern Numbers** | 51.1–51.7 |
| **Source Paths** | `**/services/llm.py`, `**/tasks.py`, `**/models.py` |
| **File Count** | Service + tasks + models |
| **Imported By** | Views, Tasks |
| **Specialist Type** | code |
| **Purpose** | LLM client setup, sync views for simple chat, async streaming with SSE, Celery for long-running LLM tasks, conversation memory models, rate limiting, cost tracking |
| **Activation Trigger** | openai, anthropic, llm, gpt, claude, chatbot, ai integration |

---

## Purpose

Define Django LLM integration patterns: client initialization from Django settings, synchronous views for simple completions, async streaming with Server-Sent Events, Celery for batch LLM processing, Django models for conversation history, per-user rate limiting, and usage cost tracking.

---

## Pattern 51.1: LLM Client Setup

```python
# apps/ai/services/llm.py
from django.conf import settings
from openai import OpenAI, AsyncOpenAI
import anthropic


def get_openai_client():
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def get_async_openai_client():
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


def get_anthropic_client():
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
```

```python
# settings.py
OPENAI_API_KEY = env("OPENAI_API_KEY")
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")
LLM_DEFAULT_MODEL = env("LLM_DEFAULT_MODEL", default="gpt-4o")
LLM_MAX_TOKENS = int(env("LLM_MAX_TOKENS", default="4096"))
```

---

## Pattern 51.2: Sync Views for LLM

```python
# apps/ai/views.py
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from apps.ai.services.llm import get_openai_client
from django.conf import settings
import json


@login_required
def chat_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    data = json.loads(request.body)
    user_message = data.get("message", "").strip()
    if not user_message:
        return JsonResponse({"error": "Message required"}, status=400)

    client = get_openai_client()
    response = client.chat.completions.create(
        model=settings.LLM_DEFAULT_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": user_message},
        ],
        max_tokens=settings.LLM_MAX_TOKENS,
    )

    reply = response.choices[0].message.content
    usage = response.usage

    return JsonResponse({
        "reply": reply,
        "usage": {
            "prompt_tokens": usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "total_tokens": usage.total_tokens,
        },
    })
```

---

## Pattern 51.3: Async Streaming with SSE

```python
# apps/ai/views.py
from django.http import StreamingHttpResponse
from apps.ai.services.llm import get_async_openai_client
import json


async def stream_chat_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    data = json.loads(request.body)
    user_message = data.get("message", "")

    async def event_stream():
        client = get_async_openai_client()
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_message},
            ],
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                data = json.dumps({"content": delta.content})
                yield f"data: {data}\n\n"

        yield "data: [DONE]\n\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
```

---

## Pattern 51.4: Celery for Long-Running LLM Tasks

```python
# apps/ai/tasks.py
from celery import shared_task
from apps.ai.services.llm import get_openai_client


@shared_task(bind=True, max_retries=3)
def analyze_document(self, document_id):
    """Analyze document with LLM — long-running task."""
    from apps.documents.models import Document

    try:
        document = Document.objects.get(pk=document_id)
        client = get_openai_client()

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Analyze this document and provide a summary."},
                {"role": "user", "content": document.content[:10000]},
            ],
            max_tokens=2000,
        )

        document.summary = response.choices[0].message.content
        document.analysis_status = "completed"
        document.save(update_fields=["summary", "analysis_status"])

        # Track usage
        track_usage(document.user, response.usage, "gpt-4o")

    except Exception as exc:
        document.analysis_status = "failed"
        document.save(update_fields=["analysis_status"])
        raise self.retry(exc=exc, countdown=60 * self.request.retries)
```

---

## Pattern 51.5: Conversation Memory (Django Models)

```python
# apps/ai/models.py
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200, blank=True)
    model = models.CharField(max_length=50, default="gpt-4o")
    system_prompt = models.TextField(default="You are a helpful assistant.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_messages(self, limit=20):
        """Get conversation history formatted for LLM API."""
        messages = [{"role": "system", "content": self.system_prompt}]
        for msg in self.messages.order_by("created_at")[:limit]:
            messages.append({"role": msg.role, "content": msg.content})
        return messages


class Message(models.Model):
    ROLE_CHOICES = [("user", "User"), ("assistant", "Assistant"), ("system", "System")]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    tokens_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

```python
# apps/ai/views.py — Chat with history
@login_required
def conversation_chat(request, conversation_id):
    conversation = get_object_or_404(Conversation, pk=conversation_id, user=request.user)
    data = json.loads(request.body)

    # Save user message
    Message.objects.create(conversation=conversation, role="user", content=data["message"])

    # Get history + call LLM
    client = get_openai_client()
    messages = conversation.get_messages()
    response = client.chat.completions.create(model=conversation.model, messages=messages)

    reply = response.choices[0].message.content

    # Save assistant message
    Message.objects.create(
        conversation=conversation,
        role="assistant",
        content=reply,
        tokens_used=response.usage.total_tokens,
    )

    return JsonResponse({"reply": reply})
```

---

## Pattern 51.6: Rate Limiting for LLM Endpoints

```python
from django_ratelimit.decorators import ratelimit


@login_required
@ratelimit(key="user", rate="30/h", method="POST", block=True)
def chat_view(request):
    """Max 30 LLM calls per hour per user."""
    # ... chat implementation
    pass
```

```python
# Token budget per user
class UserLLMQuota(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    daily_token_limit = models.PositiveIntegerField(default=100_000)
    tokens_used_today = models.PositiveIntegerField(default=0)
    last_reset = models.DateField(auto_now_add=True)

    def check_quota(self, estimated_tokens=1000):
        from django.utils import timezone
        today = timezone.now().date()
        if self.last_reset < today:
            self.tokens_used_today = 0
            self.last_reset = today
            self.save(update_fields=["tokens_used_today", "last_reset"])
        return self.tokens_used_today + estimated_tokens <= self.daily_token_limit
```

---

## Pattern 51.7: Cost Tracking

```python
# apps/ai/models.py
class LLMUsage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    model = models.CharField(max_length=50)
    prompt_tokens = models.PositiveIntegerField()
    completion_tokens = models.PositiveIntegerField()
    total_tokens = models.PositiveIntegerField()
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)


# Pricing (update as needed)
MODEL_PRICING = {
    "gpt-4o": {"input": 2.50 / 1_000_000, "output": 10.00 / 1_000_000},
    "gpt-4o-mini": {"input": 0.15 / 1_000_000, "output": 0.60 / 1_000_000},
    "claude-sonnet-4-20250514": {"input": 3.00 / 1_000_000, "output": 15.00 / 1_000_000},
}


def track_usage(user, usage, model_name):
    pricing = MODEL_PRICING.get(model_name, {"input": 0, "output": 0})
    cost = (usage.prompt_tokens * pricing["input"]) + (usage.completion_tokens * pricing["output"])

    LLMUsage.objects.create(
        user=user,
        model=model_name,
        prompt_tokens=usage.prompt_tokens,
        completion_tokens=usage.completion_tokens,
        total_tokens=usage.total_tokens,
        estimated_cost=cost,
    )
```

---

## MUST DO

- Use async views for streaming LLM responses
- Use Celery for batch/long-running LLM tasks
- Rate limit LLM endpoints per user
- Track token usage and costs
- Store conversation history in Django models

## MUST NOT DO

- Stream LLM responses from sync views (blocks threads)
- Allow unlimited LLM access without rate limits
- Skip cost tracking (API costs can escalate fast)
- Store API keys in code (use environment variables)
- Send entire documents as context (chunk and summarize)

---

## References

- [OpenAI: Python SDK](https://github.com/openai/openai-python)
- [Anthropic: Python SDK](https://github.com/anthropics/anthropic-sdk-python)

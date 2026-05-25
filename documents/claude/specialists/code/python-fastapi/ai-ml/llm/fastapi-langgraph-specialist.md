# FastAPI LangGraph Specialist
# FastAPI LangGraphスペシャリスト
# Chuyen Gia LangGraph FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/graphs/`, `src/ai/workflows/` |
| **Variant** | ALL |
| **Naming Convention** | `graph.py`, `workflow.py`, `nodes.py`, `state.py` |
| **Imports From** | Domain (schemas), Application (chains, tools) |
| **Cannot Import** | Presentation |
| **Dependencies** | `langgraph>=0.2` |
| **When To Use** | Multi-step agent workflows, state graphs, human-in-loop |
| **Source Skeleton** | `src/llm/graphs/{workflow}.py`, `src/llm/agents/` |
| **Pattern Numbers** | 53.1–53.7 |
| **Source Paths** | `**/graphs/**/*.py`, `**/workflows/**/*.py` |
| **File Count** | 2-4 per agent workflow |
| **Imported By** | Application (services) |
| **Specialist Type** | code |
| **Purpose** | LangGraph StateGraph, state design with annotations, conditional routing, checkpointers for memory, human-in-the-loop, multi-agent systems, common pitfalls |
| **Activation Trigger** | langgraph, StateGraph, graph, checkpoint, agent workflow, multi-agent |

---

## Purpose

Define LangGraph patterns for FastAPI: StateGraph basics with typed state, state design with annotated reducers, conditional edge routing, checkpointers for conversation memory, human-in-the-loop interrupt flows, multi-agent supervisor patterns, and common pitfalls to avoid.

---

## Pattern 53.1: StateGraph Basics

```python
from typing import Annotated, TypedDict
import operator

from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI


# 1. Define State
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]  # Append-only
    next_step: str


# 2. Define Nodes (functions)
llm = ChatOpenAI(model="gpt-4o")


async def research_node(state: AgentState) -> dict:
    """Research node — calls LLM for information gathering."""
    response = await llm.ainvoke(state["messages"])
    return {"messages": [response]}


async def summarize_node(state: AgentState) -> dict:
    """Summarize node — condenses research results."""
    response = await llm.ainvoke(
        state["messages"] + [("user", "Summarize the above research.")]
    )
    return {"messages": [response]}


# 3. Build Graph
graph = StateGraph(AgentState)
graph.add_node("research", research_node)
graph.add_node("summarize", summarize_node)

# 4. Add Edges
graph.add_edge(START, "research")
graph.add_edge("research", "summarize")
graph.add_edge("summarize", END)

# 5. Compile
app = graph.compile()

# 6. Execute
result = await app.ainvoke({
    "messages": [("user", "Research Python async patterns")],
})
```

**Key concepts**:
- **State**: TypedDict shared across all nodes
- **Node**: Function that takes state, returns partial state update
- **Edge**: Connection between nodes (unconditional or conditional)
- **compile()**: Converts graph definition to executable Runnable

> Source: LangGraph SKILL.md (SpillwaveSolutions)

---

## Pattern 53.2: State Design

```python
from typing import Annotated, TypedDict
import operator
from langchain_core.messages import BaseMessage


# CORRECT: Annotated with operator.add — APPEND mode
class GoodState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]  # Appends
    documents: Annotated[list[str], operator.add]          # Appends
    current_step: str                                       # Overwrites


# WRONG: Without annotation — OVERWRITE mode
class BadState(TypedDict):
    messages: list[BaseMessage]  # Each node OVERWRITES entire list!


# Custom reducer for deduplication
def deduplicate_add(existing: list, new: list) -> list:
    """Add only unique items."""
    seen = set(existing)
    return existing + [item for item in new if item not in seen]


class AdvancedState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    sources: Annotated[list[str], deduplicate_add]
    retry_count: int  # No annotation = overwrite
```

**Critical rule**: Use `Annotated[list, operator.add]` for any list that multiple nodes append to. Without annotation, each node OVERWRITES the entire list.

> Source: LangGraph SKILL.md (core principle #4)

---

## Pattern 53.3: Conditional Edges

```python
from langgraph.graph import StateGraph, START, END


class RouterState(TypedDict):
    messages: Annotated[list, operator.add]
    query_type: str


async def classify_node(state: RouterState) -> dict:
    """Classify the query type."""
    response = await llm.ainvoke(
        [("system", "Classify as: technical, billing, or general"),
         ("user", state["messages"][-1].content)]
    )
    return {"query_type": response.content.strip().lower()}


async def technical_node(state: RouterState) -> dict:
    response = await llm.ainvoke(
        state["messages"] + [("system", "You are a technical support agent.")]
    )
    return {"messages": [response]}


async def billing_node(state: RouterState) -> dict:
    response = await llm.ainvoke(
        state["messages"] + [("system", "You are a billing support agent.")]
    )
    return {"messages": [response]}


def route_query(state: RouterState) -> str:
    """Routing function — returns node name."""
    query_type = state["query_type"]
    if query_type == "technical":
        return "technical"
    elif query_type == "billing":
        return "billing"
    return "general"


# Build graph with conditional routing
graph = StateGraph(RouterState)
graph.add_node("classify", classify_node)
graph.add_node("technical", technical_node)
graph.add_node("billing", billing_node)
graph.add_node("general", general_node)

graph.add_edge(START, "classify")
graph.add_conditional_edges(
    "classify",
    route_query,
    {"technical": "technical", "billing": "billing", "general": "general"},
)
graph.add_edge("technical", END)
graph.add_edge("billing", END)
graph.add_edge("general", END)

app = graph.compile()
```

---

## Pattern 53.4: Checkpointers (Conversation Memory)

```python
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


# Development: In-memory
memory = InMemorySaver()
app = graph.compile(checkpointer=memory)

# Production: Postgres
async def get_postgres_checkpointer():
    return AsyncPostgresSaver.from_conn_string(
        "postgresql+asyncpg://user:pass@localhost/langgraph"
    )


# Invoke with thread_id — enables conversation continuity
config = {"configurable": {"thread_id": "user-123-session-1"}}

# Turn 1
result = await app.ainvoke(
    {"messages": [("user", "What is Python?")]},
    config=config,
)

# Turn 2 — automatically has Turn 1 context
result = await app.ainvoke(
    {"messages": [("user", "Tell me more about its async features")]},
    config=config,
)
```

**Key rule**: Always pass `thread_id` in config when using checkpointers. Without it, each invocation starts fresh (no memory).

> Source: LangGraph SKILL.md

---

## Pattern 53.5: Human-in-the-Loop

```python
from langgraph.types import interrupt, Command


async def review_node(state: AgentState) -> dict:
    """Pause graph for human review."""
    # Interrupt execution — returns control to caller
    human_feedback = interrupt(
        "Please review the draft and provide feedback."
    )

    # This code runs AFTER human responds
    return {"messages": [("user", f"Human feedback: {human_feedback}")]}


graph = StateGraph(AgentState)
graph.add_node("draft", draft_node)
graph.add_node("review", review_node)  # Will pause here
graph.add_node("finalize", finalize_node)

graph.add_edge(START, "draft")
graph.add_edge("draft", "review")
graph.add_edge("review", "finalize")
graph.add_edge("finalize", END)

app = graph.compile(checkpointer=memory)

# Invoke — will pause at review_node
config = {"configurable": {"thread_id": "doc-1"}}
result = await app.ainvoke({"messages": [("user", "Write a report")]}, config)

# ... later, human provides feedback
result = await app.ainvoke(
    Command(resume="Looks good, but add more details about performance."),
    config=config,
)
```

**FastAPI endpoint for human-in-loop**:
```python
@router.post("/workflows/{thread_id}/start")
async def start_workflow(thread_id: str, request: WorkflowRequest):
    config = {"configurable": {"thread_id": thread_id}}
    result = await app.ainvoke({"messages": request.messages}, config)
    return {"thread_id": thread_id, "status": "waiting_for_review"}


@router.post("/workflows/{thread_id}/resume")
async def resume_workflow(thread_id: str, feedback: str):
    config = {"configurable": {"thread_id": thread_id}}
    result = await app.ainvoke(Command(resume=feedback), config)
    return {"result": result}
```

---

## Pattern 53.6: Multi-Agent Systems

```python
from langgraph.graph import StateGraph, START, END


class MultiAgentState(TypedDict):
    messages: Annotated[list, operator.add]
    next_agent: str
    task_complete: bool


# Supervisor decides which agent to use
async def supervisor_node(state: MultiAgentState) -> dict:
    response = await llm.ainvoke(
        state["messages"] + [(
            "system",
            "You are a supervisor. Decide which agent should handle this: "
            "researcher, coder, or reviewer. Reply with just the agent name. "
            "Reply 'done' if the task is complete."
        )]
    )
    next_agent = response.content.strip().lower()
    return {
        "next_agent": next_agent,
        "task_complete": next_agent == "done",
    }


async def researcher_node(state: MultiAgentState) -> dict:
    response = await llm.ainvoke(
        state["messages"] + [("system", "You are a researcher. Find relevant information.")]
    )
    return {"messages": [response]}


async def coder_node(state: MultiAgentState) -> dict:
    response = await llm.ainvoke(
        state["messages"] + [("system", "You are a coder. Write code based on the research.")]
    )
    return {"messages": [response]}


def route_agent(state: MultiAgentState) -> str:
    if state["task_complete"]:
        return END
    return state["next_agent"]


graph = StateGraph(MultiAgentState)
graph.add_node("supervisor", supervisor_node)
graph.add_node("researcher", researcher_node)
graph.add_node("coder", coder_node)
graph.add_node("reviewer", reviewer_node)

graph.add_edge(START, "supervisor")
graph.add_conditional_edges(
    "supervisor",
    route_agent,
    {"researcher": "researcher", "coder": "coder", "reviewer": "reviewer", END: END},
)
# All agents return to supervisor for next decision
graph.add_edge("researcher", "supervisor")
graph.add_edge("coder", "supervisor")
graph.add_edge("reviewer", "supervisor")

app = graph.compile()
```

---

## Pattern 53.7: Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Missing `operator.add` | List state gets overwritten instead of appended | Use `Annotated[list, operator.add]` |
| Missing `thread_id` | Checkpointer doesn't save/restore state | Always pass `configurable.thread_id` |
| Sync nodes in async graph | Blocks event loop | Use `async def` for all nodes |
| Too many nodes | Graph becomes hard to debug | Keep graphs < 10 nodes, split into sub-graphs |
| No recursion limit | Agent loops forever | Set `recursion_limit` in config (default: 25) |

**Recursion limit**:
```python
result = await app.ainvoke(
    {"messages": [("user", "...")]},
    config={"configurable": {"thread_id": "t1"}, "recursion_limit": 15},
)
```

> Source: LangGraph SKILL.md (5 pitfalls)

---

## MUST DO

- Use `Annotated[list, operator.add]` for list state fields
- Pass `thread_id` in config when using checkpointers
- Use `async def` for all node functions in async graphs
- Set `recursion_limit` to prevent infinite agent loops
- Use `interrupt()` for human-in-the-loop (not custom polling)
- Keep graphs under 10 nodes (split into sub-graphs)

## MUST NOT DO

- Define list state without `operator.add` annotation
- Forget `thread_id` (checkpointer silently fails)
- Use sync functions as nodes in async graphs
- Create graphs without recursion limits
- Put complex logic in routing functions (keep them simple)
- Mix LangGraph state management with manual state tracking

---

## References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangGraph Tutorials](https://langchain-ai.github.io/langgraph/tutorials/)
- [LangGraph Human-in-the-Loop](https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/)
- [LangGraph Multi-Agent](https://langchain-ai.github.io/langgraph/how-tos/multi-agent/)

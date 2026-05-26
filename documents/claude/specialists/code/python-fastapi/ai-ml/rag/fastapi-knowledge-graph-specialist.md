# FastAPI Knowledge Graph Specialist
# FastAPIナレッジグラフスペシャリスト
# Chuyen Gia Do Thi Tri Thuc FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `src/graph/`, `src/infrastructure/neo4j/` |
| **Variant** | ALL |
| **Naming Convention** | `graph_client.py`, `neo4j_repo.py`, `knowledge_graph.py` |
| **Imports From** | Domain (schemas) |
| **Cannot Import** | Application, Presentation |
| **Dependencies** | `neo4j>=5.0`, `graphiti-core` (optional temporal), `lightrag` (optional) |
| **When To Use** | Knowledge graph construction, GraphRAG, hybrid retrieval |
| **Source Skeleton** | `src/rag/kg_service.py`, `src/rag/neo4j_client.py` |
| **Pattern Numbers** | 58.1–58.7 |
| **Source Paths** | `**/graph/**/*.py`, `**/neo4j/**/*.py` |
| **File Count** | 1-3 per project |
| **Imported By** | Application (RAG pipeline, services) |
| **Specialist Type** | code |
| **Purpose** | Neo4j best practices, Cypher injection prevention, GraphRAG architecture, SimpleKGPipeline, Graphiti temporal knowledge, hybrid retrieval, performance tuning |
| **Activation Trigger** | neo4j, cypher, knowledge graph, graphrag, graph database, entity extraction |

---

## Purpose

Define knowledge graph patterns for FastAPI: Neo4j naming conventions and best practices, parameterized Cypher queries for injection prevention, GraphRAG architecture with entity extraction, SimpleKGPipeline for automatic KG construction, Graphiti for temporal knowledge, hybrid retrieval combining graph traversal with vector search, and performance optimization.

---

## Pattern 58.1: Neo4j Best Practices

```python
# pip install neo4j
from neo4j import AsyncGraphDatabase

from src.core.config import settings


# Naming conventions (Neo4j standard)
# Nodes: PascalCase       → (:Person), (:Company)
# Relationships: UPPER_SNAKE → [:WORKS_AT], [:KNOWS]
# Properties: camelCase    → firstName, createdAt


class Neo4jClient:
    def __init__(self):
        self.driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,          # bolt://localhost:7687
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            max_connection_pool_size=50,
        )

    async def close(self):
        await self.driver.close()

    async def verify_connectivity(self):
        await self.driver.verify_connectivity()

    async def execute_read(self, query: str, params: dict | None = None) -> list[dict]:
        async with self.driver.session() as session:
            result = await session.run(query, params or {})
            return [record.data() async for record in result]

    async def execute_write(self, query: str, params: dict | None = None) -> list[dict]:
        async with self.driver.session() as session:
            result = await session.run(query, params or {})
            return [record.data() async for record in result]
```

**FastAPI integration**:
```python
from contextlib import asynccontextmanager

neo4j_client: Neo4jClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo4j_client
    neo4j_client = Neo4jClient()
    await neo4j_client.verify_connectivity()
    yield
    await neo4j_client.close()


async def get_neo4j() -> Neo4jClient:
    return neo4j_client
```

> Source: Neo4j .mdc rules (sanjeed5/awesome-cursor-rules-mdc)

---

## Pattern 58.2: Parameterized Queries (Injection Prevention)

```python
# CRITICAL: ALWAYS use parameters — NEVER string interpolation

# ✅ CORRECT — parameterized
async def find_person(name: str) -> list[dict]:
    return await neo4j_client.execute_read(
        "MATCH (p:Person {name: $name}) RETURN p",
        {"name": name},
    )

# ❌ WRONG — Cypher injection vulnerability
async def find_person_unsafe(name: str) -> list[dict]:
    return await neo4j_client.execute_read(
        f"MATCH (p:Person {{name: '{name}'}}) RETURN p"  # INJECTION RISK!
    )


# Complex parameterized query
async def find_connections(person_name: str, depth: int = 2) -> list[dict]:
    return await neo4j_client.execute_read(
        """
        MATCH path = (p:Person {name: $name})-[:KNOWS*1..$depth]-(connected)
        RETURN connected.name AS name,
               length(path) AS distance
        ORDER BY distance
        LIMIT $limit
        """,
        {"name": person_name, "depth": depth, "limit": 20},
    )


# Batch operations with UNWIND
async def create_relationships(pairs: list[dict]) -> int:
    result = await neo4j_client.execute_write(
        """
        UNWIND $pairs AS pair
        MATCH (a:Person {id: pair.from_id})
        MATCH (b:Person {id: pair.to_id})
        MERGE (a)-[:KNOWS {since: pair.since}]->(b)
        RETURN count(*) AS created
        """,
        {"pairs": pairs},
    )
    return result[0]["created"]
```

> Source: Neo4j .mdc rules

---

## Pattern 58.3: GraphRAG Architecture

```python
# pip install neo4j-graphrag
from neo4j_graphrag.retrievers import VectorRetriever, VectorCypherRetriever


# Vector search on graph (embeddings stored as node properties)
vector_retriever = VectorRetriever(
    driver=neo4j_client.driver,
    index_name="document_embeddings",
    embedder=openai_embedder,
)

# Hybrid: vector search + graph traversal
graph_retriever = VectorCypherRetriever(
    driver=neo4j_client.driver,
    index_name="document_embeddings",
    embedder=openai_embedder,
    retrieval_query="""
        // Start from vector-matched nodes
        WITH node, score
        // Traverse graph for related context
        OPTIONAL MATCH (node)-[:MENTIONS]->(entity:Entity)
        OPTIONAL MATCH (entity)-[:RELATED_TO]-(related:Entity)
        RETURN node.text AS text,
               score,
               collect(DISTINCT entity.name) AS entities,
               collect(DISTINCT related.name) AS related_entities
    """,
)

# Search
results = await vector_retriever.search(query_text="What is FastAPI?", top_k=5)
```

**GraphRAG vs plain RAG**:

| Aspect | Plain RAG | GraphRAG |
|--------|-----------|----------|
| **Context** | Isolated chunks | Connected knowledge |
| **Multi-hop** | No | Yes (traverse relationships) |
| **Entity aware** | No | Yes (named entities linked) |
| **Setup** | Simple | Complex (KG construction) |
| **Best for** | Simple Q&A | Complex reasoning, entity-heavy |

---

## Pattern 58.4: SimpleKGPipeline (Auto KG Construction)

```python
# pip install neo4j-graphrag[openai]
from neo4j_graphrag.experimental.pipeline.kg_builder import SimpleKGPipeline
from neo4j_graphrag.llm import OpenAILLM


# Auto-construct knowledge graph from documents
pipeline = SimpleKGPipeline(
    llm=OpenAILLM(model_name="gpt-4o"),
    driver=neo4j_client.driver,
    embedder=openai_embedder,
    entities=["Person", "Organization", "Technology", "Concept"],
    relations=["WORKS_AT", "USES", "RELATED_TO", "CREATED"],
    on_error="IGNORE",  # Skip failed chunks
)

# Process documents
async def build_knowledge_graph(texts: list[str]):
    for text in texts:
        await pipeline.run_async(text=text)
```

**What SimpleKGPipeline does**:
1. Splits text into chunks
2. LLM extracts entities and relationships
3. Creates Neo4j nodes and edges
4. Generates embeddings for vector search
5. Creates vector index automatically

> Source: neo4j-graphrag-python (official package)

---

## Pattern 58.5: Graphiti Temporal Knowledge

```python
# pip install graphiti-core
from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType


# Graphiti = temporal knowledge graph (tracks when facts are valid)
graphiti = Graphiti(
    neo4j_uri=settings.NEO4J_URI,
    neo4j_user=settings.NEO4J_USER,
    neo4j_password=settings.NEO4J_PASSWORD,
)

await graphiti.build_indices_and_constraints()


# Add episode (a piece of information with timestamp)
await graphiti.add_episode(
    name="team-update-2024-01",
    episode_body="Alice joined the AI team. Bob moved to infrastructure.",
    source=EpisodeType.text,
    source_description="Team standup notes",
)

# Later: Alice leaves the team
await graphiti.add_episode(
    name="team-update-2024-06",
    episode_body="Alice left the AI team to join Google.",
    source=EpisodeType.text,
    source_description="HR announcement",
)

# Search — Graphiti knows temporal validity
results = await graphiti.search("Who is on the AI team?")
# Returns: Bob (Alice's membership has validity end date)
```

**When to use Graphiti vs plain Neo4j**:
- **Graphiti**: Facts change over time (team membership, product versions, policies)
- **Plain Neo4j**: Static relationships (taxonomy, ontology, architecture)

> Source: getzep/graphiti

---

## Pattern 58.6: Hybrid Retrieval

```python
class HybridGraphRetriever:
    """Combine semantic search + BM25 + graph traversal."""

    def __init__(self, neo4j_client, vector_store, embed_fn):
        self.neo4j = neo4j_client
        self.vector = vector_store
        self.embed_fn = embed_fn

    async def search(self, query: str, top_k: int = 5) -> list[dict]:
        # 1. Semantic search (vector)
        embedding = await self.embed_fn([query])
        vector_results = await self.vector.search(embedding[0], top_k=top_k * 2)

        # 2. Extract entities from query
        entities = await self.extract_entities(query)

        # 3. Graph traversal for entity context
        graph_context = []
        for entity in entities:
            neighbors = await self.neo4j.execute_read(
                """
                MATCH (e {name: $name})-[r]-(neighbor)
                RETURN e.name AS entity,
                       type(r) AS relationship,
                       neighbor.name AS neighbor_name,
                       neighbor.description AS description
                LIMIT 10
                """,
                {"name": entity},
            )
            graph_context.extend(neighbors)

        # 4. Merge and deduplicate
        combined = self.merge_results(vector_results, graph_context)
        return combined[:top_k]
```

---

## Pattern 58.7: Performance

```python
# 1. Create indexes for frequently queried properties
CREATE INDEX person_name FOR (p:Person) ON (p.name);
CREATE INDEX entity_id FOR (e:Entity) ON (e.id);

# 2. Composite index for multi-property lookups
CREATE INDEX person_name_org FOR (p:Person) ON (p.name, p.organization);

# 3. Full-text search index
CREATE FULLTEXT INDEX entity_search FOR (n:Entity) ON EACH [n.name, n.description];

# 4. Vector index
CREATE VECTOR INDEX document_embeddings FOR (d:Document) ON (d.embedding)
OPTIONS {indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
}};
```

**Query optimization**:
```python
# Use PROFILE to analyze query plans
async def analyze_query(query: str, params: dict):
    result = await neo4j_client.execute_read(
        f"PROFILE {query}", params
    )
    # Check db hits, rows examined
    return result


# Always start traversal from indexed nodes
# ✅ Good: Start from indexed node
# MATCH (p:Person {name: $name})-[:KNOWS]->(friend) RETURN friend

# ❌ Bad: Start from unindexed traversal
# MATCH (p)-[:KNOWS]->(friend {name: $name}) RETURN p
```

**Key rules**:
- Always start MATCH from an indexed property
- Use `PROFILE` / `EXPLAIN` to check query plans
- Set `max_connection_pool_size` based on concurrent users
- Use UNWIND for batch operations (not individual queries)

> Source: Neo4j .mdc rules

---

## MUST DO

- Use parameterized queries (NEVER string interpolation)
- Follow Neo4j naming: PascalCase nodes, UPPER_SNAKE relations, camelCase properties
- Create indexes on frequently queried properties
- Start MATCH from indexed nodes
- Use PROFILE to analyze query performance
- Close driver on application shutdown

## MUST NOT DO

- Interpolate user input into Cypher queries (injection risk)
- Skip indexes on production databases
- Start traversal from unindexed nodes
- Create unbounded traversals (always set depth limit)
- Store embeddings without vector index
- Use synchronous driver in async FastAPI

---

## References

- [Neo4j Python Driver](https://neo4j.com/docs/python-manual/current/)
- [neo4j-graphrag-python](https://github.com/neo4j/neo4j-graphrag-python)
- [Graphiti](https://github.com/getzep/graphiti)
- [Neo4j Vector Index](https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/vector-indexes/)

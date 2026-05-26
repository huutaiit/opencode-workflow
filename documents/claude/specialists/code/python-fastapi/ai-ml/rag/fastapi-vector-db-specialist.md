# FastAPI Vector Database Specialist
# FastAPIベクトルDBスペシャリスト
# Chuyen Gia Vector DB FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `src/vectordb/`, `src/infrastructure/vector/` |
| **Variant** | ALL |
| **Naming Convention** | `vector_store.py`, `embeddings.py` |
| **Imports From** | Domain (schemas) |
| **Cannot Import** | Application, Presentation |
| **Dependencies** | `pgvector` or `qdrant-client` or `chromadb` |
| **When To Use** | Vector similarity search, embedding storage, semantic caching |
| **Source Skeleton** | `src/rag/vector_store.py`, `src/rag/embeddings.py` |
| **Pattern Numbers** | 57.1–57.7 |
| **Source Paths** | `**/vectordb/**/*.py`, `**/vector/**/*.py` |
| **File Count** | 1-2 per project |
| **Imported By** | Application (RAG pipeline, services) |
| **Specialist Type** | code |
| **Purpose** | pgvector, Qdrant, ChromaDB vector stores, embedding models, semantic caching, database selection guide |
| **Activation Trigger** | vector, embedding, pgvector, qdrant, chromadb, pinecone, similarity search |

---

## Purpose

Define vector database patterns for FastAPI: comparison of pgvector/Qdrant/ChromaDB/Pinecone, async operations, embedding model selection, semantic caching with similarity threshold, and decision guide for choosing the right vector store.

---

## Pattern 57.1: Database Comparison

| Feature | pgvector | Qdrant | ChromaDB | Pinecone | Milvus |
|---------|----------|--------|----------|----------|--------|
| **Type** | Postgres ext | Standalone | Embedded/server | Managed cloud | Standalone |
| **Deployment** | Add to existing PG | Docker / Cloud | pip install | SaaS | Docker / Cloud |
| **Latency (1M)** | ~10ms | ~5ms | ~15ms | ~10ms | ~8ms |
| **Filtering** | SQL WHERE | Rich payload filter | Metadata filter | Metadata filter | Attribute filter |
| **Indexing** | HNSW, IVFFlat | HNSW | HNSW | Proprietary | HNSW, IVF |
| **Python client** | asyncpg + SQL | qdrant-client | chromadb | pinecone | pymilvus |
| **Best for** | Already use Postgres | Production, complex filters | Prototyping | Zero-ops | Large scale |

---

## Pattern 57.2: pgvector (Postgres Extension)

```python
# pip install asyncpg pgvector
from pgvector.asyncpg import register_vector
import asyncpg
import numpy as np


async def init_pgvector(pool: asyncpg.Pool):
    """Initialize pgvector extension."""
    async with pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await register_vector(conn)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                embedding vector(1536)
            )
        """)
        # CRITICAL: Create HNSW index for fast search
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS documents_embedding_idx
            ON documents USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        """)


async def upsert_document(
    pool: asyncpg.Pool,
    content: str,
    embedding: list[float],
    metadata: dict | None = None,
) -> int:
    async with pool.acquire() as conn:
        await register_vector(conn)
        row = await conn.fetchrow(
            "INSERT INTO documents (content, metadata, embedding) "
            "VALUES ($1, $2, $3) RETURNING id",
            content,
            metadata or {},
            np.array(embedding),
        )
        return row["id"]


async def search_similar(
    pool: asyncpg.Pool,
    query_embedding: list[float],
    top_k: int = 5,
    metadata_filter: dict | None = None,
) -> list[dict]:
    async with pool.acquire() as conn:
        await register_vector(conn)

        query = """
            SELECT id, content, metadata,
                   1 - (embedding <=> $1::vector) AS similarity
            FROM documents
        """
        params = [np.array(query_embedding)]

        if metadata_filter:
            query += " WHERE metadata @> $2::jsonb"
            params.append(metadata_filter)

        query += " ORDER BY embedding <=> $1::vector LIMIT $" + str(len(params) + 1)
        params.append(top_k)

        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]
```

**Key rules**:
- Always create HNSW index (without it, pgvector does brute-force scan)
- Use `<=>` for cosine distance, `<->` for L2 distance
- Register vector type with `register_vector(conn)` before each query

---

## Pattern 57.3: Qdrant

```python
# pip install qdrant-client
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)


async def get_qdrant_client() -> AsyncQdrantClient:
    return AsyncQdrantClient(url="http://localhost:6333")


async def init_collection(
    client: AsyncQdrantClient,
    collection_name: str = "documents",
    vector_size: int = 1536,
):
    """Create collection with HNSW index."""
    exists = await client.collection_exists(collection_name)
    if not exists:
        await client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )


async def upsert_points(
    client: AsyncQdrantClient,
    points: list[dict],
    collection: str = "documents",
):
    """Batch upsert documents."""
    await client.upsert(
        collection_name=collection,
        points=[
            PointStruct(
                id=p["id"],
                vector=p["embedding"],
                payload={"content": p["content"], **p.get("metadata", {})},
            )
            for p in points
        ],
    )


async def search(
    client: AsyncQdrantClient,
    query_vector: list[float],
    top_k: int = 5,
    category: str | None = None,
    collection: str = "documents",
) -> list[dict]:
    """Search with optional metadata filtering."""
    query_filter = None
    if category:
        query_filter = Filter(
            must=[FieldCondition(key="category", match=MatchValue(value=category))]
        )

    results = await client.search(
        collection_name=collection,
        query_vector=query_vector,
        limit=top_k,
        query_filter=query_filter,
    )

    return [
        {"id": r.id, "score": r.score, "content": r.payload["content"], **r.payload}
        for r in results
    ]
```

---

## Pattern 57.4: ChromaDB (Rapid Prototyping)

```python
# pip install chromadb
import chromadb


# Embedded mode (in-process, no server needed)
chroma_client = chromadb.Client()  # In-memory
# chroma_client = chromadb.PersistentClient(path="./chroma_data")  # Persistent

collection = chroma_client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"},
)


def add_documents(texts: list[str], ids: list[str], metadatas: list[dict] | None = None):
    """Add documents — ChromaDB auto-generates embeddings."""
    collection.add(
        documents=texts,  # Auto-embedded if no embeddings provided
        ids=ids,
        metadatas=metadatas,
    )


def search_documents(query: str, top_k: int = 5, where: dict | None = None) -> list[dict]:
    """Search with optional metadata filter."""
    results = collection.query(
        query_texts=[query],  # Auto-embedded
        n_results=top_k,
        where=where,  # e.g., {"category": "tech"}
    )

    return [
        {"id": id, "content": doc, "distance": dist}
        for id, doc, dist in zip(
            results["ids"][0],
            results["documents"][0],
            results["distances"][0],
        )
    ]
```

**Key rule**: ChromaDB auto-embeds text (uses `all-MiniLM-L6-v2` by default). Great for prototyping — no embedding code needed.

---

## Pattern 57.5: Embedding Models

```python
# Local: sentence-transformers (free, private, ~100ms/batch)
from sentence_transformers import SentenceTransformer

local_model = SentenceTransformer("all-MiniLM-L6-v2")  # 384 dims, fast
# local_model = SentenceTransformer("all-mpnet-base-v2")  # 768 dims, better quality

def embed_local(texts: list[str]) -> list[list[float]]:
    return local_model.encode(texts, normalize_embeddings=True).tolist()


# API: OpenAI (paid, 1536/3072 dims, highest quality)
from openai import AsyncOpenAI

openai_client = AsyncOpenAI()

async def embed_openai(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    response = await openai_client.embeddings.create(input=texts, model=model)
    return [item.embedding for item in response.data]
```

**Embedding model comparison**:

| Model | Dims | Speed | Quality | Cost |
|-------|------|-------|---------|------|
| all-MiniLM-L6-v2 | 384 | Very Fast | Good | Free |
| all-mpnet-base-v2 | 768 | Fast | Better | Free |
| text-embedding-3-small | 1536 | API call | High | $0.02/1M |
| text-embedding-3-large | 3072 | API call | Highest | $0.13/1M |

**Decision**: Local for privacy/speed/cost. API for highest quality or no GPU.

---

## Pattern 57.6: Semantic Caching

```python
import hashlib
import json
import numpy as np


class SemanticCache:
    """Cache LLM responses by semantic similarity."""

    def __init__(
        self,
        vector_store,
        embed_fn,
        similarity_threshold: float = 0.95,
    ):
        self.store = vector_store
        self.embed_fn = embed_fn
        self.threshold = similarity_threshold

    async def get(self, query: str) -> str | None:
        """Check if similar query exists in cache."""
        query_embedding = await self.embed_fn([query])
        results = await self.store.search(
            query_embedding[0], top_k=1
        )

        if results and results[0]["score"] >= self.threshold:
            return results[0]["payload"]["response"]
        return None

    async def set(self, query: str, response: str):
        """Cache query-response pair."""
        query_embedding = await self.embed_fn([query])
        cache_id = hashlib.md5(query.encode()).hexdigest()
        await self.store.upsert([{
            "id": cache_id,
            "embedding": query_embedding[0],
            "content": query,
            "metadata": {"response": response},
        }])


# Usage in RAG pipeline
cache = SemanticCache(vector_store, embed_openai, similarity_threshold=0.95)

async def query_with_cache(query: str) -> str:
    cached = await cache.get(query)
    if cached:
        return cached  # Cache hit — no LLM call

    response = await rag_pipeline.query(query)
    await cache.set(query, response)
    return response
```

**Key rule**: Threshold 0.95+ for semantic caching (lower values risk returning wrong answers). Exact match caching (hash) for identical queries.

---

## Pattern 57.7: Decision Guide

```
                    ┌─ Already use Postgres? ─── YES → pgvector
                    │
  Need vector DB? ──┤── Prototyping / POC? ──── YES → ChromaDB
                    │
                    ├── Production + filters? ── YES → Qdrant
                    │
                    ├── Zero-ops / managed? ──── YES → Pinecone
                    │
                    └── Very large scale (B+)? ─ YES → Milvus
```

| Scenario | Recommendation | Why |
|----------|---------------|-----|
| Existing Postgres, < 10M vectors | pgvector | No new infra, SQL filtering |
| New project, rapid prototyping | ChromaDB | `pip install`, no server |
| Production, complex filtering | Qdrant | Rich payload filters, fast |
| Managed, no infra team | Pinecone | Zero ops, auto-scaling |
| Billion-scale, distributed | Milvus | Designed for massive scale |

---

## MUST DO

- Create HNSW index on pgvector (default is brute-force)
- Normalize embeddings for cosine similarity
- Batch upsert operations (not one-by-one)
- Use the same embedding model for indexing and querying
- Test retrieval quality before choosing a vector store
- Set appropriate similarity thresholds for your use case

## MUST NOT DO

- Use pgvector without HNSW index in production
- Mix embedding models between indexing and search
- Store embeddings without metadata (needed for filtering)
- Assume cosine similarity scores are absolute (they're relative)
- Use ChromaDB embedded mode in multi-worker production
- Skip dimension matching between model and collection

---

## References

- [pgvector](https://github.com/pgvector/pgvector)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [ChromaDB](https://docs.trychroma.com/)
- [Sentence Transformers](https://www.sbert.net/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

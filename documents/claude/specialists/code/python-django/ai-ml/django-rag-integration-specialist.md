# Django RAG Integration Specialist
# Django RAG統合スペシャリスト
# Chuyen Gia RAG Django

**Stack**: Python 3.12+ / Django 5.x / pgvector | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `apps/{domain}/models.py`, `apps/{domain}/services/rag.py` |
| **Variant** | ALL |
| **Naming Convention** | `rag.py` service, `VectorField` in models |
| **Imports From** | pgvector.django, openai, Domain (models) |
| **Cannot Import** | Views |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | pgvector-setup, embedding-storage, vector-search, rag-pipeline, ingestion-command, hybrid-search |
| **Pattern Numbers** | 52.1–52.6 |
| **Source Paths** | `**/models.py`, `**/services/rag.py`, `**/management/commands/` |
| **File Count** | Models + service + command |
| **Imported By** | Views, Tasks |
| **Specialist Type** | code |
| **Purpose** | pgvector with Django ORM, embedding storage models, vector similarity search, RAG pipeline service, document ingestion management command, hybrid search (vector + full-text) |
| **Activation Trigger** | rag, vector, pgvector, embedding, retrieval, semantic search |

---

## Purpose

Define Django RAG patterns: pgvector extension with Django ORM via django-pgvector, embedding storage models with HNSW indexes, vector similarity search queries, end-to-end RAG pipeline as a Django service, document ingestion via management command, and hybrid search combining vector similarity with PostgreSQL full-text search.

---

## Pattern 52.1: pgvector with Django

```bash
pip install pgvector django-pgvector
```

```sql
-- Enable extension in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;
```

```python
# apps/knowledge/models.py
from django.db import models
from pgvector.django import VectorField, HnswIndex


class Document(models.Model):
    title = models.CharField(max_length=500)
    content = models.TextField()
    source = models.CharField(max_length=200, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="chunks")
    content = models.TextField()
    chunk_index = models.PositiveIntegerField()
    embedding = VectorField(dimensions=1536)  # OpenAI text-embedding-3-small
    token_count = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            HnswIndex(
                name="chunk_embedding_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]
        ordering = ["document", "chunk_index"]
```

---

## Pattern 52.2: Embedding Storage

```python
# apps/knowledge/services/embeddings.py
from django.conf import settings
from openai import OpenAI


def get_embeddings(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    """Get embeddings for a batch of texts."""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(
        model=model,
        input=texts,
    )
    return [item.embedding for item in response.data]


def get_embedding(text: str) -> list[float]:
    """Get embedding for a single text."""
    return get_embeddings([text])[0]
```

```python
# Store embeddings for document chunks
from apps.knowledge.models import Document, DocumentChunk
from apps.knowledge.services.embeddings import get_embeddings


def embed_document(document_id: int, chunk_size: int = 500):
    """Split document into chunks and store embeddings."""
    document = Document.objects.get(pk=document_id)
    chunks = split_text(document.content, chunk_size=chunk_size)

    # Batch embed (more efficient than one-by-one)
    embeddings = get_embeddings([c["text"] for c in chunks])

    chunk_objects = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_objects.append(DocumentChunk(
            document=document,
            content=chunk["text"],
            chunk_index=i,
            embedding=embedding,
            token_count=chunk["tokens"],
        ))

    DocumentChunk.objects.bulk_create(chunk_objects, batch_size=100)


def split_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk_words = words[i:i + chunk_size]
        chunks.append({
            "text": " ".join(chunk_words),
            "tokens": len(chunk_words),
        })
    return chunks
```

---

## Pattern 52.3: Vector Search in Django ORM

```python
# apps/knowledge/services/search.py
from pgvector.django import CosineDistance
from apps.knowledge.models import DocumentChunk
from apps.knowledge.services.embeddings import get_embedding


def vector_search(query: str, top_k: int = 5, max_distance: float = 0.5) -> list[dict]:
    """Search for similar document chunks using vector similarity."""
    query_embedding = get_embedding(query)

    results = (
        DocumentChunk.objects
        .annotate(distance=CosineDistance("embedding", query_embedding))
        .filter(distance__lt=max_distance)
        .order_by("distance")
        .select_related("document")
        [:top_k]
    )

    return [
        {
            "content": chunk.content,
            "document_title": chunk.document.title,
            "document_id": chunk.document_id,
            "distance": float(chunk.distance),
            "score": 1.0 - float(chunk.distance),
        }
        for chunk in results
    ]
```

---

## Pattern 52.4: RAG Pipeline (Django Service)

```python
# apps/knowledge/services/rag.py
from apps.knowledge.services.search import vector_search
from apps.ai.services.llm import get_openai_client
from django.conf import settings


class RAGService:
    @staticmethod
    def query(question: str, top_k: int = 5, model: str = None) -> dict:
        """End-to-end RAG: Retrieve → Augment → Generate."""
        model = model or settings.LLM_DEFAULT_MODEL

        # 1. Retrieve relevant chunks
        chunks = vector_search(question, top_k=top_k)

        if not chunks:
            return {
                "answer": "I don't have enough information to answer this question.",
                "sources": [],
            }

        # 2. Build context from retrieved chunks
        context = "\n\n---\n\n".join([
            f"Source: {c['document_title']}\n{c['content']}"
            for c in chunks
        ])

        # 3. Generate answer with context
        client = get_openai_client()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Answer the user's question based on the provided context. "
                        "If the context doesn't contain enough information, say so. "
                        "Cite sources when possible."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {question}",
                },
            ],
            max_tokens=1000,
        )

        return {
            "answer": response.choices[0].message.content,
            "sources": [
                {"title": c["document_title"], "score": c["score"]}
                for c in chunks
            ],
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            },
        }
```

---

## Pattern 52.5: Document Ingestion (Management Command)

```python
# apps/knowledge/management/commands/ingest_documents.py
import os
from django.core.management.base import BaseCommand
from apps.knowledge.models import Document
from apps.knowledge.services.embeddings import embed_document


class Command(BaseCommand):
    help = "Ingest documents from a directory and create embeddings."

    def add_arguments(self, parser):
        parser.add_argument("path", type=str, help="Directory or file path")
        parser.add_argument("--chunk-size", type=int, default=500)
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--extensions", nargs="+", default=[".txt", ".md", ".pdf"])

    def handle(self, *args, **options):
        path = options["path"]
        chunk_size = options["chunk_size"]
        dry_run = options["dry_run"]
        extensions = options["extensions"]

        files = self.collect_files(path, extensions)
        self.stdout.write(f"Found {len(files)} files to ingest.")

        if dry_run:
            for f in files:
                self.stdout.write(f"  [DRY RUN] {f}")
            return

        created = 0
        for filepath in files:
            try:
                content = self.read_file(filepath)
                document, was_created = Document.objects.update_or_create(
                    source=filepath,
                    defaults={"title": os.path.basename(filepath), "content": content},
                )

                # Clear old chunks and re-embed
                document.chunks.all().delete()
                embed_document(document.id, chunk_size=chunk_size)

                status = "created" if was_created else "updated"
                chunks_count = document.chunks.count()
                self.stdout.write(f"  {status}: {filepath} ({chunks_count} chunks)")
                created += 1
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"  Failed: {filepath} — {e}"))

        self.stdout.write(self.style.SUCCESS(f"Ingested {created}/{len(files)} documents."))

    def collect_files(self, path, extensions):
        if os.path.isfile(path):
            return [path]
        files = []
        for root, _, filenames in os.walk(path):
            for fn in filenames:
                if any(fn.endswith(ext) for ext in extensions):
                    files.append(os.path.join(root, fn))
        return sorted(files)

    def read_file(self, filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
```

---

## Pattern 52.6: Hybrid Search (Vector + Full-Text)

```python
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from pgvector.django import CosineDistance
from django.db.models import F, Value
from django.db.models.functions import Greatest


def hybrid_search(query: str, top_k: int = 10, vector_weight: float = 0.7) -> list[dict]:
    """Combine vector similarity with PostgreSQL full-text search (RRF)."""
    query_embedding = get_embedding(query)
    text_weight = 1.0 - vector_weight

    # Vector search results
    vector_results = (
        DocumentChunk.objects
        .annotate(
            vector_distance=CosineDistance("embedding", query_embedding),
            vector_score=1.0 - CosineDistance("embedding", query_embedding),
        )
        .order_by("vector_distance")
        [:top_k * 2]
    )

    # Full-text search results
    search_query = SearchQuery(query, search_type="websearch")
    text_results = (
        DocumentChunk.objects
        .annotate(
            search_vector=SearchVector("content"),
            text_rank=SearchRank(SearchVector("content"), search_query),
        )
        .filter(search_vector=search_query)
        .order_by("-text_rank")
        [:top_k * 2]
    )

    # Reciprocal Rank Fusion (RRF)
    k = 60  # RRF constant
    scores = {}

    for rank, chunk in enumerate(vector_results):
        scores[chunk.pk] = scores.get(chunk.pk, 0) + vector_weight * (1.0 / (k + rank + 1))

    for rank, chunk in enumerate(text_results):
        scores[chunk.pk] = scores.get(chunk.pk, 0) + text_weight * (1.0 / (k + rank + 1))

    # Sort by combined score and fetch top_k
    top_ids = sorted(scores.keys(), key=lambda pk: scores[pk], reverse=True)[:top_k]

    chunks = DocumentChunk.objects.filter(pk__in=top_ids).select_related("document")
    chunk_map = {c.pk: c for c in chunks}

    return [
        {
            "content": chunk_map[pk].content,
            "document_title": chunk_map[pk].document.title,
            "score": scores[pk],
        }
        for pk in top_ids
        if pk in chunk_map
    ]
```

---

## MUST DO

- Use HNSW index on VectorField (prevents brute-force scan)
- Batch embed documents (cheaper and faster than one-by-one)
- Use `CosineDistance` for normalized embeddings
- Implement hybrid search for better recall
- Use management commands for ingestion (idempotent)

## MUST NOT DO

- Skip HNSW index (linear scan at scale)
- Embed documents per-request (batch via Celery or management command)
- Store raw embeddings without indexing
- Use vector search alone (hybrid with full-text improves quality)
- Send entire documents as LLM context (chunk and retrieve relevant parts)

---

## References

- [pgvector](https://github.com/pgvector/pgvector)
- [django-pgvector](https://github.com/pgvector/pgvector-python#django)
- [OpenAI: Embeddings](https://platform.openai.com/docs/guides/embeddings)

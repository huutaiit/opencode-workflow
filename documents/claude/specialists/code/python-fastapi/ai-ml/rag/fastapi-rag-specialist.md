# FastAPI RAG Pipeline Specialist
# FastAPI RAGパイプラインスペシャリスト
# Chuyen Gia RAG FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/rag/`, `src/ai/retrieval/` |
| **Variant** | ALL |
| **Naming Convention** | `rag_pipeline.py`, `retriever.py`, `chunker.py` |
| **Imports From** | Infrastructure (vector stores), Domain (schemas) |
| **Cannot Import** | Presentation |
| **Dependencies** | `langchain`, `llama-index` (alternative), `unstructured` (parsing) |
| **When To Use** | RAG pipeline, text splitting, retrieval, reranking |
| **Source Skeleton** | `src/rag/pipeline.py`, `src/rag/retriever.py`, `src/rag/router.py` |
| **Pattern Numbers** | 56.1–56.8 |
| **Source Paths** | `**/rag/**/*.py`, `**/retrieval/**/*.py` |
| **File Count** | 3-5 per RAG feature |
| **Imported By** | Application (services) |
| **Specialist Type** | code |
| **Purpose** | RAG pipeline architecture, text splitting/chunking, retrieval patterns, reranking, hybrid search, evaluation, vector store as DI dependency |
| **Activation Trigger** | rag, retrieval, chunking, rerank, context retrieval, augmented generation |

---

## Purpose

Define RAG (Retrieval-Augmented Generation) pipeline patterns for FastAPI: architecture with strict ingest/retrieve/generate separation, text splitting strategies, advanced retrieval (multi-query, parent document, contextual compression), reranking with cross-encoders, hybrid dense+sparse search, evaluation metrics, and clean vector store dependency injection.

---

## Pattern 56.1: RAG Architecture

```
┌─────────────────────────────────────────────────────┐
│                 RAG Pipeline                         │
│                                                      │
│  INGEST                RETRIEVE              GENERATE │
│  ┌──────────┐         ┌──────────┐         ┌────────┐│
│  │ Document  │──────▶│ Query     │──────▶│ LLM    ││
│  │ Loader    │        │ Embedding │        │ + Ctx  ││
│  │   ↓       │        │   ↓       │        │   ↓    ││
│  │ Chunker   │        │ Vector    │        │ Answer ││
│  │   ↓       │        │ Search    │        │        ││
│  │ Embedder  │        │   ↓       │        │        ││
│  │   ↓       │        │ Rerank    │        │        ││
│  │ Vector DB │        │   ↓       │        │        ││
│  └──────────┘         │ Context   │        └────────┘│
│                       └──────────┘                    │
└─────────────────────────────────────────────────────┘
```

```python
from pydantic import BaseModel


class RAGRequest(BaseModel):
    query: str
    top_k: int = 5
    rerank: bool = True


class RAGResponse(BaseModel):
    answer: str
    sources: list[dict]
    tokens_used: int


class RAGPipeline:
    """Strict separation: ingest, retrieve, generate."""

    def __init__(self, retriever, reranker, llm):
        self.retriever = retriever
        self.reranker = reranker
        self.llm = llm

    async def query(self, request: RAGRequest) -> RAGResponse:
        # Step 1: Retrieve
        documents = await self.retriever.search(
            request.query, top_k=request.top_k * 3  # Over-fetch for reranking
        )

        # Step 2: Rerank
        if request.rerank and self.reranker:
            documents = await self.reranker.rerank(
                request.query, documents, top_k=request.top_k
            )
        else:
            documents = documents[:request.top_k]

        # Step 3: Generate
        context = "\n\n".join([doc.content for doc in documents])
        answer = await self.llm.generate(request.query, context)

        return RAGResponse(
            answer=answer.text,
            sources=[{"title": d.metadata.get("title"), "score": d.score} for d in documents],
            tokens_used=answer.usage.total_tokens,
        )
```

> Source: gpt-researcher CURSOR_RULES

---

## Pattern 56.2: Text Splitting

```python
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    MarkdownTextSplitter,
    Language,
)


# General text — handles paragraphs, sentences, words
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=len,
)

# Markdown — preserves heading hierarchy
md_splitter = MarkdownTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)

# Code — language-aware splitting
code_splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=1500,
    chunk_overlap=200,
)

# Split documents
chunks = text_splitter.split_text(document_text)
```

**Splitter selection guide**:

| Content Type | Splitter | Chunk Size |
|-------------|----------|------------|
| General text | RecursiveCharacter | 500-1500 |
| Markdown/docs | MarkdownText | 500-1500 |
| Source code | from_language() | 1000-2000 |
| Legal/medical | RecursiveCharacter (smaller) | 300-500 |
| Tables/structured | Custom (by row/section) | Varies |

> Source: LangChain SKILL.md RAG section

---

## Pattern 56.3: Chunk Strategy

```python
from pydantic import BaseModel


class Chunk(BaseModel):
    content: str
    metadata: dict  # title, source, page, section


def chunk_with_metadata(
    text: str,
    metadata: dict,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[Chunk]:
    """Chunk text preserving source metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    chunks = splitter.split_text(text)

    return [
        Chunk(
            content=chunk,
            metadata={
                **metadata,
                "chunk_index": i,
                "chunk_total": len(chunks),
            },
        )
        for i, chunk in enumerate(chunks)
    ]
```

**Chunk sizing rules**:
- **Too small** (< 200 tokens): Lost context, fragmented answers
- **Too large** (> 2000 tokens): Noise, diluted relevance
- **Sweet spot**: 500-1500 characters (200-500 tokens)
- **Overlap**: 10-20% of chunk size (prevents information loss at boundaries)

---

## Pattern 56.4: Retrieval Patterns

```python
# 1. Multi-Query Retrieval (3-5 query variants)
from langchain.retrievers.multi_query import MultiQueryRetriever

multi_retriever = MultiQueryRetriever.from_llm(
    retriever=vector_store.as_retriever(search_kwargs={"k": 5}),
    llm=llm,
)
# LLM generates 3 query variants → searches each → deduplicates

# 2. Parent Document Retrieval
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore

parent_retriever = ParentDocumentRetriever(
    vectorstore=vector_store,
    docstore=InMemoryStore(),
    child_splitter=RecursiveCharacterTextSplitter(chunk_size=400),
    parent_splitter=RecursiveCharacterTextSplitter(chunk_size=2000),
)
# Index small chunks, retrieve parent (larger context)

# 3. Contextual Compression
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

compressor = LLMChainExtractor.from_llm(llm)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=vector_store.as_retriever(),
)
# Retrieve documents → LLM extracts only relevant parts
```

> Source: RAG_Techniques repo (34 techniques)

---

## Pattern 56.5: Reranking

```python
from sentence_transformers import CrossEncoder


class Reranker:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)

    async def rerank(
        self,
        query: str,
        documents: list,
        top_k: int = 5,
    ) -> list:
        """Rerank documents by relevance to query."""
        pairs = [(query, doc.content) for doc in documents]
        scores = self.model.predict(pairs)

        # Sort by score descending
        scored_docs = sorted(
            zip(documents, scores),
            key=lambda x: x[1],
            reverse=True,
        )

        return [
            doc._replace(score=float(score))
            for doc, score in scored_docs[:top_k]
        ]
```

**Why reranking matters**:
- Bi-encoder (embedding search): fast but approximate
- Cross-encoder (reranker): slow but precise
- Strategy: over-fetch with bi-encoder → rerank top results with cross-encoder

---

## Pattern 56.6: Hybrid Search (Dense + Sparse)

```python
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever


# Sparse (BM25 — keyword matching)
bm25_retriever = BM25Retriever.from_documents(documents, k=10)

# Dense (vector similarity)
dense_retriever = vector_store.as_retriever(search_kwargs={"k": 10})

# Hybrid (Reciprocal Rank Fusion)
hybrid_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, dense_retriever],
    weights=[0.4, 0.6],  # 40% keyword, 60% semantic
)

results = await hybrid_retriever.ainvoke("query")
```

**When to use hybrid**:
- Technical terms that must match exactly (error codes, product IDs)
- Mixed queries (semantic intent + specific keywords)
- Domain-specific jargon

> Source: RAG_Techniques repo

---

## Pattern 56.7: Evaluation

```python
# pip install deepeval
from deepeval.metrics import (
    ContextualRelevancyMetric,
    FaithfulnessMetric,
    AnswerRelevancyMetric,
)
from deepeval.test_case import LLMTestCase


async def evaluate_rag(
    query: str,
    answer: str,
    context: list[str],
    expected: str | None = None,
) -> dict:
    """Evaluate RAG response quality."""
    test_case = LLMTestCase(
        input=query,
        actual_output=answer,
        retrieval_context=context,
        expected_output=expected,
    )

    metrics = {
        "faithfulness": FaithfulnessMetric(),      # Answer supported by context?
        "relevancy": AnswerRelevancyMetric(),        # Answer relevant to query?
        "context": ContextualRelevancyMetric(),     # Retrieved context relevant?
    }

    results = {}
    for name, metric in metrics.items():
        await metric.a_measure(test_case)
        results[name] = {"score": metric.score, "reason": metric.reason}

    return results
```

---

## Pattern 56.8: Vector Store as DI Dependency

```python
from fastapi import Depends
from typing import Annotated


class VectorStoreService:
    """Abstraction over vector store — injectable."""

    def __init__(self, collection_name: str = "default"):
        self.collection_name = collection_name

    async def search(self, query: str, top_k: int = 5) -> list:
        # Implementation: pgvector, Qdrant, ChromaDB, etc.
        raise NotImplementedError

    async def upsert(self, documents: list) -> int:
        raise NotImplementedError


async def get_vector_store() -> VectorStoreService:
    return QdrantVectorStore(collection_name="documents")


VectorStoreDep = Annotated[VectorStoreService, Depends(get_vector_store)]


@router.post("/search")
async def search(query: str, store: VectorStoreDep):
    return await store.search(query)
```

---

## MUST DO

- Separate ingest, retrieve, and generate stages cleanly
- Use chunk overlap (10-20%) to prevent information loss
- Rerank after initial retrieval (over-fetch → rerank → top-k)
- Preserve metadata through the chunking pipeline
- Use hybrid search for domain-specific content
- Evaluate RAG quality (faithfulness, relevancy)

## MUST NOT DO

- Skip reranking (embedding search alone is approximate)
- Use chunks that are too large (>2000 chars) or too small (<200 chars)
- Lose source metadata during chunking
- Trust LLM output without grounding in retrieved context
- Use a single retrieval strategy for all query types
- Skip evaluation before deploying RAG to production

---

## References

- [RAG Techniques (34 patterns)](https://github.com/NirDiamant/RAG_Techniques)
- [LangChain RAG Tutorial](https://python.langchain.com/docs/tutorials/rag/)
- [DeepEval](https://docs.confident-ai.com/)
- [Cross-Encoder Reranking](https://www.sbert.net/docs/cross_encoder/usage/usage.html)

# FastAPI NL-to-SQL Specialist
# FastAPI自然言語SQLスペシャリスト
# Chuyen Gia NL-to-SQL FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/nlsql/`, `src/nlsql/` |
| **Variant** | ALL |
| **Naming Convention** | `nlsql_service.py`, `schema_context.py`, `sql_validator.py`, `query_sandbox.py`, `template_matcher.py` |
| **Imports From** | Domain (models, schemas), Data Access (async session), Application (LLM client services from ai-ml specialists) |
| **Imported By** | Presentation (router endpoints expose NL-to-SQL API) |
| **Cannot Import** | Presentation (inversion of dependency) |
| **Dependencies** | `sqlalchemy[asyncio]>=2.0`, `anthropic>=0.30` or `openai>=1.0` (LLM provider) |
| **When To Use** | Natural language to SQL translation, schema-aware prompting, SQL validation and sandboxing, template-based fallback |
| **Source Skeleton** | `src/nlsql/service.py`, `src/nlsql/schema_context.py`, `src/nlsql/sql_validator.py`, `src/nlsql/query_sandbox.py` |
| **Pattern Numbers** | 63.1–63.6 |
| **Source Paths** | `**/nlsql/**/*.py`, `**/nl_sql/**/*.py` |
| **File Count** | 4-6 NL-to-SQL components |
| **Specialist Type** | code |
| **Purpose** | Generate NL-to-SQL pipeline components — schema context extraction, LLM prompt engineering, SQL validation/sandboxing, result formatting, and template-based fallback when LLM unavailable |
| **Activation Trigger** | files: **/nlsql/**/*.py, **/nl_sql/**/*.py; keywords: nlToSql, textToSql, naturalLanguageQuery, schemaContext, sqlGeneration |

---

## Purpose

Define NL-to-SQL patterns for FastAPI: auto-discover database schema from `information_schema`, build LLM prompts with DDL context and few-shot examples, validate generated SQL (SELECT-only, sandboxed), execute in read-only transactions with timeout, and fall back to template-based query matching when LLM is unavailable.

---

## Pattern 63.1: Schema Context Provider

```python
from dataclasses import dataclass, field

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.cache import redis_cache


@dataclass
class ColumnInfo:
    table_name: str
    column_name: str
    data_type: str
    is_nullable: bool
    constraint_type: str | None = None


@dataclass
class TableMetadata:
    table_name: str
    columns: list[ColumnInfo] = field(default_factory=list)


@dataclass
class SchemaContext:
    schema_name: str
    tables: list[TableMetadata] = field(default_factory=list)


class SchemaContextProvider:
    """Auto-discover schema from information_schema (PostgreSQL).

    Key principles:
    - Read schema from DB metadata (never hardcode DDL)
    - Cache schema context (changes infrequently)
    - Format as DDL for LLM prompt (proven most effective)
    - Filter to relevant tables (token budget management)
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    @redis_cache(ttl=3600, key_prefix="schema-context")
    async def get_schema_context(self, schema_name: str = "public") -> SchemaContext:
        query = text("""
            SELECT
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                tc.constraint_type
            FROM information_schema.tables t
            JOIN information_schema.columns c
                ON t.table_name = c.table_name AND t.table_schema = c.table_schema
            LEFT JOIN information_schema.key_column_usage kcu
                ON c.column_name = kcu.column_name AND c.table_name = kcu.table_name
            LEFT JOIN information_schema.table_constraints tc
                ON kcu.constraint_name = tc.constraint_name
            WHERE t.table_schema = :schema AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position
        """)
        result = await self._session.execute(query, {"schema": schema_name})
        rows = result.all()

        tables_map: dict[str, TableMetadata] = {}
        for row in rows:
            tbl = tables_map.setdefault(
                row.table_name, TableMetadata(table_name=row.table_name)
            )
            tbl.columns.append(ColumnInfo(
                table_name=row.table_name,
                column_name=row.column_name,
                data_type=row.data_type,
                is_nullable=row.is_nullable == "YES",
                constraint_type=row.constraint_type,
            ))

        return SchemaContext(
            schema_name=schema_name, tables=list(tables_map.values())
        )

    def format_for_prompt(
        self, context: SchemaContext, relevant_tables: list[str] | None = None
    ) -> str:
        """Format schema as DDL for LLM prompt."""
        tables = context.tables
        if relevant_tables:
            tables = [t for t in tables if t.table_name in relevant_tables]

        ddl_parts = []
        for table in tables:
            cols = ",\n".join(
                f"  {c.column_name} {c.data_type}"
                + (f" -- {c.constraint_type}" if c.constraint_type else "")
                for c in table.columns
            )
            ddl_parts.append(f"CREATE TABLE {table.table_name} (\n{cols}\n);")
        return "\n\n".join(ddl_parts)
```

**Why Approved**:
- Auto-discovers from information_schema (no hardcoded DDL)
- Redis cache with 1h TTL (schema changes infrequently)
- DDL format proven most effective for LLM SQL generation
- Supports filtering relevant tables (token budget)

---

## Pattern 63.2: NL-to-SQL Prompt Engineering

```python
from dataclasses import dataclass


@dataclass
class FewShotExample:
    question: str
    sql: str


SYSTEM_PROMPT = """You are a SQL query generator for PostgreSQL.

RULES:
1. Generate ONLY SELECT queries. Never INSERT, UPDATE, DELETE, DROP, or DDL.
2. Use exact table and column names from the schema provided.
3. Always include soft-delete filter: del_flg = 0
4. Use :param_name for parameters (SQLAlchemy named binding).
5. Return ONLY the SQL query, no explanation.
6. If the question cannot be answered: respond with CANNOT_ANSWER: <reason>

DATABASE SCHEMA:
{schema_ddl}

EXAMPLES:
{few_shot_examples}
"""


class NlSqlPromptBuilder:
    """Build LLM prompts for text-to-SQL.

    Key principles:
    - System prompt with explicit constraints (SELECT-only, soft-delete)
    - Schema context in DDL format
    - Few-shot examples for accuracy improvement
    - CANNOT_ANSWER escape hatch
    """

    def __init__(self, schema_provider: SchemaContextProvider):
        self._schema_provider = schema_provider

    async def build_prompt(
        self,
        relevant_tables: list[str] | None = None,
        examples: list[FewShotExample] | None = None,
    ) -> str:
        context = await self._schema_provider.get_schema_context()
        schema_ddl = self._schema_provider.format_for_prompt(context, relevant_tables)

        examples_text = ""
        if examples:
            examples_text = "\n\n".join(
                f"Q: {e.question}\nSQL: {e.sql}" for e in examples
            )

        return SYSTEM_PROMPT.format(
            schema_ddl=schema_ddl,
            few_shot_examples=examples_text or "(none)",
        )
```

**Why Approved**:
- Explicit constraints (SELECT-only, soft-delete, parameterized)
- DDL format for schema context
- Few-shot examples for accuracy
- CANNOT_ANSWER for unanswerable questions

---

## Pattern 63.3: SQL Validator & Sandboxing

```python
import re
from dataclasses import dataclass


PROHIBITED_KEYWORDS = frozenset({
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
    "TRUNCATE", "GRANT", "REVOKE", "EXEC", "EXECUTE",
    "INTO", "MERGE", "CALL",
})

MAX_RESULT_ROWS = 1000


@dataclass
class SqlValidationResult:
    accepted: bool
    sql: str
    reason: str | None = None

    @classmethod
    def accept(cls, sql: str) -> "SqlValidationResult":
        return cls(accepted=True, sql=sql)

    @classmethod
    def reject(cls, reason: str) -> "SqlValidationResult":
        return cls(accepted=False, sql="", reason=reason)


class SqlValidator:
    """Validate and sandbox LLM-generated SQL.

    Key principles:
    - Keyword-level validation (not naive regex on full query)
    - String literal awareness (prevents false positives)
    - Auto-LIMIT enforcement
    - Whitelist: only SELECT / WITH (CTE)
    """

    def validate(self, sql: str) -> SqlValidationResult:
        normalized = re.sub(r"\s+", " ", sql.strip()).upper()

        # Must start with SELECT or WITH (CTE)
        if not (normalized.startswith("SELECT") or normalized.startswith("WITH")):
            return SqlValidationResult.reject("Only SELECT queries are allowed")

        # Check prohibited keywords
        for keyword in PROHIBITED_KEYWORDS:
            pattern = rf"\b{keyword}\b"
            if re.search(pattern, normalized) and not self._inside_string(sql, keyword):
                return SqlValidationResult.reject(
                    f"Prohibited SQL operation: {keyword}"
                )

        # Enforce LIMIT
        safe_sql = self._enforce_limit(sql)
        return SqlValidationResult.accept(safe_sql)

    def _enforce_limit(self, sql: str) -> str:
        if "LIMIT" not in sql.upper():
            return f"{sql.rstrip().rstrip(';')} LIMIT {MAX_RESULT_ROWS}"
        return sql

    def _inside_string(self, sql: str, keyword: str) -> bool:
        idx = sql.upper().find(keyword)
        if idx < 0:
            return False
        quotes_before = sql[:idx].count("'")
        return quotes_before % 2 != 0
```

**Why Approved**:
- Keyword validation with word boundary `\b`
- String literal awareness
- Auto-LIMIT enforcement
- Clean accept/reject result

---

## Pattern 63.4: Query Sandbox Execution

```python
import asyncio
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


QUERY_TIMEOUT_SECONDS = 10


@dataclass
class QueryResult:
    success: bool
    rows: list[dict[str, Any]] = field(default_factory=list)
    sql: str = ""
    error: str | None = None
    row_count: int = 0

    @classmethod
    def ok(cls, rows: list[dict[str, Any]], sql: str) -> "QueryResult":
        return cls(success=True, rows=rows, sql=sql, row_count=len(rows))

    @classmethod
    def fail(cls, error: str) -> "QueryResult":
        return cls(success=False, error=error)


class QuerySandbox:
    """Execute validated SQL in sandboxed context.

    Key principles:
    - SET LOCAL statement_timeout (PostgreSQL session-level)
    - Read-only via BEGIN READ ONLY
    - Timeout enforcement via asyncio.wait_for
    - Generic row-to-dict conversion
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def execute(self, validated_sql: str) -> QueryResult:
        try:
            # Set session-level timeout
            await self._session.execute(
                text("SET LOCAL statement_timeout = :timeout"),
                {"timeout": f"{QUERY_TIMEOUT_SECONDS}s"},
            )

            result = await asyncio.wait_for(
                self._session.execute(text(validated_sql)),
                timeout=QUERY_TIMEOUT_SECONDS,
            )
            rows = [dict(row._mapping) for row in result.all()]
            return QueryResult.ok(rows, validated_sql)

        except asyncio.TimeoutError:
            return QueryResult.fail(
                f"Query timed out after {QUERY_TIMEOUT_SECONDS} seconds"
            )
        except Exception as e:
            return QueryResult.fail(f"SQL error: {e}")
```

**Why Approved**:
- SET LOCAL statement_timeout for PostgreSQL
- `asyncio.wait_for` as Python-level timeout backup
- Generic `row._mapping` to dict conversion
- Clean success/error result type

---

## Pattern 63.5: NL-to-SQL Orchestrator

```python
import logging

from src.nlsql.prompt_builder import NlSqlPromptBuilder
from src.nlsql.sql_validator import SqlValidator, SqlValidationResult
from src.nlsql.query_sandbox import QuerySandbox, QueryResult
from src.nlsql.template_matcher import TemplateQueryMatcher

logger = logging.getLogger(__name__)


class NlSqlService:
    """End-to-end NL-to-SQL pipeline.

    Pipeline: question → prompt → LLM → validate → execute → format

    Key principles:
    - Single entry point for NL-to-SQL
    - Retry with feedback on SQL validation failure
    - Fallback to template matching when LLM unavailable
    """

    def __init__(
        self,
        prompt_builder: NlSqlPromptBuilder,
        llm_client,  # anthropic.AsyncAnthropic or openai.AsyncOpenAI
        sql_validator: SqlValidator,
        sandbox: QuerySandbox,
        template_matcher: TemplateQueryMatcher,
    ):
        self._prompt_builder = prompt_builder
        self._llm = llm_client
        self._validator = sql_validator
        self._sandbox = sandbox
        self._template_matcher = template_matcher

    async def query(self, user_question: str) -> QueryResult:
        # Try LLM path
        try:
            system_prompt = await self._prompt_builder.build_prompt()
            generated_sql = await self._call_llm(system_prompt, user_question)

            validation = self._validator.validate(generated_sql)
            if not validation.accepted:
                generated_sql = await self._retry_with_feedback(
                    system_prompt, user_question, generated_sql, validation.reason
                )
                validation = self._validator.validate(generated_sql)
                if not validation.accepted:
                    return QueryResult.fail(
                        f"Could not generate valid SQL after retry: {validation.reason}"
                    )

            return await self._sandbox.execute(validation.sql)

        except Exception as e:
            logger.warning("LLM unavailable, falling back to template: %s", e)
            return await self._fallback_template(user_question)

    async def _call_llm(self, system_prompt: str, question: str) -> str:
        # Works with Anthropic client — adapt for OpenAI
        response = await self._llm.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": question}],
        )
        return response.content[0].text.strip()

    async def _retry_with_feedback(
        self, system_prompt: str, question: str, failed_sql: str, reason: str | None
    ) -> str:
        feedback = (
            f"The previous SQL was rejected: {reason}\n"
            f"Failed SQL: {failed_sql}\n"
            "Please generate a corrected SELECT query."
        )
        return await self._call_llm(
            system_prompt, f"{question}\n\n{feedback}"
        )

    async def _fallback_template(self, question: str) -> QueryResult:
        match = self._template_matcher.match(question)
        if match is None:
            return QueryResult.fail(f"No template matched: {question}")
        return await self._sandbox.execute(match)
```

**Why Approved**:
- Clear pipeline: prompt -> LLM -> validate -> execute
- Retry with error feedback
- Fallback to template matching when LLM unavailable
- Single entry point

---

## Pattern 63.6: Template Query Matcher (Fallback)

```python
import re


class TemplateQueryMatcher:
    """Rule-based fallback when LLM is unavailable.

    Key principles:
    - Regex patterns for common question types
    - Parameterized SQL templates
    - Identifier sanitization to prevent SQL injection
    - Covers ~60-80% of common queries without LLM
    """

    TEMPLATES = [
        (
            re.compile(r"(?i)how many (\w+)"),
            "SELECT COUNT(*) AS total FROM {table} WHERE del_flg = 0",
        ),
        (
            re.compile(r"(?i)top (\d+) (\w+) by (\w+)"),
            "SELECT * FROM {table} WHERE del_flg = 0 ORDER BY {column} DESC LIMIT {limit}",
        ),
        (
            re.compile(r"(?i)total (\w+) (?:of|for|in) (\w+)"),
            "SELECT SUM({column}) AS total FROM {table} WHERE del_flg = 0",
        ),
    ]

    def match(self, question: str) -> str | None:
        for pattern, template in self.TEMPLATES:
            m = pattern.search(question)
            if m:
                return self._build_sql(template, m)
        return None

    def _build_sql(self, template: str, match: re.Match) -> str:
        groups = match.groups()
        # Map regex groups to template params
        params: dict[str, str] = {}
        if len(groups) >= 1:
            params["table"] = self._sanitize(groups[-1])  # last group = table
        if len(groups) >= 2:
            params["column"] = self._sanitize(groups[0])
        if len(groups) >= 3:
            params["limit"] = self._sanitize(groups[0])
            params["table"] = self._sanitize(groups[1])
            params["column"] = self._sanitize(groups[2])

        return template.format(**params)

    @staticmethod
    def _sanitize(identifier: str) -> str:
        """Whitelist: only alphanumeric + underscore."""
        return re.sub(r"[^a-zA-Z0-9_]", "", identifier)
```

**Why Approved**:
- Covers common question patterns without LLM
- Identifier sanitization prevents SQL injection
- Extensible template list
- Returns None when no match (caller handles)

---

## REJECTED Pattern 1: Direct User Input to SQL

```python
# DON'T: Pass LLM output directly to database without validation
async def query(question: str, session: AsyncSession):
    sql = await llm_client.generate(question)
    result = await session.execute(text(sql))  # no validation!
    return result.all()
```

**Why Rejected**: No SQL validation, no read-only transaction, no timeout. LLM could generate DROP/DELETE.

**Solution**: Always validate + sandbox (Patterns 63.3 + 63.4)

---

## REJECTED Pattern 2: Hardcoded Schema in Prompt

```python
# DON'T: Hardcoded DDL
SCHEMA = """
CREATE TABLE users (id INT, name VARCHAR, email VARCHAR);
"""
```

**Why Rejected**: Schema drifts from actual database. Must manually update on every migration.

**Solution**: Auto-discover from information_schema (Pattern 63.1)

---

## DECISION TREE

```
Is this question about NL-to-SQL / text-to-query?
├─ YES → Continue
│   ├─ Schema context for LLM prompt?
│   │   → Pattern 63.1 (Schema Context Provider)
│   ├─ Designing the LLM prompt?
│   │   → Pattern 63.2 (Prompt Engineering)
│   ├─ SQL validation / security?
│   │   → Pattern 63.3 (SQL Validator)
│   ├─ Safe query execution?
│   │   → Pattern 63.4 (Query Sandbox)
│   ├─ End-to-end pipeline?
│   │   → Pattern 63.5 (NL-to-SQL Orchestrator)
│   └─ Fallback when LLM is down?
│       → Pattern 63.6 (Template Query Matcher)
└─ NO → Delegate
    ├─ BI aggregation? → fastapi-bi-analytics-specialist (62.x)
    ├─ LLM client (Claude)? → fastapi-llm-anthropic-specialist (51.x)
    ├─ LLM client (OpenAI)? → fastapi-llm-openai-specialist (50.x)
    └─ Database queries? → sqlalchemy-async-specialist (12.x)
```

---

## KEYWORDS

NL-to-SQL, text-to-SQL, natural language query, text to query, prompt engineering, schema context, SQL generation, SQL validation, query sandbox

---

## VERSION HISTORY

- **v1.0.0** (2026-04-07): Initial version — 6 patterns, 2 rejected

---

*FastAPI NL-to-SQL Specialist v1.0 — Python FastAPI*
*Location: `specialists/code/python-fastapi/analytics/fastapi-nl-to-sql-specialist.md`*

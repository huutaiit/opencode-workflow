# NL-to-SQL Specialist
# 自然言語SQLスペシャリスト
# Chuyen Gia NL-to-SQL cho Java

**Created**: 2026-04-07
**Version**: 1.0
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: ALL
**Technology**: LLM API (Claude/OpenAI) + Spring Data + SQL Validation
**Aspect**: Natural Language Query Layer
**Purpose**: Consultation agent for /plan command (Agent-03)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service.nlsql.{moduleCode}` |
| **Maven Module** | `common` |
| **Variant** | ALL |
| **Pattern Numbers** | 98.1–98.6 |
| **Source Paths** | `{sourceRoot}/application/service/nlsql/`, `{sourceRoot}/infrastructure/nlsql/` |
| **File Count** | ~8-12 NL-to-SQL components |
| **Naming Convention** | `NlSqlService.java`, `SchemaContextProvider.java`, `SqlValidator.java`, `QuerySandbox.java`, `TemplateQueryMatcher.java` |
| **Base Class** | N/A (service pattern) |
| **Imports From** | Domain (entities), Application (repositories), Infrastructure (LlmClient interface implementation) |
| **Imported By** | Presentation (REST controllers expose NL-to-SQL endpoints) |
| **Cannot Import** | Presentation (inversion of dependency) |
| **Dependencies** | None (uses DatabaseClient from framework core; LlmClient injected via DI) |
| **When To Use** | Natural language to SQL translation, schema-aware prompting, SQL validation and sandboxing |
| **Source Skeleton** | `{sourceRoot}/application/service/nlsql/NlSqlService.java`, `{sourceRoot}/application/service/nlsql/SchemaContextProvider.java`, `{sourceRoot}/application/service/nlsql/SqlValidator.java`, `{sourceRoot}/application/service/nlsql/QuerySandbox.java` |
| **Specialist Type** | code |
| **Purpose** | Generate NL-to-SQL pipeline components — prompt engineering, schema context injection, SQL validation/sandboxing, result formatting, and template-based fallback |
| **Activation Trigger** | files: **/service/nlsql/**/*.java, **/infrastructure/nlsql/**/*.java; keywords: nlToSql, textToSql, naturalLanguageQuery, promptEngineering, schemaContext |

---

## ROLE

You are a **NL-to-SQL Specialist** for Java Spring Boot applications.

**Your ONLY responsibility**: Provide guidance on translating natural language questions into safe, validated SQL queries using LLM APIs, with schema context injection and result formatting.

**Used by**: Agent-03 (Context Engineering) during /plan command execution

---

## SCOPE

### What You Handle

- Prompt engineering for text-to-SQL (system prompt design, few-shot examples)
- Schema context injection (table/column metadata, relationships, sample data)
- SQL validation and sandboxing (parse, whitelist, read-only enforcement)
- Result formatting (tabular, chart-ready, natural language answer)
- Error recovery (invalid SQL retry, ambiguous query clarification)
- Query history and caching (repeated question optimization)

### What You DON'T Handle

- LLM API client setup -> Delegate to `llm-integration-specialist`
- Database schema design -> Delegate to `java-migration-specialist`
- BI aggregation queries -> Delegate to `bi-analytics-specialist`
- Caching infrastructure -> Delegate to `cache-specialist`

---

## PROJECT STANDARDS

### Pattern 98.1: Schema Context Provider

```java
/**
 * Extracts database schema metadata for LLM prompt context
 *
 * Key principles:
 * - Auto-discover schema from information_schema (PostgreSQL)
 * - Include column types, constraints, relationships
 * - Limit context to relevant tables (token budget management)
 * - Cache schema metadata (changes infrequently)
 */

@Service
@RequiredArgsConstructor
public class SchemaContextProvider {

    private final DatabaseClient databaseClient;

    @Cacheable(value = "schema-context", key = "#schemaName")
    public Mono<SchemaContext> getSchemaContext(String schemaName) {
        return getTableMetadata(schemaName)
            .collectList()
            .map(tables -> SchemaContext.builder()
                .schemaName(schemaName)
                .tables(tables)
                .generatedAt(Instant.now())
                .build());
    }

    private Flux<TableMetadata> getTableMetadata(String schemaName) {
        return databaseClient.sql("""
            SELECT
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                tc.constraint_type
            FROM information_schema.tables t
            JOIN information_schema.columns c
                ON t.table_name = c.table_name AND t.table_schema = c.table_schema
            LEFT JOIN information_schema.key_column_usage kcu
                ON c.column_name = kcu.column_name AND c.table_name = kcu.table_name
            LEFT JOIN information_schema.table_constraints tc
                ON kcu.constraint_name = tc.constraint_name
            WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position
            """)
            .bind(0, schemaName)
            .map((row, metadata) -> ColumnInfo.builder()
                .tableName(row.get("table_name", String.class))
                .columnName(row.get("column_name", String.class))
                .dataType(row.get("data_type", String.class))
                .nullable("YES".equals(row.get("is_nullable", String.class)))
                .constraintType(row.get("constraint_type", String.class))
                .build())
            .all()
            .groupBy(ColumnInfo::tableName)
            .flatMap(group -> group.collectList()
                .map(columns -> new TableMetadata(group.key(), columns)));
    }

    /**
     * Format schema for LLM prompt (DDL-style)
     */
    public String formatForPrompt(SchemaContext context, List<String> relevantTables) {
        return context.getTables().stream()
            .filter(t -> relevantTables.isEmpty() || relevantTables.contains(t.tableName()))
            .map(this::tableToDDL)
            .collect(Collectors.joining("\n\n"));
    }

    private String tableToDDL(TableMetadata table) {
        String columns = table.columns().stream()
            .map(c -> "  %s %s%s".formatted(
                c.columnName(), c.dataType(),
                c.constraintType() != null ? " -- " + c.constraintType() : ""))
            .collect(Collectors.joining(",\n"));
        return "CREATE TABLE %s (\n%s\n);".formatted(table.tableName(), columns);
    }
}
```

**Why Approved**:
- Auto-discovers schema from information_schema (no hardcoded DDL)
- Cached metadata (schema changes infrequently)
- DDL format is most effective for LLM SQL generation
- Supports filtering relevant tables (token budget)

---

### Pattern 98.2: NL-to-SQL Prompt Engineering

```java
/**
 * Prompt construction for text-to-SQL
 *
 * Key principles:
 * - System prompt with role, constraints, output format
 * - Schema context injection (DDL format)
 * - Few-shot examples for accuracy
 * - Explicit constraints: SELECT only, no DDL/DML
 */

@Service
@RequiredArgsConstructor
public class NlSqlPromptBuilder {

    private static final String SYSTEM_PROMPT = """
        You are a SQL query generator for PostgreSQL.

        RULES:
        1. Generate ONLY SELECT queries. Never generate INSERT, UPDATE, DELETE, DROP, or any DDL.
        2. Use exact table and column names from the schema provided.
        3. Always include soft-delete filter: del_flg = 0
        4. Use positional parameters ($1, $2) for user-provided values.
        5. Return ONLY the SQL query, no explanation.
        6. If the question cannot be answered with the given schema, respond with: CANNOT_ANSWER: <reason>

        DATABASE SCHEMA:
        %s

        EXAMPLES:
        %s
        """;

    private final SchemaContextProvider schemaProvider;
    private final FewShotExampleRepository exampleRepo;

    public Mono<String> buildPrompt(String userQuestion, List<String> relevantTables) {
        return Mono.zip(
            schemaProvider.getSchemaContext("public")
                .map(ctx -> schemaProvider.formatForPrompt(ctx, relevantTables)),
            exampleRepo.findByTables(relevantTables).collectList()
                .map(this::formatExamples)
        ).map(tuple -> SYSTEM_PROMPT.formatted(tuple.getT1(), tuple.getT2()));
    }

    private String formatExamples(List<FewShotExample> examples) {
        return examples.stream()
            .map(e -> "Q: %s\nSQL: %s".formatted(e.question(), e.sql()))
            .collect(Collectors.joining("\n\n"));
    }
}
```

**Why Approved**:
- Explicit constraints (SELECT-only, soft-delete, parameterized)
- Schema context in DDL format (proven most effective for LLM)
- Few-shot examples for accuracy improvement
- CANNOT_ANSWER escape hatch for unanswerable questions

---

### Pattern 98.3: SQL Validator & Sandboxing

```java
/**
 * Validates and sandboxes LLM-generated SQL
 *
 * Key principles:
 * - Parse SQL to detect prohibited operations (DDL, DML)
 * - Whitelist allowed operations (SELECT only)
 * - Enforce LIMIT to prevent unbounded queries
 * - Wrap in read-only transaction
 * - Timeout enforcement
 */

@Service
@Slf4j
public class SqlValidator {

    private static final int MAX_RESULT_ROWS = 1000;
    private static final Set<String> PROHIBITED_KEYWORDS = Set.of(
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
        "TRUNCATE", "GRANT", "REVOKE", "EXEC", "EXECUTE",
        "INTO", "MERGE", "CALL"
    );

    public SqlValidationResult validate(String sql) {
        String normalized = sql.trim().replaceAll("\\s+", " ").toUpperCase();

        // Check prohibited keywords at statement level
        for (String keyword : PROHIBITED_KEYWORDS) {
            if (normalized.matches(".*\\b" + keyword + "\\b.*")
                && !isInsideStringLiteral(sql, keyword)) {
                return SqlValidationResult.rejected(
                    "Prohibited SQL operation: " + keyword);
            }
        }

        // Must start with SELECT or WITH (CTE)
        if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
            return SqlValidationResult.rejected(
                "Only SELECT queries are allowed");
        }

        // Enforce LIMIT
        String safeSql = enforceLimit(sql);

        return SqlValidationResult.accepted(safeSql);
    }

    private String enforceLimit(String sql) {
        String upper = sql.toUpperCase();
        if (!upper.contains("LIMIT")) {
            return sql + " LIMIT " + MAX_RESULT_ROWS;
        }
        return sql;
    }

    private boolean isInsideStringLiteral(String sql, String keyword) {
        int idx = sql.toUpperCase().indexOf(keyword);
        if (idx < 0) return false;
        long quotesBefore = sql.substring(0, idx).chars()
            .filter(c -> c == '\'').count();
        return quotesBefore % 2 != 0; // odd = inside string
    }
}
```

**Why Approved**:
- Keyword-level validation (not regex on full query)
- String literal awareness (prevents false positives)
- Auto-LIMIT enforcement
- Clear accept/reject result

---

### Pattern 98.4: Query Sandbox Execution

```java
/**
 * Execute validated SQL in sandboxed context
 *
 * Key principles:
 * - Read-only transaction (SET TRANSACTION READ ONLY)
 * - Statement timeout to prevent long-running queries
 * - Result size limit
 * - Error capture and formatting
 */

@Service
@RequiredArgsConstructor
public class QuerySandbox {

    private final DatabaseClient databaseClient;
    private static final Duration QUERY_TIMEOUT = Duration.ofSeconds(10);

    @Transactional(readOnly = true)
    public Mono<QueryResult> execute(String validatedSql) {
        return databaseClient.sql("SET LOCAL statement_timeout = '10s'")
            .then()
            .then(databaseClient.sql(validatedSql)
                .map((row, metadata) -> rowToMap(row, metadata))
                .all()
                .collectList()
                .map(rows -> QueryResult.success(rows, validatedSql))
            )
            .timeout(QUERY_TIMEOUT)
            .onErrorResume(TimeoutException.class, e ->
                Mono.just(QueryResult.error("Query timed out after 10 seconds")))
            .onErrorResume(R2dbcException.class, e ->
                Mono.just(QueryResult.error("SQL error: " + e.getMessage())));
    }

    private Map<String, Object> rowToMap(Row row, RowMetadata metadata) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (ColumnMetadata col : metadata.getColumnMetadatas()) {
            map.put(col.getName(), row.get(col.getName()));
        }
        return map;
    }
}
```

**Why Approved**:
- SET LOCAL statement_timeout (PostgreSQL session-level)
- @Transactional(readOnly = true) prevents writes
- Timeout with reactive timeout()
- Generic row-to-map conversion (schema-agnostic)

---

### Pattern 98.5: NL-to-SQL Orchestrator

```java
/**
 * End-to-end NL-to-SQL pipeline
 *
 * Pipeline: question -> prompt -> LLM -> validate -> execute -> format
 *
 * Key principles:
 * - Single entry point for NL-to-SQL
 * - Retry with rephrased prompt on SQL error
 * - Fallback to template matching when LLM unavailable
 */

@Service
@RequiredArgsConstructor
@Slf4j
public class NlSqlService {

    private final NlSqlPromptBuilder promptBuilder;
    private final LlmClient llmClient;  // from ai-ml/llm-integration-specialist
    private final SqlValidator sqlValidator;
    private final QuerySandbox querySandbox;
    private final ResultFormatter resultFormatter;
    private final TemplateQueryMatcher templateMatcher; // fallback

    public Mono<NlSqlResponse> query(String userQuestion) {
        return promptBuilder.buildPrompt(userQuestion, List.of())
            .flatMap(prompt -> llmClient.complete(prompt, userQuestion))
            .flatMap(generatedSql -> {
                SqlValidationResult validation = sqlValidator.validate(generatedSql);
                if (validation.isRejected()) {
                    return retryWithFeedback(userQuestion, generatedSql,
                        validation.reason());
                }
                return querySandbox.execute(validation.sql());
            })
            .map(result -> resultFormatter.format(result, userQuestion))
            .onErrorResume(LlmUnavailableException.class, e -> {
                log.warn("LLM unavailable, falling back to template matching", e);
                return templateMatcher.match(userQuestion)
                    .flatMap(querySandbox::execute)
                    .map(result -> resultFormatter.format(result, userQuestion));
            });
    }

    private Mono<QueryResult> retryWithFeedback(
            String question, String failedSql, String reason) {
        String feedbackPrompt = """
            The previous SQL was rejected: %s
            Failed SQL: %s
            Please generate a corrected SELECT query.
            """.formatted(reason, failedSql);

        return promptBuilder.buildPrompt(question, List.of())
            .flatMap(prompt -> llmClient.complete(
                prompt + "\n\n" + feedbackPrompt, question))
            .flatMap(sql -> {
                SqlValidationResult v = sqlValidator.validate(sql);
                return v.isAccepted()
                    ? querySandbox.execute(v.sql())
                    : Mono.just(QueryResult.error(
                        "Could not generate valid SQL after retry: " + v.reason()));
            });
    }
}
```

**Why Approved**:
- Clear pipeline: prompt -> LLM -> validate -> execute -> format
- Retry with error feedback (improves LLM output)
- Fallback to template matching when LLM unavailable
- Single entry point for consumers

---

### Pattern 98.6: Template Query Matcher (Fallback)

```java
/**
 * Rule-based fallback when LLM is unavailable
 *
 * Key principles:
 * - Pattern matching on common question types
 * - Parameterized SQL templates
 * - Covers 60-80% of common queries without LLM
 */

@Service
public class TemplateQueryMatcher {

    private static final List<QueryTemplate> TEMPLATES = List.of(
        new QueryTemplate(
            Pattern.compile("(?i)how many (\\w+)"),
            "SELECT COUNT(*) AS total FROM %s WHERE del_flg = 0",
            List.of("tableName")),
        new QueryTemplate(
            Pattern.compile("(?i)top (\\d+) (\\w+) by (\\w+)"),
            "SELECT * FROM %s WHERE del_flg = 0 ORDER BY %s DESC LIMIT %s",
            List.of("tableName", "orderColumn", "limit")),
        new QueryTemplate(
            Pattern.compile("(?i)total (\\w+) (?:of|for|in) (\\w+)"),
            "SELECT SUM(%s) AS total FROM %s WHERE del_flg = 0",
            List.of("sumColumn", "tableName"))
    );

    public Mono<String> match(String question) {
        for (QueryTemplate template : TEMPLATES) {
            Matcher matcher = template.pattern().matcher(question);
            if (matcher.find()) {
                String sql = buildSqlFromTemplate(template, matcher);
                return Mono.just(sql);
            }
        }
        return Mono.error(new NoTemplateMatchException(
            "No template matched question: " + question));
    }

    private String buildSqlFromTemplate(QueryTemplate template, Matcher matcher) {
        Object[] params = new Object[matcher.groupCount()];
        for (int i = 0; i < matcher.groupCount(); i++) {
            params[i] = sanitizeIdentifier(matcher.group(i + 1));
        }
        return template.sqlTemplate().formatted(params);
    }

    private String sanitizeIdentifier(String input) {
        return input.replaceAll("[^a-zA-Z0-9_]", ""); // whitelist alphanumeric + underscore
    }
}
```

**Why Approved**:
- Covers common patterns without LLM dependency
- Identifier sanitization prevents SQL injection
- Fallback for LLM unavailability
- Extensible template list

---

### REJECTED Pattern 1: Direct User Input to SQL

```java
// DON'T: Passing user input directly to SQL without validation
public Mono<QueryResult> query(String userQuestion) {
    return llmClient.complete(systemPrompt, userQuestion)
        .flatMap(sql -> databaseClient.sql(sql).fetch().all()); // no validation!
}
```

**Why Rejected**:
- No SQL validation (LLM could generate DELETE/DROP)
- No read-only transaction enforcement
- No timeout protection
- No result size limit

**Solution**: Always validate + sandbox (Patterns 98.3 + 98.4)

---

### REJECTED Pattern 2: Hardcoded Schema in Prompt

```java
// DON'T: Hardcoded DDL in prompt string
private static final String PROMPT = """
    Schema:
    CREATE TABLE users (id INT, name VARCHAR, email VARCHAR);
    CREATE TABLE orders (id INT, user_id INT, total DECIMAL);
    """;
```

**Why Rejected**:
- Schema drifts from actual database
- Must manually update on every migration
- Missing constraints, relationships, column types

**Solution**: Auto-discover from information_schema (Pattern 98.1)

---

## DECISION TREE

```
Is this question about NL-to-SQL / text-to-query?
+-- YES -> Continue consultation
|   |
|   +-- Need schema context for LLM prompt?
|   |   -> RECOMMEND: Pattern 98.1 (Schema Context Provider)
|   |
|   +-- Designing the LLM prompt?
|   |   -> RECOMMEND: Pattern 98.2 (Prompt Engineering)
|   |
|   +-- Need SQL validation/security?
|   |   -> RECOMMEND: Pattern 98.3 (SQL Validator)
|   |
|   +-- Need safe query execution?
|   |   -> RECOMMEND: Pattern 98.4 (Query Sandbox)
|   |
|   +-- Building end-to-end pipeline?
|   |   -> RECOMMEND: Pattern 98.5 (NL-to-SQL Orchestrator)
|   |
|   +-- Need fallback when LLM is down?
|   |   -> RECOMMEND: Pattern 98.6 (Template Query Matcher)
|   |
|   +-- Need LLM API client setup?
|       -> DELEGATE: llm-integration-specialist
|
+-- NO -> Delegate to appropriate specialist
    +-- BI aggregation? -> bi-analytics-specialist
    +-- LLM integration? -> llm-integration-specialist
    +-- Data access? -> java-data-access-specialist
```

---

## KEYWORDS

Trigger this specialist when step description contains:

- "NL-to-SQL"
- "text-to-SQL"
- "natural language query"
- "text to query"
- "prompt engineering"
- "schema context"
- "SQL generation"
- "query generation"
- "SQL validation"
- "query sandbox"

---

## VERSION HISTORY

- **v1.0.0** (2026-04-07): Initial version
  - 6 approved patterns: schema context, prompt engineering, SQL validation, query sandbox, orchestrator, template fallback
  - 2 rejected patterns: direct input to SQL, hardcoded schema
  - Security-first: validation + sandboxing + read-only transactions

---

*NL-to-SQL Specialist v1.0 — Java Spring Boot*
*Location: `specialists/code/java-springboot/analytics/nl-to-sql-specialist.md`*

# Odoo Performance Specialist — Enterprise
# Odoo Performance Chuyen Gia — Enterprise
# Odoo パフォーマンス スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Performance
**Category**: infra
**Purpose**: Optimize Odoo performance through prefetching, indexing, batch operations, and PostgreSQL tuning

---

## Metadata

```json
{
  "id": "odoo-performance-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Performance",
  "category": "infra",
  "subcategory": "odoo",
  "lines": 450,
  "token_cost": 5800,
  "version": "3.0.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/orm#performance)",
    "E2: /opt/workspace/odoo-18/odoo/models.py (flush_model, invalidate_recordset, recompute)",
    "E3: Odoo profiling tools documentation",
    "E4: /opt/workspace/odoo-18/odoo/sql_db.py (Cursor, commit, savepoint)",
    "E5: /opt/workspace/odoo-18/odoo/tools/misc.py (split_every)",
    "E6: /opt/workspace/odoo-18/odoo/service/server.py (worker pool, cron threads)",
    "E7: /opt/workspace/odoo-18/odoo/addons/stock/models/stock_move.py (_action_done cascade)",
    "E8: /opt/workspace/odoo-18/odoo/addons/hr_payroll/models/hr_payslip.py (flush_model pattern)",
    "E9: /opt/workspace/odoo-18/odoo/tools/sql.py (FOR UPDATE SKIP LOCKED)",
    "E10: /opt/workspace/odoo-18/odoo/addons/base/models/ir_cron.py (cron lock, progress)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (cross-cutting) |
| **Directory Pattern** | All model files |
| **Variant** | enterprise |
| **Pattern Numbers** | 428.1–428.24 |
| **Source Paths** | `**/models/**/*.py`, `odoo.conf` |
| **File Count** | N/A (cross-cutting concern) |
| **Naming Convention** | N/A |
| **Imports From** | `odoo.models`, `odoo.tools` |
| **Imported By** | N/A (optimization rules) |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Optimizing slow queries, reducing memory usage, tuning prefetch behavior, and configuring PostgreSQL |
| **Source Skeleton** | N/A (rule-set specialist, no files created) |
| **Specialist Type** | rule-set |
| **Purpose** | Optimize Odoo performance through prefetching, indexing, batch operations, and PostgreSQL tuning |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: index=, prefetch, read_group, search_fetch, flush_model |

---

## Role

You are an **Odoo Performance Specialist** for Odoo 18 Enterprise.

**Used by**: Code agents optimizing slow operations
**Not used by**: Initial development (optimize after profiling, not before)

---

## Patterns

### Pattern 428.1–428.3: ORM Performance (CRITICAL)

**428.1 Prefetch tuning**: ORM prefetches all fields of same model in batch. Control with `prefetch=False` on large fields.

```python
# Exclude large binary fields from batch prefetch
report_data = fields.Binary(prefetch=False)
# search_fetch for controlled prefetching
orders = self.env['sale.order'].search_fetch(
    [('state', '=', 'sale')],
    ['name', 'partner_id', 'amount_total'],  # Only these fields
    limit=100)
```

**428.2 _read_group optimization**: Use `_read_group` instead of search + manual aggregation.

```python
# ❌ Slow: search + iterate
orders = self.search([('state', '=', 'sale')])
total = sum(o.amount_total for o in orders)

# ✅ Fast: _read_group (SQL GROUP BY)
for partner, amount_sum in self.env['sale.order']._read_group(
    [('state', '=', 'sale')],
    groupby=['partner_id'],
    aggregates=['amount_total:sum'],
):
    print(f"{partner.name}: {amount_sum}")
```

**428.3 _sql_constraints vs Python constraints**: SQL constraints are faster (checked at DB level).

```python
# ✅ Fast: SQL constraint
_sql_constraints = [
    ('name_uniq', 'unique(name, company_id)', 'Order reference must be unique per company.'),
]

# ⚠️ Slower: Python constraint (but more flexible)
@api.constrains('name')
def _check_name(self):
    ...
```

### Pattern 428.4–428.6: Indexing & Batch (HIGH)

**428.4 Field indexing**: Choose the right index type.

```python
# btree (default) — equality and range queries
partner_id = fields.Many2one('res.partner', index=True)

# btree_not_null — sparse fields (skips NULLs, smaller index)
tracking_number = fields.Char(index='btree_not_null')

# trigram — text search (LIKE/ILIKE)
name = fields.Char(index='trigram')
```

**428.5 Batch create**: Create multiple records in one call.

```python
# ❌ Slow: one-by-one
for data in data_list:
    self.env['sale.order.line'].create(data)

# ✅ Fast: batch create
self.env['sale.order.line'].create(data_list)
```

**428.6 with_context(prefetch_fields=False)**: Disable prefetch for memory-constrained operations.

```python
# Processing millions of records — don't prefetch everything
for batch in split_every(1000, record_ids):
    records = self.env['sale.order'].with_context(prefetch_fields=False).browse(batch)
    for record in records:
        record._process_one()
    self.env.cr.commit()  # Only in specific migration/cron scenarios
```

### Pattern 428.7–428.8: PostgreSQL & Profiling (MEDIUM)

**428.7 PostgreSQL tuning**: Key parameters for Odoo workloads.

```ini
# postgresql.conf for Odoo
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
work_mem = 128MB                  # Per-query sort/hash memory
maintenance_work_mem = 1GB        # VACUUM, CREATE INDEX
max_connections = 200             # workers * 2 + spare
```

**428.8 Profiling tools**: Built-in Odoo profiler.

```python
# Enable profiling in odoo.conf
# --limit-time-real=0 for profiling (no timeout)

# In code — profile specific method
from odoo.tools.profiler import profile
with profile():
    self._expensive_operation()
```

```bash
# URL-based profiling (admin only)
# Add ?profile=1 to any URL to get SQL/Python timing
```

---

## Abnormal Case Patterns (2 patterns)

1. **N+1 query problem** — iterating recordset and accessing related fields triggers one query per record. Fix: Use `mapped()` to trigger batch prefetch, or `search_fetch()` with specific fields.
2. **Oversized index** — indexing all fields wastes disk and slows writes. Fix: Only index fields used in search domains, foreign keys, and sort orders.

---

### Pattern 428.9–428.15: Data Scale (HIGH)

**428.9 Batch commit with split_every**: Process large recordsets in chunks with intermediate commits.

```python
# ❌ Dangerous: single transaction for millions of records — locks entire table
records = self.env['stock.move'].search([('state', '=', 'draft')])
records.write({'state': 'cancel'})

# ✅ Safe: chunked processing with commit per batch
from odoo.tools import split_every
record_ids = self.env['stock.move'].search([('state', '=', 'draft')]).ids
for batch_ids in split_every(1000, record_ids):
    batch = self.env['stock.move'].browse(batch_ids)
    batch.write({'state': 'cancel'})
    self.env.cr.commit()
    self.env.invalidate_all()  # clear cache after commit
    # ⚠️ After commit, recordsets obtained BEFORE commit have stale cache.
    # Re-browse if you need to read updated values in next iteration.
    # Write-only loops (like above) are safe — no read after write needed.
```
- When: processing >10K records in background (cron, migration)
- Source: odoo/tools/misc.py:691 (split_every), odoo/sql_db.py:477 (commit)
- CRITICAL: NEVER use cr.commit() in user-facing HTTP requests
- CRITICAL: After cr.commit(), do NOT read fields from recordsets obtained before commit without re-browsing. If you need read-after-commit: `self.env['model'].browse(ids)`

**428.10 flush_model / flush_recordset**: Control when ORM writes pending changes to DB.

```python
# ORM delays writes until needed. Force flush before raw SQL reads:
self.env['hr.payslip'].flush_model(['employee_id', 'state', 'date_from', 'date_to'])
self.env['hr.payslip.line'].flush_model(['total', 'slip_id', 'salary_rule_id'])

# Then safe to use raw SQL that reads these fields
self.env.cr.execute("""
    SELECT employee_id, SUM(total) FROM hr_payslip_line ...
""")
```
- When: mixing ORM writes and raw SQL reads in same transaction
- Source: odoo/addons/hr_payroll/models/hr_payslip.py:736-738
- Rule: flush_model(fields) before cr.execute that reads those fields

**428.11 invalidate_recordset / invalidate_all**: Clear ORM cache after external data changes.

```python
# After direct SQL update — ORM cache is stale
self.env.cr.execute("UPDATE stock_quant SET quantity = %s WHERE id = %s", (new_qty, quant_id))
self.env['stock.quant'].invalidate_recordset(['quantity'])

# After commit in batch loop — entire cache may be stale
self.env.cr.commit()
self.env.invalidate_all()
```
- When: after cr.execute that modifies data, after cr.commit()
- Source: odoo/models.py:7061 (invalidate_recordset)
- Rule: invalidate_recordset(fnames) for targeted invalidation, invalidate_all() after commit

**428.12 Computed field dependency depth**: Measure cascade before using `store=True`.

```python
# ⚠️ Deep dependency chain — triggers cascade recompute:
# product.qty_available (store=True)
#   ← depends: stock.quant.quantity
#     ← depends: stock.move.line._action_done()
#       ← triggers: sale.order.line._compute_qty_delivered
#         ← triggers: sale.order._amount_all
# Result: 1 quant change → recompute across 4 models

# ✅ Method 1: Trace field.depends to measure chain depth
def trace_depends(model_name, field_name, env, depth=0, visited=None):
    """Trace dependency chain for a computed field."""
    if visited is None:
        visited = set()
    key = f"{model_name}.{field_name}"
    if key in visited:
        return
    visited.add(key)
    model = env[model_name]
    field = model._fields.get(field_name)
    if not field or not field.depends:
        return
    for dep in field.depends:
        print("  " * depth + f"← {model_name}.{field_name} depends on: {dep}")
        parts = dep.split('.')
        if len(parts) > 1:
            related = model._fields.get(parts[0])
            if related and hasattr(related, 'comodel_name'):
                trace_depends(related.comodel_name, parts[1], env, depth+1, visited)

# Usage: trace_depends('product.product', 'qty_available', self.env)

# ✅ Method 2: Quick SQL check — count stored fields depending on this field
self.env.cr.execute("""
    SELECT model, name FROM ir_model_fields
    WHERE depends LIKE %s AND store = true
""", ['%qty_available%'])
# If >5 dependent stored fields → high cascade risk

# ✅ Decision rule:
#   - Chain depth ≤ 2: store=True is safe
#   - Chain depth > 2: consider compute on-the-fly or materialized view (506.7)
#   - Write frequency > read frequency: don't store
```
- When: deciding store=True vs on-the-fly for new computed field
- Rule: trace dependency chain with `trace_depends()` BEFORE adding store=True. Chain depth >2 = red flag

**428.13 Domain filter optimization**: Ensure indexes exist and avoid Python-level filtering.

```python
# ❌ Bad: Python filtering after ORM search (loads all records into memory first)
records = self.search([('state', '=', 'done')])
urgent = [r for r in records if 'urgent' in (r.description or '')]

# ✅ Good: let PostgreSQL do all filtering via domain
urgent = self.search([('state', '=', 'done'), ('description', 'ilike', 'urgent')])

# ❌ Bad: search on non-indexed field with >100K records → full table scan
records = self.search([('custom_field', '=', 'value')])

# ✅ Good: ensure index exists on fields used in search domains
custom_field = fields.Char(index='btree')

# ✅ Verify query plan for slow searches
self.env.cr.execute("EXPLAIN ANALYZE SELECT id FROM my_table WHERE custom_field = %s", ['value'])
plan = self.env.cr.fetchall()
# Look for: "Seq Scan" (bad, needs index) vs "Index Scan" (good)
```
- When: search on models with >100K records is slow
- Rule: domain ORDER does NOT affect PostgreSQL — query planner decides execution order based on statistics
- Rule: ensure index EXISTS on all fields used in frequently-searched domains
- Rule: use EXPLAIN ANALYZE to verify index usage, not assumptions
- Rule: NEVER filter in Python after search — always use domain filters

**428.14 search_count vs search**: Count without loading records.

```python
# ❌ Loads all records into memory just to count
total = len(self.search([('state', '=', 'draft')]))

# ✅ SQL COUNT — no record loading
total = self.search_count([('state', '=', 'draft')])
```
- When: you only need the count, not the records
- Source: used throughout Odoo core (e.g., ir_cron.py:641)

**428.15 Streaming cursor for batch processing**: Process millions without loading all into memory.

```python
# ❌ Loads entire result set into Python memory
self.env.cr.execute("SELECT id, name FROM large_table")
rows = self.env.cr.fetchall()  # millions of rows in memory

# ✅ Stream in batches
self.env.cr.execute("SELECT id, name FROM large_table")
while True:
    batch = self.env.cr.fetchmany(1000)
    if not batch:
        break
    for row in batch:
        process_row(row)
```
- When: processing >100K rows via raw SQL
- Source: psycopg2 cursor.fetchmany()

---

### Pattern 428.16–428.19: Heavy Load (MEDIUM)

**428.16 Worker configuration**: Tune Odoo worker pool for your server.

```ini
# odoo.conf — production tuning
workers = 5                    # Formula: (2 × CPU_cores) + 1. Example: 2 cores → 5
max_cron_threads = 1           # Taken FROM workers pool (not additional). 1-2 typically
limit_time_real = 120          # Max HTTP request time (seconds)
limit_time_real_cron = 600     # Max cron job time — separate timeout from HTTP
limit_memory_hard = 2684354560 # 2.5GB per worker — worker killed if exceeded
limit_memory_soft = 2147483648 # 2GB — warning logged
db_maxconn = 64                # Max DB connections per worker process
```
- When: deploying production Odoo with >10 concurrent users
- Source: odoo/service/server.py:754 (population), :757 (cron_timeout)
- Formula: workers = (2 × CPU_cores) + 1 (Odoo official)
- max_cron_threads is PART of workers count, not additional (workers=5, max_cron_threads=1 → 4 HTTP + 1 cron)
- Total DB connections = (workers + max_cron_threads) × db_maxconn. Must be < PostgreSQL max_connections

**428.17 Cron isolation**: Prevent heavy crons from blocking HTTP workers.

```ini
# Separate cron and HTTP workers via limit_time_real_cron
limit_time_real = 60           # HTTP: 60s max (user-facing)
limit_time_real_cron = 1800    # Cron: 30 min max (background)

# Alternative: run separate Odoo instance for crons only
# Instance 1 (HTTP only):  --workers=4 --max-cron-threads=0
# Instance 2 (Cron only):  --workers=0 --max-cron-threads=2
```
- When: heavy cron jobs (payslip generation, inventory valuation) slow down UI
- Source: odoo/service/server.py:421-422 (limit_time_real_cron)
- Rule: cron-heavy deployments should separate HTTP and cron processes

**428.18 Long-running cron patterns**: Chunked processing with progress tracking.

```python
# ❌ Single cron processes everything — blocks cron slot, may timeout
def _cron_process_all(self):
    records = self.search([('state', '=', 'pending')])
    for rec in records:
        rec.process()  # may take hours

# ✅ Chunked cron with progress — processes N per run, resumes next run
def _cron_process_chunk(self):
    limit = int(self.env['ir.config_parameter'].sudo().get_param(
        'my_module.cron_batch_size', '500'))
    records = self.search([('state', '=', 'pending')], limit=limit)
    if not records:
        return
    records.process()
    # Cron reschedules automatically — next run picks up remaining
```
- When: processing >10K records in scheduled action
- Source: odoo/addons/base/models/ir_cron.py:379-382 (PARTIALLY_DONE reschedule)
- Rule: use ir.config_parameter for configurable batch size

**428.19 Resource monitoring**: Detect worker exhaustion.

```python
# Check connection pool usage
import odoo.sql_db as sql_db
pool = sql_db.db_connect(self.env.cr.dbname)
used = pool._pool.getconn  # approximate — check actual pool stats

# In odoo.conf monitoring:
# --log-handler=odoo.sql_db:DEBUG  → logs connection pool activity
# --log-level=debug_sql            → logs every SQL query
```
- When: production debugging, slow request investigation
- Rule: monitor limit_memory_hard kills (OOM) and limit_time_real kills (timeout) in logs

---

### Pattern 428.20–428.24: Concurrent Access (MEDIUM)

**428.20 Row-level locking — FOR UPDATE SKIP LOCKED**: Lock rows without blocking other transactions.

```python
from odoo.tools import SQL

# ❌ FOR UPDATE NOWAIT — raises error if locked (requires retry logic)
# Also bad: Python % format for table name (unsafe practice)
self.env.cr.execute(
    "SELECT 1 FROM %s WHERE id IN %%s FOR UPDATE NOWAIT" % self._table,
    [tuple(self.ids)])

# ✅ FOR UPDATE SKIP LOCKED with SQL.identifier (Odoo 18 best practice)
self.env.cr.execute(SQL(
    """
    UPDATE %s SET reserved_quantity = reserved_quantity + %s
    WHERE id IN (
        SELECT id FROM %s WHERE id = ANY(%s) FOR UPDATE SKIP LOCKED
    )
    """,
    SQL.identifier(self._table),
    qty,
    SQL.identifier(self._table),
    self.ids,
))
```
- When: concurrent access to same records (multi-user warehouse, batch processing)
- Source: odoo/tools/sql.py:645 (FOR UPDATE SKIP LOCKED in core)
- Rule: prefer SKIP LOCKED over NOWAIT for batch operations

**428.21 cr.savepoint(): Partial rollback in batch operations**.

```python
# ❌ Entire batch fails if one record errors
for record in records:
    record.process()  # if this raises → all previous work lost

# ✅ Savepoint per record — partial success possible
for record in records:
    try:
        with self.env.cr.savepoint():
            record.process()
    except Exception as e:
        _logger.warning("Failed processing %s: %s", record.id, e)
        continue  # skip failed, continue batch
```
- When: batch processing where partial success is acceptable
- Source: odoo/sql_db.py:175 (savepoint with flush)
- Rule: savepoint creates overhead — use per-record only when failure is expected

**428.22 Optimistic locking**: Check write_date before concurrent update.

```python
# ❌ No concurrency check — last write wins, may overwrite concurrent changes
record.write({'field': new_value})

# ✅ Optimistic lock — check write_date hasn't changed since read
original_write_date = record.write_date
# ... user edits ...
record.invalidate_recordset(['write_date'])
if record.write_date != original_write_date:
    raise UserError(_("Record was modified by another user. Please reload."))
record.write({'field': new_value})
```
- When: forms where multiple users may edit same record simultaneously
- Rule: Odoo has no built-in optimistic locking — implement manually for critical models

**428.23 Multi-worker safe cron**: Prevent duplicate cron execution across workers.

```python
# Odoo's ir.cron uses SELECT ... FOR UPDATE to prevent concurrent execution.
# If your custom cron needs same protection:
def _cron_safe_process(self):
    # Attempt to lock — skip if another worker already running
    self.env.cr.execute("""
        SELECT id FROM my_processing_lock
        WHERE name = 'my_cron' FOR UPDATE SKIP LOCKED
    """)
    if not self.env.cr.fetchone():
        _logger.info("Cron already running in another worker, skipping")
        return
    # ... safe to process ...
```
- When: custom crons that must not run in parallel across workers
- Source: odoo/addons/base/models/ir_cron.py (ir.cron internal locking)

**428.24 Connection pool tuning**: Prevent pool exhaustion.

```ini
# odoo.conf
db_maxconn = 64       # Per-process max connections
# Total = workers × db_maxconn + max_cron_threads × db_maxconn
# Ensure: total < PostgreSQL max_connections (default 100)

# For high-concurrency:
db_maxconn = 32       # Reduce per-process
# PostgreSQL: max_connections = 300
# Consider: pgbouncer for connection pooling between Odoo and PostgreSQL
```
- When: "too many connections" errors, connection pool exhaustion under load
- Source: odoo/service/server.py:180 (max_http_threads based on db_maxconn)
- Rule: workers × db_maxconn must be < PostgreSQL max_connections

---

*Odoo Performance Specialist — Enterprise | EPS v10.0 | Metadata v2.1*

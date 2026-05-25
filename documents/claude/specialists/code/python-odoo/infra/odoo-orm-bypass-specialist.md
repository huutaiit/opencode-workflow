# Odoo ORM Bypass Specialist — Enterprise
# Odoo ORM Bypass Chuyen Gia — Enterprise
# Odoo ORM バイパス スペシャリスト — Enterprise

**Version**: 1.0.0
**Technology**: Odoo 18 Enterprise
**Aspect**: ORM Bypass
**Category**: infra
**Purpose**: Teach when and how to bypass Odoo ORM for production-scale operations

---

## Metadata

```json
{
  "id": "odoo-orm-bypass-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "ORM Bypass",
  "category": "infra",
  "subcategory": "odoo",
  "lines": 350,
  "token_cost": 4500,
  "version": "1.0.0",
  "evidence": [
    "E1: Production feedback — DD fails at scale for mature Odoo projects",
    "E2: /opt/workspace/odoo-18/odoo/tools/sql.py (FOR UPDATE SKIP LOCKED)",
    "E3: /opt/workspace/odoo-18/odoo/addons/stock/models/stock_move.py (_action_done cascade)",
    "E4: /opt/workspace/odoo-18/odoo/addons/hr_payroll/models/hr_payslip.py (flush_model)",
    "E5: /opt/workspace/odoo-18/odoo/sql_db.py (Cursor, savepoint)",
    "E6: OCA queue_job module documentation"
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
| **Pattern Numbers** | 506.1–506.10 |
| **Source Paths** | `**/models/**/*.py`, `**/wizards/**/*.py` |
| **File Count** | N/A (rule-set specialist, no files created) |
| **Naming Convention** | N/A |
| **Imports From** | `odoo.models`, `odoo.sql_db`, `odoo.tools.sql` |
| **Imported By** | N/A (decision rules) |
| **Cannot Import** | N/A |
| **Dependencies** | Requires 428.8 (profiling) before choosing bypass |
| **When To Use** | ONLY when SCALE_CLASSIFICATION=HEAVY. Operations hitting >100 ORM queries, SLA <5s, >100K records |
| **Source Skeleton** | N/A (rule-set specialist, no files created) |
| **Specialist Type** | rule-set |
| **Purpose** | Decide when to bypass ORM and how to implement each bypass pattern safely |
| **Activation Trigger** | `SCALE_CLASSIFICATION=HEAVY`; keywords: cr.execute, FOR UPDATE, queue_job, MATERIALIZED VIEW |

---

## Role

You are an **Odoo ORM Bypass Specialist** for Odoo 18 Enterprise.

**Used by**: DD generation agents when SCALE_CLASSIFICATION=HEAVY
**Not used by**: LIGHT/MEDIUM projects (ORM optimization via 428.x is sufficient)
**Prerequisite**: Profile with 428.8 BEFORE choosing any bypass pattern

---

## Patterns

### Pattern 506.1: Direct SQL — Stored Procedure

Replace ORM cascade with single PostgreSQL function for critical paths.

```python
# ❌ ORM cascade: 1 delivery validation → ~1100 queries (30 min under load)
picking.button_validate()

# ✅ Stored procedure: same logic, ~20 queries (5 seconds)
# Step 1: Create PostgreSQL function
# CREATE FUNCTION process_delivery(p_picking_id INT) RETURNS VOID AS $$
# DECLARE
#   v_move RECORD;
# BEGIN
#   -- 1. stock.move.line: set qty_done = reserved_qty
#   UPDATE stock_move_line SET qty_done = reserved_uom_qty
#     WHERE picking_id = p_picking_id AND state != 'done';
#
#   -- 2. stock.move: set state = 'done', quantity = demand
#   UPDATE stock_move SET state = 'done', quantity = product_uom_qty
#     WHERE picking_id = p_picking_id AND state != 'done';
#
#   -- 3. stock.quant: decrease source, increase dest (handle lot/serial/package)
#   FOR v_move IN SELECT * FROM stock_move WHERE picking_id = p_picking_id LOOP
#     UPDATE stock_quant
#       SET reserved_quantity = reserved_quantity - v_move.product_uom_qty,
#           quantity = quantity - v_move.product_uom_qty
#       WHERE product_id = v_move.product_id AND location_id = v_move.location_id;
#     INSERT INTO stock_quant (product_id, location_id, quantity)
#       VALUES (v_move.product_id, v_move.location_dest_id, v_move.product_uom_qty)
#       ON CONFLICT (product_id, location_id, lot_id, package_id, owner_id)
#       DO UPDATE SET quantity = stock_quant.quantity + EXCLUDED.quantity;
#   END LOOP;
#
#   -- 4. stock.valuation.layer: create entries (if automated valuation)
#   -- 5. account.move + account.move.line: journal entries (NEVER skip)
#   -- 6. stock.picking: set state = 'done', date_done = NOW()
#   UPDATE stock_picking SET state = 'done', date_done = NOW()
#     WHERE id = p_picking_id;
# END $$ LANGUAGE plpgsql;

# Step 2: Call from Odoo
self.env.cr.execute("SELECT process_delivery(%s)", [picking.id])
self.env['stock.picking'].invalidate_recordset()
self.env['stock.move'].invalidate_recordset()
self.env['stock.quant'].invalidate_recordset()
```
- When: single operation triggers >100 ORM queries (measure with 428.8 profiler)
- Tradeoff: lose mail.tracking, computed field recompute, activity log — must handle manually
- CRITICAL: always call invalidate_recordset() after direct SQL
- Bypass checklist (MUST handle all, in order):
  1. stock.move.line — update qty_done
  2. stock.move — update state, quantity
  3. stock.quant — decrease source, increase dest (handle lot/serial/package)
  4. stock.valuation.layer — create entries (if automated valuation enabled)
  5. account.move + account.move.line — journal entries (NEVER skip for financial ops)
  6. stock.picking — update state, date_done
  Missing any step = data inconsistency between inventory and accounting
- Source: stock_move._action_done() cascade analysis

### Pattern 506.2: Direct SQL — Inline cr.execute for Batch

Bypass ORM write() for mass updates where ORM overhead is unacceptable.

```python
# ❌ ORM write in loop: N queries + mail.tracking + recompute per record
for quant in quants:
    quant.write({'quantity': quant.quantity + delta})

# ✅ Odoo 18: use SQL() for safe query building
from odoo.tools import SQL

self.env['stock.quant'].flush_model(['quantity'])  # flush pending ORM writes first
self.env.cr.execute(SQL(
    """
    UPDATE %s
       SET quantity = quantity + %s,
           write_date = NOW(),
           write_uid = %s
     WHERE id = ANY(%s)
    """,
    SQL.identifier('stock_quant'),
    delta,
    self.env.uid,
    list(quant_ids),
))
self.env['stock.quant'].invalidate_recordset(['quantity', 'write_date', 'write_uid'])
# Note: SQL.identifier() for table/column names, %s for values
```
- When: batch update >10K records where write() per record is too slow
- Tradeoff: skip @api.constrains, computed field triggers, mail.tracking
- CRITICAL: update write_date and write_uid manually (audit trail)
- CRITICAL: call flush_model BEFORE and invalidate_recordset AFTER
- Source: odoo/tools/sql.py:645

### Pattern 506.3: queue_job (OCA) — Async Processing

Defer heavy operations to background workers via OCA queue_job module.

```python
# Install: pip install odoo-addon-queue-job
# Config: server_wide_modules = web,queue_job
# odoo.conf: [queue_job] channels = root:2

# ❌ Synchronous: user waits for bulk invoice generation
def action_generate_payslips(self):
    for employee in self.employee_ids:
        self._generate_payslip(employee)  # blocks UI for minutes

# ✅ Async: return immediately, process in background
def action_generate_payslips(self):
    for employee in self.employee_ids:
        self.with_delay(
            priority=10,
            max_retries=3,
            description=f"Generate payslip for {employee.name}"
        )._generate_payslip(employee)
    return {'type': 'ir.actions.client', 'tag': 'display_notification',
            'params': {'title': 'Processing', 'message': 'Payslips queued for generation'}}
```
- When: operation can be deferred (user doesn't need immediate result)
- Tradeoff: eventual consistency, need queue_job module installed, debug complexity
- UI: provide job status tracking via ir.actions.act_window on queue.job model

### Pattern 506.4: Chunked Cron Processing (without queue_job)

Process millions in background via ir.cron with offset tracking.

```python
BATCH_SIZE_PARAM = 'my_module.cron_batch_size'
PROGRESS_PARAM = 'my_module.cron_progress'

def _cron_process_pending(self):
    """Process pending records in chunks with progress tracking."""
    ICP = self.env['ir.config_parameter'].sudo()
    batch_size = int(ICP.get_param(BATCH_SIZE_PARAM, '500'))

    total_pending = self.search_count([('state', '=', 'pending')])
    if not total_pending:
        ICP.set_param(PROGRESS_PARAM, 'complete:0 remaining')
        return

    records = self.search([('state', '=', 'pending')], limit=batch_size)
    processed = 0
    failed = 0

    for batch in split_every(100, records.ids):
        batch_records = self.browse(batch)
        try:
            with self.env.cr.savepoint():
                batch_records._process_batch()
                processed += len(batch)
        except Exception as e:
            _logger.error("Batch failed: %s", e)
            failed += len(batch)
            continue

    remaining = total_pending - processed
    ICP.set_param(PROGRESS_PARAM,
        f'processed:{processed} failed:{failed} remaining:{remaining}')
    _logger.info("Cron progress: %d processed, %d failed, %d remaining",
        processed, failed, remaining)
    # ir.cron handles PARTIALLY_DONE → reschedule_asap
```
- When: process millions of records, no queue_job available
- Tradeoff: processing speed limited by cron interval
- CRITICAL: use savepoint per sub-batch for partial failure resilience
- Progress visible via: Settings → Technical → Parameters → System Parameters (search: my_module.cron_progress)
- Source: ir_cron.py:379-382 (PARTIALLY_DONE → reschedule_asap)

### Pattern 506.5: Custom Batch Endpoint

Bypass standard Odoo workflow (button_validate) with optimized API.

```python
from odoo import http

class StockBatchController(http.Controller):

    @http.route('/api/stock/batch_validate', type='json', auth='user')
    def batch_validate(self, picking_ids):
        """Batch validate deliveries — bypasses ORM cascade."""
        # Access control: require stock manager group
        if not request.env.user.has_group('stock.group_stock_manager'):
            raise AccessError(_("Only Stock Managers can use batch validation"))

        pickings = request.env['stock.picking'].browse(picking_ids)
        pickings._check_company()  # mandatory: multi-company check

        # Batch process instead of per-picking cascade
        moves = pickings.mapped('move_ids')
        move_lines = moves.mapped('move_line_ids')

        # Single SQL for quant updates
        request.env.cr.execute("""
            UPDATE stock_quant SET quantity = quantity - reserved_quantity,
                   reserved_quantity = 0
            WHERE id = ANY(%s)
        """, [list(move_lines.mapped('quant_id').ids)])

        # Batch state update
        pickings.write({'state': 'done'})
        moves.write({'state': 'done'})

        request.env['stock.quant'].invalidate_recordset()
        return {'success': True, 'count': len(picking_ids)}
```
- When: standard Odoo workflow too slow for operational SLA (e.g., warehouse needs <5 min)
- Tradeoff: must maintain data integrity manually (quant balance, accounting entries)
- CRITICAL: always call _check_company() when bypassing standard security
- CRITICAL: create account.move entries if financial tracking required

### Pattern 506.6: External Service Split

Offload computation to external Python/Go microservice.

```python
# Odoo side: trigger + receive callback
import requests

def action_heavy_compute(self):
    """Trigger external service for heavy computation."""
    payload = {
        'picking_ids': self.ids,
        'callback_url': f'{base_url}/api/stock/callback',
    }
    try:
        resp = requests.post(
            'http://compute-service:8080/process',
            json=payload, timeout=5)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise UserError(_("Compute service unavailable: %s") % e)

    self.write({'state': 'processing'})
    return {'type': 'ir.actions.client', 'tag': 'display_notification',
            'params': {'message': 'Processing started. You will be notified.'}}

# Callback controller
@http.route('/api/stock/callback', type='json', auth='api_key')
def receive_callback(self, picking_ids, result):
    pickings = request.env['stock.picking'].sudo().browse(picking_ids)
    pickings.write({'state': 'done', 'result_data': result})
```
- When: operation needs >1 minute, hard real-time requirement, Odoo worker can't handle
- Tradeoff: deployment complexity, API contract, health check + retry needed
- Architecture: Odoo (UI + trigger) → REST API → external service → callback

### Pattern 506.7: Materialized Views for Reporting

Replace expensive computed fields with PostgreSQL materialized views.

```python
# Step 1: Create materialized view via migration
# CREATE MATERIALIZED VIEW stock_valuation_summary AS
#   SELECT product_id, SUM(value) as total_value, ...
#   FROM stock_valuation_layer GROUP BY product_id;
# CREATE UNIQUE INDEX ON stock_valuation_summary (product_id);

# Step 2: Odoo model on materialized view
class StockValuationSummary(models.Model):
    _name = 'stock.valuation.summary'
    _auto = False  # don't create table — use view
    _table = 'stock_valuation_summary'

    product_id = fields.Many2one('product.product', readonly=True)
    total_value = fields.Float(readonly=True)

# Step 3: Refresh via cron
def _cron_refresh_valuation_summary(self):
    self.env.cr.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY stock_valuation_summary")
```
- When: dashboard/report uses computed fields with deep dependency chains
- Tradeoff: data staleness (refresh interval), extra disk usage
- Rule: CONCURRENTLY allows reads during refresh (requires unique index)

### Pattern 506.8: PostgreSQL Partitioning

Partition large tables (>10M records) for faster queries.

```sql
-- Step 1: Create partitioned table (in migration script)
CREATE TABLE stock_move_partitioned (
    LIKE stock_move INCLUDING ALL
) PARTITION BY RANGE (create_date);

CREATE TABLE stock_move_y2025 PARTITION OF stock_move_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE stock_move_y2026 PARTITION OF stock_move_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Step 2: Migrate data (in maintenance window)
-- INSERT INTO stock_move_partitioned SELECT * FROM stock_move;
-- ALTER TABLE stock_move RENAME TO stock_move_old;
-- ALTER TABLE stock_move_partitioned RENAME TO stock_move;
```
- When: table >10M records, queries slow despite proper indexing
- Tradeoff: migration complexity, partition management (create new partitions yearly)
- Note: Odoo ORM is transparent to partitioning — just works with partitioned tables
- Source: PostgreSQL 14+ native declarative partitioning

---

### Pattern 506.9: Decision Matrix — When to Use Which

```
Profile first (428.8) → Identify bottleneck → Choose pattern:

                    ┌─ >100 ORM queries per operation?
                    │   YES → 506.1 (Stored Procedure) or 506.5 (Batch Endpoint)
                    │   NO ↓
                    │
                    ├─ Batch update >10K records?
                    │   YES → 506.2 (Inline cr.execute)
                    │   NO ↓
                    │
                    ├─ Can defer processing?
                    │   YES → 506.3 (queue_job) or 506.4 (Chunked Cron)
                    │   NO ↓
                    │
                    ├─ Need real-time, Odoo can't handle?
                    │   YES → 506.6 (External Service)
                    │   NO ↓
                    │
                    ├─ Report/dashboard slow?
                    │   YES → 506.7 (Materialized View)
                    │   NO ↓
                    │
                    └─ Table >10M records, indexed queries still slow?
                        YES → 506.8 (Partitioning)
                        NO → Use 428.x ORM optimization (not bypass)
```

**Rule**: NEVER bypass ORM preemptively. Always profile first (428.8).
**Rule**: Choose the LEAST invasive pattern that meets the SLA.
**Rule**: Always maintain audit trail when bypassing ORM.

### Pattern 506.10: Anti-Patterns — NEVER Rules

1. **NEVER** bypass ORM without calling `invalidate_recordset()` or `invalidate_all()` after direct SQL. Stale cache causes data corruption.
2. **NEVER** skip `_check_company()` in multi-company environment when bypassing standard flows. Security violation.
3. **NEVER** bypass `account.move` creation for financial operations. Legal/audit requirement — always create journal entries.
4. **NEVER** use `cr.commit()` in user-facing HTTP requests. If the request fails after commit, data is inconsistent.
5. **NEVER** use direct SQL in test methods. Breaks test isolation (tests run in rolled-back transactions).
6. **NEVER** bypass ORM for models with `_parent_store = True` (hierarchical). Parent left/right values must be maintained by ORM.
7. **NEVER** assume bypassed operations are faster without profiling. Measure with 428.8 before and after.

---

*Odoo ORM Bypass Specialist — Enterprise | EPS v10.0 | Metadata v2.1*

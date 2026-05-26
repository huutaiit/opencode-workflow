# Odoo Account Move Specialist — Enterprise
# Odoo Account Move Chuyen Gia — Enterprise
# Odoo 仕訳帳 スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Account Move (Journal Entries & Invoices)
**Category**: domain-accounting
**Purpose**: Manage journal entries, invoices, and credit notes using account.move and account.move.line models

---

## Metadata

```json
{
  "id": "odoo-account-move-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Account Move",
  "category": "domain-accounting",
  "subcategory": "odoo",
  "lines": 280,
  "token_cost": 3500,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/addons/account)",
    "E2: /opt/workspace/odoo-18/odoo/addons/account/models/account_move.py (~6254 lines)",
    "E3: /opt/workspace/odoo-18/odoo/addons/account/models/account_move_line.py"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `account/models/account_move*.py` |
| **Variant** | enterprise |
| **Pattern Numbers** | 429.1–429.18 |
| **Source Paths** | `**/account/models/account_move*.py` |
| **File Count** | 2–3 (account_move.py, account_move_line.py) |
| **Naming Convention** | `account_move.py` |
| **Imports From** | `odoo.models`, `odoo.fields`, `odoo.api`, `odoo.tools` |
| **Imported By** | sale, purchase, stock, payment modules |
| **Cannot Import** | N/A |
| **Dependencies** | `account` module |
| **When To Use** | Creating/managing invoices, bills, credit notes, journal entries, and their line items |
| **Source Skeleton** | N/A (extends existing account module) |
| **Specialist Type** | code |
| **Purpose** | Manage journal entries, invoices, and credit notes using account.move and account.move.line models |
| **Activation Trigger** | files: `**/models/account_move*.py`; keywords: account.move, move_type, journal_id, invoice |

---

## Role

You are an **Odoo Account Move Specialist** for Odoo 18 Enterprise. Your expertise covers the `account.move` model (journal entries, invoices, bills, credit/debit notes) and `account.move.line` (journal items). You understand the 7 move types, state machine, sequence numbering, tax computation, and payment reconciliation patterns.

**Used by**: Code agents working with invoicing, accounting entries, and payment flows
**Not used by**: Tax configuration (see odoo-account-tax), reporting (see odoo-account-reports)

---

## Patterns

### Pattern 429.1–429.4: Model Structure (CRITICAL)

**429.1 account.move model declaration**: 5 mixins, company-auto-check, sequence-based naming.

```python
class AccountMove(models.Model):
    _name = "account.move"
    _inherit = ['portal.mixin', 'mail.thread.main.attachment', 'mail.activity.mixin', 'sequence.mixin', 'product.catalog.mixin']
    _description = "Journal Entry"
    _order = 'date desc, name desc, id desc'
    _check_company_auto = True
    _sequence_index = "journal_id"
    _rec_names_search = ['name', 'partner_id.name', 'ref']
```

**429.2 move_type — 7 types of accounting documents**:

```python
move_type = fields.Selection([
    ('entry', 'Journal Entry'),
    ('out_invoice', 'Customer Invoice'),
    ('out_refund', 'Customer Credit Note'),
    ('in_invoice', 'Vendor Bill'),
    ('in_refund', 'Vendor Credit Note'),
    ('out_receipt', 'Sales Receipt'),
    ('in_receipt', 'Purchase Receipt'),
], string='Type', required=True, readonly=True)
```

**429.3 State machine**: draft → posted → cancel (with sequence assignment on post).

```python
state = fields.Selection([
    ('draft', 'Draft'),
    ('posted', 'Posted'),
    ('cancel', 'Cancelled'),
], default='draft', tracking=True)

def action_post(self):
    """Validate and post the journal entry, assign sequence number."""
    ...

def button_draft(self):
    """Reset to draft (requires unreconcile first)."""
    ...

def button_cancel(self):
    """Cancel the entry."""
    ...
```

**429.4 Sequence numbering**: Name computed from journal sequence on first post.

```python
name = fields.Char(
    string='Number',
    compute='_compute_name', inverse='_inverse_name',
    readonly=False, store=True, copy=False,
    tracking=True, index='trigram')
# Name = '/' until posted, then e.g. 'INV/2026/00001'
```

### Pattern 429.5–429.9: Invoice Lines (CRITICAL)

**429.5 account.move.line — journal items**: Debit/credit lines with account, tax, analytic.

```python
class AccountMoveLine(models.Model):
    _name = "account.move.line"
    _description = "Journal Item"

    move_id = fields.Many2one('account.move', ondelete='cascade', index=True)
    account_id = fields.Many2one('account.account', required=True)
    debit = fields.Monetary(default=0.0, currency_field='company_currency_id')
    credit = fields.Monetary(default=0.0, currency_field='company_currency_id')
    balance = fields.Monetary(compute='_compute_balance', store=True)
    amount_currency = fields.Monetary(currency_field='currency_id')
    tax_ids = fields.Many2many('account.tax')
    tax_line_id = fields.Many2one('account.tax')
```

**429.6 Balanced entry constraint**: Total debits must equal total credits.

```python
_sql_constraints = [
    ('check_credit_debit', 'CHECK(credit >= 0 AND debit >= 0)', 'Wrong credit/debit values.'),
]
# Python constraint ensures sum(debit) == sum(credit) per move
```

**429.7 Tax computation flow**: `_compute_tax_totals()` for invoice summary.

**429.8 Currency handling**: `amount_currency` for multi-currency, `balance` in company currency.

**429.9 Analytic distribution**: `analytic_distribution` field (JSON) for cost allocation.

### Pattern 429.10–429.14: Invoice Operations (HIGH)

**429.10 Create invoice from sale order**: `_prepare_invoice()` + `_create_invoices()`.

```python
# sale/models/sale_order.py
def _create_invoices(self, grouped=False, final=False):
    moves = self.env['account.move']
    for order in self:
        invoice_vals = order._prepare_invoice()
        invoice_vals['invoice_line_ids'] = [
            Command.create(line._prepare_invoice_line())
            for line in order.order_line if line._is_invoiceable()
        ]
        moves |= self.env['account.move'].create(invoice_vals)
    return moves
```

**429.11 Payment reconciliation**: Link payment to invoice.

```python
# Reconcile payment with invoice
(payment.line_ids + invoice.line_ids)\
    .filtered(lambda l: l.account_id == receivable_account)\
    .reconcile()
```

**429.12 Credit note (reversal)**: Create reversal entry from existing invoice.

```python
# account/wizard/account_move_reversal.py
def reverse_moves(self, is_modify=False):
    moves = self.move_ids
    default_values = {'ref': _('Reversal of: %s') % move.name}
    reversed_moves = moves._reverse_moves(default_values)
    return reversed_moves
```

**429.13 Payment terms**: Compute due dates and installments.

**429.14 Fiscal position**: Auto-map taxes based on customer location.

### Pattern 429.15–429.18: Enterprise Features (MEDIUM)

**429.15 Bank reconciliation widget**: `bank.rec.widget` for matching bank statements.
**429.16 Deferred revenue/expense**: Spreading entries across periods.
**429.17 Lock dates**: Prevent modifications before fiscal lock date.
**429.18 Audit trail**: `account.move.line` is append-only (never deleted once posted).

---

## Abnormal Case Patterns (3 patterns)

1. **Unbalanced entry** — debits ≠ credits. Fix: Always include balancing line (auto-computed for invoices).
2. **Editing posted entry** — raises UserError. Fix: Reset to draft first, or create reversal + new entry.
3. **Sequence gap** — cancelling a posted entry leaves a gap in numbering. Fix: Use credit note instead of cancel (many countries require sequential numbering).

---

*Odoo Account Move Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

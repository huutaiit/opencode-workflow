# Odoo Mail & Chatter Specialist — Enterprise
# Odoo Mail & Chatter Chuyen Gia — Enterprise
# Odoo メール＆チャッター スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Mail & Chatter
**Category**: business
**Purpose**: Integrate mail.thread and mail.activity.mixin for message tracking, followers, and activity management

---

## Metadata

```json
{
  "id": "odoo-mail-chatter-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Mail & Chatter",
  "category": "business",
  "subcategory": "odoo",
  "lines": 220,
  "token_cost": 2700,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/mixins#mail-thread)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/models/sale_order.py (mail.thread usage)",
    "E3: /opt/workspace/odoo-18/odoo/addons/mail/models/ (mail framework)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Business |
| **Directory Pattern** | `{module}/models/{model}.py` (mixin integration) |
| **Variant** | enterprise |
| **Pattern Numbers** | 423.1–423.8 |
| **Source Paths** | `**/models/**/*.py` (files with `mail.thread`) |
| **File Count** | N/A (mixin applied to existing models) |
| **Naming Convention** | N/A |
| **Imports From** | `odoo.models` (mail.thread is an AbstractModel) |
| **Imported By** | Chatter widget in form views |
| **Cannot Import** | N/A |
| **Dependencies** | `mail` module (standard dependency) |
| **When To Use** | Adding message history, change tracking, followers, activities, and email notifications to any model |
| **Source Skeleton** | N/A (mixin applied to existing model files) |
| **Specialist Type** | code |
| **Purpose** | Integrate mail.thread and mail.activity.mixin for message tracking, followers, and activity management |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: mail.thread, mail.activity.mixin, tracking=, message_post, chatter |

---

## Role

You are an **Odoo Mail & Chatter Specialist** for Odoo 18 Enterprise.

**Used by**: Code agents adding messaging/tracking capabilities to models
**Not used by**: Email campaigns (see domain specialists), portal views (see odoo-views-xml)

---

## Patterns

### Pattern 423.1–423.3: mail.thread Mixin (CRITICAL)

**423.1 mail.thread integration**: Add chatter to any model.

```python
class SaleOrder(models.Model):
    _name = 'sale.order'
    _inherit = ['portal.mixin', 'mail.thread', 'mail.activity.mixin']

    # Fields with tracking
    state = fields.Selection([...], tracking=1)
    partner_id = fields.Many2one('res.partner', tracking=2)
    amount_total = fields.Monetary(tracking=4)
```

```xml
<!-- In form view — just add <chatter/> after </sheet> -->
<sheet>...</sheet>
<chatter/>
```

**423.2 tracking attribute**: Log field changes in chatter. `True` = track all, integer = display priority (lower = higher).

```python
state = fields.Selection([...], tracking=1)       # Priority 1 (shown first)
partner_id = fields.Many2one('res.partner', tracking=2)  # Priority 2
amount_total = fields.Monetary(tracking=4)         # Priority 4
locked = fields.Boolean(tracking=True)             # Tracked, no priority
```

**423.3 mail.activity.mixin**: Add scheduled activities (to-do, calls, meetings).

```python
class SaleOrder(models.Model):
    _inherit = ['mail.thread', 'mail.activity.mixin']
    # Adds: activity_ids, activity_state, activity_user_id, activity_date_deadline
```

### Pattern 423.4–423.6: Message Posting (HIGH)

**423.4 message_post()**: Post a message to the chatter.

```python
self.message_post(
    body=_("Order confirmed by %s", self.env.user.name),
    message_type='notification',
    subtype_xmlid='sale.mt_order_confirmed')
```

**423.5 Followers/subscription**: Auto-subscribe partners to receive notifications.

```python
# Subscribe partner on partner change
self.message_subscribe(partner_ids=[partner_id])
# Unsubscribe
self.message_unsubscribe(partner_ids=[old_partner_id])
```

**423.6 Email gateway (message_new)**: Process incoming emails to create records.

```python
@api.model
def message_new(self, msg_dict, custom_values=None):
    """Create new record from incoming email."""
    defaults = {'name': msg_dict.get('subject', 'New from email')}
    defaults.update(custom_values or {})
    return super().message_new(msg_dict, custom_values=defaults)
```

### Pattern 423.7–423.8: Subtypes & Templates (MEDIUM)

**423.7 Mail subtypes**: Categorize messages for notification filtering.

```xml
<record id="mt_order_confirmed" model="mail.message.subtype">
    <field name="name">Sales Order Confirmed</field>
    <field name="res_model">sale.order</field>
    <field name="default" eval="True"/>
    <field name="description">Order has been confirmed</field>
</record>
```

**423.8 WhatsApp/VoIP integration hooks**: Enterprise modules extend mail.thread with WhatsApp and VoIP capabilities via additional mixins.

---

## Abnormal Case Patterns (2 patterns)

1. **tracking on non-stored field** — tracking only works on stored fields. Fix: Set `store=True` or remove `tracking`.
2. **Excessive notifications** — every write triggers notifications to followers. Fix: Use `message_subscribe()` carefully and set subtype `default=False` for low-priority subtypes.

---

*Odoo Mail & Chatter Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

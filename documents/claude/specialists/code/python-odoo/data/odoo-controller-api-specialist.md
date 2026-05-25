# Odoo Controller & API Specialist — Enterprise
# Odoo Controller & API Chuyen Gia — Enterprise
# Odoo コントローラ＆API スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Controllers & API
**Category**: data
**Purpose**: Create HTTP controllers, JSON-RPC endpoints, and portal routes with correct auth modes

---

## Metadata

```json
{
  "id": "odoo-controller-api-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Controllers & API",
  "category": "data",
  "subcategory": "odoo",
  "lines": 250,
  "token_cost": 3100,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/http)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/controllers/portal.py",
    "E3: /opt/workspace/odoo-18/odoo/http.py (route decorator)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Controller |
| **Directory Pattern** | `{module}/controllers/{name}.py` |
| **Variant** | enterprise |
| **Pattern Numbers** | 418.1–418.10 |
| **Source Paths** | `**/controllers/**/*.py` |
| **File Count** | 1–5 controller files per module |
| **Naming Convention** | `portal.py`, `main.py`, `{feature}.py` |
| **Imports From** | `odoo.http`, `odoo.http.request`, `odoo.addons.portal.controllers.portal` |
| **Imported By** | WSGI router (URL matching) |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | HTTP endpoints for portal pages, JSON-RPC APIs, file downloads, and webhook receivers |
| **Source Skeleton** | `{module}/controllers/__init__.py`, `{module}/controllers/portal.py` |
| **Specialist Type** | code |
| **Purpose** | Create HTTP controllers, JSON-RPC endpoints, and portal routes with correct auth modes |
| **Activation Trigger** | files: `**/controllers/**/*.py`; keywords: @http.route, Controller, request.env |

---

## Role

You are an **Odoo Controller & API Specialist** for Odoo 18 Enterprise. Your responsibility is to create HTTP controllers with correct `@http.route` decorators, auth modes, portal controllers extending the portal base, JSON-RPC endpoints, and external API integrations.

**Used by**: Code agents creating web endpoints and portal pages
**Not used by**: Model logic (see odoo-crud-recordset), view definitions (see odoo-views-xml)

---

## Patterns

### Pattern 418.1–418.3: Route Basics (CRITICAL)

**418.1 @http.route — HTTP endpoint**: Define URL pattern with type, auth mode, and methods.

```python
from odoo import http
from odoo.http import request

class SalePortal(http.Controller):
    @http.route(['/my/orders', '/my/orders/page/<int:page>'], type='http', auth="user", website=True)
    def portal_my_orders(self, page=1, **kw):
        values = self._prepare_order_values(page)
        return request.render("sale.portal_my_orders", values)
```

**418.2 Auth modes**: `auth="user"` (logged in), `auth="public"` (anyone, logged or not), `auth="none"` (no session).

```python
# user — requires login
@http.route('/my/orders', type='http', auth="user", website=True)

# public — accessible without login but session available
@http.route('/my/orders/<int:order_id>', type='http', auth="public", website=True)

# none — no session, no env (webhooks, health checks)
@http.route('/api/webhook', type='json', auth="none", csrf=False)
```

**418.3 type='http' vs type='json'**: HTTP returns rendered pages; JSON returns JSON-RPC responses.

```python
# HTTP — returns HTML
@http.route('/my/orders/<int:order_id>', type='http', auth="public", website=True)
def portal_order_page(self, order_id, **kw):
    order = request.env['sale.order'].browse(order_id)
    return request.render("sale.sale_order_portal_template", {'sale_order': order})

# JSON-RPC — returns dict (auto-serialized to JSON)
@http.route('/my/orders/<int:order_id>/accept', type='json', auth="public", website=True)
def portal_quote_accept(self, order_id, access_token=None, **kw):
    order = request.env['sale.order'].sudo().browse(order_id)
    order.action_confirm()
    return {'force_refresh': True}
```

### Pattern 418.4–418.6: Portal Controller (HIGH)

**418.4 Portal controller extending base**: Inherit from portal base class.

```python
from odoo.addons.portal.controllers.portal import pager as portal_pager
from odoo.addons.payment.controllers import portal as payment_portal

class CustomerPortal(payment_portal.PaymentPortal):
    def _prepare_home_portal_values(self, counters):
        values = super()._prepare_home_portal_values(counters)
        if 'order_count' in counters:
            values['order_count'] = request.env['sale.order'].search_count([
                ('state', '=', 'sale')], limit=1)
        return values
```

**418.5 request.render — template rendering**: Render QWeb template with values.

```python
return request.render("sale.portal_my_orders", {
    'orders': orders,
    'pager': pager_values,
    'searchbar_sortings': sortings,
})
```

**418.6 request.env — ORM access**: Access models through `request.env`.

```python
SaleOrder = request.env['sale.order']
order = SaleOrder.sudo().browse(order_id)
partner = request.env.user.partner_id
```

### Pattern 418.7–418.10: API Patterns (MEDIUM)

**418.7 JSON-RPC external API**: Odoo's built-in JSON-RPC at `/jsonrpc`.

```python
# Client call (external):
# POST /jsonrpc {"method": "call", "params": {"service": "object", "method": "execute_kw", ...}}
```

**418.8 XML-RPC external API**: Legacy API at `/xmlrpc/2/object`.

**418.9 CORS configuration**: Enable cross-origin for API endpoints.

```python
@http.route('/api/v1/orders', type='json', auth="api_key", cors="*", csrf=False)
def api_get_orders(self, **kw):
    orders = request.env['sale.order'].search_read([], ['name', 'amount_total'])
    return {'orders': orders}
```

**418.10 API key authentication**: Use `auth="api_key"` with `ir.api.key` model.

```python
@http.route('/api/v1/orders', type='json', auth="api_key", cors="*")
def get_orders(self, **params):
    return request.env['sale.order'].search_read([('state', '=', 'sale')], ['name', 'amount_total'])
```

---

## Abnormal Case Patterns (2 patterns)

1. **CSRF on JSON endpoint** — `type='json'` auto-disables CSRF. For `type='http'` POST, CSRF token is required. Fix: Include CSRF token in forms or set `csrf=False` (only for webhooks).

2. **Missing sudo() for portal** — portal users have limited access. Fix: Use `request.env['model'].sudo()` when portal users need to read records, combined with access token validation.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (418.1-418.10), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Controller & API Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

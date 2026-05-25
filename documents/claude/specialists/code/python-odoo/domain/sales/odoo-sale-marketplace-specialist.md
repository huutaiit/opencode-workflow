# Odoo Sale Marketplace Specialist — Enterprise
# Odoo Sale Marketplace Chuyen Gia — Enterprise
# Odoo マーケットプレイス スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Marketplace Integration
**Category**: domain-sales | **Purpose**: Sync orders from Amazon/Shopee marketplaces with Odoo sales and delivery

---

## Metadata

```json
{"id":"odoo-sale-marketplace-specialist","technology":"Odoo 18 Enterprise","aspect":"Marketplace Integration","category":"domain-sales","subcategory":"odoo","lines":130,"token_cost":1600,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/sale_amazon/ (11 files)","E2: /opt/workspace/odoo-18/odoo/addons/sale_shopee/ (8 files)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 458.1–458.6 |
| **Dependencies** | `sale_amazon`, `sale_shopee` (Enterprise) |
| **When To Use** | Multi-channel sales — importing orders from Amazon/Shopee and syncing delivery status |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: sale_amazon, sale_shopee, marketplace, amazon_order |

---

## Patterns

**458.1** Amazon account configuration and API credentials.
**458.2** Order import: Amazon → sale.order (cron-based sync).
**458.3** Delivery sync: Odoo tracking → Amazon fulfillment.
**458.4** Product mapping: Amazon ASIN ↔ Odoo product.
**458.5** Shopee integration (similar pattern to Amazon).
**458.6** Multi-marketplace order management dashboard.

---

*Odoo Sale Marketplace Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

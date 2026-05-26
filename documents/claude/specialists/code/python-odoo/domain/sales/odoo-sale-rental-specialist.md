# Odoo Sale Rental Specialist — Enterprise
# Odoo Sale Rental Chuyen Gia — Enterprise
# Odoo レンタル スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Rentals
**Category**: domain-sales | **Purpose**: Manage rental contracts, pickup/return schedules, and rental pricing

---

## Metadata

```json
{"id":"odoo-sale-rental-specialist","technology":"Odoo 18 Enterprise","aspect":"Rentals","category":"domain-sales","subcategory":"odoo","lines":140,"token_cost":1700,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/sale_renting/models/ (10 files)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 456.1–456.8 |
| **Dependencies** | `sale_renting` (Enterprise) |
| **When To Use** | Equipment/product rental — pickup dates, return dates, and rental pricing |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: sale_renting, is_rental, rental, pickup, return |

---

## Patterns

**456.1** Rental SO line: `is_rental=True` with pickup_date and return_date.
**456.2** Rental pricing: per day/week/month with duration-based discounts.
**456.3** Availability checking: prevent double-booking.
**456.4** Pickup workflow: delivery order for rental start.
**456.5** Return workflow: receipt for rental end.
**456.6** Late return handling and penalties.
**456.7** Rental-to-purchase conversion.
**456.8** Gantt view for rental schedule visualization.

---

*Odoo Sale Rental Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

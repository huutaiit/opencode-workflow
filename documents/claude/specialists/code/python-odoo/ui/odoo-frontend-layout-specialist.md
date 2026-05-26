# Odoo Frontend Layout Specialist — Enterprise
# Odoo Bố Cục Giao Diện Chuyên Gia — Enterprise
# Odoo フロントエンドレイアウト スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: List/Form Layout Design, SCSS Column Patterns, UX Methodology
**Category**: ui
**Purpose**: Generate SCSS column layouts and XML view structures for data-dense enterprise screens with proper information hierarchy

---

## Metadata

```json
{
  "id": "odoo-frontend-layout-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Frontend Layout & UX",
  "category": "ui",
  "subcategory": "odoo",
  "lines": 520,
  "token_cost": 6200,
  "version": "2.1.0",
  "evidence": [
    "E1: /opt/workspace/erp/task_check/static/src/scss/ (10 SCSS files, 1217 lines — production column patterns)",
    "E2: /opt/workspace/erp/task_check/views/ (50+ view definitions — real enterprise layouts)",
    "E3: Odoo 18 UI/UX guidelines (developer/reference/user_interface)",
    "E4: Nielsen Norman Group — Data Table UX (nngroup.com/articles/data-tables)",
    "E5: Edward Tufte — Information Density principle (Visual Display of Quantitative Information)",
    "E6: Japanese enterprise UX patterns (高密度情報表示 — high-density information display)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | View |
| **Directory Pattern** | `{module}/static/src/scss/{feature}.scss`, `{module}/views/{model}_views.xml` |
| **Variant** | enterprise |
| **Pattern Numbers** | 509.1–509.20 |
| **Source Paths** | `**/static/src/scss/**/*.scss`, `**/views/**/*.xml` |
| **File Count** | 1–10 SCSS files + 5–50 view XMLs per module (enterprise modules with data-dense screens) |
| **Naming Convention** | SCSS: `{feature_name}.scss`, CSS class on view: `class="{feature_name}"`, View: `view_{model}_{type}.xml` |
| **Imports From** | N/A (declarative XML + SCSS) |
| **Imported By** | Web client (renders styled views), List Button controllers (507.x) via `js_class` on styled views |
| **Cannot Import** | N/A |
| **Dependencies** | Bootstrap 5 (bundled with Odoo 18), Odoo SCSS variables |
| **When To Use** | Enterprise screens with 8+ columns, data-dense grids, multi-field forms, responsive column sizing, custom field presentation |
| **Source Skeleton** | `{module}/static/src/scss/{feature}.scss`, `{module}/views/{model}_views.xml` |
| **Specialist Type** | code |
| **Purpose** | Generate SCSS column layouts and XML view structures for data-dense enterprise screens with proper information hierarchy |
| **Activation Trigger** | files: `**/static/src/scss/**/*.scss`, `**/views/**/*.xml`; keywords: column width, layout, tree view, list view, data-name, !important, min-width, white-space, text-align, データ表示, bố cục |

---

## Role

You are an **Odoo Frontend Layout Specialist** for Odoo 18 Enterprise. You design list view column layouts, form view structures, and SCSS patterns that optimize for **information density** — showing maximum relevant data per screen area without sacrificing readability. You apply visual hierarchy principles to enterprise workflows where users scan hundreds of records daily.

**Used by**: DD agents designing list/form views for data-heavy screens (warehouse, HR, accounting, quality control)
**Not used by**: Standard CRUD views with <6 fields (use odoo-views-xml 415.x)
**Companion to**: odoo-list-button (507.x) — when list views need both custom buttons AND dense column layout; odoo-owl-advanced (508.x) — when dashboards need card/table layout patterns

---

## Layout Analysis Methodology

### 509.M1: When to Apply This Specialist

This specialist activates when a screen design exhibits ANY of these characteristics:

| Signal | Threshold | Example |
|--------|-----------|---------|
| Column count | ≥8 columns in list view | Warehouse picking list, payroll summary |
| Field diversity | ≥3 different data types in one row | ID + name + date + amount + status + tags |
| Scan frequency | Users view this screen >10 times/day | Quality check list, task dashboard |
| Data density | >50 records typically visible | Employee list, product catalog |
| Custom interaction | Buttons + data in same view | Workflow screens with upload/sync/calculate |
| Multi-stakeholder | Different users need different field priority | Manager sees KPIs, operator sees details |

### 509.M2: 5-Step Layout Design Process

```
Step 1: CLASSIFY — Field Inventory & Type Analysis
    → List all fields, classify each: identifier, measure, category, status, action, timestamp

Step 2: PRIORITIZE — Information Hierarchy (Fitts' Law + F-Pattern)
    → Primary (leftmost, always visible) → Secondary → Tertiary (rightmost, overflow)

Step 3: SIZE — Column Width Allocation (see patterns below)
    → Apply width rules by field type, verify total ≤ 100%

Step 4: STYLE — Visual Encoding (color, alignment, weight)
    → Numbers right-aligned, status as badges, categories as tags

Step 5: VALIDATE — Responsive Check + Real Data Test
    → Test with longest actual data values, verify no truncation of critical fields
```

### 509.M3: Customer Layout Expectations by Culture

| Aspect | Japanese Enterprise (JP) | Vietnamese Enterprise (VN) | Western Enterprise (EU/US) |
|--------|--------------------------|---------------------------|---------------------------|
| **Density** | 極めて高密度 — Maximum fields per screen, scrolling is failure | Moderate density, prioritize speed | Lower density, whitespace valued |
| **Precision** | Every decimal matters, alignment critical | Summary-first, drill-down for detail | Summary with quick filters |
| **Color** | Minimal — status badges only, muted palette | Color-coded freely, icons encouraged | Status colors, conditional formatting |
| **Column order** | Code/ID first, hierarchical left-to-right | Name first, action buttons prominent | Name first, smart defaults |
| **Form vs List** | Prefer dense list over form detail | Both equally used | Form-centric with inline edit |
| **Language** | Fixed-width consideration (全角文字) | Vietnamese diacritics need vertical space | Standard Latin metrics |

### 509.M4: Use-Case Patterns for Complex Layouts

| Use-Case | Layout Strategy | Example |
|----------|----------------|---------|
| **Master Data Grid** | Fixed ID column + scrollable detail columns, sortable | Customer master, product catalog |
| **Workflow Monitor** | Status column with color badge + action buttons in toolbar | Quality check workflow, approval pipeline |
| **Comparison Screen** | Side-by-side columns with diff highlighting | JPC vs WO comparison, budget vs actual |
| **Score/Point Matrix** | Numeric columns right-aligned, subtotals, conditional color | P3 point total, performance score |
| **Import/Upload Hub** | Minimal list columns + prominent upload buttons | Template upload screens |
| **Timeline/History** | Timestamp left, event description wide, actor right | Audit log, change history |

---

## Patterns

### Pattern 509.1–509.5: List View Column Sizing (CRITICAL)

**509.1 SCSS Column Width Pattern** — Standard structure:

```scss
// file: static/src/scss/customer_views.scss

.tree_customer_master {
    // Identifiers — narrow, fixed width
    [data-name="code"] {
        width: 100px !important;
        min-width: 100px !important;
    }

    // Names — flexible, moderate width
    [data-name="name"] {
        width: 200px !important;
        min-width: 150px !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    // Numeric — narrow, right-aligned
    [data-name="total_amount"] {
        width: 120px !important;
        min-width: 100px !important;
        text-align: right !important;
    }

    // Status — badge-sized
    [data-name="state"] {
        width: 100px !important;
        min-width: 80px !important;
        text-align: center !important;
    }

    // Notes/Description — take remaining space
    [data-name="note"] {
        min-width: 200px !important;
        white-space: normal !important;
        word-break: break-word;
    }

    // Boolean — minimal
    [data-name="is_active"] {
        width: 60px !important;
        min-width: 60px !important;
        text-align: center !important;
    }
}
```

**509.2 Width Guidelines by Field Type**:

| Field Type | Width | Min-Width | Alignment | Overflow |
|-----------|-------|-----------|-----------|----------|
| Code/ID | 80–120px | 60px | left | nowrap |
| Short name | 150–200px | 120px | left | ellipsis |
| Long name | 200–300px | 150px | left | ellipsis |
| Date | 100–120px | 90px | center | nowrap |
| DateTime | 150–170px | 130px | center | nowrap |
| Integer | 80–100px | 60px | right | nowrap |
| Float/Monetary | 100–140px | 80px | right | nowrap |
| Selection/Status | 80–120px | 70px | center | nowrap |
| Boolean | 50–70px | 50px | center | — |
| Many2one | 150–250px | 120px | left | ellipsis |
| Many2many (tags) | 200–300px | 150px | left | wrap + max-width on tag |
| Text/Notes | min-width only | 200px | left | word-break |
| Email/URL | 180–250px | 150px | left | ellipsis |

**509.3 High-Density List (10+ columns)** — Compressed mode:

```scss
.tree_p3point_total {
    // Technique: reduce base font, tighter padding
    .o_list_renderer {
        font-size: 0.85rem;
    }

    .o_list_renderer th,
    .o_list_renderer td {
        padding: 4px 6px !important;
    }

    // Column widths for 11-column layout
    [data-name="username"]       { width: 120px !important; min-width: 100px !important; }
    [data-name="fullname"]       { width: 150px !important; min-width: 120px !important; }
    [data-name="employee_code"]  { width: 90px !important;  min-width: 80px !important; }
    [data-name="area"]           { width: 100px !important; min-width: 80px !important; }
    [data-name="rank_code"]      { width: 80px !important;  min-width: 70px !important; }
    [data-name="total_point"]    { width: 100px !important; min-width: 80px !important; text-align: right !important; font-weight: bold; }
    [data-name="mistake_points"] { width: 100px !important; min-width: 80px !important; text-align: right !important; }
    [data-name="pro_point"]      { width: 100px !important; min-width: 80px !important; text-align: right !important; }
    [data-name="indirect_point"] { width: 100px !important; min-width: 80px !important; text-align: right !important; }
    [data-name="base_point"]     { width: 100px !important; min-width: 80px !important; text-align: right !important; }
    [data-name="tsubo_point"]    { width: 100px !important; min-width: 80px !important; text-align: right !important; }
}
```

**509.4 Many2many Tags Width Control**:

```scss
.tree_mistake_record {
    [data-name="tag_ids"] {
        max-width: 300px !important;
        .badge {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: inline-block;
            vertical-align: middle;
        }
    }
}
```

**509.5 Percentage-Based Layout** (for variable-width screens):

```scss
.tree_mistake_definition {
    [data-name="code"]        { width: 10% !important; min-width: 80px !important; }
    [data-name="name"]        { width: 25% !important; min-width: 150px !important; word-break: break-word; }
    [data-name="description"] { width: 35% !important; min-width: 200px !important; word-break: break-word; }
    [data-name="category_id"] { width: 15% !important; min-width: 100px !important; }
    [data-name="point"]       { width: 8% !important;  min-width: 60px !important; text-align: right !important; }
    [data-name="is_active"]   { width: 7% !important;  min-width: 50px !important; text-align: center !important; }
}
```

**Rules**:
- ALWAYS use `!important` for column widths — Odoo's default styles override without it
- ALWAYS set both `width` and `min-width` — prevents column collapse on narrow screens
- Use `data-name` attribute selector (not class) — stable across Odoo versions
- CSS class on `<list>` tag connects view to SCSS: `<list class="tree_customer_master">`
- Numeric columns: `text-align: right !important` — universal accounting convention
- Key numeric columns: add `font-weight: bold` for visual emphasis
- Notes/text columns: use `white-space: normal` + `word-break: break-word` to allow wrapping

### Pattern 509.6–509.10: Form View Layout (HIGH)

**509.6 Form Architecture — Group/Page Structure**:

```xml
<form string="Quality Record">
    <!-- Header: Status + Action Buttons -->
    <header>
        <button name="action_confirm" string="Confirm" type="object"
                class="btn-primary" invisible="state != 'draft'"/>
        <button name="action_approve" string="Approve" type="object"
                class="btn-success" invisible="state != 'confirmed'"
                groups="quality.group_quality_manager"/>
        <field name="state" widget="statusbar"
               statusbar_visible="draft,confirmed,approved"/>
    </header>

    <sheet>
        <!-- Top Group: Key identifiers (always visible without scroll) -->
        <group>
            <group string="Record Info">
                <field name="name"/>
                <field name="code"/>
                <field name="date"/>
                <field name="responsible_id"/>
            </group>
            <group string="Classification">
                <field name="category_id"/>
                <field name="severity"/>
                <field name="priority" widget="priority"/>
                <field name="tag_ids" widget="many2many_tags"/>
            </group>
        </group>

        <!-- Notebook: Detail sections (scrollable) -->
        <notebook>
            <page string="Details" name="details">
                <group>
                    <field name="description"/>
                    <field name="root_cause"/>
                    <field name="corrective_action"/>
                </group>
            </page>
            <page string="Measurements" name="measurements">
                <field name="measurement_ids">
                    <list editable="bottom">
                        <field name="parameter"/>
                        <field name="value"/>
                        <field name="unit"/>
                        <field name="result" widget="badge"
                               decoration-success="result == 'pass'"
                               decoration-danger="result == 'fail'"/>
                    </list>
                </field>
            </page>
            <page string="Attachments" name="attachments">
                <field name="attachment_ids" widget="many2many_binary"/>
            </page>
        </notebook>
    </sheet>

    <!-- Chatter (below sheet, always at bottom) -->
    <chatter/>
</form>
```

**509.7 Form Layout Principles**:

| Principle | Rule | Why |
|-----------|------|-----|
| **F-Pattern** | Key fields top-left, secondary top-right | Users scan left-to-right, top-to-bottom |
| **Above the Fold** | Identifiers + status visible without scroll | User must orient immediately |
| **Group Semantics** | Left group = identity, Right group = classification | Cognitive grouping reduces load |
| **Notebook for Detail** | Heavy content in tabs, not in main body | Prevents scroll fatigue |
| **Progressive Disclosure** | `invisible` attr hides irrelevant fields by state | Reduces visual noise |
| **Action in Header** | Workflow buttons in `<header>`, not in sheet | Consistent action placement |

**509.8 Inline List in Form** — Sub-records editable inline:

```xml
<field name="line_ids">
    <list editable="bottom" class="tree_order_lines">
        <field name="sequence" widget="handle"/>
        <field name="product_id"/>
        <field name="description" optional="show"/>
        <field name="quantity"/>
        <field name="unit_price"/>
        <field name="subtotal" sum="Total"/>
    </list>
</field>
```

**509.9 Smart Button Box** — KPI indicators at top of form:

```xml
<div class="oe_button_box" name="button_box">
    <button name="action_view_invoices" type="object"
            class="oe_stat_button" icon="fa-pencil-square-o">
        <field name="invoice_count" widget="statinfo" string="Invoices"/>
    </button>
    <button name="action_view_deliveries" type="object"
            class="oe_stat_button" icon="fa-truck">
        <field name="delivery_count" widget="statinfo" string="Deliveries"/>
    </button>
</div>
```

**509.10 Conditional Field Visibility**:

```xml
<!-- Show field only when state is confirmed -->
<field name="approval_date" invisible="state != 'confirmed'"/>

<!-- Show section only for specific type -->
<group string="Manufacturing Details" invisible="type != 'production'">
    <field name="bom_id"/>
    <field name="routing_id"/>
</group>

<!-- Permission-based visibility -->
<field name="cost_price" groups="account.group_account_manager"/>
```

### Pattern 509.11–509.15: Visual Encoding (HIGH)

**509.11 Status Badge Decoration**:

```xml
<field name="state" widget="badge"
       decoration-success="state == 'done'"
       decoration-warning="state == 'in_progress'"
       decoration-danger="state == 'overdue'"
       decoration-info="state == 'draft'"/>
```

**509.12 Row-Level Conditional Coloring**:

```xml
<list decoration-danger="is_overdue == True"
      decoration-muted="state == 'cancelled'"
      decoration-bf="is_urgent == True">
    <field name="name"/>
    <field name="due_date"/>
    <field name="state"/>
</list>
```

**509.13 Widget Selection Guide**:

| Data Type | Widget | Visual Effect |
|-----------|--------|---------------|
| Selection | `badge` | Colored pill |
| Priority | `priority` | Star rating |
| Many2many | `many2many_tags` | Colored tags |
| Color | `color` | Color dot |
| Progress | `progressbar` | Progress bar |
| Boolean | `boolean_toggle` | Toggle switch |
| URL | `url` | Clickable link |
| Email | `email` | Clickable mailto |
| Phone | `phone` | Clickable tel |
| Monetary | `monetary` | Currency-formatted |
| Image | `image` | Thumbnail |
| Binary | `binary` | File download |
| Handle | `handle` | Drag handle for reorder |

**509.14 Wizard Dialog Layout** — Expanded width for complex wizards:

```scss
// Expand wizard to near-full width for data-heavy forms
.wizard-expanded-dialog {
    .modal-dialog {
        max-width: 95vw !important;
    }
    .modal-body {
        max-height: 80vh;
        overflow-y: auto;
    }
}
```

**509.15 Dashboard Card SCSS**:

```scss
.o_dashboard_card {
    .card {
        transition: box-shadow 0.2s ease;
        cursor: pointer;

        &:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .card-body {
            h2 {
                font-size: 2rem;
                font-weight: 700;
            }
            h5 {
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
        }
    }
}
```

### Pattern 509.16–509.20: Scientific Layout Methodology (MEDIUM)

**509.16 Information Density Formula** (Tufte):

```
Data-Ink Ratio = (Data-Ink) / (Total Ink)
Goal: Maximize data-ink ratio — remove gridlines, borders, backgrounds that don't encode data.
```

Application to Odoo list views:
- Remove unnecessary column borders (Odoo default is clean)
- Use `text-muted` for secondary data instead of separate columns
- Combine related fields: `"John Doe (EMP-001)"` instead of 2 columns
- Use `widget="badge"` for status (color encodes data, saves reading time)

**509.17 Fitts' Law — Action Target Size**:

```
T = a + b × log₂(D/W + 1)
T = time to reach target
D = distance to target
W = target width
```

Application:
- Primary action buttons: `btn-primary` (larger, high contrast)
- Frequently-used buttons: leftmost position in toolbar
- Destructive actions: right-aligned, `btn-danger`, smaller
- Inline record actions: use icon buttons (`fa-search`, `fa-edit`) to save space

**509.18 Miller's Law — 7±2 Chunking**:

```
Working memory holds 7±2 chunks of information.
```

Application to form views:
- Maximum 7 fields per `<group>` section
- Maximum 5-7 tabs in `<notebook>`
- Maximum 4 smart buttons in `button_box`
- Group related fields visually (use `<group string="Section Name">`)

**509.19 Gestalt Proximity — Visual Grouping**:

```
Elements near each other are perceived as related.
```

Application:
- Form `<group>` with `string` creates visual boundary + label
- List columns: group related fields together (name+code, quantity+unit, date+time)
- Use `<separator string="Section"/>` between logical groups
- Dashboard: cards in same row = related KPIs

**509.20 Japanese Enterprise Density Pattern** (高密度情報表示):

```
Principle: Maximum information per viewport. Scrolling = information loss.
```

Application for Japanese enterprise clients:
- List views: compress column widths to fit 12-15 columns without horizontal scroll
- Font size: 0.85rem for dense grids (still readable for CJK characters)
- Padding: 4px 6px (minimal but clickable)
- Fixed header: always visible (`position: sticky`)
- Key numeric columns: bold + right-aligned + monospace font for decimal alignment
- Status: single-character codes (○ ✕ △) instead of full text where culturally appropriate
- Column headers: abbreviated to 2-4 characters when space constrained

```scss
// Japanese enterprise density pattern
.tree_dense_jp {
    .o_list_renderer {
        font-size: 0.85rem;
        font-family: "Noto Sans JP", "Hiragino Sans", sans-serif;
    }

    .o_list_renderer th,
    .o_list_renderer td {
        padding: 4px 6px !important;
        white-space: nowrap;
    }

    // Sticky header
    .o_list_renderer thead {
        position: sticky;
        top: 0;
        z-index: 1;
        background: white;
    }

    // Monospace for numeric alignment
    [data-name="amount"],
    [data-name="quantity"],
    [data-name="point"] {
        font-family: "JetBrains Mono", "Source Code Pro", monospace;
        text-align: right !important;
    }
}
```

---

## Generation Checklist

When designing a layout, produce these artifacts:

| # | Artifact | File | Check |
|---|----------|------|-------|
| 1 | Field inventory | (analysis) | All fields classified by type + priority |
| 2 | XML view | `views/{model}_views.xml` | Groups, notebooks, widgets, decorations, `class=` attribute |
| 3 | SCSS | `static/src/scss/{feature}.scss` | Column widths for all fields, responsive min-widths |
| 4 | Manifest | `__manifest__.py` | SCSS registered in `web.assets_backend` |
| 5 | Real data test | (validation) | Longest values don't break layout |

---

## Abnormal Case Patterns (3 patterns)

1. **Columns collapse on narrow screen** — Only `width` set, no `min-width`. Fix: Always set both `width` and `min-width` in SCSS. Use px for min-width even when width is percentage.

2. **Horizontal scroll on default Odoo list** — Too many fixed-width columns exceeding viewport. Fix: Use percentage widths for flexible columns, fixed widths only for identifiers and numbers. Let text columns absorb remaining space.

3. **Japanese text truncated** — CJK characters wider than Latin. Fix: Increase min-width by 30% for columns displaying Japanese content. Use `word-break: keep-all` for Japanese text (don't break mid-word).

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E6, real production SCSS from task_check)?
- [x] **Q2**: Pattern IDs unique (509.1-509.20), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Frontend Layout Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

# Odoo List Button Specialist — Enterprise
# Odoo Nút Bấm List View Chuyên Gia — Enterprise
# Odoo リストビューボタン スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: List View Custom Buttons & Controllers
**Category**: ui
**Purpose**: Generate ListController extensions with custom toolbar buttons — upload, import, export, workflow, bulk actions — following Odoo 18 OWL patterns

---

## Metadata

```json
{
  "id": "odoo-list-button-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "List View Custom Buttons",
  "category": "ui",
  "subcategory": "odoo",
  "lines": 480,
  "token_cost": 5800,
  "version": "2.1.0",
  "evidence": [
    "E1: /opt/workspace/odoo-18/odoo/addons/web/static/src/views/list/list_controller.js",
    "E2: /opt/workspace/odoo-18/odoo/addons/web/static/src/views/list/list_view.js",
    "E3: /opt/workspace/erp/task_check/static/src/js/ (29 controllers, 1731 lines — real production patterns)",
    "E4: /opt/workspace/odoo-18/odoo/addons/web/static/src/core/utils/hooks.js (useService pattern)",
    "E5: Odoo 18 official docs (developer/reference/frontend/registries)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | OWL |
| **Directory Pattern** | `{module}/static/src/js/{feature_name}.js` + `{module}/static/src/xml/{feature_name}.xml` |
| **Variant** | enterprise |
| **Pattern Numbers** | 507.1–507.16 |
| **Source Paths** | `**/static/src/js/**/*.js`, `**/static/src/xml/**/*.xml` |
| **File Count** | 2 files per button group (JS controller + XML template), typically 5–30 pairs per module |
| **Naming Convention** | File: `{model_or_feature}.js`, Class: PascalCase `{Feature}Controller`, Template: `{module}.{Feature}View.Buttons` |
| **Imports From** | `@web/views/list/list_controller`, `@web/views/list/list_view`, `@web/core/registry`, `@web/core/utils/hooks` |
| **Imported By** | Odoo view registry (loaded via `js_class` attribute on list view XML) |
| **Cannot Import** | Python model files (JS runs client-side only) |
| **Dependencies** | `@odoo/owl:2.x` (bundled with Odoo) |
| **When To Use** | Adding custom action buttons to list view toolbar — upload/import CSV/Excel, export, sync, calculate, bulk operations, workflow triggers |
| **Source Skeleton** | `{module}/static/src/js/{feature}.js`, `{module}/static/src/xml/{feature}.xml` |
| **Specialist Type** | code |
| **Purpose** | Generate complete ListController + XML template pairs for custom list view buttons |
| **Activation Trigger** | files: `**/static/src/js/**/*.js`; keywords: ListController, listView, registry, js_class, action_upload, action_import, action_export, bulk, toolbar button |

---

## Role

You are an **Odoo List Button Specialist** for Odoo 18 Enterprise. Your responsibility is to generate ListController extensions that add custom action buttons to list views. You cover 6 tiers of complexity — from single-click upload buttons to multi-action workflow controllers with permission checks and bulk selection.

**Used by**: DD agents generating custom list view interactions (upload, import, export, sync, calculate, compare, workflow)
**Not used by**: Form view buttons (use odoo-views-xml 415.x), standalone OWL components (use odoo-owl-component 416.x), standard server actions (no JS needed)

---

## Design Principles

### When JS Controller is Needed vs Standard XML

| Situation | Solution | Specialist |
|-----------|----------|------------|
| Button calls Python method, no JS logic needed | `<button type="object">` in XML view | odoo-views-xml (415.x) |
| Button opens wizard or action window from toolbar | **This specialist** (507.x) | |
| Button needs UI blocking, error handling, page reload | **This specialist** (507.x) | |
| Button needs bulk selection processing | **This specialist** (507.x) | |
| Button needs permission-based visibility | **This specialist** (507.x) | |
| Custom dashboard or non-list component | odoo-owl-component (416.x) or odoo-owl-advanced (508.x) | |

---

## Patterns

### Pattern 507.1–507.4: Simple Action Button (CRITICAL)

The most common pattern — 1 button, 1 ORM call, optional wizard popup.

**507.1 Single Upload/Import Button**: Button triggers Python method that returns an action (typically wizard).

```javascript
/** @odoo-module **/
import { ListController } from "@web/views/list/list_controller";
import { registry } from "@web/core/registry";
import { listView } from "@web/views/list/list_view";
import { useService } from "@web/core/utils/hooks";

export class CustomerUploadController extends ListController {
    setup() {
        this.orm = useService("orm");
        this.actionService = useService("action");
        super.setup();
    }

    async onUploadClick() {
        const result = await this.orm.call(
            "customer.master", "action_upload_template", [[]]
        );
        if (result && result.action) {
            await this.actionService.doAction(result.action, {
                onClose: () => window.location.reload(),
            });
        }
    }
}

CustomerUploadController.template = "my_module.CustomerListView.Buttons";

export const customerUploadListView = {
    ...listView,
    Controller: CustomerUploadController,
};

registry.category("views").add("customer_upload_list", customerUploadListView);
```

**507.2 XML Template — Button Injection via XPath**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<templates id="template" xml:space="preserve">
    <t t-name="my_module.CustomerListView.Buttons"
       t-inherit="web.ListView"
       t-inherit-mode="primary"
       owl="1">
        <xpath expr="//Layout/t[@t-set-slot='control-panel-create-button']"
               position="inside">
            <button type="button"
                    class="btn btn-primary"
                    style="margin-right: 10px;"
                    t-on-click="onUploadClick">
                <i class="fa fa-upload me-1"/>Upload Excel
            </button>
        </xpath>
    </t>
</templates>
```

**507.3 Python View Linking** — Connect JS controller via `js_class`:

```xml
<record id="view_customer_master_tree" model="ir.ui.view">
    <field name="name">customer.master.tree</field>
    <field name="model">customer.master</field>
    <field name="arch" type="xml">
        <list string="Customer Master" js_class="customer_upload_list"
              class="tree_customer_master">
            <field name="name"/>
            <field name="code"/>
        </list>
    </field>
</record>
```

**507.4 Manifest Registration** — JS before XML, always:

```python
'assets': {
    'web.assets_backend': [
        'my_module/static/src/js/customer_upload.js',
        'my_module/static/src/xml/customer_upload.xml',
    ],
},
```

**Rules**:
- `js_class` value in XML view MUST match `registry.category("views").add("key", ...)` key
- Template `t-name` MUST match `Controller.template` value
- JS file MUST be listed before XML file in manifest
- Always use `t-inherit-mode="primary"` to create independent template (not modify base)
- XPath target `//Layout/t[@t-set-slot='control-panel-create-button']` is stable across Odoo 18
- `onClose: () => window.location.reload()` ensures data refresh after wizard closes

### Pattern 507.5–507.7: Export & Direct Action Button (HIGH)

**507.5 Export Button — Opens Wizard Directly**:

```javascript
async onExportClick() {
    await this.actionService.doAction({
        type: "ir.actions.act_window",
        res_model: "export.wizard",
        view_mode: "form",
        views: [[false, "form"]],
        target: "new",
        context: {},
    });
}
```

**507.6 Direct Action — No Wizard, Just Execute**:

```javascript
async onSyncClick() {
    const result = await this.orm.call(
        "data.sync", "action_sync_all", [[]]
    );
    if (result && result.action) {
        await this.actionService.doAction(result.action);
    }
}
```

**507.7 Action with Alert Feedback**:

```javascript
async onCompareClick() {
    const result = await this.orm.call(
        "jpc.compare", "action_compare_data", [[]]
    );
    if (result && result.message) {
        alert(result.message);
    }
}
```

**Rules**:
- `target: "new"` opens wizard as modal dialog
- For simple feedback, `alert()` is acceptable; for rich feedback, use notification service
- Always check `result` before accessing properties — Python method may return `None`

### Pattern 507.8–507.10: UI-Blocking Action Button (HIGH)

For operations that take >2 seconds — prevent double-click, show loading state.

**507.8 UI Block/Unblock Pattern**:

```javascript
export class WorkflowSyncController extends ListController {
    setup() {
        this.orm = useService("orm");
        this.actionService = useService("action");
        this.ui = useService("ui");
        this.notification = useService("notification");
        super.setup();
    }

    async onSyncClick() {
        this.ui.block();
        try {
            const result = await this.orm.call(
                "workflow.sync", "action_sync_data", [[]]
            );
            if (result && result.action) {
                await this.actionService.doAction(result.action, {
                    onClose: () => window.location.reload(),
                });
            }
        } catch (error) {
            this.notification.add(
                error.message || "Sync failed",
                { type: "danger" }
            );
        } finally {
            this.ui.unblock();
        }
    }
}
```

**507.9 Wizard Trigger with UI Block** — For operations that open wizard after server processing:

```javascript
async onSyncByCodeClick() {
    this.ui.block();
    try {
        const result = await this.orm.call(
            "workflow.sync", "action_open_sync_wizard", [[]]
        );
        this.ui.unblock();
        if (result && result.action) {
            await this.actionService.doAction(result.action, {
                onClose: () => window.location.reload(),
            });
        }
    } catch (error) {
        this.ui.unblock();
        this.notification.add(error.message || "Error", { type: "danger" });
    }
}
```

**507.10 Confirmation Before Action**:

```javascript
async onResetClick() {
    const confirmed = confirm("Reset all data? This cannot be undone.");
    if (!confirmed) return;

    this.ui.block();
    try {
        await this.orm.call("data.model", "action_reset", [[]]);
        window.location.reload();
    } catch (error) {
        this.notification.add(error.message || "Reset failed", { type: "danger" });
    } finally {
        this.ui.unblock();
    }
}
```

**Rules**:
- Always use `try/finally` with `this.ui.block()` — unblock MUST execute even on error
- `this.notification.add(message, { type })` — types: `"success"`, `"warning"`, `"danger"`, `"info"`
- For destructive actions, always use `confirm()` dialog before execution
- Prefer `finally { this.ui.unblock() }` over manual unblock in try+catch

### Pattern 507.11–507.13: Multi-Action Controller (HIGH)

Multiple buttons on same list view — workflow screens with calculate, sync, export, lock.

**507.11 Multi-Button Controller Structure**:

```javascript
export class P3PointWorkflowController extends ListController {
    setup() {
        this.orm = useService("orm");
        this.actionService = useService("action");
        this.ui = useService("ui");
        this.notification = useService("notification");
        super.setup();
    }

    async onCalculateClick() {
        const selectedIds = this.model.root.selection.map(r => r.resId);
        if (!selectedIds.length) {
            this.notification.add("Please select records to calculate", { type: "warning" });
            return;
        }
        this.ui.block();
        try {
            await this.orm.call("p3point.workflow", "action_calculate", [selectedIds]);
            window.location.reload();
        } catch (error) {
            this.notification.add(error.message || "Calculation failed", { type: "danger" });
        } finally {
            this.ui.unblock();
        }
    }

    async onBulkCalculateClick() {
        this.ui.block();
        try {
            await this.orm.call("p3point.workflow", "action_bulk_calculate", [[]]);
            window.location.reload();
        } catch (error) {
            this.notification.add(error.message || "Bulk calculation failed", { type: "danger" });
        } finally {
            this.ui.unblock();
        }
    }

    async onSyncClick() {
        this.ui.block();
        try {
            const result = await this.orm.call("p3point.workflow", "action_sync", [[]]);
            if (result && result.action) {
                this.ui.unblock();
                await this.actionService.doAction(result.action, {
                    onClose: () => window.location.reload(),
                });
                return;
            }
            window.location.reload();
        } catch (error) {
            this.notification.add(error.message || "Sync failed", { type: "danger" });
        } finally {
            this.ui.unblock();
        }
    }

    async onExportClick() {
        const result = await this.orm.call("p3point.workflow", "action_export", [[]]);
        if (result && result.action) {
            await this.actionService.doAction(result.action);
        }
    }
}
```

**507.12 Multi-Button XML Template**:

```xml
<t t-name="my_module.P3PointWorkflowView.Buttons"
   t-inherit="web.ListView" t-inherit-mode="primary" owl="1">
    <xpath expr="//Layout/t[@t-set-slot='control-panel-create-button']" position="inside">
        <button type="button" class="btn btn-primary me-1" t-on-click="onCalculateClick">
            <i class="fa fa-calculator me-1"/>Calculate Selected
        </button>
        <button type="button" class="btn btn-info me-1" t-on-click="onBulkCalculateClick">
            <i class="fa fa-cogs me-1"/>Calculate All
        </button>
        <button type="button" class="btn btn-warning me-1" t-on-click="onSyncClick">
            <i class="fa fa-refresh me-1"/>Sync
        </button>
        <button type="button" class="btn btn-success me-1" t-on-click="onExportClick">
            <i class="fa fa-download me-1"/>Export
        </button>
    </xpath>
</t>
```

**507.13 Bulk Selection Access**:

```javascript
// Get selected record IDs
const selectedIds = this.model.root.selection.map(record => record.resId);

// Get selected record data
const selectedRecords = this.model.root.selection;
const names = selectedRecords.map(r => r.data.display_name);

// Check if any records selected
if (!this.model.root.selection.length) {
    this.notification.add("No records selected", { type: "warning" });
    return;
}
```

**Rules**:
- Use `me-1` (margin-end Bootstrap 5) between buttons, not inline `style="margin-right"`
- Button color convention: primary=main action, info=bulk, warning=sync/refresh, success=export, danger=delete/reset
- Icon convention: `fa-upload`=import, `fa-download`=export, `fa-calculator`=calculate, `fa-refresh`=sync, `fa-cogs`=bulk, `fa-trash`=delete
- `this.model.root.selection` is the proper way to access selected records in Odoo 18

### Pattern 507.14–507.16: Permission-Aware Controller (MEDIUM)

Buttons that show/hide based on user groups or record context.

**507.14 OWL State + Permission Check**:

```javascript
import { useState, onWillStart } from "@odoo/owl";
import { user } from "@web/core/user";

export class MistakeRecordController extends ListController {
    setup() {
        this.orm = useService("orm");
        this.actionService = useService("action");
        this.notification = useService("notification");
        this.state = useState({ isManager: false });
        super.setup();

        onWillStart(async () => {
            this.state.isManager = await user.hasGroup("project.group_project_manager");
        });
    }

    async onSetCheckerPointClick() {
        if (!this.state.isManager) {
            this.notification.add("Permission denied", { type: "danger" });
            return;
        }
        await this.orm.call("mistake.record", "action_set_checker_point", [[]]);
        window.location.reload();
    }
}
```

**507.15 Context-Aware Buttons** — Visibility based on view context props:

```javascript
export class CompareDetailController extends ListController {
    setup() {
        this.orm = useService("orm");
        this.actionService = useService("action");
        this.ui = useService("ui");
        this.notification = useService("notification");
        super.setup();
    }

    get showActionButtons() {
        const ctx = this.props.context || {};
        return ctx.st_compare_type && ctx.st_compare_id;
    }

    async onCreateInvoiceClick() {
        const ctx = this.props.context;
        this.ui.block();
        try {
            await this.orm.call(
                "st.compare.detail", "action_create_invoice",
                [[ctx.st_compare_id], true]
            );
            window.location.reload();
        } catch (error) {
            this.notification.add(error.message || "Failed", { type: "danger" });
        } finally {
            this.ui.unblock();
        }
    }
}
```

**507.16 Permission-Aware XML Template**:

```xml
<t t-name="my_module.MistakeRecordView.Buttons"
   t-inherit="web.ListView" t-inherit-mode="primary" owl="1">
    <xpath expr="//Layout/t[@t-set-slot='control-panel-create-button']" position="inside">
        <!-- Manager-only button -->
        <button t-if="this.state.isManager"
                type="button" class="btn btn-warning me-1"
                t-on-click="onSetCheckerPointClick">
            Set Checker Point
        </button>
        <!-- Context-aware button -->
        <button t-if="this.showActionButtons"
                type="button" class="btn btn-primary me-1"
                t-on-click="onCreateInvoiceClick">
            Create Invoice
        </button>
        <!-- Always-visible button -->
        <button type="button" class="btn btn-success me-1"
                t-on-click="onExportClick">
            <i class="fa fa-download me-1"/>Export
        </button>
    </xpath>
</t>
```

**Rules**:
- Use `user.hasGroup("module.group_xml_id")` for permission checks — returns Promise
- Permission checks MUST be in `onWillStart` (async hook), NOT in `setup()` directly
- Use OWL `useState` for reactive permission state — `t-if="this.state.isManager"` auto-updates
- Context props available via `this.props.context` — passed from parent action
- Getter properties (e.g., `get showActionButtons()`) are reactive in OWL templates

---

## Generation Checklist

When generating a ListController button, verify these 5 artifacts:

| # | Artifact | File | Check |
|---|----------|------|-------|
| 1 | JS Controller | `static/src/js/{feature}.js` | Class extends ListController, registered in views registry |
| 2 | XML Template | `static/src/xml/{feature}.xml` | `t-inherit="web.ListView"`, `t-inherit-mode="primary"`, owl="1" |
| 3 | Python View | `views/{model}_views.xml` | `js_class=` matches registry key |
| 4 | Manifest | `__manifest__.py` | JS before XML in `web.assets_backend` |
| 5 | SCSS (optional) | `static/src/scss/{feature}.scss` | Column widths if list has custom layout |

---

## Abnormal Case Patterns (4 patterns)

1. **Button not appearing** — `js_class` value in XML view doesn't match `registry.category("views").add("key")`. Fix: Ensure exact string match between Python view `js_class` attribute and JS registry key.

2. **"Template not found" error** — Template `t-name` in XML doesn't match `Controller.template`. Fix: Use exact module-qualified name. Check for typo in namespace (`module.task_check.` vs `task_check.`).

3. **Double-click causes duplicate actions** — Missing `this.ui.block()` before async operation. Fix: Always wrap long-running operations with `this.ui.block()`/`this.ui.unblock()`.

4. **Selected records empty** — Using `this.model.root.records` instead of `this.model.root.selection`. Fix: `selection` property contains only checked records; `records` contains all visible records.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E5 sources, real production code from task_check)?
- [x] **Q2**: Pattern IDs unique (507.1-507.16), no overlap with existing 415-417?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo List Button Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

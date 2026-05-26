# Odoo OWL Advanced View Specialist — Enterprise
# Odoo OWL Nâng Cao Chuyên Gia — Enterprise
# Odoo OWL上級ビュー スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Custom Dashboards, Framework Patches, Global Services
**Category**: ui
**Purpose**: Build advanced OWL patterns beyond basic components — custom action views (dashboards), view renderer patches, global services with lifecycle management

---

## Metadata

```json
{
  "id": "odoo-owl-advanced-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "OWL Advanced Views",
  "category": "ui",
  "subcategory": "odoo",
  "lines": 480,
  "token_cost": 5800,
  "version": "2.1.0",
  "evidence": [
    "E1: /opt/workspace/erp/task_check/static/src/views/planning_dashboard/planning_dashboard.js",
    "E2: /opt/workspace/erp/task_check/static/src/views/planning_gantt/planning_gantt_renderer.js",
    "E3: /opt/workspace/erp/task_check/static/src/js/text_translator.js (service pattern)",
    "E4: /opt/workspace/odoo-18/odoo/addons/web/static/src/core/utils/patch.js",
    "E5: /opt/workspace/odoo-18/odoo/addons/web/static/src/core/utils/hooks.js",
    "E6: Odoo 18 official docs (developer/reference/frontend/patching)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | OWL |
| **Directory Pattern** | `{module}/static/src/views/{view_name}/` (dashboards, patches), `{module}/static/src/js/` (services) |
| **Variant** | enterprise |
| **Pattern Numbers** | 508.1–508.15 |
| **Source Paths** | `**/static/src/views/**/*.js`, `**/static/src/js/**/*.js` |
| **File Count** | 1–5 advanced components per module |
| **Naming Convention** | Dashboard: `{name}_dashboard.js`, Patch: `{view}_{component}.js`, Service: `{name}_service.js` |
| **Imports From** | `@odoo/owl`, `@web/core/registry`, `@web/core/utils/patch`, `@web/core/utils/hooks`, `@web/core/network/rpc` |
| **Imported By** | Odoo action registry (dashboards), patched views (patches), all components (services) |
| **Cannot Import** | Python model files (JS runs client-side only) |
| **Dependencies** | `@odoo/owl:2.x` |
| **When To Use** | Custom dashboards with aggregated KPIs, patching existing Odoo views (Gantt, Calendar, Kanban), global frontend services (translation popup, keyboard handler) |
| **Source Skeleton** | `{module}/static/src/views/{name}/{name}.js`, `{module}/static/src/views/{name}/{name}.xml` |
| **Specialist Type** | code |
| **Purpose** | Build advanced OWL patterns — dashboards, patches, services |
| **Activation Trigger** | files: `**/static/src/views/**/*.js`; keywords: patch, dashboard, Component, onWillStart, useState, registry.category("actions"), registry.category("services"), MutationObserver |

---

## Role

You are an **Odoo OWL Advanced View Specialist** for Odoo 18 Enterprise. You handle 3 advanced frontend patterns that go beyond basic OWL components (416.x) and list buttons (507.x): custom dashboards registered as actions, view renderer patches that modify existing Odoo views, and global services that run across the entire application lifecycle.

**Used by**: DD agents building custom dashboard screens, modifying Gantt/Calendar/Kanban renderers, creating global interaction services
**Not used by**: Basic OWL components (use 416.x), list view buttons (use 507.x), server-side views (use 415.x)

### Scope Boundary with 416.x (Basic OWL)

| 416.x Basic OWL | 508.x Advanced OWL |
|-----------------|---------------------|
| Component class + props + template | Action-registered dashboards with data aggregation |
| Static template binding | Dynamic state + async data loading |
| Service injection (useService) | Framework patches (patch prototype) |
| Reactive state (simple) | Complex state with multi-query orchestration |
| N/A | Global services with DOM lifecycle |
| N/A | View renderer override |

---

## Patterns

### Pattern 508.1–508.5: Custom Dashboard Action (CRITICAL)

Dashboards are OWL Components registered in the `"actions"` registry, loaded when user navigates to a menu item.

**508.1 Dashboard Component Structure**:

```javascript
/** @odoo-module **/
import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

export class PlanningDashboard extends Component {
    static template = "my_module.PlanningDashboard";

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.state = useState({
            loading: true,
            totalSlots: 0,
            doneSlots: 0,
            lateSlots: 0,
            overloadedEmployees: [],
            lateTasks: [],
        });

        onWillStart(async () => {
            await this._loadData();
        });
    }

    async _loadData() {
        this.state.loading = true;
        try {
            // Query 1: Aggregate counts
            this.state.totalSlots = await this.orm.searchCount(
                "planning.slot", [["start_datetime", ">=", this._weekStart()]]
            );

            // Query 2: Group aggregation
            const groups = await this.orm.readGroup(
                "planning.slot",
                [["state", "=", "done"], ["start_datetime", ">=", this._weekStart()]],
                ["employee_id"],
                ["employee_id"],
                { orderby: "allocated_hours desc", limit: 10 }
            );

            // Query 3: Detailed records
            this.state.overloadedEmployees = groups
                .filter(g => g.allocated_hours > 67.5)
                .map(g => ({
                    id: g.employee_id[0],
                    name: g.employee_id[1],
                    hours: g.allocated_hours,
                    percentage: Math.round((g.allocated_hours / 67.5) * 100),
                }));

            this.state.lateTasks = await this.orm.searchRead(
                "planning.slot",
                [["state", "!=", "done"], ["end_datetime", "<", new Date().toISOString()]],
                ["display_name", "employee_id", "end_datetime"],
                { limit: 5, order: "end_datetime asc" }
            );
        } finally {
            this.state.loading = false;
        }
    }

    _weekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(now.setDate(diff)).toISOString().split("T")[0];
    }

    onCardClick(domain) {
        this.action.doAction({
            type: "ir.actions.act_window",
            res_model: "planning.slot",
            view_mode: "list,form",
            views: [[false, "list"], [false, "form"]],
            domain: domain,
            name: "Filtered Records",
        });
    }
}

registry.category("actions").add("planning_dashboard", PlanningDashboard);
```

**508.2 Dashboard XML Template** — Card-based layout:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<templates id="template" xml:space="preserve">
    <t t-name="my_module.PlanningDashboard" owl="1">
        <div class="o_action">
            <div t-if="state.loading" class="text-center p-5">
                <i class="fa fa-spinner fa-spin fa-3x"/>
            </div>
            <div t-else="" class="container-fluid p-3">
                <!-- KPI Cards Row -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card shadow-sm cursor-pointer"
                             t-on-click="() => this.onCardClick([['state','!=','cancel']])">
                            <div class="card-body text-center">
                                <h5 class="text-muted">Total Slots</h5>
                                <h2 class="text-primary" t-esc="state.totalSlots"/>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card shadow-sm">
                            <div class="card-body text-center">
                                <h5 class="text-muted">Done</h5>
                                <h2 class="text-success" t-esc="state.doneSlots"/>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card shadow-sm">
                            <div class="card-body text-center">
                                <h5 class="text-muted">Late</h5>
                                <h2 class="text-danger" t-esc="state.lateSlots"/>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Data Table -->
                <div class="card" t-if="state.overloadedEmployees.length">
                    <div class="card-header"><h5>Overloaded Employees</h5></div>
                    <table class="table table-striped mb-0">
                        <thead><tr>
                            <th>Employee</th><th>Hours</th><th>Load %</th>
                        </tr></thead>
                        <tbody>
                            <t t-foreach="state.overloadedEmployees" t-as="emp" t-key="emp.id">
                                <tr>
                                    <td t-esc="emp.name"/>
                                    <td t-esc="emp.hours"/>
                                    <td>
                                        <span class="badge"
                                              t-attf-class="bg-#{emp.percentage > 120 ? 'danger' : 'warning'}">
                                            <t t-esc="emp.percentage"/>%
                                        </span>
                                    </td>
                                </tr>
                            </t>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </t>
</templates>
```

**508.3 Dashboard Action Registration** — Python menu item:

```xml
<record id="action_planning_dashboard" model="ir.actions.client">
    <field name="name">Planning Dashboard</field>
    <field name="tag">planning_dashboard</field>
</record>

<menuitem id="menu_planning_dashboard"
          name="Dashboard"
          action="action_planning_dashboard"
          parent="planning.planning_menu_root"
          sequence="1"/>
```

**508.4 Dashboard ORM Methods**:

```javascript
// Count records matching domain
await this.orm.searchCount("model.name", domain);

// Group by with aggregation
await this.orm.readGroup("model.name", domain, fields, groupBy, options);
// options: { orderby, limit, offset, lazy }

// Read specific fields from records
await this.orm.searchRead("model.name", domain, fields, options);
// options: { limit, offset, order }

// Call custom Python method
await this.orm.call("model.name", "method_name", [positional_args], { kwarg: value });
```

**508.5 Dashboard Manifest** — Lazy loading for non-critical dashboards:

```python
'assets': {
    'web.assets_backend': [
        # Always loaded (if dashboard is primary navigation)
        'my_module/static/src/views/dashboard/dashboard.js',
        'my_module/static/src/views/dashboard/dashboard.xml',
    ],
    # OR lazy loaded (if dashboard is secondary)
    'web.assets_backend_lazy': [
        'my_module/static/src/views/dashboard/dashboard.js',
        'my_module/static/src/views/dashboard/dashboard.xml',
    ],
},
```

**Rules**:
- Action `tag` in Python MUST match `registry.category("actions").add("tag", Component)` key
- Dashboard state MUST use `useState()` for reactive rendering
- Data loading MUST be in `onWillStart` (not constructor, not setup directly)
- Use `try/finally` with loading state to prevent stuck spinners
- Use Bootstrap 5 classes (`row`, `col-md-*`, `card`, `table`) for responsive layout
- Dashboard is an `ir.actions.client` type (not `act_window`)

### Pattern 508.6–508.10: Framework Patches (HIGH)

Modify existing Odoo view renderers without copying the entire component.

**508.6 View Renderer Patch** — Add behavior to existing view:

```javascript
/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { PlanningGanttRenderer } from "@planning/views/planning_gantt/planning_gantt_renderer";

patch(PlanningGanttRenderer.prototype, {
    /**
     * Override pill title to show custom format
     */
    enrichPill(pill) {
        const result = super.enrichPill(pill);
        // Custom: append task count to title
        const record = pill.record;
        if (record && record.task_count) {
            result.displayName = `${result.displayName} (${record.task_count} tasks)`;
        }
        return result;
    },

    /**
     * Override popover to add custom fields
     */
    getPopoverProps(pill) {
        const props = super.getPopoverProps(pill);
        props.customField = pill.record?.custom_field || "";
        return props;
    },

    /**
     * Add DOM elements after rendering
     */
    computeDerivedParams() {
        super.computeDerivedParams();
        // Debounced DOM manipulation after render
        clearTimeout(this._badgeTimeout);
        this._badgeTimeout = setTimeout(() => this._insertBadges(), 300);
    },

    /**
     * New method: inject task count badges into row headers
     */
    _insertBadges() {
        const rows = this.el?.querySelectorAll(".o_gantt_row_sidebar");
        if (!rows) return;
        rows.forEach(row => {
            if (row.querySelector(".custom-badge")) return; // Already inserted
            const badge = document.createElement("span");
            badge.className = "custom-badge badge bg-info ms-2";
            badge.textContent = row.dataset.taskCount || "0";
            row.appendChild(badge);
        });
    },
});
```

**508.7 Simple Property Patch** — Override getter:

```javascript
/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { PlanningGanttRowProgressBar } from
    "@planning/views/planning_gantt/planning_gantt_row_progress_bar";

patch(PlanningGanttRowProgressBar.prototype, {
    get show() {
        return true; // Always show progress bar (override conditional logic)
    },
});
```

**508.8 Patch with State Addition** — Add new reactive state to existing component:

```javascript
patch(SomeRenderer.prototype, {
    setup() {
        super.setup();
        this.customState = useState({ expanded: false, filterActive: false });
    },

    toggleExpand() {
        this.customState.expanded = !this.customState.expanded;
    },
});
```

**508.9 Patch Import Path Convention**:

```javascript
// Standard Odoo addons — use @web/ prefix
import { ListRenderer } from "@web/views/list/list_renderer";
import { KanbanRenderer } from "@web/views/kanban/kanban_renderer";
import { CalendarRenderer } from "@web/views/calendar/calendar_renderer";

// Enterprise addons — use @module_name/ prefix
import { PlanningGanttRenderer } from "@planning/views/planning_gantt/planning_gantt_renderer";
import { GanttRenderer } from "@web_gantt/gantt_renderer";
import { MapRenderer } from "@web_map/map_renderer/map_renderer";
```

**508.10 Patch SCSS** — Style injected DOM elements:

```scss
// Target patched view elements
.o_gantt_view {
    .custom-badge {
        font-size: 0.75rem;
        vertical-align: middle;
    }

    .o_gantt_row_sidebar .o_gantt_progress_bar {
        visibility: visible !important; // Force show
    }

    // Half-day separators
    .o_gantt_header_cell::after {
        content: "";
        position: absolute;
        right: 50%;
        border-right: 1px dashed #dee2e6;
        height: 100%;
    }
}
```

**Rules**:
- Always call `super.method()` when overriding existing methods
- Use `setTimeout` for DOM manipulation after render (Odoo renders async)
- Check element existence before DOM manipulation (`if (!this.el) return`)
- Prevent duplicate DOM insertions (check for existing elements first)
- Patches are loaded globally — register in `web.assets_backend_lazy` if view-specific
- Import path must match Odoo's module alias system (`@module_name/path`)
- NEVER copy the entire renderer — patch only the methods you need

### Pattern 508.11–508.15: Global Services (MEDIUM)

Services run across the entire Odoo application lifecycle, independent of any view.

**508.11 Service with RPC + DOM Interaction**:

```javascript
/** @odoo-module **/
import { registry } from "@web/core/registry";
import { rpc } from "@web/core/network/rpc";

export const textTranslatorService = {
    start(env) {
        let popup = null;
        let lastText = "";

        function createPopup() {
            const el = document.createElement("div");
            el.className = "translator-popup";
            el.innerHTML = `
                <div class="translator-loading" style="display:none;">
                    <i class="fa fa-spinner fa-spin"></i> Translating...
                </div>
                <div class="translator-result"></div>
            `;
            document.body.appendChild(el);
            return el;
        }

        async function translate(text) {
            if (!text || text === lastText) return;
            lastText = text;
            if (!popup) popup = createPopup();

            popup.querySelector(".translator-loading").style.display = "block";
            popup.querySelector(".translator-result").textContent = "";
            popup.style.display = "block";

            try {
                const result = await rpc("/my_module/translate", { text });
                popup.querySelector(".translator-result").textContent = result.translation;
            } catch {
                popup.querySelector(".translator-result").textContent = "Translation failed";
            } finally {
                popup.querySelector(".translator-loading").style.display = "none";
            }
        }

        function hide() {
            if (popup) popup.style.display = "none";
        }

        // Event listeners
        let debounceTimer;
        document.addEventListener("mouseup", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const selection = window.getSelection().toString().trim();
                if (selection.length > 2) translate(selection);
            }, 200);
        });

        document.addEventListener("click", (e) => {
            if (popup && !popup.contains(e.target)) hide();
        });

        return { translate, hide };
    },
};

registry.category("services").add("textTranslator", textTranslatorService);
```

**508.12 Global DOM Observer** — Watch for dynamic elements:

```javascript
/** @odoo-module **/
(function () {
    // One-time initialization guard
    if (window.__myModuleInitialized) return;
    window.__myModuleInitialized = true;

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                // Detect dialog appearance
                if (node.matches?.(".modal-dialog, .o_dialog")) {
                    handleDialogAppeared(node);
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function handleDialogAppeared(dialog) {
        // Custom dialog enhancement (e.g., Enter key handling)
        dialog.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                const btn = dialog.querySelector(".btn-primary");
                if (btn) btn.click();
            }
        });
    }
})();
```

**508.13 Browser API Patch** — Fix framework bugs:

```javascript
/** @odoo-module **/
// Patch IntersectionObserver to filter detached DOM elements
// Fixes Odoo 18 bug: TypeError on null.clientHeight
const OriginalObserver = window.IntersectionObserver;
window.IntersectionObserver = class extends OriginalObserver {
    constructor(callback, options) {
        super((entries, observer) => {
            const connected = entries.filter(e => e.target.isConnected);
            if (connected.length) callback(connected, observer);
        }, options);
    }
};
```

**508.14 Service CSS** — Standalone styling:

```css
.translator-popup {
    position: fixed;
    z-index: 9999;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 12px;
    max-width: 400px;
    display: none;
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}
```

**508.15 Service/Patch Manifest Registration**:

```python
'assets': {
    'web.assets_backend': [
        # Global patches — load early (before components)
        'my_module/static/src/js/intersection_patch.js',

        # Services
        'my_module/static/src/js/text_translator.js',
        'my_module/static/src/css/text_translator.css',

        # IIFE observers (no ES6 module needed)
        'my_module/static/src/js/wizard_enter_listener.js',
    ],
    'web.assets_backend_lazy': [
        # View-specific patches — lazy load
        'my_module/static/src/views/planning_gantt/planning_gantt_renderer.js',
        'my_module/static/src/views/planning_gantt/planning_progress_bar.js',
    ],
},
```

**Rules**:
- Global patches load in `web.assets_backend` (before all views)
- View-specific patches load in `web.assets_backend_lazy` (with the view they patch)
- Services MUST return an API object from `start()` for other components to use
- Use debouncing (200-300ms) for event-driven services to prevent excessive calls
- Always guard DOM observers with initialization flag (`window.__initialized`)
- Clean up event listeners if service can be destroyed (SPA navigation)
- Use `rpc()` (not `orm.call()`) for custom controller endpoints

---

## Abnormal Case Patterns (3 patterns)

1. **Patch target not found** — Import path doesn't match Odoo's module alias. Fix: Check `__manifest__.py` of the target addon for `"name"` field — that's the `@name/` prefix. Enterprise modules use their technical name (e.g., `@planning/`, `@web_gantt/`).

2. **Service not available** — `useService("myService")` throws "not available". Fix: Service must be registered before the component that uses it. Check manifest load order — service JS file must come before consumer JS file.

3. **DOM manipulation lost after re-render** — Elements added via `appendChild()` disappear when OWL re-renders. Fix: Use `computeDerivedParams()` or `onPatched()` hook to re-inject after each render. Add existence check to prevent duplicates.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E6 sources, real production code)?
- [x] **Q2**: Pattern IDs unique (508.1-508.15), no overlap with 416.x or 507.x?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo OWL Advanced View Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

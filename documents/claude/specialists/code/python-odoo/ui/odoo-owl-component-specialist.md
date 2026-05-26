# Odoo OWL Component Specialist — Enterprise
# Odoo OWL Component Chuyen Gia — Enterprise
# Odoo OWLコンポーネント スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: OWL Components
**Category**: ui
**Purpose**: Create Odoo Web Library (OWL 2) components with correct class structure, props, templates, and services

---

## Metadata

```json
{
  "id": "odoo-owl-component-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "OWL Components",
  "category": "ui",
  "subcategory": "odoo",
  "lines": 230,
  "token_cost": 2800,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/frontend/owl_components)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/static/src/js/product/product.js",
    "E3: /opt/workspace/odoo-18/odoo/addons/point_of_sale/static/src/app/store/pos_store.js"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | OWL |
| **Directory Pattern** | `{module}/static/src/js/{component}/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 416.1–416.8 |
| **Source Paths** | `**/static/src/js/**/*.js` |
| **File Count** | 1–20 JS components per module |
| **Naming Convention** | File: `{component_name}.js`, Class: PascalCase `ProductCard` |
| **Imports From** | `@odoo/owl`, `@web/core/registry`, `@web/core/utils/reactive` |
| **Imported By** | Other OWL components, registries |
| **Cannot Import** | Python model files (JS runs client-side only) |
| **Dependencies** | `@odoo/owl:2.x` (bundled with Odoo) |
| **When To Use** | Building interactive client-side UI beyond standard XML views — custom widgets, POS screens, configurators |
| **Source Skeleton** | `{module}/static/src/js/{component}/{component}.js`, `{module}/static/src/js/{component}/{component}.xml` |
| **Specialist Type** | code |
| **Purpose** | Create Odoo Web Library (OWL 2) components with correct class structure, props, templates, and services |
| **Activation Trigger** | files: `**/static/src/js/**/*.js`; keywords: @odoo/owl, Component, Reactive, static template |

---

## Role

You are an **Odoo OWL Component Specialist** for Odoo 18 Enterprise. Your responsibility is to create OWL 2 components following Odoo 18 patterns — class-based components with static props validation, template binding, registry registration, and Reactive service patterns. You ensure correct imports from `@odoo/owl` and Odoo's web module.

**Used by**: Code agents creating custom frontend components (widgets, POS screens, configurators)
**Not used by**: Server-side views (see odoo-views-xml), QWeb templates (see odoo-qweb-template)

---

## Patterns

### Pattern 416.1–416.4: Component Structure (CRITICAL)

**416.1 Class-based OWL Component**: Extend `Component` from `@odoo/owl`.

```javascript
/** @odoo-module */
import { Component } from "@odoo/owl";

export class Product extends Component {
    static components = { PTAL, QuantityButtons };
    static template = "sale.Product";
    static props = {
        id: { type: [Number, {value: false}], optional: true },
        product_tmpl_id: Number,
        display_name: String,
        price: Number,
        quantity: Number,
    };

    getFormattedPrice() {
        return formatCurrency(this.props.price, this.props.currencyId);
    }
}
```

**416.2 Static components registry**: Declare child components used in the template.

```javascript
import { PTAL } from "../product_template_attribute_line/product_template_attribute_line";
import { QuantityButtons } from '../quantity_buttons/quantity_buttons';

export class Product extends Component {
    static components = { PTAL, QuantityButtons };
}
```

**416.3 Static template binding**: Link component to QWeb XML template by module-qualified name.

```javascript
export class Product extends Component {
    static template = "sale.Product";
    // Template defined in sale/static/src/js/product/product.xml
}
```

**416.4 Static props validation**: Type-check props at runtime in dev mode.

```javascript
static props = {
    id: { type: [Number, {value: false}], optional: true },
    display_name: String,
    description_sale: [Boolean, String],  // union type
    attribute_lines: Object,
    imageURL: { type: String, optional: true },
    archived_combinations: Array,
};
```

**Rules**:
- Prop types: `String`, `Number`, `Boolean`, `Object`, `Array`, `Function`
- Union types: `[Type1, Type2]`
- Literal values: `{value: false}`, `{value: null}`
- Optional: `{ type: Type, optional: true }`

### Pattern 416.5–416.6: Environment & Getters (HIGH)

**416.5 Environment access**: Use `this.env` for services and global state.

```javascript
export class ProductScreen extends Component {
    setup() {
        this.pos = this.env.services.pos;
        this.dialog = this.env.services.dialog;
    }

    get currentOrder() {
        return this.pos.get_order();
    }
}
```

**416.6 Getter properties**: Computed values accessed in templates.

```javascript
export class Product extends Component {
    get isAvailable() {
        return this.props.quantity > 0 && !this.props.archived;
    }
    // In template: <t t-if="component.isAvailable">
}
```

### Pattern 416.7–416.8: Reactive Services (HIGH)

**416.7 Reactive service class**: State management using `Reactive` base class from `@web/core/utils/reactive`.

```javascript
import { Reactive } from "@web/core/utils/reactive";

export class PosStore extends Reactive {
    loadingSkipButtonIsShown = false;
    mainScreen = { name: null, component: null };

    static serviceDependencies = [
        "bus_service",
        "number_buffer",
        "hardware_proxy",
        "ui",
        "pos_data",
        "dialog",
        "notification",
    ];

    async setup(env, deps) {
        this.env = env;
        Object.assign(this, deps);
        // Initialize state...
    }
}
```

**416.8 Static serviceDependencies (DI)**: Declare service dependencies for automatic injection.

```javascript
export class PosStore extends Reactive {
    static serviceDependencies = [
        "bus_service",
        "pos_data",
        "dialog",
        "notification",
        "printer",
    ];
    // Dependencies injected via setup(env, deps) — deps has the requested services
}
```

**Rules**:
- `Reactive` auto-triggers re-renders when properties change
- Services registered in `@web/core/registry` under `"services"` category
- `serviceDependencies` = array of registry keys

---

## Abnormal Case Patterns (2 patterns)

1. **Missing @odoo-module comment** — Odoo's module system won't load the file as ES module. Fix: Always start with `/** @odoo-module */` or `/** @odoo-module **/`.

2. **Template name mismatch** — `static template = "wrong.Name"` causes "template not found" error. Fix: Template name must match `t-name` in the XML file and use `{module}.{TemplateName}` format.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (416.1-416.8), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo OWL Component Specialist — Enterprise | EPS v3.2 | Metadata v2.1*

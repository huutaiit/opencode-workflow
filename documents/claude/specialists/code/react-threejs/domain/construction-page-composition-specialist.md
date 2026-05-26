# Construction Page Composition Specialist
# Construction Page Composition スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain (construction page layout, component composition, mode switching) |
| **Directory Pattern** | `features/construction/ConstructionPage.tsx`, `features/construction/index.tsx` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 7.01–7.04 |
| **Source Paths** | `**/construction/ConstructionPage.tsx`, `**/construction/index.tsx` |
| **File Count** | 2 files (ConstructionPage main + index route) |
| **Naming Convention** | `ConstructionPage.tsx`, `index.tsx` |
| **Imports From** | Rendering (ThreeEditor, Mode2dEditor), State (Redux construction, locationSelector, shippingInformation), Settings (meshcolor modal) |
| **Cannot Import** | API (services directly — through Redux thunks), Camera (controls — inside viewers) |
| **Imported By** | Domain (App routing renders this page) |
| **Dependencies** | `react-burger-menu:3.x`, `react-bootstrap:2.x`, `formik:2.2` |
| **When To Use** | Building the main construction worker page with 2D/3D mode switch, location/pump dropdowns, filter section, table toggle, and hamburger menu |
| **Source Skeleton** | `features/construction/ConstructionPage.tsx`, `features/construction/index.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate construction page layout composing header, filters, location/pump selectors, 2D/3D viewer toggle, table section, and 6 confirmation/settings modals |
| **Activation Trigger** | files: **/construction/ConstructionPage.tsx; keywords: constructionPage, modeSwitch, hamburgerMenu, locationSelector, pumpSelector |

---

## Pattern 7.01: Page Layout Structure

```pseudo
PAGE_COMPOSITION: |
  ConstructionPage.tsx
  ├── Header
  │   ├── Logo image
  │   ├── Hamburger menu (react-burger-menu)
  │   │   ├── メッシュ色凡例 → Color Legend Modal
  │   │   ├── メッシュ透過率設定 → Transparency Formik Modal
  │   │   ├── 作業状態 submenu
  │   │   │   ├── 作業中 (BeforePumping → DuringPumping)
  │   │   │   └── 作業終了 (DuringPumping → FinishPumping)
  │   │   ├── 開始取消 (Revert all DuringPumping)
  │   │   ├── 2D/3D表示へ切替
  │   │   └── ログアウト
  │   └── Location name display
  ├── Filter Section
  │   ├── Checkbox: 終了分を非表示
  │   ├── Radio: 全層 / 選択層のみ (3D only)
  │   └── Floor dropdown (when 選択層のみ)
  ├── Selection Dropdowns
  │   ├── Location selector
  │   └── Pump selector
  ├── 3D/2D Viewer Area
  │   ├── ThreeEditor (mode=1, 3D)
  │   ├── Mode2dEditor (mode=2, 2D)
  │   └── Alert: 薄層打設済みメッシュあり
  ├── Table Toggle
  │   ├── ListMesh (overlapping info)
  │   └── ShippingInformationList
  └── Modals (6 total)
      ├── Color Legend
      ├── Delete Confirmation
      ├── Start Status Confirmation
      ├── Success Status Confirmation
      └── Transparency Settings (Formik)
```

---

## Pattern 7.02: 2D/3D Mode Switch

```pseudo
MODE_SWITCH: |
  constructionState.modeShow = 1 (3D) | 2 (2D)

  # Menu item triggers:
  dispatch(constructionActions.changeModeShow(
    modeShow === 1 ? 2 : 1
  ))

  # Conditional rendering:
  {modeShow === 1 && <ThreeEditor />}
  {modeShow === 2 && <Mode2dEditor />}

  # Floor mode radio ONLY visible in 3D mode (modeShow === 1)
```

---

## Pattern 7.03: Login Types (Role-Based Views)

```pseudo
LOGIN_TYPES: {
  OFFICE: "Full settings access",
  WORKINGSITE: "Construction page (primary)",
  FACTORY: "Factory-focused view",
  LOCATION: "Location monitoring",
  PUMPINGMANAGEMENT: "Pump vehicle management",
  LOCATIONPUMPINGMANAGEMENT: "Combined location + pump",
  ICTAGMANAGEMENT: "IC tag card reader management"
}

ROUTING: "Login type determines initial redirect and available menu items"
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_DIRECT_RENDER_BOTH: "Never render ThreeEditor AND Mode2dEditor simultaneously — conditional only",
  NO_FLOOR_RADIO_IN_2D: "Floor mode toggle hidden in 2D view",
  NO_ENGLISH_MENU: "All menu items in Japanese"
}
```

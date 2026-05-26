# Navigation UX Specialist
# ナビゲーションUXスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 228.1–228.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Breadcrumb, sidebar, tabs, mobile nav, back button, active state indicators |
| **Activation Trigger** | navigation, breadcrumb, sidebar, tabs, menu, mobile nav, back button |
| **Complements** | 222.x responsive-layout, 224.x focus-accessibility |

---

## Rules

### 228.1 — Breadcrumb Rules

| Rule | Requirement |
|------|------------|
| Hierarchy | Reflect URL/page structure, NOT user history |
| Max depth | ≤5 levels visible; truncate middle with ellipsis |
| Current page | Last item, non-clickable, `font-medium` |
| Separator | `/` or `>` — consistent across app |

```tsx
// ✅ AntD Breadcrumb
<Breadcrumb items={[
  { title: <Link href="/">Home</Link> },
  { title: <Link href="/projects">Projects</Link> },
  { title: 'Project Alpha' },  // Current — no link
]} />

// ✅ Truncation for deep hierarchies
<Breadcrumb items={[
  { title: <Link href="/">Home</Link> },
  { title: '...' },  // Collapsed middle levels
  { title: <Link href="/parent">Parent</Link> },
  { title: 'Current Page' },
]} />

// ❌ WRONG: Breadcrumb as browser history (Back/Forward)
// ❌ WRONG: Current page as a clickable link
```

### 228.2 — Sidebar Navigation

```tsx
// ✅ AntD Menu sidebar — collapsible
<Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}
  className="hidden lg:block"  // Hide on mobile
  breakpoint="lg" collapsedWidth={64}>
  <Menu mode="inline" selectedKeys={[current]} items={menuItems} />
</Sider>

// ✅ Persistent sidebar state (localStorage)
const [collapsed, setCollapsed] = useState(() =>
  localStorage.getItem('sidebar-collapsed') === 'true'
);

// ❌ WRONG: Sidebar always expanded on mobile (covers content)
// ❌ WRONG: Sidebar without collapse control
```

### 228.3 — Tabs & Segmented Control

| Rule | Requirement |
|------|------------|
| Max items | ≤7 visible tabs; overflow with scroll or dropdown |
| Active indicator | Bottom border (tabs) or filled bg (segmented) |
| Content switch | No page reload — client-side only |
| URL sync | Optional: sync active tab with `?tab=` query param |

```tsx
// ✅ AntD Tabs
<Tabs activeKey={tab} onChange={setTab} items={[
  { key: 'overview', label: 'Overview', children: <Overview /> },
  { key: 'settings', label: 'Settings', children: <Settings /> },
]} />

// ✅ AntD Segmented (≤5 options)
<Segmented options={['Daily', 'Weekly', 'Monthly']} value={period}
  onChange={setPeriod} />

// ❌ WRONG: >7 tabs without overflow handling
// ❌ WRONG: Tabs that trigger full page navigation
```

### 228.4 — Mobile Navigation

```tsx
// ✅ Responsive: sidebar → drawer on mobile
<Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}
  placement="left" className="lg:hidden">
  <Menu mode="inline" items={menuItems} />
</Drawer>

// ✅ Hamburger toggle (mobile only)
<Button type="text" icon={<MenuOutlined />}
  className="lg:hidden" onClick={() => setMobileMenuOpen(true)} />

// ❌ WRONG: Desktop nav unchanged on mobile (overflows, tiny targets)
```

### 228.5 — Back Button & Unsaved Changes

```tsx
// ✅ Warn on unsaved changes via beforeunload + confirmation modal
<Modal open={showLeaveConfirm} title="Unsaved Changes"
  onOk={confirmLeave} onCancel={cancelLeave}>
  <p>You have unsaved changes. Leave without saving?</p>
</Modal>

// ❌ WRONG: Silent data loss on back navigation
```

### 228.6 — Active State Indicators

| Element | Active Indicator | Tailwind |
|---------|-----------------|----------|
| Sidebar item | Left border + bg tint | `border-l-3 border-primary bg-primary/5` |
| Top nav link | Bottom border | `border-b-2 border-primary` |
| Tab | Bottom bar (AntD built-in) | — |
| Breadcrumb | `font-medium`, non-link | `font-medium text-gray-900` |
| Mobile bottom tab | Icon color + label color | `text-primary-600` |

```tsx
// ✅ Sidebar active state
<div className={cn('flex items-center gap-3 rounded-r px-4 py-2.5',
  isActive
    ? 'border-l-[3px] border-primary bg-primary/5 font-medium text-primary-700'
    : 'text-gray-600 hover:bg-gray-50')}>

// ✅ AntD Menu — selectedKeys handles active state automatically
<Menu selectedKeys={[pathname]} items={menuItems} />

// ❌ WRONG: No visual active indicator (user doesn't know where they are)
// ❌ WRONG: Only color change without structural indicator (border/bg)
```

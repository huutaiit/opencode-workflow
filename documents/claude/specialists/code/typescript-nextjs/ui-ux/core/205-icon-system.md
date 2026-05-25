# Icon System Specialist
# アイコンシステムスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 205.1–205.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Icon sizing, SVG standards, AntD Icons integration, naming conventions |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | — |

---

## Rules

### 205.1 — Sizing Scale

| Size | px | Tailwind | Use |
|------|-----|---------|-----|
| xs | 12 | w-3 h-3 | Inline badges |
| sm | 16 | w-4 h-4 | Inline with text, table cells |
| md | 20 | w-5 h-5 | Buttons, form labels |
| lg | 24 | w-6 h-6 | Navigation, standalone |
| xl | 32 | w-8 h-8 | Empty states, feature icons |
| 2xl | 40 | w-10 h-10 | Hero sections |

```tsx
// ✅ Consistent sizing with Tailwind
<CheckCircleOutlined className="w-4 h-4 text-success" />  {/* inline */}
<SearchOutlined className="w-5 h-5" />  {/* button icon */}
<InboxOutlined className="w-8 h-8 text-muted" />  {/* empty state */}
```

### 205.2 — Stroke vs Fill Convention

- **Outlined** (stroke): Default — lighter, modern feel
- **Filled**: Active/selected states only
- ❌ NEVER mix outlined and filled in same context

```tsx
// ✅ Outlined by default, filled when active
<HeartOutlined />       {/* default */}
<HeartFilled />         {/* active/selected */}
<StarOutlined />        {/* unrated */}
<StarFilled />          {/* rated */}
```

### 205.3 — SVG Requirements

- `viewBox="0 0 24 24"` for all custom icons
- `fill="currentColor"` or `stroke="currentColor"` — inherits text color
- No hardcoded colors in SVG paths

```tsx
// ✅ Custom SVG icon
<svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
  <path d="M12 2L2 12h3v8h14v-8h3L12 2z" />
</svg>
```

### 205.4 — Icon + Text Alignment

- Use `flex items-center gap-1.5` for icon + text
- Icon size matches text size (text-sm → w-4, text-base → w-5)

```tsx
// ✅ Aligned icon + text
<span className="inline-flex items-center gap-1.5">
  <CalendarOutlined className="w-4 h-4" />
  <span className="text-sm">2026年4月5日</span>
</span>
```

### 205.5 — Naming Conventions (AntD Icons)

| Category | Pattern | Example |
|----------|---------|---------|
| Action | `{Action}Outlined` | `EditOutlined`, `DeleteOutlined` |
| Status | `{Status}CircleOutlined` | `CheckCircleOutlined`, `CloseCircleOutlined` |
| Navigation | `{Direction}Outlined` | `LeftOutlined`, `MenuOutlined` |
| Content | `{Object}Outlined` | `FileOutlined`, `UserOutlined` |

### 205.6 — Accessibility

- Decorative icons: `aria-hidden="true"` (AntD default)
- Meaningful icons (no text): `aria-label="description"`

```tsx
// ✅ Decorative (has text label)
<Button><EditOutlined aria-hidden="true" /> Edit</Button>
// ✅ Meaningful (icon-only button)
<Button icon={<DeleteOutlined />} aria-label="Delete record" />
```

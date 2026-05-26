# Border Radius Specialist
# ボーダーラジアススペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 204.1–204.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Radius scale, consistency rules, component-type mapping |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | 119.x tailwind-css-specialist |

---

## Rules

### 204.1 — Radius Scale

| Token | AntD | Tailwind | px | Use |
|-------|------|---------|-----|-----|
| xs | — | rounded-xs | 2 | Badges, tags |
| sm | borderRadiusSM (4) | rounded-sm | 4 | Small buttons, chips |
| base | borderRadius (6) | rounded-md | 6 | Inputs, buttons (AntD default) |
| lg | borderRadiusLG (8) | rounded-lg | 8 | Cards, modals |
| xl | — | rounded-xl | 12 | Large cards, hero sections |
| full | — | rounded-full | 9999 | Avatars, pills |

### 204.2 — Component Type Mapping

| Component | Radius | Tailwind |
|-----------|--------|---------|
| Button | base (6px) | rounded-md |
| Input, Select | base (6px) | rounded-md |
| Card | lg (8px) | rounded-lg |
| Modal | lg (8px) | rounded-lg |
| Avatar | full | rounded-full |
| Badge/Tag | sm (4px) | rounded-sm |
| Tooltip | base (6px) | rounded-md |
| Dropdown | lg (8px) | rounded-lg |

```tsx
// ✅ Consistent radius by component type
<Card className="rounded-lg">
<Button className="rounded-md">
<Avatar className="rounded-full">
<Tag className="rounded-sm">
```

### 204.3 — Nested Radius Rule

Inner radius = outer radius - padding. Prevents visual mismatch.

```tsx
// ✅ Outer: rounded-lg (8px), padding: p-2 (8px) → inner: rounded-sm (8-8≈0-4px)
<div className="rounded-lg p-2">
  <div className="rounded-sm bg-gray-100 p-4">Inner content</div>
</div>
```

### 204.4 — Consistency Rule

- Same component type = same radius everywhere
- ❌ WRONG: Button rounded-lg on page A, rounded-sm on page B
- AntD ConfigProvider enforces global consistency via `borderRadius` token

### 204.5 — Square Corners (When)

- Data tables: `rounded-none` for cells (sharp grid alignment)
- Full-width sections: `rounded-none` (touches screen edge)
- Dividers/separators: no radius needed

# Component States Specialist
# コンポーネントステートスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 206.1–206.9 |
| **Specialist Type** | rule-set |
| **Purpose** | 9 interactive states, opacity overlays, cursors, skeleton patterns, optimistic UI |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | 96.x web-design-guidelines, 82.x crud-page-patterns |

---

## Rules

### 206.1 — Default State

Base appearance — no visual modifiers.

```tsx
<Button className="bg-primary text-white rounded-md px-4 py-2">Action</Button>
```

### 206.2 — Hover State

Visual highlight on mouse enter. Timing: 150ms ease-out.

```tsx
// ✅ Tailwind hover
<Button className="bg-primary hover:bg-primary/90 transition-colors duration-150">
<div className="border hover:border-primary hover:shadow-sm transition-all duration-150">
// AntD: built-in hover states for Button, Input, Card
```

### 206.3 — Focus State

Keyboard focus indicator. MUST meet WCAG 2.4.11 (≥2px, 3:1 contrast).

```tsx
// ✅ Focus ring
<Button className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2">
<Input className="focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary">
// ❌ WRONG: outline-none without replacement — breaks keyboard nav
```

### 206.4 — Active/Pressed State

Depressed feel on click. Timing: 100ms ease-out.

```tsx
<Button className="active:scale-[0.98] active:bg-primary/80 transition-transform duration-100">
```

### 206.5 — Disabled State

38% opacity for content. Cursor: not-allowed.

```tsx
// ✅ AntD: disabled prop handles styling
<Button disabled>Can't click</Button>
// ✅ Custom: opacity + cursor
<div className="opacity-38 cursor-not-allowed pointer-events-none">
  <Select disabled />
</div>
```

### 206.6 — Loading State

Spinner/skeleton during async operations.

```tsx
// ✅ AntD Button loading
<Button type="primary" loading={isSubmitting}>
  {isSubmitting ? '保存中...' : '保存'}
</Button>

// ✅ Skeleton for data loading
{isLoading ? (
  <Skeleton active paragraph={{ rows: 4 }} />
) : (
  <DataDisplay data={data} />
)}

// ✅ Tailwind shimmer animation
<div className="animate-pulse rounded-md bg-muted h-4 w-3/4" />
```

### 206.7 — Error State

Red border + icon + message. WCAG: color alone insufficient.

```tsx
// ✅ AntD Form error
<Form.Item
  name="email"
  rules={[{ required: true, message: 'メールアドレスは必須です' }]}
  validateStatus="error"
  help="メールアドレスは必須です"
>
  <Input status="error" />
</Form.Item>

// ✅ Custom error state
<div className="border-error ring-1 ring-error/30 bg-error/5 rounded-md p-3">
  <AlertCircle className="w-4 h-4 text-error" />
  <span className="text-sm text-error">Validation failed</span>
</div>
```

### 206.8 — Selected State

Check/fill for selected items. 8-12% primary overlay.

```tsx
// ✅ Selected row in table
<tr className={cn(
  "cursor-pointer transition-colors",
  isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-gray-50"
)}>

// ✅ Selected card
<Card className={cn(
  "cursor-pointer border-2 transition-all",
  isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-gray-200"
)}>
```

### 206.9 — Dragged State

Elevated appearance during drag. 16% primary overlay.

```tsx
// ✅ Dragging state
<div className={cn(
  "transition-all",
  isDragging && "opacity-80 shadow-lg ring-2 ring-primary/20 scale-[1.02]"
)}>
```

<!-- State summary: Default→Hover(150ms)→Focus(0ms)→Active(100ms)→Disabled(38%)→Loading→Error→Selected→Dragged -->

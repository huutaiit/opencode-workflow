# Chart Theming Specialist
# チャートテーミングスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 232.1–232.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Chart axis, tooltip, legend, responsive sizing, dark mode colors, AntD token integration |
| **Activation Trigger** | Chart styling, visualization theming |
| **Complements** | 200.x color-system, 230.x chart-types |

---

## Rules

### 232.1 — Axis Color Rules

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Axis line | `text-gray-400` (#9ca3af) | `text-gray-600` (#4b5563) |
| Axis label | `text-gray-600` (#4b5563) | `text-gray-400` (#9ca3af) |
| Grid line | `border-gray-200` (#e5e7eb) | `border-gray-700` (#374151) |
| Tick mark | `text-gray-400` | `text-gray-500` |

- ✅ Axis labels: `className="text-xs text-gray-600 dark:text-gray-400"`
- ❌ NEVER use `text-gray-300` for axis in light mode — fails WCAG contrast

### 232.2 — Tooltip Styling

```tsx
// ✅ Tooltip container
<div className="rounded-lg shadow-lg bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 min-w-[160px]">
  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
  <p className="text-sm text-gray-600 dark:text-gray-400">{value}</p>
</div>
```

- ✅ Use AntD token `colorBgElevated` for tooltip background
- ✅ `shadow-lg` + `rounded-lg` for floating appearance
- ✅ Min-width 160px to prevent text clipping (JP text wider)
- ❌ NEVER use browser-default tooltip — always custom styled

### 232.3 — Legend Layout

| Screen | Layout | Position |
|--------|--------|----------|
| Desktop (≥768px) | Horizontal | Top-center above chart |
| Desktop (wide charts) | Vertical | Right side of chart |
| Mobile (<768px) | Horizontal | Below chart, scrollable |

```tsx
// ✅ Legend item
<span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
  <span className="size-3 rounded-sm" style={{ backgroundColor: seriesColor }} />
  {seriesName}
</span>
```

- ✅ Max 8 legend items visible — overflow as "+N more" popover
- ❌ NEVER hide legend entirely — always show series identification

### 232.4 — Responsive Chart Container

```tsx
// ✅ Responsive container
<div className="w-full min-h-[240px] md:min-h-[320px] lg:min-h-[400px] relative">
  <ChartComponent className="absolute inset-0" />
</div>
```

| Breakpoint | Min Height | Aspect Hint |
|-----------|-----------|------------|
| Mobile (<640px) | 240px | 4:3 |
| Tablet (640–1024px) | 320px | 16:9 |
| Desktop (>1024px) | 400px | 16:9 |

- ✅ Use `ResizeObserver` for container-query based resizing
- ❌ NEVER set fixed pixel width — always `className="w-full"`

### 232.5 — Dark Mode Chart Colors

Lighter palette — no pure black backgrounds.

| Series | Light | Dark |
|--------|-------|------|
| Primary | #1677ff | #4096ff (lighter blue) |
| Series 2 | #52c41a | #73d13d |
| Series 3 | #faad14 | #ffc53d |
| Series 4 | #f5222d | #ff4d4f |
| Series 5 | #722ed1 | #9254de |
| Chart BG | #ffffff | #1c2128 (NOT #000000) |

- ✅ Increase saturation +10% for dark mode visibility
- ❌ NEVER use pure black (#000000) as chart background

### 232.6 — AntD Theme Token Integration

```tsx
// ✅ Read tokens from AntD theme context
import { theme } from 'antd';

const { token } = theme.useToken();

const chartTheme = {
  axisColor: token.colorTextSecondary,
  gridColor: token.colorBorderSecondary,
  tooltipBg: token.colorBgElevated,
  fontFamily: token.fontFamily,
  fontSize: token.fontSize,
};
```

- ✅ Derive chart colors from AntD tokens — single source of truth
- ✅ Re-render chart on theme change (light ↔ dark)
- ❌ NEVER hardcode chart colors independent of AntD theme

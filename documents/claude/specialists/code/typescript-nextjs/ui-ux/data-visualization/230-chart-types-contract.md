# Chart Types Contract Specialist
# チャートタイプ契約スペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 230.1–230.10 |
| **Specialist Type** | contract |
| **Purpose** | Chart type catalog with capabilities, data shape, and JP banking requirements |
| **Activation Trigger** | Chart/graph rendering, data visualization selection |
| **Complements** | 232.x chart-theming, 231.x bi-output |

---

## Rules

### 230.1 — Bar Chart (棒グラフ)

Use for categorical comparison. Horizontal for long labels (JP text).

| Capability | Required |
|-----------|----------|
| Data shape | `{ category: string; value: number; group?: string }[]` |
| When to use | Comparing discrete categories, 帳票 quarterly summaries |
| Stacked | Optional — grouped or stacked for multi-series |

- ✅ Horizontal bars for JP labels (部門名 can be 10+ chars)
- ❌ NEVER vertical bars with rotated JP text — unreadable

### 230.2 — Line Chart (折れ線グラフ)

Use for time-series trends.

| Capability | Required |
|-----------|----------|
| Data shape | `{ date: string; value: number; series?: string }[]` |
| When to use | Trend over time, monthly revenue (月次推移) |
| Interpolation | Linear default, monotone for financial data |

### 230.3 — Pie / Donut Chart (円グラフ)

Use for part-to-whole (≤7 segments).

| Capability | Required |
|-----------|----------|
| Data shape | `{ label: string; value: number }[]` |
| When to use | Composition breakdown, portfolio allocation |
| Constraint | Max 7 segments — group remainder as "その他" |

### 230.4 — Area Chart (面グラフ)

Stacked area for cumulative trends. Requires opacity < 0.7 for overlap visibility.

### 230.5 — Heatmap (ヒートマップ)

Grid of intensity values. Use sequential palette (light → dark). Color-blind safe: blue→yellow scale.

### 230.6 — Treemap (ツリーマップ)

Hierarchical proportions. Min cell size 48×48px for touch targets. Label inside cell with `className="truncate text-xs"`.

### 230.7 — Funnel (ファネルチャート)

Conversion pipeline. Top-to-bottom with percentage drop labels between stages.

### 230.8 — Waterfall (ウォーターフォール)

Cumulative effect of sequential values. Color coding: increase=`text-success`, decrease=`text-error`, total=`text-primary`.

### 230.9 — Candlestick (ローソク足)

JP banking/financial: open-high-low-close. Data shape: `{ date: string; open: number; high: number; low: number; close: number }[]`. 陽線=`fill-error` (red=up in JP convention), 陰線=`fill-primary` (blue=down).

### 230.10 — JP Banking Format Rules (帳票・色覚バリアフリー)

- ✅ 万/億 number formatting: `1億2,345万` via `formatJPNumber(123450000)`
- ✅ 色覚バリアフリー (color-blind accessible): pair color with pattern/icon
- ✅ 帳票 format: consistent axis labels, grid lines, title with 年月 date range
- ❌ NEVER use red/green as sole differentiator
- ❌ NEVER display raw numbers > 10,000 without 万/億 grouping in JP financial context

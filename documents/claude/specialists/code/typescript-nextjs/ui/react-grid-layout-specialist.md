# React Grid Layout Specialist
# React Grid Layoutスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | Dashboard components, widget containers |
| **Variant** | ALL |
| **Pattern Numbers** | 120.1–120.6 |
| **Source Paths** | Dashboard/widget components using react-grid-layout |
| **File Count** | Varies |
| **Naming Convention** | PascalCase: `DashboardGrid`, `WidgetCard` |
| **Imports From** | `react-grid-layout`, `react-resizable` |
| **Imported By** | Dashboard pages, admin panels |
| **Cannot Import** | N/A |
| **Dependencies** | react-grid-layout@1.5, react-resizable@3 |
| **When To Use** | Dashboard widget layout with drag-resize |
| **Source Skeleton** | `components/dashboards/DashboardGrid.tsx`, `hooks/useDashboardLayout.ts` |
| **Specialist Type** | tool |
| **Purpose** | React Grid Layout: dashboard widget layout, responsive breakpoints, drag-resize, serialization, dynamic widgets |
| **Activation Trigger** | react-grid-layout, dashboard, widget, grid layout, drag, resize, responsive grid |

---

## Description

Dashboard widget layout system using react-grid-layout. Extracted from StarX4CRM dashboard patterns (executive/manager/employee dashboards with drag-resize widgets).

---

## Rules

### 120.1 — Basic Responsive Grid

```typescript
'use client'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

interface DashboardWidget {
  id: string
  type: string
  title: string
}

interface DashboardGridProps {
  widgets: DashboardWidget[]
  layouts: ReactGridLayout.Layouts
  onLayoutChange: (layouts: ReactGridLayout.Layouts) => void
}

export function DashboardGrid({ widgets, layouts, onLayoutChange }: DashboardGridProps) {
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={80}
      onLayoutChange={(_, allLayouts) => onLayoutChange(allLayouts)}
      draggableHandle=".widget-drag-handle"
      isResizable
      isDraggable
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="rounded-lg border bg-white shadow-sm">
          <div className="widget-drag-handle cursor-grab border-b px-4 py-2">
            <h3 className="text-sm font-medium">{widget.title}</h3>
          </div>
          <div className="p-4">
            <WidgetRenderer type={widget.type} id={widget.id} />
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}
```

### 120.2 — Layout Serialization (Persist/Restore)

```typescript
// ✅ Save layout to backend/localStorage
function saveLayout(layouts: ReactGridLayout.Layouts) {
  localStorage.setItem('dashboard-layouts', JSON.stringify(layouts))
  // Or: await api.post('/dashboard/layout', { layouts })
}

// ✅ Restore layout
function loadLayout(): ReactGridLayout.Layouts | undefined {
  const saved = localStorage.getItem('dashboard-layouts')
  return saved ? JSON.parse(saved) : undefined
}

// ✅ Default layout generation
function generateDefaultLayout(widgets: DashboardWidget[]): ReactGridLayout.Layouts {
  const lg = widgets.map((widget, i) => ({
    i: widget.id,
    x: (i % 3) * 4,
    y: Math.floor(i / 3) * 4,
    w: 4,
    h: 3,
    minW: 2,
    minH: 2,
  }))
  return { lg, md: lg, sm: lg }
}
```

### 120.3 — Dynamic Widget Add/Remove

```typescript
'use client'
import { useState, useCallback } from 'react'

export function DashboardEditor() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialWidgets)
  const [layouts, setLayouts] = useState<ReactGridLayout.Layouts>({})

  const addWidget = useCallback((type: string) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type} Widget`,
    }
    setWidgets((prev) => [...prev, newWidget])
    // Layout auto-generates position for new items
  }, [])

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id))
    // react-grid-layout auto-removes from layout
  }, [])

  return (
    <>
      <WidgetToolbar onAdd={addWidget} />
      <DashboardGrid
        widgets={widgets}
        layouts={layouts}
        onLayoutChange={setLayouts}
        onRemove={removeWidget}
      />
    </>
  )
}
```

### 120.4 — Drag Handle Pattern

```tsx
// ✅ Restrict drag to specific handle (not entire widget)
<ResponsiveGridLayout draggableHandle=".widget-drag-handle">
  <div key="chart-1">
    {/* Only this div triggers drag */}
    <div className="widget-drag-handle cursor-grab">
      <GripIcon className="h-4 w-4" />
      <span>Chart Title</span>
    </div>
    {/* Content area — scroll, click, interact freely */}
    <div className="overflow-auto">
      <ChartComponent />
    </div>
  </div>
</ResponsiveGridLayout>
```

### 120.5 — SSR Handling (Next.js)

```typescript
// ✅ react-grid-layout requires window — dynamic import with ssr: false
import dynamic from 'next/dynamic'

const DashboardGrid = dynamic(
  () => import('@/components/dashboards/DashboardGrid'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardGrid />
    </Suspense>
  )
}
```

### 120.6 — Performance

- Use `useMemo` for layout calculations
- `draggableHandle` prevents unnecessary drag detection on content
- Avoid re-rendering all widgets on layout change — use `React.memo` on widget components
- Debounce `onLayoutChange` saves (don't save on every pixel move)

```typescript
const handleLayoutChange = useMemo(
  () => debounce((layouts: ReactGridLayout.Layouts) => {
    saveLayout(layouts)
  }, 500),
  []
)
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | SSR with react-grid-layout | Requires window — crashes on server | Dynamic import `ssr: false` |
| 2 | No drag handle | Entire widget becomes draggable — can't interact with content | `draggableHandle` class |
| 3 | Save layout on every change | Too many saves during drag | Debounce 500ms |
| 4 | No default layout | Empty grid on first visit | Generate from widget list |
| 5 | Missing CSS imports | Grid renders without styles | Import both CSS files |

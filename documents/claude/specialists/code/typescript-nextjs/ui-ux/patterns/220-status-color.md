# Status Color Specialist
# ステータスカラースペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 220.1–220.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Semantic status categories, badge/indicator patterns, color-blind safe palettes |
| **Activation Trigger** | status color, badge color, indicator color, tag color, semantic status |
| **Complements** | 200.x color-system, 206.x component-states |

---

## Rules

### 220.1 — Control Status (System State)

| Status | AntD Color | Tailwind | Icon |
|--------|-----------|----------|------|
| Active | `color="green"` | `text-success` | CheckCircle |
| Inactive | `color="default"` | `text-muted` | MinusCircle |
| Disabled | `color="default"` | `text-gray-400 opacity-60` | StopOutlined |

```tsx
// ✅ AntD Tag with icon
<Tag icon={<CheckCircleOutlined />} color="success">Active</Tag>
<Tag icon={<MinusCircleOutlined />} color="default">Inactive</Tag>

// ❌ WRONG: Color alone without icon
<Tag color="green">Active</Tag>  // → fails color-blind safety
```

### 220.2 — Action Status (Operations)

| Status | AntD Color | Tailwind | Icon |
|--------|-----------|----------|------|
| Success | `color="success"` | `text-success` | CheckCircle |
| Failed | `color="error"` | `text-error` | CloseCircle |
| Pending | `color="warning"` | `text-warning` | ClockCircle |

### 220.3 — Workflow Status (Process)

| Status | AntD Color | Tailwind | Icon |
|--------|-----------|----------|------|
| Draft | `color="default"` | `text-muted` | FileOutlined |
| In Review | `color="processing"` | `text-info` | SyncOutlined |
| Approved | `color="success"` | `text-success` | CheckOutlined |
| Rejected | `color="error"` | `text-error` | CloseOutlined |

### 220.4 — User Interaction Status

| Status | AntD Color | Tailwind | Icon |
|--------|-----------|----------|------|
| Online | `color="green"` | `text-success` | — (dot) |
| Away | `color="orange"` | `text-warning` | — (dot) |
| Offline | `color="default"` | `text-muted` | — (dot) |

```tsx
// ✅ Badge dot indicator
<Badge status="success" text="Online" />
<Badge status="warning" text="Away" />
<Badge status="default" text="Offline" />
```

### 220.5 — AI / Special Status

| Status | AntD Color | Tailwind | Icon |
|--------|-----------|----------|------|
| AI Generated | `color="purple"` | `text-purple-600` | RobotOutlined |
| Beta | `color="cyan"` | `text-cyan-600` | ExperimentOutlined |
| Deprecated | `color="red"` | `text-error` | WarningOutlined |

```tsx
// ✅ Distinct category via color + icon + label
<Tag icon={<RobotOutlined />} color="purple">AI Generated</Tag>
<Tag icon={<ExperimentOutlined />} color="cyan">Beta</Tag>
```

### 220.6 — Color-Blind Safe Palette

- ✅ Every status uses icon + color + text label (triple redundancy)
- ✅ Adjacent status colors differ by ≥30° hue AND ≥3:1 luminance contrast
- ✅ Use AntD `status` prop on Badge (renders accessible dot patterns)
- ❌ NEVER distinguish statuses by hue alone (red vs green)
- ❌ NEVER use `color` prop without accompanying `icon` prop on Tag

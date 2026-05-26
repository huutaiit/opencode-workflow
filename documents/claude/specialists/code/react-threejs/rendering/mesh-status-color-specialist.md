# Mesh Status Color Specialist
# Mesh Status Color スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Rendering (status-based color and opacity calculation) |
| **Directory Pattern** | Inline color logic within `Model` component in `features/{viewer}/components/` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 1.20–1.24 |
| **Source Paths** | `**/ThreeEditor.tsx`, `**/3dViewer.tsx`, `**/Mode2dEditor.tsx`, `**/PlayHistory.tsx` |
| **File Count** | 4 files with color calculation logic (~50 LOC each, inline) |
| **Naming Convention** | Inline logic block within `Model` component (no separate file) |
| **Imports From** | State (Redux meshSettingState for transferTime, locationSelectorState for pumpSelect) |
| **Cannot Import** | API (services), Camera (controls), Settings (subsystem components) |
| **Imported By** | Rendering (Model component uses calculated color/opacity for meshStandardMaterial) |
| **Dependencies** | None (uses framework core only — color strings and arithmetic) |
| **When To Use** | Calculating mesh appearance from 5-level priority chain: active selection → pump filter → warning → status+slim → default |
| **Source Skeleton** | Inline logic within `Model` component in `features/{viewer}/components/ThreeEditor.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate mesh color and opacity calculation following the 5-level priority chain (active, pump filter, warning, status+slim, default) with configurable transferTime opacity formula |
| **Activation Trigger** | files: **/ThreeEditor.tsx, **/3dViewer.tsx; keywords: meshColor, statusColor, opacity, transferTime, warningStatus, isSlim |

---

## Specialist Identity

```pseudo
SPECIALIST MeshStatusColorSpecialist {
  ROLE: "Mesh appearance calculation expert for construction status visualization"

  RESPONSIBILITIES: [
    "Calculate mesh color based on 5-level priority chain",
    "Calculate mesh opacity from transferTime formula",
    "Apply slim mode color overrides",
    "Apply pump filter gray-out",
    "Apply active selection highlight",
    "Source colors from meshSettingState Redux slice"
  ]

  DOMAIN_CONTEXT: {
    statuses: "BeforePumping, DuringPumping, FinishPumping",
    warnings: "WarningTimeExceeded, TimeLimitExceeded",
    slim_mode: "Thin-layer casting with different color scheme",
    pump_filter: "Gray out meshes not assigned to selected pump"
  }
}
```

---

## Pattern 1.20: Color Priority Chain (5 Levels)

```pseudo
WORKFLOW ColorPriorityChain_Implementation {
  PURPOSE: "Determine mesh color through ordered priority checks"

  PRIORITY_ORDER: |
    # Highest priority first — first match wins

    PRIORITY 1 — Active Selection:
      IF isMeshActive THEN
        color = '#53616E'  # Dark gray-blue
        opacity = 1.0
        RETURN

    PRIORITY 2 — Pump Filter:
      IF pumpSelect !== '' AND item.pumpId !== pumpSelect THEN
        color = '#B0B3B5'  # Gray
        opacity = 0.8
        RETURN

    PRIORITY 3 — Warning Status:
      IF item.warningStatus !== '' THEN
        meshSetting = meshSettingState.meshSettingList.find(s => s.code === item.warningStatus)
        opacity = 1 - (meshSetting.transferTime / 100)

        IF item.warningStatus === 'WarningTimeExceeded' THEN
          color = '#f766ff'  # Magenta/pink
        ELSE IF item.warningStatus === 'TimeLimitExceeded' THEN
          color = '#F50505'  # Red
        END IF
        RETURN

    PRIORITY 4 — Status + Slim Mode:
      meshSetting = meshSettingState.meshSettingList.find(s => s.code === item.status)
      opacity = 1 - (meshSetting.transferTime / 100)

      IF item.isSlim THEN
        # Slim mode colors
        SWITCH item.status:
          'BeforePumping'  → color = '#FFFAFA'  # White (same)
          'DuringPumping'  → color = '#fdfc06'  # Bright yellow
          'FinishPumping'  → color = '#2670c1'  # Blue
      ELSE
        # Normal mode colors
        SWITCH item.status:
          'BeforePumping'  → color = '#FFFAFA'  # Off-white
          'DuringPumping'  → color = '#FFFF00'  # Yellow
          'FinishPumping'  → color = '#9ACD32'  # Yellow-green
                           # OR '#00B400' (green, varies by viewer)

    PRIORITY 5 — Default Fallback:
      color = '#FFFAFA'
      opacity = 1.0

  CRITICAL_RULES: [
    "Priority order is STRICT — higher priority ALWAYS wins",
    "Active selection (#53616E) overrides ALL other colors",
    "Pump filter (#B0B3B5) overrides warning and status",
    "Warning status overrides normal status colors",
    "Slim mode colors ONLY apply when isSlim === true",
    "Color values are hex strings passed to meshStandardMaterial"
  ]
}
```

---

## Pattern 1.21: Opacity Formula

```pseudo
WORKFLOW OpacityFormula_Implementation {
  BASE_FORMULA: |
    # transferTime from meshSettingState (range 0-100)
    opacity = 1 - (meshSetting.transferTime / 100)

    # Examples:
    # transferTime = 0   → opacity = 1.0 (fully opaque)
    # transferTime = 30  → opacity = 0.7
    # transferTime = 50  → opacity = 0.5
    # transferTime = 100 → opacity = 0.0 (fully transparent)

  OVERRIDES: {
    ACTIVE_SELECTION: "opacity = 1.0 (always fully opaque)",
    PUMP_FILTER: "opacity = 0.8 (slightly transparent gray)",
    DEFAULT: "opacity = 1.0 (when no meshSetting found)"
  }

  DATA_SOURCE: |
    # meshSettingState.meshSettingList: IMeshSetting[]
    # Each entry:
    {
      code: 'BeforePumping' | 'DuringPumping' | 'FinishPumping' | 'WarningTimeExceeded' | 'TimeLimitExceeded',
      colorName: string,     # Display name
      transferTime: number   # 0-100 (used for opacity calculation)
    }

  CRITICAL_RULES: [
    "transferTime is per-STATUS, not per-mesh — all BeforePumping meshes share same opacity",
    "meshSettingState is loaded from API via meshSettingActions.fetch()",
    "User can configure transferTime in settings (メッシュ透過率設定 modal)",
    "Opacity applies to meshStandardMaterial.opacity WITH transparent=true"
  ]
}
```

---

## Pattern 1.22: Color Reference Table

```pseudo
COLOR_REFERENCE: {
  NORMAL_MODE: {
    'BeforePumping':         { color: '#FFFAFA', name: 'Snow White' },
    'DuringPumping':         { color: '#FFFF00', name: 'Yellow' },
    'FinishPumping':         { color: '#9ACD32', name: 'Yellow Green' }
    # Note: Some viewers use '#00B400' (pure green) for FinishPumping
  }

  SLIM_MODE: {
    'BeforePumping':         { color: '#FFFAFA', name: 'Snow White (same)' },
    'DuringPumping':         { color: '#fdfc06', name: 'Bright Lime Yellow' },
    'FinishPumping':         { color: '#2670c1', name: 'Blue' }
  }

  WARNING: {
    'WarningTimeExceeded':   { color: '#f766ff', name: 'Magenta/Pink' },
    'TimeLimitExceeded':     { color: '#F50505', name: 'Red' }
  }

  SPECIAL: {
    'ActiveSelection':       { color: '#53616E', name: 'Dark Gray-Blue', opacity: 1.0 },
    'PumpFiltered':          { color: '#B0B3B5', name: 'Light Gray', opacity: 0.8 },
    'Default':               { color: '#FFFAFA', name: 'Snow White', opacity: 1.0 }
  }
}
```

---

## Pattern 1.23: Implementation Template

```pseudo
WORKFLOW ColorCalculation_Function {
  TEMPLATE: |
    function calculateMeshAppearance(
      item: IMesh,
      meshSettingState: MeshSettingState,
      pumpSelect: string,
      isModeSlim: boolean,
      isMeshActive: boolean
    ): { color: string, opacity: number } {

      # Priority 1: Active selection
      IF isMeshActive THEN
        return { color: '#53616E', opacity: 1.0 }

      # Priority 2: Pump filter
      IF pumpSelect !== '' AND item.pumpId !== pumpSelect THEN
        return { color: '#B0B3B5', opacity: 0.8 }

      # Priority 3: Warning status
      IF item.warningStatus !== '' THEN
        setting = meshSettingState.meshSettingList.find(s => s.code === item.warningStatus)
        opacity = setting ? 1 - (setting.transferTime / 100) : 1.0
        color = item.warningStatus === 'WarningTimeExceeded' ? '#f766ff' : '#F50505'
        return { color, opacity }

      # Priority 4: Normal/Slim status
      setting = meshSettingState.meshSettingList.find(s => s.code === item.status)
      opacity = setting ? 1 - (setting.transferTime / 100) : 1.0

      IF item.isSlim THEN
        SWITCH item.status:
          'BeforePumping'  → return { color: '#FFFAFA', opacity }
          'DuringPumping'  → return { color: '#fdfc06', opacity }
          'FinishPumping'  → return { color: '#2670c1', opacity }
      ELSE
        SWITCH item.status:
          'BeforePumping'  → return { color: '#FFFAFA', opacity }
          'DuringPumping'  → return { color: '#FFFF00', opacity }
          'FinishPumping'  → return { color: '#9ACD32', opacity }

      # Priority 5: Default
      return { color: '#FFFAFA', opacity: 1.0 }
    }
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_HARDCODED_COLORS_IN_COMPONENT: "Colors come from this priority chain — never random hex in JSX",
  NO_SKIP_PRIORITY: "MUST check all 5 priority levels in order — skipping causes wrong color",
  NO_OPACITY_WITHOUT_SETTING: "Always look up meshSetting for transferTime — default to 1.0 if missing",
  NO_SLIM_WITHOUT_CHECK: "Slim colors ONLY when item.isSlim === true — check before applying",
  NO_ACTIVE_WITH_OTHER_COLOR: "Active selection (#53616E) overrides EVERYTHING — no blending"
}
```

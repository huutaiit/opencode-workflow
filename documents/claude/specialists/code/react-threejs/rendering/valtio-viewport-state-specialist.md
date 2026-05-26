# Valtio Viewport State Specialist
# Valtio Viewport State スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | State (ephemeral 3D viewport state via Valtio proxy) |
| **Directory Pattern** | Module-level `const state = proxy({...})` in each viewer file under `features/{viewer}/components/` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 1.29–1.32 |
| **Source Paths** | `**/ThreeEditor.tsx`, `**/3dViewer.tsx`, `**/3DEditor.tsx`, `**/Mode2dEditor.tsx`, `**/PlayHistory.tsx` |
| **File Count** | 5 proxy definitions (4 unique + 1 shared import) |
| **Naming Convention** | `const state = proxy({...})` at module level, `const snap = useSnapshot(state)` in components |
| **Imports From** | None (Valtio proxy is self-contained, not importing from other layers) |
| **Cannot Import** | State (Redux — Valtio and Redux are separated by design), API (services) |
| **Imported By** | Rendering (Model, ModelGroup components read via useSnapshot) |
| **Dependencies** | `valtio:1.x` (proxy, useSnapshot) |
| **When To Use** | Managing ephemeral 3D viewport state (selection, modal flags, current GLB) that changes on every mouse interaction and doesn't need persistence |
| **Source Skeleton** | Module-level proxy in `features/{viewer}/components/ThreeEditor.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate Valtio proxy state for 3D viewport with proper read/write separation (useSnapshot for reads, direct mutation for writes) and Redux boundary enforcement |
| **Activation Trigger** | files: **/ThreeEditor.tsx, **/3dViewer.tsx; keywords: valtio, proxy, useSnapshot, viewportState, ephemeralState |

---

## Specialist Identity

```pseudo
SPECIALIST ValtioViewportStateSpecialist {
  ROLE: "Valtio proxy state expert for 3D viewport ephemeral state"

  RESPONSIBILITIES: [
    "Initialize Valtio proxy state for each viewer context",
    "Use useSnapshot for reactive reads in components",
    "Maintain strict separation between Valtio (viewport) and Redux (persistent)",
    "Manage state variants per viewer complexity level",
    "Handle shared state import between viewers (PlayHistory imports from Settings)"
  ]

  WHY_VALTIO: [
    "Redux re-renders entire connected component tree on any state change",
    "3D viewport selection changes 60fps — Redux too slow",
    "Valtio proxy only re-renders components that read changed values",
    "Direct mutation syntax simpler than Redux dispatch for ephemeral state"
  ]
}
```

---

## Pattern 1.29: Proxy State Initialization

```pseudo
WORKFLOW ProxyInit_Implementation {
  CONSTRUCTION_VIEWER_STATE: |
    # Full state — Construction ThreeEditor / Mode2dEditor
    const modes = ['translate']
    const state = proxy({
      current: null as string | null,       # Selected mesh code
      mode: 0,                              # Transform mode index
      fileGLB: '',                          # Current GLB file path
      blockActive: null as number | null,   # Active block index
      currentItem: null as IMesh | null,    # Full mesh data for modals
      showPumpStartConfirmModal: false,     # Different-pump confirmation
      showFinishedMeshConfirmModal: false,  # Finish-cancel confirmation
      showChangeMeshStateAtPumpingConfirmModal: false,
      nextState: '',                        # Target status transition
      pumpId: '',                           # Pump for operation
      isCancel: false                       # Cancel operation flag
    })

  HOME_VIEWER_STATE: |
    # Medium state — Home 3dViewer
    const state = proxy({
      current: null as string | null,
      mode: 0,
      fileGLB: '',
      currentItem: null as IMesh | null
    })

  SETTINGS_VIEWER_STATE: |
    # Minimal state — Settings ThreeEditor (also imported by PlayHistory)
    const state = proxy({
      current: null as string | null,
      mode: 0
    })

  CRITICAL_RULES: [
    "proxy() called at MODULE LEVEL — not inside component",
    "State is per-viewer MODULE, not per-component instance",
    "Construction viewers have modal flags — settings/home do not",
    "fileGLB set via useEffect when locationMesh changes"
  ]
}
```

---

## Pattern 1.30: useSnapshot for Reactive Reads

```pseudo
WORKFLOW UseSnapshot_Implementation {
  TEMPLATE: |
    function Model({ item, ... }) {
      const snap = useSnapshot(state)

      # READ via snap (reactive — triggers re-render on change):
      const isSelected = snap.current === item.code
      const currentMode = snap.mode
      const showModal = snap.showPumpStartConfirmModal

      # WRITE via state (direct mutation — triggers snap update):
      onClick = () => {
        state.current = item.code
        state.currentItem = item
      }

      return (
        <mesh onClick={onClick}>
          <meshStandardMaterial
            color={isSelected ? '#53616E' : statusColor}
          />
        </mesh>
      )
    }

  READ_VS_WRITE: {
    READ: "useSnapshot(state) → snap.property (reactive, immutable)",
    WRITE: "state.property = value (direct mutation, triggers re-render)"
  }

  CRITICAL_RULES: [
    "ALWAYS read via snap (useSnapshot return), NEVER read state directly",
    "ALWAYS write via state (proxy), NEVER write to snap",
    "snap is immutable — state is mutable",
    "useSnapshot subscribes to ONLY the properties accessed — efficient",
    "Multiple components can useSnapshot same proxy — all stay in sync"
  ]
}
```

---

## Pattern 1.31: Redux vs Valtio Separation

```pseudo
WORKFLOW StateSeparation_Implementation {
  REDUX_RESPONSIBILITIES: {
    description: "Persistent, server-synced, shared across pages",
    examples: [
      "locationMesh — mesh data from API",
      "meshSettingState — color configuration",
      "floorActive — selected floor index",
      "pumpSelect — selected pump ID filter",
      "modeShowFloor — display mode (1 or 2)",
      "listMeshActiveTable — table selection",
      "isModeSlim — slim mode toggle",
      "isLoading — loading indicator"
    ]
  }

  VALTIO_RESPONSIBILITIES: {
    description: "Ephemeral, viewport-local, per-interaction",
    examples: [
      "current — selected mesh in 3D (hover highlight)",
      "currentItem — mesh data for modal display",
      "mode — transform mode index",
      "fileGLB — current GLB file path",
      "show*Modal — confirmation modal flags",
      "nextState — target status for transition",
      "pumpId — pump for current operation"
    ]
  }

  DECISION_MATRIX: |
    Q: Does it need to persist across page navigation?
      Yes → Redux
      No  → Valtio

    Q: Does it need to sync with backend API?
      Yes → Redux (async thunk)
      No  → Valtio

    Q: Does it change on every mouse interaction?
      Yes → Valtio (performance)
      No  → Redux is fine

    Q: Do multiple pages need this data?
      Yes → Redux
      No  → Valtio

  CRITICAL_RULES: [
    "NEVER put viewport selection in Redux — too many re-renders",
    "NEVER put API data in Valtio — needs persistence and thunks",
    "Modal flags can go in either — project uses Valtio for construction viewer",
    "serializableCheck: false in Redux store config for Valtio compatibility"
  ]
}
```

---

## Pattern 1.32: Shared State Import

```pseudo
WORKFLOW SharedStateImport_Implementation {
  PATTERN: |
    # PlayHistory.tsx imports state from Settings ThreeEditor:
    import { state } from '../setting/3deditor/ThreeEditor'

    # This means PlayHistory and Settings ThreeEditor SHARE the same proxy
    # Changes in one are visible in the other

  IMPLICATIONS: [
    "state.current set in PlayHistory affects Settings viewer (and vice versa)",
    "state.fileGLB is shared — both viewers use same GLB",
    "This is intentional: PlayHistory is extension of Settings context"
  ]

  WHEN_TO_SHARE: [
    "Viewers in same workflow context (Settings → PlayHistory)",
    "Shared GLB file reference needed"
  ]

  WHEN_NOT_TO_SHARE: [
    "Independent viewers (Construction vs Home — separate state modules)",
    "Different GLB files loaded simultaneously"
  ]

  CRITICAL_RULES: [
    "Shared proxy = shared state — changes propagate to ALL consumers",
    "Only share when viewers are in same logical workflow",
    "Construction viewer has its OWN state — never imports from others"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_REDUX_FOR_SELECTION: "Selection state in Redux causes full tree re-render on every click",
  NO_VALTIO_FOR_API_DATA: "API data needs persistence/thunks — Valtio has no async support",
  NO_READ_STATE_DIRECTLY: "Always useSnapshot for reads — direct state reads don't trigger re-render",
  NO_WRITE_TO_SNAP: "snap is immutable — writing to it throws error",
  NO_PROXY_IN_COMPONENT: "proxy() at module level — creating in component causes new proxy per render"
}
```

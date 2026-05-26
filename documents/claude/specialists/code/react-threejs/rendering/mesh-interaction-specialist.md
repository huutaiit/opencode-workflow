# Mesh Interaction Specialist
# Mesh Interaction スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Rendering (3D mesh click, hover, selection events) |
| **Directory Pattern** | Inline event handlers within `Model` component in `features/{viewer}/components/` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 1.15–1.19 |
| **Source Paths** | `**/ThreeEditor.tsx`, `**/3dViewer.tsx`, `**/Mode2dEditor.tsx`, `**/PlayHistory.tsx` |
| **File Count** | 4 files with interaction handlers (construction has complex modal triggers) |
| **Naming Convention** | Inline handlers: `onClick`, `onPointerOver`, `onPointerOut`, `onPointerMissed` |
| **Imports From** | State (Valtio proxy for selection state), Realtime (pumping lifecycle triggers modals) |
| **Cannot Import** | API (services directly — status changes go through Redux thunks), Camera (controls) |
| **Imported By** | Rendering (Model component contains these handlers) |
| **Dependencies** | `@react-three/drei:8.x` (useCursor), `valtio:1.x` (useSnapshot) |
| **When To Use** | Adding click-to-select, hover feedback, pointer miss deselection, or context menu to 3D meshes |
| **Source Skeleton** | Inline handlers within `Model` component in `features/{viewer}/components/ThreeEditor.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate mesh interaction handlers with click selection, hover cursor feedback, pointer miss deselection, and construction modal triggers |
| **Activation Trigger** | files: **/ThreeEditor.tsx, **/3dViewer.tsx; keywords: onClick, onPointerOver, onPointerMissed, useCursor, meshSelection |

---

## Specialist Identity

```pseudo
SPECIALIST MeshInteractionSpecialist {
  ROLE: "3D mesh interaction expert for construction pumping workflow"

  RESPONSIBILITIES: [
    "Handle mesh click for status change workflow",
    "Provide hover feedback with cursor change",
    "Handle pointer miss for deselection",
    "Manage selection state via Valtio proxy",
    "Trigger confirmation modals based on mesh status and pump context",
    "Sync 3D selection with table (bidirectional)"
  ]
}
```

---

## Pattern 1.15: Click Handler

```pseudo
WORKFLOW ClickHandler_Implementation {
  CONSTRUCTION_VIEWER: |
    # ThreeEditor (complex — triggers pumping workflow)
    onClick={(e) => {
      e.stopPropagation()
      state.current = item.code
      state.currentItem = item
      state.pumpId = pumpId

      # Branch based on pump assignment and status
      IF item.pumpId !== pumpId THEN
        # Different pump — show pump start confirmation
        IF item.status === 'DuringPumping' THEN
          error("打設開始済みです")
          return
        END IF
        IF item.status === 'FinishPumping' THEN
          error("打設済みです")
          return
        END IF
        state.showPumpStartConfirmModal = true
        state.nextState = STATUS_MESH[1]  # DuringPumping
      ELSE IF item.status === 'FinishPumping' THEN
        state.showFinishedMeshConfirmModal = true
      ELSE
        # Same pump, not finished — show action options
        state.currentItem = item
      END IF
    }}

  HOME_VIEWER: |
    # 3dViewer (simple — table sync only)
    onClick={(e) => {
      e.stopPropagation()
      setActiveMeshToTable(item.code)
      # Dispatches changeMeshActiveListMesh + setShippingFromMesh
    }}

  PLAY_HISTORY: |
    # PlayHistory (read-only — select only, no actions)
    onClick={(e) => {
      e.stopPropagation()
      state.current = item.code
    }}

  SETTINGS_LOCATION: |
    # Settings/Location viewers — NO click handler (view-only)

  CRITICAL_RULES: [
    "ALWAYS e.stopPropagation() — prevent click bubbling to parent meshes",
    "Construction viewer triggers MODALS — never directly changes status",
    "Home viewer triggers TABLE SYNC — never triggers modals",
    "Play history is READ-ONLY — select for visual highlight only",
    "Settings/location viewers have NO interaction handlers"
  ]
}
```

---

## Pattern 1.16: Hover Feedback

```pseudo
WORKFLOW HoverFeedback_Implementation {
  TEMPLATE: |
    const [hovered, setHovered] = useState(false)
    useCursor(hovered)  # Changes cursor to pointer when hovered

    <mesh
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={(e) => {
        setHovered(false)
      }}
    >

  CRITICAL_RULES: [
    "useCursor(hovered) from @react-three/drei — auto-manages cursor style",
    "e.stopPropagation() on onPointerOver — prevent parent hover",
    "No visual highlight on hover (no color change) — cursor only",
    "Hover state is component-local — not in Redux or Valtio"
  ]
}
```

---

## Pattern 1.17: Pointer Miss (Deselection)

```pseudo
WORKFLOW PointerMiss_Implementation {
  TEMPLATE: |
    <mesh
      onPointerMissed={(e) => {
        IF e.type === 'click' THEN
          state.current = null
          # Deselect — clicking empty space clears selection
        END IF
      }}
    >

  CRITICAL_RULES: [
    "Check e.type === 'click' — onPointerMissed also fires for other events",
    "Sets Valtio state.current to null — triggers re-render via useSnapshot",
    "Only clears viewport selection — does NOT clear table selection",
    "Works because R3F fires onPointerMissed on any mesh when click hits nothing"
  ]
}
```

---

## Pattern 1.18: Context Menu

```pseudo
WORKFLOW ContextMenu_Implementation {
  TEMPLATE: |
    <mesh
      onContextMenu={(e) => {
        e.stopPropagation()
        # Cycle transform modes (currently only 'translate')
        state.mode = (snap.mode + 1) % modes.length
      }}
    >

  NOTE: "TransformControls is commented out in current code.
         Context menu cycles modes array but has no visual effect.
         Preserved for future TransformControls re-enablement."

  CRITICAL_RULES: [
    "modes array = ['translate'] — single mode currently",
    "onContextMenu prevents browser default right-click menu",
    "TransformControls integration is commented out but pattern preserved"
  ]
}
```

---

## Pattern 1.19: Selection State (Valtio)

```pseudo
WORKFLOW SelectionState_Implementation {
  VALTIO_STATE: |
    const state = proxy({
      current: null as string | null,    # Selected mesh code
      mode: 0,                           # Transform mode index
      fileGLB: '',                       # Current GLB file path
      blockActive: null,                 # Active block index
      currentItem: null as IMesh | null, # Full mesh data
      showPumpStartConfirmModal: false,
      showFinishedMeshConfirmModal: false,
      showChangeMeshStateAtPumpingConfirmModal: false,
      nextState: '',                     # Target status for transition
      pumpId: '',                        # Selected pump for operation
      isCancel: false                    # Cancel operation flag
    })

  USAGE_IN_COMPONENT: |
    const snap = useSnapshot(state)

    # Read (reactive — triggers re-render):
    IF snap.current === item.code THEN highlight END IF

    # Write (direct mutation):
    state.current = item.code
    state.showPumpStartConfirmModal = true

  VARIANTS: {
    CONSTRUCTION: "Full state with modals, nextState, pumpId, isCancel",
    HOME: "Minimal: current, mode, fileGLB, currentItem",
    SETTINGS: "Minimal: current, mode (shared with PlayHistory via import)",
    PLAY_HISTORY: "Imports state from settings ThreeEditor (shared global)"
  }

  CRITICAL_RULES: [
    "Valtio proxy for VIEWPORT state — NOT Redux",
    "Read via useSnapshot (reactive) — write via direct mutation",
    "state.current is mesh CODE (string), not mesh object",
    "state.currentItem is full IMesh for modal display",
    "PlayHistory IMPORTS state from settings ThreeEditor — shared global!",
    "Modal flags (show*) are in Valtio, not React useState"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_DIRECT_STATUS_CHANGE: "Never change mesh status in click handler — always through modal → API",
  NO_REDUX_FOR_SELECTION: "Viewport selection uses Valtio, NOT Redux (too many re-renders)",
  NO_MISSING_STOP_PROPAGATION: "Always stopPropagation on click/hover — mesh nesting causes issues",
  NO_HOVER_COLOR_CHANGE: "No visual highlight on hover — only cursor change (useCursor)",
  NO_TABLE_SYNC_IN_CONSTRUCTION: "Construction viewer uses modals, NOT table sync on click"
}
```

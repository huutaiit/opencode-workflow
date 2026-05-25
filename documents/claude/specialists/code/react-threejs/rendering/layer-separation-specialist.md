# Layer Separation Specialist
# Layer Separation スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Rendering, State (floor filtering + Y-offset positioning) |
| **Directory Pattern** | `features/{viewer}/components/` (rendering), `features/location/selector/state_management/slices.ts` (reducers) |
| **Variant** | construction-3d |
| **Pattern Numbers** | 1.25–1.28 |
| **Source Paths** | `**/ThreeEditor.tsx`, `**/3dViewer.tsx`, `**/slices.ts`, `**/func.ts` |
| **File Count** | 4 viewer files + 1 slice + 1 utility function |
| **Naming Convention** | `spaceMesh()` in `utils/func.ts`, `actionConstructionUpdate` reducer in slices |
| **Imports From** | State (Redux modeShowFloor, floorActive, isFloorSelect flags) |
| **Cannot Import** | API (services), Camera (controls), Settings (subsystem components) |
| **Imported By** | Rendering (Model component uses isFloorSelect to offset position) |
| **Dependencies** | `three:0.139` (Vector3 for position override) |
| **When To Use** | Implementing multi-floor visibility filtering and Y-axis layer separation to prevent Z-fighting in stacked construction models |
| **Source Skeleton** | `utils/func.ts` (spaceMesh), `features/location/selector/state_management/slices.ts` (actionConstructionUpdate) |
| **Specialist Type** | code |
| **Purpose** | Generate floor filtering reducers and Y-offset layer separation logic with constant lift value and dual display modes (selected-only vs all-layers) |
| **Activation Trigger** | files: **/slices.ts, **/func.ts, **/ThreeEditor.tsx; keywords: floorSelect, layerSeparation, modeShowFloor, isFloorSelect, spaceMesh |

---

## Specialist Identity

```pseudo
SPECIALIST LayerSeparationSpecialist {
  ROLE: "Floor/layer visualization expert for multi-floor building models"

  RESPONSIBILITIES: [
    "Apply Y-axis offset to prevent Z-fighting between stacked floors",
    "Control floor visibility via modeShowFloor (all vs selected)",
    "Set isFloorSelect flag via Redux reducer logic",
    "Calculate layer lists from mesh data",
    "Manage floorActive selection state"
  ]
}
```

---

## Pattern 1.25: Layer Separation Constant

```pseudo
WORKFLOW LayerSeparation_Implementation {
  CONSTANT: |
    const LAYER_SEPARATION_LIFT = 6  # Fixed Y-offset in world units

  POSITION_CALCULATION: |
    IF mesh.isFloorSelect THEN
      position = new THREE.Vector3(
        nodes[mesh.name].position.x,     # X unchanged
        nodes[mesh.name].position.y + 6, # Y lifted by 6
        nodes[mesh.name].position.z      # Z unchanged
      )
    ELSE
      position = nodes[mesh.name].position  # Original from GLB
    END IF

  SPACEMESH_UTILITY: |
    # utils/func.ts — spaceMesh(locationY)
    # Returns constant 6 (old adaptive logic was removed as buggy)
    export const spaceMesh = (locationY: number): number => {
      return 6  # Always 6, regardless of Y position
    }

  HISTORY: |
    # Original adaptive logic (REMOVED — lines 30-44 in func.ts):
    # Was Y-dependent with ranges: Y<-50→3, -50<Y<-20→4, etc.
    # Removed because Z-fighting was inconsistent across models
    # Simplified to constant 6 which works for all building sizes

  CRITICAL_RULES: [
    "Lift value is ALWAYS 6 — never conditional or adaptive",
    "ONLY Y-axis is modified — X and Z preserved from GLB",
    "Create new Vector3 — NEVER mutate original node position",
    "isFloorSelect flag determines if lift is applied",
    "spaceMesh() in func.ts also returns 6 — both implementations exist"
  ]
}
```

---

## Pattern 1.26: Floor Filtering (Redux Reducer)

```pseudo
WORKFLOW FloorFiltering_Implementation {
  ACTION: "actionConstructionUpdate(filter)"

  LOGIC: |
    # In locationSelector slice — actionConstructionUpdate reducer:
    
    STEP 1: Reset all meshes
      FOR EACH mesh IN locationMesh[0].meshes:
        mesh.isHidden = false
        mesh.isFloorSelect = false
      END FOR

    STEP 2: Apply floor selection
      IF filter.floorSelect > -1 THEN
        IF filter.modeShowFloor === 1 THEN
          # MODE 1: Show ONLY selected floor
          FOR EACH mesh:
            IF mesh.layer !== filter.floorSelect THEN
              mesh.isHidden = true  # Hide non-matching floors
            END IF
          END FOR
        ELSE IF filter.modeShowFloor === 2 THEN
          # MODE 2: Show ALL floors, elevate selected+above
          FOR EACH mesh:
            IF filter.floorSelect <= mesh.layer THEN
              mesh.isFloorSelect = true  # Lift this mesh
            END IF
          END FOR
        END IF
      END IF

    STEP 3: Apply status filter (optional)
      IF filter.listStatus AND filter.listStatus.length > 0 THEN
        FOR EACH mesh:
          IF !filter.listStatus.includes(mesh.status) THEN
            mesh.isHidden = true
          END IF
        END FOR
      END IF

  CRITICAL_RULES: [
    "Always RESET all flags before applying new filters",
    "Mode 1 (選択層のみ): hides non-matching → isHidden = true",
    "Mode 2 (全層): shows all, lifts selected+ → isFloorSelect = true",
    "Status filter is additive with floor filter",
    "floorSelect = -1 means no floor filter active"
  ]
}
```

---

## Pattern 1.27: Floor Mode Toggle

```pseudo
WORKFLOW FloorMode_Implementation {
  MODES: {
    MODE_1: {
      value: 1,
      label: "選択層のみ (Selected layer only)",
      behavior: "Hide all floors except selected",
      uses_isHidden: true,
      uses_isFloorSelect: false
    }
    MODE_2: {
      value: 2,
      label: "全層 (All layers)",
      behavior: "Show all floors, elevate selected and above for visual separation",
      uses_isHidden: false,
      uses_isFloorSelect: true
    }
  }

  UI_TEMPLATE: |
    <div>
      <input type="radio" value={2} checked={modeShowFloor === 2}
             onChange={() => dispatch(setModeShowFloor(2))} />
      <label>全層</label>

      <input type="radio" value={1} checked={modeShowFloor === 1}
             onChange={() => dispatch(setModeShowFloor(1))} />
      <label>選択層のみ</label>
    </div>

  FLOOR_LIST_GENERATION: |
    # Extract unique floors from mesh data
    const floors = [...new Set(
      locationMesh[0].meshes.map(m => m.layer)
    )].sort((a, b) => a - b)

    dispatch(setListFloors(floors))

  CRITICAL_RULES: [
    "Mode toggle is ONLY shown in 3D view, NOT 2D mode",
    "Default mode is 2 (全層 — all floors visible)",
    "Floor list auto-generated from mesh layer values",
    "Floor dropdown shows layer numbers, floorActive is array index"
  ]
}
```

---

## Pattern 1.28: 2D Mode Floor Handling

```pseudo
WORKFLOW Floor2D_Implementation {
  DESCRIPTION: "Mode2dEditor shows current + previous floor side-by-side"

  LOGIC: |
    # Two ModelGroups in dual Canvas:
    ModelGroup (Current):
      filter: mesh.layer === (floorActive + 1)
      rotation: new THREE.Euler(Math.PI / 1.8, 5.1, 0)

    ModelGroupBefore (Previous):
      filter: mesh.layer === floorActive
      rotation: new THREE.Euler(Math.PI / 1.8, 5.1, 0)

  TOUCH_SWIPE: |
    # Horizontal swipe changes floor
    onTouchStart → record startX
    onTouchEnd → calculate deltaX
      IF deltaX > threshold THEN floorActive++  # Swipe right → next
      IF deltaX < -threshold THEN floorActive-- # Swipe left → prev

  CRITICAL_RULES: [
    "2D mode does NOT use isFloorSelect/layer separation",
    "Floor shown by FILTERING meshes, not by lifting",
    "Dual canvas: current floor + previous floor for comparison",
    "Isometric rotation applied to BOTH groups identically",
    "Touch swipe navigates floors on tablet devices"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_ADAPTIVE_LIFT: "Never use Y-dependent lift formula — always constant 6",
  NO_MUTATE_ORIGINAL: "Never modify nodes[name].position directly — create new Vector3",
  NO_FILTER_IN_COMPONENT: "Floor filtering in Redux reducer, NOT in render logic",
  NO_LIFT_IN_2D: "2D mode uses mesh filtering, NOT layer separation lift"
}
```

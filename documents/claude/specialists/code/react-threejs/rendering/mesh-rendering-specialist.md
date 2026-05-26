# Mesh Rendering Specialist
# Mesh Rendering スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Rendering (individual mesh component with material and position) |
| **Directory Pattern** | Inline `Model` component within `features/{viewer}/components/ThreeEditor.tsx` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 1.11–1.14 |
| **Source Paths** | `**/ThreeEditor.tsx`, `**/3dViewer.tsx`, `**/Mode2dEditor.tsx`, `**/PlayHistory.tsx` |
| **File Count** | 4 files containing Model sub-component (~150 LOC each) |
| **Naming Convention** | Inline `Model` function component (not exported separately) |
| **Imports From** | Rendering (GLTF nodes for geometry/material), State (Valtio snap for selection, Redux for mesh data) |
| **Cannot Import** | API (services), Settings (subsystem components), Camera (controls) |
| **Imported By** | Rendering (ModelGroup iterates and renders Model per mesh) |
| **Dependencies** | `three:0.139` (Vector3, meshStandardMaterial), `@react-three/drei:8.x` (useCursor) |
| **When To Use** | Rendering individual construction mesh with dynamic color/opacity from status and position override for layer separation |
| **Source Skeleton** | Inline `Model` component within `features/{viewer}/components/ThreeEditor.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate individual mesh rendering with meshStandardMaterial, dynamic color/opacity from status, and Y-axis position override for layer separation |
| **Activation Trigger** | files: **/ThreeEditor.tsx, **/3dViewer.tsx; keywords: meshStandardMaterial, meshRendering, opacity, transparent, visible |

---

## Specialist Identity

```pseudo
SPECIALIST MeshRenderingSpecialist {
  ROLE: "Individual mesh rendering expert for construction building elements"

  RESPONSIBILITIES: [
    "Render individual mesh components with geometry/material from GLTF nodes",
    "Apply meshStandardMaterial with dynamic color and opacity",
    "Override mesh position for layer separation (Y-offset)",
    "Control mesh visibility based on isHidden and pump filter",
    "Manage mesh transparency for status visualization"
  ]

  TECH_STACK: {
    component: "R3F <mesh> element",
    material: "meshStandardMaterial (JSX intrinsic)",
    math: "THREE.Vector3 for position overrides",
    state: "Props from Redux + Valtio for selection"
  }
}
```

---

## Pattern 1.11: Model Component Structure

```pseudo
WORKFLOW ModelComponent_Implementation {
  PROPS: {
    item: IMesh,              # Mesh data from Redux
    index: number,            # Array index
    meshSettingState: object,  # Color configuration
    pumpId: string,           # Selected pump filter
    isModeSlim: boolean,      # Slim mode flag
    isHidden: boolean,        # Visibility (combined filter result)
    isMeshActive: boolean,    # Table selection highlight
    colorPump: string,        # Pump-specific color (optional)
    setCastingHeightValue: function  # Slim mode callback
  }

  COMPONENT_TEMPLATE: |
    function Model({ item, meshSettingState, pumpId, isModeSlim, isHidden, isMeshActive, ... }) {
      const snap = useSnapshot(state)
      const [hovered, setHovered] = useState(false)
      useCursor(hovered)

      # Calculate color and opacity (delegate to mesh-status-color-specialist)
      const { color, opacity } = calculateMeshAppearance(item, meshSettingState, pumpId, isModeSlim, isMeshActive)

      return (
        <mesh
          name={item.name}
          geometry={nodes[item.name].geometry}
          position={calculatePosition(item, nodes)}
          rotation={nodes[item.name].rotation}
          scale={nodes[item.name].scale}
          visible={!isHidden}
          onClick={(e) => handleClick(e, item)}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
          onPointerOut={(e) => setHovered(false)}
          onPointerMissed={(e) => { IF e.type === 'click' THEN state.current = null }}
          onContextMenu={(e) => handleContextMenu(e)}
        >
          <meshStandardMaterial
            color={color}
            opacity={opacity}
            transparent={true}
          />
        </mesh>
      )
    }

  CRITICAL_RULES: [
    "geometry, rotation, scale from GLTF nodes — NEVER modified at runtime",
    "position may be overridden for layer separation (see layer-separation-specialist)",
    "material is ALWAYS meshStandardMaterial — never other material types",
    "transparent={true} ALWAYS set — opacity is dynamic",
    "visible={!isHidden} — primary visibility control"
  ]
}
```

---

## Pattern 1.12: Material Configuration

```pseudo
WORKFLOW MaterialConfig_Implementation {
  JSX_TEMPLATE: |
    <meshStandardMaterial
      color={color}              # Hex string: '#FFFAFA', '#FFFF00', etc.
      opacity={opacity}          # 0.0 to 1.0
      transparent={true}         # ALWAYS true
      visible={!isHidden}        # Redundant with mesh visible, but present
    />

  MATERIAL_PROPERTIES: {
    color: "Dynamic hex string based on status/warning/pump/active",
    opacity: "Calculated from transferTime OR overridden for active/pump",
    transparent: "Always true — required for opacity to work",
    metalness: "Not set (default 0.0)",
    roughness: "Not set (default 1.0)",
    side: "Not set (default FrontSide)"
  }

  CRITICAL_RULES: [
    "transparent={true} is REQUIRED — without it opacity has no effect",
    "Color is hex string (not THREE.Color) — R3F auto-converts",
    "Each mesh gets its OWN material instance — no sharing",
    "Material precision 'highp' set at Canvas level for complex models"
  ]
}
```

---

## Pattern 1.13: Position Override for Layer Separation

```pseudo
WORKFLOW PositionOverride_Implementation {
  CONSTANT: "LAYER_SEPARATION_LIFT = 6"

  LOGIC: |
    function calculatePosition(item: IMesh, nodes: any) {
      IF item.isFloorSelect THEN
        originalPos = nodes[item.name].position
        liftedY = originalPos.y + LAYER_SEPARATION_LIFT  # +6 units

        return new THREE.Vector3(
          originalPos.x,
          liftedY,
          originalPos.z
        )
      ELSE
        return nodes[item.name].position  # Original from GLB
      END IF
    }

  WHEN_APPLIED: {
    isFloorSelect_true: "Mesh is on or above selected floor → lift Y by 6",
    isFloorSelect_false: "Mesh is below selected floor or no floor filter → original position"
  }

  CRITICAL_RULES: [
    "ONLY Y-axis is modified — X and Z ALWAYS from original node position",
    "Lift value is CONSTANT 6 — old adaptive logic was removed (buggy)",
    "isFloorSelect is set by Redux reducer, not by component",
    "Create new Vector3 for lifted position — do NOT mutate original node.position"
  ]
}
```

---

## Pattern 1.14: Visibility Logic

```pseudo
WORKFLOW Visibility_Implementation {
  VISIBILITY_CHAIN: |
    # In ModelGroup, when iterating meshes:
    isHidden = meshItem.isHidden
              || (pumpSelect !== '' AND meshItem.pumpId !== pumpSelect)

    <Model
      item={meshItem}
      isHidden={isHidden}
      ...
    />

    # In Model component:
    <mesh visible={!isHidden}>
      ...
    </mesh>

  HIDDEN_CONDITIONS: [
    "meshItem.isHidden = true (set by Redux filter actions)",
    "pumpSelect is set AND mesh pumpId doesn't match",
    "Floor filter active AND mesh layer doesn't match (via isHidden reducer)",
    "Status filter active AND mesh status not in allowed list (via isHidden reducer)"
  ]

  CRITICAL_RULES: [
    "Pump filter applied at ModelGroup level (render-time), not in Redux",
    "Floor/status filters applied in Redux reducer (actionConstructionUpdate)",
    "visible={false} still includes mesh in scene — just hidden",
    "isHidden is the SINGLE source of truth for mesh visibility"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_CUSTOM_GEOMETRY: "Never create geometry in components — always from GLTF nodes",
  NO_SHARED_MATERIAL: "Each mesh needs its own material — sharing causes color bleed",
  NO_MUTATE_NODE: "Never mutate nodes[name].position/rotation — create new Vector3",
  NO_OPACITY_WITHOUT_TRANSPARENT: "opacity has no effect without transparent={true}",
  NO_COMPLEX_MATERIAL: "Always meshStandardMaterial — never Phong, Lambert, or Physical"
}
```

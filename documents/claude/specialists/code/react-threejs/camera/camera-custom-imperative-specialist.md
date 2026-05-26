# Camera Custom Imperative Specialist
# Camera Custom Imperative スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Camera (imperative zoom/pan/reset via useImperativeHandle) |
| **Directory Pattern** | Inline `CustomControls` component in `features/setting/3deditor/ThreeEditor.tsx`, `features/location/selector/3DEditor.tsx` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 2.09–2.11 |
| **Source Paths** | `**/setting/3deditor/ThreeEditor.tsx`, `**/location/selector/3DEditor.tsx` |
| **File Count** | 2 files with CustomControls + 1 PlayHistory importing |
| **Naming Convention** | Inline `CustomControls` forwardRef component (not exported separately) |
| **Imports From** | Rendering (placed inside Canvas, uses OrbitControls from drei) |
| **Cannot Import** | State (Redux), API (services) |
| **Imported By** | Rendering (Settings and Location viewers use via ref) |
| **Dependencies** | `@react-three/fiber:7.x` (useThree), `@react-three/drei:8.x` (OrbitControls) |
| **When To Use** | Adding lightweight zoom/pan/reset to view-only 3D previews without full camera-controls library |
| **Source Skeleton** | Inline `CustomControls` in `features/setting/3deditor/ThreeEditor.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate imperative camera controls with useImperativeHandle exposing zoomIn/zoomOut/move/reset methods and direct camera.zoom manipulation |
| **Activation Trigger** | files: **/3deditor/ThreeEditor.tsx, **/3DEditor.tsx; keywords: useImperativeHandle, customControls, directZoom, viewOnly |

---

## Specialist Identity

```pseudo
SPECIALIST CameraCustomImperativeSpecialist {
  ROLE: "Imperative camera control expert for view-only 3D viewers"

  USED_IN: "Settings ThreeEditor, Location 3DEditor, PlayHistory (Files 4, 5, 6)"

  WHY_NOT_CAMERA_CONTROLS: "View-only viewers need simple zoom/reset without orbit —
    lighter weight than full camera-controls library"
}
```

---

## Pattern 2.09: CustomControls Component

```pseudo
WORKFLOW CustomControls_Implementation {
  TEMPLATE: |
    const CustomControls = forwardRef((props, ref) => {
      const { camera, scene } = useThree()

      useImperativeHandle(ref, () => ({
        zoomIn() {
          camera.zoom = Math.min(camera.zoom + zoomStep, zoomMax)
          camera.updateProjectionMatrix()
        },

        zoomOut() {
          camera.zoom = Math.max(camera.zoom - zoomStep, zoomMin)
          camera.updateProjectionMatrix()
        },

        move(type: 'up' | 'down' | 'left' | 'right') {
          SWITCH type:
            'up'    → camera.position.y += moveStep
            'down'  → camera.position.y -= moveStep
            'left'  → camera.position.x -= moveStep
            'right' → camera.position.x += moveStep
          camera.updateProjectionMatrix()
        },

        reset() {
          camera.zoom = 1
          camera.updateProjectionMatrix()
          scene.rotation.set(0, 0, 0)  # Reset orbit rotation
        }
      }))

      return <OrbitControls makeDefault />
    })

  CONSTANTS: |
    zoomStep = 0.2
    zoomMin = 0.2
    zoomMax = 4.0
    moveStep = 0.2

  CRITICAL_RULES: [
    "camera.updateProjectionMatrix() REQUIRED after zoom/position change",
    "scene.rotation.set(0,0,0) resets OrbitControls accumulated rotation",
    "OrbitControls still active for mouse drag — CustomControls is ADDITIONAL",
    "Zoom via camera.zoom (orthographic-style), not camera.position.z"
  ]
}
```

---

## Pattern 2.10: Ref Usage in UI

```pseudo
WORKFLOW ImperativeRefUsage_Implementation {
  TEMPLATE: |
    const customControlRef = useRef(null)

    <Canvas ...>
      <CustomControls ref={customControlRef} />
    </Canvas>

    # Outside Canvas — UI buttons
    <div className="camera-controls">
      <button onClick={() => customControlRef.current?.zoomIn()}>＋</button>
      <button onClick={() => customControlRef.current?.zoomOut()}>－</button>
      <button onClick={() => customControlRef.current?.reset()}>リセット</button>
    </div>

  CRITICAL_RULES: [
    "Null-check ref before calling methods",
    "UI buttons are outside Canvas (HTML, not 3D)",
    "Japanese labels for buttons (リセット, etc.)"
  ]
}
```

---

## Pattern 2.11: When to Use Which Camera

```pseudo
DECISION_MATRIX: {
  CameraControls_Library: {
    when: "Interactive viewers with mesh selection",
    features: "Smooth animation, truck(), zoom(animated), event callbacks",
    viewers: "Construction 3D, Home, Settings editor, PlayHistory"
  }
  Camera2DControls: {
    when: "2D isometric view with pan-only navigation",
    features: "Pan + zoom only, no rotation, dual canvas sync",
    viewers: "Construction 2D (Mode2dEditor)"
  }
  CustomControls_Imperative: {
    when: "View-only preview with simple zoom/reset",
    features: "Lightweight, direct camera manipulation, no animation",
    viewers: "Settings ThreeEditor, Location 3DEditor"
  }
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_MISSING_UPDATE_PROJECTION: "Always call camera.updateProjectionMatrix() after zoom/position change",
  NO_SCENE_ROTATION_PERSIST: "Reset scene.rotation on reset() — OrbitControls accumulates rotation",
  NO_HEAVY_CONTROLS_FOR_VIEW_ONLY: "Don't use full CameraControls library for view-only viewers"
}
```

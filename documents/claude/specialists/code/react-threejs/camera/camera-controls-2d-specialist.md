# Camera Controls 2D Specialist
# Camera Controls 2D スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Camera (2D isometric pan-only camera for construction floor plan) |
| **Directory Pattern** | `features/construction/components/Camera2DControls.tsx` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 2.05–2.08 |
| **Source Paths** | `**/Camera2DControls.tsx`, `**/Mode2dEditor.tsx` |
| **File Count** | 1 Camera2DControls component + 1 Mode2dEditor using dual instances |
| **Naming Convention** | `Camera2DControls.tsx`, refs: `cameraControlRef`, `cameraControlRefBefore` |
| **Imports From** | Rendering (placed inside dual Canvas elements) |
| **Cannot Import** | State (Redux), API (services), Camera 3D (different control paradigm) |
| **Imported By** | Rendering (Mode2dEditor imports for 2D isometric view) |
| **Dependencies** | `camera-controls:2.x`, `@react-three/fiber:7.x` |
| **When To Use** | Adding pan-only 2D isometric camera with dual-canvas synchronization for construction floor plan before/after comparison |
| **Source Skeleton** | `features/construction/components/Camera2DControls.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate 2D isometric camera controls with pan-only mouse/touch mappings, dual-canvas synchronized zoom/reset, and floor swipe navigation |
| **Activation Trigger** | files: **/Camera2DControls.tsx, **/Mode2dEditor.tsx; keywords: camera2d, isometric, panOnly, dualCanvas, touchSwipe |

---

## Specialist Identity

```pseudo
SPECIALIST CameraControls2DSpecialist {
  ROLE: "2D isometric camera control expert for construction floor plan view"

  USED_IN: "Mode2dEditor.tsx only (Construction 2D view)"
}
```

---

## Pattern 2.05: 2D Camera Setup

```pseudo
WORKFLOW Camera2DSetup_Implementation {
  FILE: "features/construction/components/Camera2DControls.tsx (~90 LOC)"

  DIFFERENCES_FROM_3D: {
    position: "[-103.55, 2.1, 38.62] (offset from origin)",
    camera_z: "65 (farther from scene)",
    initial_truck: "controls.truck(-1, 0) then controls.truck(0, -6)",
    rotation_disabled: "No orbit/rotate — pan and zoom only",
    zoom_step: "0.1 (finer than 3D's 0.2)"
  }

  ISOMETRIC_PROJECTION: |
    # Applied to model group, not camera:
    const rotationGroup = new THREE.Euler(Math.PI / 1.8, 5.1, 0)
    # ≈ [101.3°, 292.0°, 0°] — creates isometric-like viewing angle

    <group rotation={rotationGroup}>
      <ModelGroup />
    </group>
}
```

---

## Pattern 2.06: Mouse Button Mappings

```pseudo
WORKFLOW MouseMappings_Implementation {
  CONFIGURATION: |
    controls.mouseButtons.left = CameraControls.ACTION.TRUCK      # Pan
    controls.mouseButtons.middle = CameraControls.ACTION.ZOOM     # Zoom
    controls.mouseButtons.right = CameraControls.ACTION.TRUCK     # Pan (same as left)

  COMPARISON_WITH_3D: {
    "3D_DEFAULT": "left=ROTATE, middle=ZOOM, right=PAN",
    "2D_OVERRIDE": "left=PAN, middle=ZOOM, right=PAN (no rotation)"
  }

  CRITICAL_RULES: [
    "Left mouse = PAN (not rotate) — this is 2D mode",
    "Right mouse = PAN (not orbit) — consistent pan from any button",
    "Middle mouse = ZOOM — only zoom control available",
    "NO rotation available in 2D mode — isometric angle is fixed"
  ]
}
```

---

## Pattern 2.07: Touch Gesture Mappings

```pseudo
WORKFLOW TouchMappings_Implementation {
  CONFIGURATION: |
    controls.touches.one = CameraControls.ACTION.TOUCH_TRUCK   # Single finger = pan
    controls.touches.two = CameraControls.ACTION.TOUCH_ZOOM    # Two fingers = zoom

  FLOOR_SWIPE_NAVIGATION: |
    # Separate from camera controls — handled in Mode2dEditor component
    onTouchStart = (e) => {
      startX = e.touches[0].clientX
    }
    onTouchEnd = (e) => {
      deltaX = e.changedTouches[0].clientX - startX
      IF deltaX > 50 THEN  # Swipe right
        floorActive = Math.min(floorActive + 1, maxFloor)
      ELSE IF deltaX < -50 THEN  # Swipe left
        floorActive = Math.max(floorActive - 1, 0)
      END IF
    }

  CRITICAL_RULES: [
    "Single finger = pan (TOUCH_TRUCK), NOT rotate",
    "Two fingers = pinch zoom (TOUCH_ZOOM)",
    "Horizontal swipe (>50px threshold) = floor navigation (separate from camera)",
    "Touch events attached to container div, not Canvas"
  ]
}
```

---

## Pattern 2.08: Dual Canvas Synchronization

```pseudo
WORKFLOW DualCanvas_Implementation {
  STRUCTURE: |
    # Mode2dEditor has TWO canvases side-by-side:
    <div className="canvas-container">
      <Canvas ...>  # Current floor
        <Camera2DControls ref={cameraControlRef} />
        <ModelGroup filter={mesh.layer === floorActive + 1} />
      </Canvas>

      <Canvas ...>  # Previous floor (comparison)
        <Camera2DControls ref={cameraControlRefBefore} />
        <ModelGroupBefore filter={mesh.layer === floorActive} />
      </Canvas>
    </div>

  SYNCHRONIZED_OPERATIONS: |
    # Zoom applies to BOTH canvases:
    handleZoomIn = () => {
      cameraControlRef.current?.zoom(0.1, true)
      cameraControlRefBefore.current?.zoom(0.1, true)
    }

    # Reset applies to BOTH:
    handleReset = () => {
      cameraControlRef.current?.reset()
      cameraControlRefBefore.current?.reset()
    }

  INITIAL_TRUCK: |
    # Both cameras pan down on mount:
    useEffect(() => {
      cameraControlRef.current?.truck(0, -6)
      cameraControlRefBefore.current?.truck(0, -6)
    }, [])

  CRITICAL_RULES: [
    "DUAL canvas — separate Canvas elements, separate camera refs",
    "Zoom/reset MUST apply to BOTH canvases simultaneously",
    "Initial truck (0, -6) on both for consistent vertical offset",
    "Each canvas renders different floor layer (current vs previous)"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_ROTATION_IN_2D: "2D mode has no rotation — isometric angle is GROUP rotation, not camera",
  NO_SINGLE_CANVAS: "Dual canvas is required for before/after comparison — don't merge",
  NO_UNSYNC_ZOOM: "Zoom must apply to BOTH canvases — single zoom breaks comparison",
  NO_CAMERA_ROTATION: "Isometric achieved via group Euler rotation, NOT camera position"
}
```

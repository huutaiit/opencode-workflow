# Camera Controls 3D Specialist
# Camera Controls 3D スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Camera (3D camera control wrapper for R3F) |
| **Directory Pattern** | `features/setting/3deditor/CameraControl.tsx` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 2.01–2.04 |
| **Source Paths** | `**/CameraControl.tsx`, `**/ThreeEditor.tsx`, `**/3dViewer.tsx`, `**/PlayHistory.tsx` |
| **File Count** | 1 CameraControl component + 4 viewers using it via ref |
| **Naming Convention** | `CameraControl.tsx` (wrapper), ref: `cameraControlRef` |
| **Imports From** | Rendering (placed inside Canvas as child element) |
| **Cannot Import** | State (Redux — camera state is ref-based, not Redux), API (services) |
| **Imported By** | Rendering (viewers import and place CameraControls in Canvas) |
| **Dependencies** | `camera-controls:2.x`, `@react-three/fiber:7.x` (useThree, useFrame) |
| **When To Use** | Adding 3D orbital camera with zoom/reset/truck methods to a construction viewer Canvas |
| **Source Skeleton** | `features/setting/3deditor/CameraControl.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate camera-controls wrapper component for R3F with zoom/reset/truck API, event callbacks, and viewer-specific position presets |
| **Activation Trigger** | files: **/CameraControl.tsx, **/ThreeEditor.tsx; keywords: cameraControls, zoom, reset, truck, orbit |

---

## Specialist Identity

```pseudo
SPECIALIST CameraControls3DSpecialist {
  ROLE: "3D camera control expert wrapping camera-controls library for R3F"

  RESPONSIBILITIES: [
    "Implement CameraControls wrapper component for R3F Canvas",
    "Expose zoom(), reset(), truck() methods via ref",
    "Handle camera events (controlstart, controlend, update)",
    "Configure camera position/rotation presets per viewer",
    "Integrate with R3F invalidate() for demand-mode rendering"
  ]

  USED_IN: "Construction 3D, Home viewer, Settings editor, PlayHistory (4 of 6 viewers)"
}
```

---

## Pattern 2.01: CameraControls Wrapper Component

```pseudo
WORKFLOW CameraControlsWrapper_Implementation {
  FILE: "features/setting/3deditor/CameraControl.tsx (101 LOC)"

  COMPONENT: |
    import CameraControlsImpl from 'camera-controls'
    import * as THREE from 'three'
    import { useThree, useFrame } from '@react-three/fiber'

    # Install camera-controls with THREE subsets
    CameraControlsImpl.install({ THREE: subsetOfTHREE })

    const CameraControls = forwardRef((props, ref) => {
      const { camera, gl, invalidate, performance } = useThree()
      const controls = useMemo(() => new CameraControlsImpl(camera, gl.domElement), [camera, gl])

      useImperativeHandle(ref, () => controls)

      useEffect(() => {
        onUpdate = () => {
          invalidate()  # Trigger R3F re-render
          IF props.regress THEN performance.regress()
        }
        controls.addEventListener('update', onUpdate)

        IF props.onStart THEN controls.addEventListener('controlstart', props.onStart)
        IF props.onEnd THEN controls.addEventListener('controlend', props.onEnd)

        return () => {
          controls.removeEventListener('update', onUpdate)
          controls.disconnect()
        }
      }, [controls])

      useFrame((_, delta) => {
        controls.update(delta)  # Animate camera transitions
      })

      return null  # No JSX — controls attached to canvas DOM element
    })

  PROPS: |
    CameraControlsProps = {
      camera?: PerspectiveCamera | OrthographicCamera,
      domElement?: HTMLElement,
      makeDefault?: boolean,
      onStart?: (e?: { type: 'controlstart' }) => void,
      onEnd?: (e?: { type: 'controlend' }) => void,
      onChange?: (e?: { type: 'update' }) => void,
      events?: boolean,
      regress?: boolean  # Enable performance regression on interaction
    }

  CRITICAL_RULES: [
    "CameraControlsImpl.install() called at MODULE level — once",
    "controls.update(delta) in useFrame — required for smooth animation",
    "invalidate() on update — triggers Canvas re-render",
    "Cleanup: removeEventListener + disconnect() on unmount",
    "Returns null — no JSX output, only side effects"
  ]
}
```

---

## Pattern 2.02: Zoom/Reset API

```pseudo
WORKFLOW ZoomResetAPI_Implementation {
  METHODS: {
    zoom: |
      # Zoom in/out by delta amount
      cameraControlRef.current.zoom(0.25, true)   # Zoom in (animated)
      cameraControlRef.current.zoom(-0.25, true)  # Zoom out (animated)

    reset: |
      # Reset to initial position/rotation/zoom
      cameraControlRef.current.reset()

    truck: |
      # Pan camera horizontally/vertically
      cameraControlRef.current.truck(0, -6)  # Pan down 6 units
      cameraControlRef.current.truck(-1, 0)  # Pan left 1 unit
  }

  ZOOM_CONSTRAINTS: |
    const cameraControlOptions = {
      zoomStep: 0.2,
      zoomMin: 0.2,
      zoomMax: 4,
      moveStep: 0.2,
      rotationStep: Math.PI / 25  # ~7.2 degrees
    }

  UI_BUTTONS: |
    <button onClick={() => cameraControlRef.current?.zoom(0.25, true)}>+</button>
    <button onClick={() => cameraControlRef.current?.zoom(-0.25, true)}>−</button>
    <button onClick={() => cameraControlRef.current?.reset()}>リセット</button>

  CRITICAL_RULES: [
    "Zoom second param = animated (true for smooth transition)",
    "Reset restores initial camera position AND rotation AND zoom",
    "Always null-check ref: cameraControlRef.current?.method()",
    "Zoom constraints applied via camera.zoom clamp, not controls config"
  ]
}
```

---

## Pattern 2.03: Camera Presets Per Viewer

```pseudo
CAMERA_PRESETS: {
  CONSTRUCTION_3D: {
    position: [0, 0, 0],
    fov: 40,
    rotation: [0, 0, 0],
    zoom: 1,
    zoomStep: 0.2
  }
  HOME_VIEWER: {
    position: [0, 14, 72],
    fov: 40,
    rotation: [0.0666, 0, 0],  # Slight forward tilt
    zoom: 1,
    zoomStep: 0.2
  }
  SETTINGS_EDITOR: {
    position: [0, 0, 0],
    fov: 40,
    rotation: [0, 0, 0],
    zoom: 1,
    zoomStep: 0.2
  }
  PLAY_HISTORY: {
    position: [0, 0, 0],
    fov: 40,
    rotation: [0, 0, 0],
    zoom: 1,
    zoomStep: 0.2
  }
}
```

---

## Pattern 2.04: Ref Creation & Usage

```pseudo
WORKFLOW CameraRef_Implementation {
  TEMPLATE: |
    const cameraControlRef = useRef<CameraControls | null>(null)

    # In Canvas:
    <Canvas ...>
      ...
      <CameraControls ref={cameraControlRef} />  # OUTSIDE Suspense!
    </Canvas>

    # In UI controls (outside Canvas):
    <button onClick={() => cameraControlRef.current?.reset()}>
      リセット
    </button>

  CRITICAL_RULES: [
    "CameraControls OUTSIDE Suspense boundary — prevent unmount during load",
    "Ref typed as CameraControls | null",
    "UI buttons are OUTSIDE Canvas element — not in 3D scene",
    "null-check before every method call"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_CONTROLS_IN_SUSPENSE: "Suspense unmounts children during load — loses camera state",
  NO_ORBIT_CONTROLS_MIX: "Don't use both OrbitControls and CameraControls — they conflict",
  NO_DIRECT_CAMERA_MUTATION: "Use controls methods, not camera.position.set() directly",
  NO_MISSING_UPDATE: "controls.update(delta) in useFrame is REQUIRED for animations"
}
```

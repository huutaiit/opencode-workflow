# R3F Canvas & Scene Specialist
# R3F Canvas & Scene スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Rendering (3D viewer Canvas, lighting, Stage wrapper) |
| **Directory Pattern** | `features/{viewer}/components/ThreeEditor.tsx`, `features/{viewer}/components/Mode2dEditor.tsx` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 1.01–1.06 |
| **Source Paths** | `**/ThreeEditor.tsx`, `**/3dViewer.tsx`, `**/3DEditor.tsx`, `**/Mode2dEditor.tsx`, `**/PlayHistory.tsx` |
| **File Count** | 6 viewer components sharing Canvas pattern |
| **Naming Convention** | `ThreeEditor.tsx`, `3dViewer.tsx`, `Mode2dEditor.tsx` |
| **Imports From** | Rendering (Model/ModelGroup sub-components), Camera (CameraControls) |
| **Cannot Import** | State (Redux slices directly — use connect HOC), API (services) |
| **Imported By** | Domain (ConstructionPage, HomeComponent compose these viewers) |
| **Dependencies** | `@react-three/fiber:7.x`, `@react-three/drei:8.x`, `three:0.139` |
| **When To Use** | Setting up a new 3D viewer with Canvas, lighting, Stage, Suspense loader, and GizmoHelper |
| **Source Skeleton** | `features/{viewer}/components/ThreeEditor.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate React Three Fiber Canvas with standardized lighting, Stage wrapper, Suspense loader, GizmoHelper, and WebGL context recovery |
| **Activation Trigger** | files: **/ThreeEditor.tsx, **/3dViewer.tsx, **/Mode2dEditor.tsx; keywords: canvas, lighting, stage, suspense, gizmo, webgl |

---

## Specialist Identity

```pseudo
SPECIALIST R3FCanvasSceneSpecialist {
  ROLE: "Canvas and scene configuration expert for construction 3D viewers"

  RESPONSIBILITIES: [
    "Configure Canvas with correct dpr, camera, shadows settings",
    "Setup standard lighting (pointLight + hemisphereLight)",
    "Wrap models in Stage for contact shadows and environment",
    "Implement Suspense with Loader fallback using useProgress",
    "Add GizmoHelper with GizmoViewcube for orientation",
    "Handle WebGL context loss and recovery"
  ]

  TECH_STACK: {
    renderer: "@react-three/fiber 7 (Canvas)",
    helpers: "@react-three/drei 8 (Stage, GizmoHelper, GizmoViewcube, Html, useProgress)",
    engine: "three 0.139",
    framework: "React 17 (class + functional components)",
    state: "Valtio (proxy/useSnapshot) for viewport state"
  }

  DOMAIN_CONTEXT: {
    industry: "Construction concrete casting management",
    region: "Japan",
    viewers: "6 separate viewer components sharing same canvas pattern",
    language: "Japanese UI labels (with EN i18n fallback)"
  }
}
```

---

## Pattern 1.01: Canvas Configuration

### Overview

```pseudo
PATTERN CanvasConfiguration {
  PURPOSE: "Standard Canvas setup for all 6 viewer components"

  PROBLEM: "6 viewers need consistent rendering quality and camera defaults"

  SOLUTION: "Shared Canvas config with dpr=[1,2], fov=40-50, optional shadows"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW CanvasConfig_Implementation {
  INPUT: {
    viewerType: "construction" | "home" | "setting" | "location" | "playback" | "2d",
    needsShadows: boolean,
    fov: number  # 40 for settings/location, 50 for construction/home
  }

  CONFIGURATION: {
    CONSTRUCTION_3D: {
      shadows: true,
      dpr: [1, 2],
      camera: { fov: 50 },
      frameloop: "default"  # requestAnimationFrame
    }

    CONSTRUCTION_2D: {
      shadows: true,
      dpr: [1, 2],
      camera: { fov: 45 }
      # NOTE: Dual Canvas for before/after comparison
    }

    HOME_VIEWER: {
      shadows: true,
      dpr: [1, 2],
      camera: { fov: 50 }
      # NOTE: Includes WebGL context recovery
    }

    SETTINGS_EDITOR: {
      shadows: false,  # No shadows for performance
      dpr: [1, 2],
      camera: { fov: 50 }
    }

    LOCATION_SELECTOR: {
      shadows: false,
      dpr: [1, 2],
      camera: { fov: 50 }
    }

    PLAY_HISTORY: {
      shadows: false,
      dpr: [1, 2]
      # NOTE: No explicit camera config
    }
  }

  TEMPLATE: |
    <Canvas
      shadows={needsShadows}
      dpr={[1, 2]}
      camera={{ fov: fovValue }}
    >
      <Suspense fallback={<Loader />}>
        {/* Lighting */}
        {/* Stage + Models */}
        {/* Gizmo */}
      </Suspense>
      {/* Camera Controls outside Suspense */}
    </Canvas>

  CRITICAL_RULES: [
    "dpr ALWAYS [1, 2] for retina support",
    "CameraControls placed OUTSIDE Suspense boundary",
    "Shadows only for construction/home viewers (performance)",
    "fov=40 for settings, fov=50 for construction/home"
  ]
}
```

---

## Pattern 1.02: Lighting Setup

### Overview

```pseudo
PATTERN LightingSetup {
  PURPOSE: "Consistent lighting across all 3D viewers"

  PROBLEM: "Inconsistent lighting makes mesh colors unreliable across viewers"

  SOLUTION: "Standard pointLight + hemisphereLight combo with viewer-specific positions"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW Lighting_Implementation {
  STANDARD_LIGHTING: {
    pointLight: {
      position: [10, 10, 10],
      intensity: 0.8
    }
    hemisphereLight: {
      color: "#A6A7A5",
      groundColor: "#696B67",
      intensity: 0.85
    }
  }

  HEMISPHERE_POSITIONS_BY_VIEWER: {
    construction_3d: [0, 0, 0],
    construction_2d: [-103.55, 2.1, 38.62],
    home_viewer: [0, 14, 72],       # Matches camera default position
    settings_editor: [4, 1, 6],
    location_selector: [0, 0, 0],
    play_history: [0, 14, 72]
  }

  TEMPLATE: |
    <pointLight position={[10, 10, 10]} intensity={0.8} />
    <hemisphereLight
      color="#A6A7A5"
      groundColor="#696B67"
      position={hemispherePosition}
      intensity={0.85}
    />

  CRITICAL_RULES: [
    "pointLight ALWAYS at [10,10,10] intensity 0.8",
    "hemisphereLight colors NEVER change: #A6A7A5 / #696B67",
    "Only position varies per viewer context",
    "intensity 0.85 for hemisphere — consistent across all"
  ]
}
```

---

## Pattern 1.03: Stage Wrapper

### Overview

```pseudo
PATTERN StageWrapper {
  PURPOSE: "Wrap model groups in Stage for environment and contact shadows"

  SOLUTION: "Drei Stage component with minimal shadow configuration"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW Stage_Implementation {
  TEMPLATE: |
    <Stage contactShadow={{ blur: 1 }}>
      <group>
        <ModelGroup {...props} />
      </group>
    </Stage>

  CONFIGURATION: {
    contactShadow: {
      blur: 1,
      opacity: 0  # Invisible contact shadow (structural only)
    },
    environment: "rembrandt"  # Default drei preset
  }

  WHEN_TO_USE: [
    "Construction 3D viewer — full Stage with shadows",
    "Home viewer — full Stage",
    "2D Mode — Stage per canvas (dual)"
  ]

  WHEN_NOT_TO_USE: [
    "Settings editor — renders primitive directly, no Stage",
    "Location selector — renders primitive directly, no Stage"
  ]

  CRITICAL_RULES: [
    "Models wrapped in <group> inside Stage",
    "Stage only for viewers with shadows={true}",
    "Settings/location viewers render <primitive> directly without Stage"
  ]
}
```

---

## Pattern 1.04: Suspense & Loader

### Overview

```pseudo
PATTERN SuspenseLoader {
  PURPOSE: "Show loading progress while GLB models load"

  SOLUTION: "React Suspense with Drei useProgress hook for percentage display"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW SuspenseLoader_Implementation {
  LOADER_COMPONENT: |
    function Loader() {
      const { progress } = useProgress()
      return (
        <Html center>
          <span>{progress.toFixed(0)}%</span>
        </Html>
      )
    }

  USAGE: |
    <Canvas ...>
      <Suspense fallback={<Loader />}>
        {/* All 3D content here */}
      </Suspense>
      {/* CameraControls OUTSIDE Suspense */}
    </Canvas>

  CRITICAL_RULES: [
    "useProgress from @react-three/drei",
    "Html from drei for DOM overlay in 3D",
    "CameraControls MUST be outside Suspense to avoid unmount on load",
    "progress.toFixed(0) for clean percentage display"
  ]
}
```

---

## Pattern 1.05: GizmoHelper

### Overview

```pseudo
PATTERN GizmoHelper {
  PURPOSE: "Orientation cube for 3D navigation reference"

  SOLUTION: "Drei GizmoHelper + GizmoViewcube with bottom-right alignment"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW Gizmo_Implementation {
  TEMPLATE: |
    <GizmoHelper alignment="bottom-right" margin={[marginX, marginY]}>
      <GizmoViewcube onClick={() => null} />
    </GizmoHelper>

  CONFIGURATION: {
    alignment: "bottom-right",
    margin: "varies by viewer (typically [80, 80])",
    onClick: "() => null  # Disabled face clicking"
  }

  VIEWERS_USING_GIZMO: [
    "Construction 3D (ThreeEditor)",
    "Home viewer (3dViewer)",
    "Settings editor (ThreeEditor)",
    "Location selector (3DEditor)"
  ]

  CRITICAL_RULES: [
    "onClick={() => null} disables default face-click rotation",
    "Only used in 3D viewers, NOT in 2D isometric mode",
    "Japanese face labels when customized"
  ]
}
```

---

## Pattern 1.06: WebGL Context Recovery

### Overview

```pseudo
PATTERN WebGLContextRecovery {
  PURPOSE: "Handle GPU context loss gracefully without page reload"

  PROBLEM: "Mobile/tablet GPU can lose WebGL context under memory pressure"

  SOLUTION: "Listen for webglcontextlost/restored events, trigger re-render"

  USED_IN: "Home viewer (3dViewer.tsx) only"

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW WebGLRecovery_Implementation {
  SETUP: |
    useEffect(() => {
      canvas = document.querySelector('canvas')

      handleContextLost = (event) => {
        event.preventDefault()  # Allow recovery
        # Optionally show loading state
      }

      handleContextRestored = () => {
        # Trigger model re-render
        setShowModel(false)
        setTimeout(() => setShowModel(true), 150)
      }

      canvas.addEventListener('webglcontextlost', handleContextLost)
      canvas.addEventListener('webglcontextrestored', handleContextRestored)

      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost)
        canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      }
    }, [])

  CRITICAL_RULES: [
    "event.preventDefault() on contextlost is REQUIRED to allow recovery",
    "150ms delay before re-showing model prevents flicker",
    "Only implemented in home viewer — other viewers rely on page navigation",
    "Cleanup listeners on unmount to prevent memory leaks"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_FRAMELOOP_DEMAND: "Never set frameloop='demand' — construction data updates in real-time via SignalR",
  NO_CUSTOM_RENDERER: "Always use R3F Canvas, never create raw THREE.WebGLRenderer",
  NO_DPR_FIXED: "Never set dpr to fixed value — always [1, 2] for device adaptation",
  NO_SHADOWS_IN_SETTINGS: "Settings/location viewers must NOT have shadows for performance",
  NO_CONTROLS_IN_SUSPENSE: "CameraControls inside Suspense causes unmount during model load"
}
```

---

## File Reference

| Viewer | File | Canvas Config |
|--------|------|--------------|
| Construction 3D | features/construction/components/ThreeEditor.tsx | shadows, fov=50 |
| Construction 2D | features/construction/components/Mode2dEditor.tsx | shadows, fov=45, DUAL |
| Home | features/main/HomeComponent/3dViewer.tsx | shadows, fov=50, WebGL recovery |
| Settings | features/setting/3deditor/ThreeEditor.tsx | no shadows, fov=50 |
| Location | features/location/selector/3DEditor.tsx | no shadows, fov=50 |
| PlayHistory | features/playHistory/PlayHistory.tsx | no shadows, no explicit camera |

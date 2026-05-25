# GLTF Model Loading Specialist
# GLTF Model Loading スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Rendering (GLB/GLTF model loading and node access) |
| **Directory Pattern** | `features/{viewer}/components/` — Model/ModelGroup sub-components within viewers |
| **Variant** | construction-3d |
| **Pattern Numbers** | 1.07–1.10 |
| **Source Paths** | `**/ThreeEditor.tsx`, `**/3dViewer.tsx`, `**/3DEditor.tsx`, `**/PlayHistory.tsx` |
| **File Count** | 6 files using GLTF loading (4 useGLTF + 2 useLoader) |
| **Naming Convention** | Inline `Model`, `ModelGroup`, `ModelGLB`, `ModelGLBAll` sub-components |
| **Imports From** | State (Valtio proxy for fileGLB path), Rendering (mesh-rendering for individual meshes) |
| **Cannot Import** | API (services — GLB URL from environment variable only), Settings (subsystem components) |
| **Imported By** | Rendering (Canvas scene consumes ModelGroup) |
| **Dependencies** | `@react-three/drei:8.x` (useGLTF), `@react-three/fiber:7.x` (useLoader), `three:0.139` (GLTFLoader) |
| **When To Use** | Loading GLB construction models with node-level mesh access or full-scene preview rendering |
| **Source Skeleton** | Inline sub-components within `features/{viewer}/components/ThreeEditor.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate GLTF/GLB model loading with useGLTF node iteration or useLoader scene traverse for construction building models |
| **Activation Trigger** | files: **/ThreeEditor.tsx, **/3dViewer.tsx, **/3DEditor.tsx; keywords: useGLTF, useLoader, GLTFLoader, gltf, glb, nodes |

---

## Specialist Identity

```pseudo
SPECIALIST GLTFModelLoadingSpecialist {
  ROLE: "GLTF/GLB model loading expert for construction building models"

  RESPONSIBILITIES: [
    "Load GLB models via useGLTF hook with automatic caching",
    "Load GLB models via useLoader(GLTFLoader) for scene-level access",
    "Iterate GLTF nodes to find block/mesh hierarchies",
    "Extract geometry, material, position, rotation from nodes",
    "Handle model endpoint configuration via environment variable",
    "Manage model show/hide transitions with 150ms delay"
  ]

  TECH_STACK: {
    loading_hook: "@react-three/drei useGLTF (primary)",
    loading_alt: "@react-three/fiber useLoader + Three.js GLTFLoader",
    model_format: "GLB (binary GLTF)",
    source: "DWG files converted to GLB on backend",
    endpoint: "process.env.REACT_APP_GLB_ENDPOINT"
  }

  DOMAIN_CONTEXT: {
    models: "Construction building models with block/lift/mesh hierarchy",
    naming: "Block${blockCode} or ${blockCode} as parent node names",
    mesh_names: "Match mesh.code from API to node names in GLB"
  }
}
```

---

## Pattern 1.07: useGLTF Hook Loading (Primary)

### Overview

```pseudo
PATTERN UseGLTFLoading {
  PURPOSE: "Load GLB with automatic caching and node-level access"

  PROBLEM: "Need individual mesh access for status coloring, selection, visibility"

  SOLUTION: "useGLTF returns parsed nodes object — iterate to match block/mesh hierarchy"

  USED_IN: "Construction 3D, Construction 2D, Home viewer, PlayHistory (Files 1-3, 6)"

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW UseGLTF_Implementation {
  INPUT: {
    glbFilePath: string,  # From locationMesh[0].glbFilePath
    endpoint: string      # process.env.REACT_APP_GLB_ENDPOINT
  }

  STEP_1_LOAD_MODEL: {
    description: "Load GLB file via useGLTF hook"
    logic: |
      function ModelGroup({ locationMesh, meshSettingState, ... }) {
        const { nodes } = useGLTF(
          `${process.env.REACT_APP_GLB_ENDPOINT}${state.fileGLB}`
        )

        # nodes is object: { nodeName: THREE.Mesh | THREE.Group | ... }
        # useGLTF automatically caches — second call returns instantly
      }
  }

  STEP_2_ITERATE_NODES: {
    description: "Find parent node matching block code"
    logic: |
      FOR EACH locationItem IN locationMesh:
        parentName = null

        FOR EACH [name, node] IN Object.entries(nodes):
          IF name === `Block${locationItem.code}` THEN
            parentName = name
            BREAK
          END IF
          IF name === locationItem.code THEN
            parentName = name
            BREAK
          END IF
        END FOR

        IF parentName found THEN
          # Render meshes under this parent
          FOR EACH meshItem IN locationItem.meshes:
            IF nodes[meshItem.name] EXISTS THEN
              <Model
                item={meshItem}
                geometry={nodes[meshItem.name].geometry}
                material={nodes[meshItem.name].material}
                position={nodes[meshItem.name].position}
                rotation={nodes[meshItem.name].rotation}
                scale={nodes[meshItem.name].scale}
              />
            END IF
          END FOR
        END IF
      END FOR
  }

  STEP_3_MODEL_SHOW_DELAY: {
    description: "150ms delay when switching models"
    logic: |
      const [isShowModel, setShowModel] = useState(false)

      useEffect(() => {
        setShowModel(false)
        timer = setTimeout(() => setShowModel(true), 150)
        return () => clearTimeout(timer)
      }, [state.fileGLB])

      IF !isShowModel THEN return null
  }

  CRITICAL_RULES: [
    "ALWAYS use process.env.REACT_APP_GLB_ENDPOINT — never hardcode URL",
    "Node names must match EXACTLY — case sensitive",
    "Block lookup tries 'Block${code}' first, then '${code}' as fallback",
    "useGLTF caches after first load — no manual cache management needed",
    "150ms delay prevents flash of old model during transitions"
  ]
}
```

---

## Pattern 1.08: useLoader with GLTFLoader (Alternative)

### Overview

```pseudo
PATTERN UseLoaderGLTF {
  PURPOSE: "Load GLB as full scene for view-only rendering"

  PROBLEM: "Settings/location viewers don't need individual mesh access — just full model preview"

  SOLUTION: "useLoader(GLTFLoader) returns full GLTF scene, render as <primitive>"

  USED_IN: "Settings editor, Location selector (Files 4, 5)"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW UseLoader_Implementation {
  STEP_1_LOAD: {
    logic: |
      import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

      function ModelGLB({ filePath, opacity, color }) {
        const gltf = useLoader(
          GLTFLoader,
          `${process.env.REACT_APP_GLB_ENDPOINT}${filePath}`
        )

        # gltf.scene is a THREE.Group containing all meshes
      }
  }

  STEP_2_TRAVERSE_AND_STYLE: {
    description: "Apply material properties to all meshes in scene"
    logic: |
      useEffect(() => {
        gltf.scene.traverse((object) => {
          IF object.isMesh THEN
            object.material.opacity = opacity      # 0.7 active, 0.3 background
            object.material.transparent = true
            object.material.color.set(colorHex)    # SaddleBrown or gray
          END IF
        })
      }, [gltf, opacity, color])
  }

  STEP_3_RENDER_PRIMITIVE: {
    description: "Render entire scene as single primitive"
    logic: |
      return <primitive object={gltf.scene} />
  }

  TWO_VARIANTS: {
    ModelGLB: {
      purpose: "Active location — visible, colored",
      opacity: 0.7,
      color: "SaddleBrown (selected) or gray (not selected)"
    }
    ModelGLBAll: {
      purpose: "Background all-models view",
      opacity: 0.3,
      color: "uniform gray"
    }
  }

  CRITICAL_RULES: [
    "Import GLTFLoader from 'three/examples/jsm/loaders/GLTFLoader'",
    "Use <primitive object={gltf.scene} /> — NOT individual meshes",
    "scene.traverse() to bulk-set materials — no per-mesh logic",
    "This pattern is for VIEW-ONLY — no click/select interaction",
    "Two opacity levels: 0.7 for active, 0.3 for background context"
  ]
}
```

---

## Pattern 1.09: Node Hierarchy — Block/Mesh Naming Convention

### Overview

```pseudo
PATTERN NodeHierarchy {
  PURPOSE: "Map API mesh data to GLB node names"

  PROBLEM: "GLB node names follow DWG export convention, API uses business codes"

  SOLUTION: "Lookup chain: Block${code} → ${code} → skip"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW NodeHierarchy_Implementation {
  NAMING_CONVENTION: {
    block_parent: "Block${blockCode}  (e.g., Block1, BlockA)",
    block_fallback: "${blockCode}  (e.g., 1, A)",
    mesh_child: "${meshName}  (exact match from API mesh.name field)"
  }

  NODE_ACCESS: {
    geometry: "nodes[meshName].geometry     # BufferGeometry",
    material: "nodes[meshName].material     # MeshStandardMaterial",
    position: "nodes[meshName].position     # Vector3",
    rotation: "nodes[meshName].rotation     # Euler",
    scale: "nodes[meshName].scale           # Vector3"
  }

  GUARD_CHECK: |
    # Always check node exists before accessing
    IF nodes[meshItem.name] THEN
      render mesh
    ELSE
      skip  # GLB may not contain all API meshes
    END IF

  CRITICAL_RULES: [
    "Node names are CASE SENSITIVE — must match DWG export exactly",
    "Always guard with existence check before accessing node properties",
    "geometry/material from GLB, position may be overridden by layer separation",
    "rotation/scale preserved from original GLB export"
  ]
}
```

---

## Pattern 1.10: E2E Testing Exposure

### Overview

```pseudo
PATTERN E2ENodeExposure {
  PURPOSE: "Expose GLTF nodes to E2E testing framework"

  USED_IN: "Home viewer (3dViewer.tsx) only"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW E2EExposure_Implementation {
  LOGIC: |
    # In ModelGroup component, after useGLTF:
    const { nodes } = useGLTF(...)

    # Expose to window for E2E testing (non-production)
    IF process.env.NODE_ENV !== 'production' THEN
      window.__THREE_NODES__ = nodes
    END IF

  CRITICAL_RULES: [
    "ONLY in development/test environments",
    "Used by E2E tests to verify mesh presence and properties",
    "Do NOT expose in production builds"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_DIRECT_FETCH: "Never fetch GLB via axios/fetch — always use useGLTF or useLoader for caching",
  NO_SCENE_MUTATION_IN_RENDER: "scene.traverse material changes go in useEffect, not render body",
  NO_HARDCODED_ENDPOINT: "Always use REACT_APP_GLB_ENDPOINT env variable",
  NO_MIXED_PATTERNS: "Files 1-3,6 use useGLTF; Files 4,5 use useLoader — don't mix in same file",
  NO_MISSING_GUARD: "Always check nodes[name] exists before accessing .geometry/.material"
}
```

---

## Decision Matrix: Which Loading Pattern?

| Need | Pattern | Files |
|------|---------|-------|
| Individual mesh interaction (click, color, visibility) | useGLTF + node iteration | 1, 2, 3, 6 |
| Full model preview (no interaction) | useLoader + primitive | 4, 5 |
| Background context layer | useLoader + traverse (opacity 0.3) | 4, 5 (ModelGLBAll) |

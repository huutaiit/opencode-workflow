# Redux Mesh Setting Specialist
# Redux Mesh Setting スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | State (mesh color and transparency configuration) |
| **Directory Pattern** | `features/setting/meshcolor/state_management/slices.ts` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 3.13–3.14 |
| **Source Paths** | `**/setting/meshcolor/state_management/**` |
| **File Count** | 3 files (slices.ts, actions.ts, types.d.ts) |
| **Naming Convention** | `slices.ts`, `actions.ts`, `types.d.ts` in `state_management/` |
| **Imports From** | API (meshSettingAPI for fetch/updateRange) |
| **Cannot Import** | Rendering (viewer components), Camera (controls) |
| **Imported By** | Rendering (all viewers read meshSettingState for color/opacity calculation) |
| **Dependencies** | `@reduxjs/toolkit:1.8` (createSlice, createAsyncThunk) |
| **When To Use** | Managing user-configurable mesh color settings with transferTime opacity formula |
| **Source Skeleton** | `features/setting/meshcolor/state_management/slices.ts`, `features/setting/meshcolor/state_management/types.d.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate mesh setting Redux slice with IMeshSetting interface (code, colorName, transferTime) and fetch/updateRange async thunks |
| **Activation Trigger** | files: **/meshcolor/state_management/**; keywords: meshSetting, transferTime, colorConfig, meshOpacity |

---

## Specialist Identity

```pseudo
SPECIALIST ReduxMeshSettingSpecialist {
  ROLE: "Mesh color configuration state expert"

  STATE_SHAPE: |
    {
      meshSettingList: IMeshSetting[],  # Color config per status
      isLoading: boolean
    }

  INTERFACE: |
    IMeshSetting {
      id: string,
      code: string,       # 'BeforePumping' | 'DuringPumping' | 'FinishPumping' | warnings
      colorName: string,  # Display name for UI
      transferTime: number # 0-100 → opacity = 1 - (transferTime/100)
    }

  API_ENDPOINTS: {
    fetch: "GET /api/v1/MeshSetting/GetAll",
    updateRange: "PUT /api/v1/MeshSetting/UpdateRange  (batch update)"
  }

  USER_CONFIGURABLE: |
    # Settings accessible via メッシュ透過率設定 modal on Construction page
    # User can adjust transferTime per status → changes opacity in real-time
    # Changes saved via updateRange API → meshSettingList refreshed

  CRITICAL_RULES: [
    "meshSettingList loaded on app init — used by ALL 3D viewers",
    "transferTime is the ONLY user-configurable rendering parameter",
    "Color hex values come from mesh-status-color-specialist priority chain, NOT from this slice",
    "This slice provides transferTime for opacity calculation only"
  ]
}
```

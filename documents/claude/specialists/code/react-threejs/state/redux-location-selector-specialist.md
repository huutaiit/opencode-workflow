# Redux Location Selector Specialist
# Redux Location Selector スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | State (primary 3D viewer state — locationSelector slice) |
| **Directory Pattern** | `features/location/selector/state_management/slices.ts` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 3.01–3.06 |
| **Source Paths** | `**/location/selector/state_management/slices.ts`, `**/location/selector/state_management/types.d.ts` |
| **File Count** | 2 files (slices.ts 655 LOC + types.d.ts) |
| **Naming Convention** | `slices.ts`, `types.d.ts` in `state_management/` directory |
| **Imports From** | API (locationAPI, meshAPI via createAsyncThunk) |
| **Cannot Import** | Rendering (viewer components), Camera (controls), Settings (subsystem slices) |
| **Imported By** | Rendering (all 6 viewers connect to this slice), Realtime (SignalR dispatches updateStatusMesh) |
| **Dependencies** | `@reduxjs/toolkit:1.8` (createSlice, createAsyncThunk, PayloadAction) |
| **When To Use** | Managing mesh data, floor filtering, pump selection, playback timeline, and mesh status mutations for the 3D construction viewer |
| **Source Skeleton** | `features/location/selector/state_management/slices.ts`, `features/location/selector/state_management/types.d.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate the primary 3D viewer Redux slice with 20+ reducers for floor filtering, mesh status updates, history playback, and table-3D selection sync |
| **Activation Trigger** | files: **/location/selector/state_management/**; keywords: locationSelector, locationMesh, floorActive, modeShowFloor, updateStatusMesh |

---

## Specialist Identity

```pseudo
SPECIALIST ReduxLocationSelectorSpecialist {
  ROLE: "Primary 3D viewer state management expert — the most complex Redux slice"

  SLICE_STATS: {
    file: "features/location/selector/state_management/slices.ts",
    loc: 655,
    sync_reducers: "20+",
    async_thunks: 8,
    state_properties: "15+"
  }
}
```

---

## Pattern 3.01: Location Mesh State Shape

```pseudo
STATE_SHAPE: |
  {
    locationList: { data: ILocationConstructionModel[] },
    constructionModelList: { data: IConstructionModel[] },
    locationMesh: ILocationMeshModel[],          # PRIMARY — mesh data for 3D
    locationMeshHistory: ILocationMeshHistoryModel, # Timeline playback data
    locationSelect: string,                       # Selected location ID
    showBlockLocation: number,                    # Block highlight
    modeShow3d: boolean,                          # 3D view visibility
    activeMeshTable: string,                      # Single selected mesh
    activeLocationTable: string,                  # Selected location in table
    listMeshActiveTable: string[],                # Multi-select mesh codes
    isFull3dMode: boolean,                        # Full screen toggle
    modeShowFloor: number,                        # 1=selected only, 2=all
    floorActive: number,                          # Selected floor index
    listFloors: number[],                         # Available floor numbers
    filter: {
      isShowMeshNotComplete: boolean,
      floorSelect: number,
      showCompleted: boolean,
      listStatus: string[]
    },
    pumpSelect: string,                           # Selected pump ID
    isModeSlim: boolean,                          # Thin-layer casting mode
    isShowAlert: boolean,                         # Warning indicator
    stepIndexHistoryPlay: number,                 # Playback position
    isLoading: boolean
  }
```

---

## Pattern 3.02: Key Sync Reducers

```pseudo
REDUCERS: {
  # Floor/Visibility
  setShowMeshWithFloor(layer): "Set isFloorSelect for meshes at/above selected layer",
  setShowMeshSuccess(): "Hide incomplete meshes (status !== FinishPumping)",
  resetShowMesh(): "Clear all filters — reset isHidden/isFloorSelect",
  actionConstructionUpdate(filter): "Complex multi-filter: floor + status + mode",
  setModeShowFloor(1|2): "Switch between layer-only and all-layers mode",
  changeFloorActive(index): "Track selected floor",

  # Mesh Status
  updateStatusMesh(payload): "Update mesh status/warning/isSlim/pumpId by ID — called from SignalR",
  changePumpSelect(pumpId): "Filter by pump",

  # Selection
  changeMeshActiveFromTable(code): "Set activeMeshTable from table click",
  changeMeshActiveListMesh(code): "Toggle mesh in listMeshActiveTable array",
  changeMeshActiveList(payload): "Batch add(type1) or remove(type2) from listMeshActiveTable",

  # History/Playback
  changeMeshHistory(time): "Apply historical state at specific time offset",
  changeStepIndexHistory(delta): "Advance/rewind playback",
  changeStepIndexHistoryFirst(): "Jump to beginning",
  changeStepIndexHistoryLast(index): "Jump to end",
  changeIsGetMeshPlayHistory(bool): "Reset all meshes to BeforePumping for playback",

  # UI
  changeModeShow3d(bool): "Toggle 3D view visibility",
  changeModeShow3DView(bool): "Toggle full-screen 3D",
  setListFloors(array): "Cache available floor numbers",
  setModeSlimSocket(data): "Update slim mode from SignalR"
}
```

---

## Pattern 3.03: Async Thunks

```pseudo
ASYNC_THUNKS: {
  fetchLocationByConstructionModel(modelId): "GET locations for selected model",
  fetchConstructionModel(): "GET all construction models",
  updateLocationStatus(params): "PUT location completion status",
  fetchLocationMesh({ locationId, ignoreFilter }): "GET mesh data for 3D — PRIMARY DATA LOAD",
  fetchLocationMeshAlert({ locationId }): "GET mesh data and check for warnings",
  fetchLocationMeshHistory(locationId): "GET historical mesh snapshots for playback",
  fetchLocationAll(): "GET all locations",
  changeModeLocation({ isSlim, pumpId }): "PUT toggle slim mode"
}

KEY_THUNK_DETAIL: |
  # fetchLocationMesh — most important thunk
  fetchLocationMesh.fulfilled → {
    state.locationMesh = action.payload.data
    state.fileGLB = locationMesh[0]?.glbFilePath  # Set GLB for viewer
    # Trigger floor list recalculation
    # Apply existing filters if not ignoreFilter
  }
```

---

## Pattern 3.04: actionConstructionUpdate — Complex Filter Reducer

```pseudo
WORKFLOW ActionConstructionUpdate_Implementation {
  PURPOSE: "The master filter reducer — applies floor + status + mode filters atomically"

  LOGIC: |
    actionConstructionUpdate(state, action: { floorSelect, modeShowFloor, listStatus }) {
      meshes = state.locationMesh[0].meshes

      # STEP 1: Reset all
      FOR EACH mesh IN meshes:
        mesh.isHidden = false
        mesh.isFloorSelect = false

      # STEP 2: Floor filter
      IF floorSelect > -1 THEN
        IF modeShowFloor === 1 THEN  # Selected layer only
          FOR EACH mesh: mesh.isHidden = (mesh.layer !== floorSelect)
        ELSE IF modeShowFloor === 2 THEN  # All layers with separation
          FOR EACH mesh: mesh.isFloorSelect = (floorSelect <= mesh.layer)
        END IF
      END IF

      # STEP 3: Status filter
      IF listStatus.length > 0 THEN
        FOR EACH mesh:
          IF !listStatus.includes(mesh.status) THEN mesh.isHidden = true
      END IF
    }

  CRITICAL_RULES: [
    "Always RESET before applying — prevents stale filter accumulation",
    "Floor and status filters are ADDITIVE — both apply",
    "modeShowFloor=1 uses isHidden, modeShowFloor=2 uses isFloorSelect",
    "floorSelect=-1 means no floor filter"
  ]
}
```

---

## Pattern 3.05: updateStatusMesh — SignalR Handler

```pseudo
WORKFLOW UpdateStatusMesh_Implementation {
  PURPOSE: "Update single mesh state from SignalR real-time message"

  LOGIC: |
    updateStatusMesh(state, action: { id, status, warningStatus, isSlim, pumpId }) {
      mesh = state.locationMesh[0].meshes.find(m => m.id === action.payload.id)
      IF mesh THEN
        mesh.status = action.payload.status
        mesh.warningStatus = action.payload.warningStatus
        mesh.isSlim = action.payload.isSlim
        mesh.pumpId = action.payload.pumpId
      END IF
    }

  CALLED_FROM: "Main.tsx SignalR handler → TYPE_MESSAGE_SOCKET[0] (Mesh)"
}
```

---

## Pattern 3.06: History Playback Reducer

```pseudo
WORKFLOW HistoryPlayback_Implementation {
  LOGIC: |
    changeMeshHistory(state, action: { time: number }) {
      histories = state.locationMeshHistory.meshHistories
      firstLogTime = moment(histories[0].logTime)

      # Find all history entries up to current time offset
      targetTime = firstLogTime.add(action.payload.time, 'seconds')

      FOR EACH history IN histories:
        IF moment(history.logTime) <= targetTime THEN
          mesh = state.locationMesh[0].meshes.find(m => m.id === history.meshId)
          IF mesh THEN
            mesh.status = history.status
            mesh.warningStatus = history.warningStatus
            mesh.isSlim = history.isSlim
          END IF
        END IF
      END FOR
    }

  CRITICAL_RULES: [
    "History entries are chronologically ordered by logTime",
    "Apply all entries up to target time — cumulative, not discrete",
    "Mesh lookup by meshId (not code) — IDs are stable"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_FILTER_IN_COMPONENT: "All filtering in this slice — components only READ filtered state",
  NO_DIRECT_MESH_MUTATION: "Always find mesh in locationMesh array, then mutate via Immer",
  NO_SKIP_RESET: "actionConstructionUpdate MUST reset before applying new filters"
}
```

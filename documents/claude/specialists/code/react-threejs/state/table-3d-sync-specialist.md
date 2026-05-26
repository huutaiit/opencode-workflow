# Table-3D Sync Specialist
# Table-3D Sync スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | State, Rendering (bidirectional selection between table and 3D viewer) |
| **Directory Pattern** | `features/main/HomeComponent/` (3dViewer + ListMesh), `features/location/selector/state_management/slices.ts` (reducer) |
| **Variant** | construction-3d |
| **Pattern Numbers** | 3.15–3.17 |
| **Source Paths** | `**/3dViewer.tsx`, `**/ListMesh.tsx`, `**/slices.ts` |
| **File Count** | 3 key files (3dViewer onClick, ListMesh highlight, slices reducer) |
| **Naming Convention** | `changeMeshActiveListMesh` reducer, `listMeshActiveTable` state property |
| **Imports From** | State (Redux locationSelector slice for listMeshActiveTable) |
| **Cannot Import** | API (services directly), Camera (controls), Settings (subsystem components) |
| **Imported By** | Rendering (3dViewer Model onClick), Domain (ListMesh table row highlight + scrollIntoView) |
| **Dependencies** | None (uses React refs + Redux core only) |
| **When To Use** | Implementing bidirectional selection sync between a data table and 3D mesh viewer with auto-scroll and visual highlight |
| **Source Skeleton** | Inline handlers in `features/main/HomeComponent/3dViewer.tsx`, `features/main/HomeComponent/ListMesh.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate bidirectional table-3D selection sync with toggle-based listMeshActiveTable reducer, auto-scroll via scrollIntoView, and #53616E active highlight color |
| **Activation Trigger** | files: **/3dViewer.tsx, **/ListMesh.tsx; keywords: tableSync, meshActiveTable, scrollIntoView, bidirectionalSelection |

---

## Specialist Identity

```pseudo
SPECIALIST Table3DSyncSpecialist {
  ROLE: "Bidirectional sync expert between 3D viewer selection and data table"
}
```

---

## Pattern 3.15: 3D → Table Sync

```pseudo
WORKFLOW ThreeDToTableSync_Implementation {
  TRIGGER: "User clicks mesh in 3D viewer (Home 3dViewer)"

  FLOW: |
    # In 3dViewer Model component:
    onClick = (meshCode) => {
      dispatch(changeMeshActiveListMesh(meshCode))  # Toggle in list

      IF !listMeshActiveTable.includes(meshCode) THEN
        # Adding to selection
        dispatch(setShippingFromMesh({ type: 1, meshCode }))
      ELSE
        # Removing from selection
        dispatch(setShippingFromMesh({ type: 2, meshCode }))
      END IF
    }

  TABLE_REACTION: |
    # In ListMesh component:
    FOR EACH mesh IN meshList:
      IF listMeshActiveTable.includes(mesh.code) THEN
        className += " text-danger"  # Red text highlight
        ref.scrollIntoView({ behavior: "smooth", block: "center" })
      END IF

  CRITICAL_RULES: [
    "changeMeshActiveListMesh TOGGLES — click again to deselect",
    "Table auto-scrolls to selected row (smooth, center)",
    "Shipping data synced via setShippingFromMesh action",
    "Only Home viewer (3dViewer) does table sync — Construction uses modals"
  ]
}
```

---

## Pattern 3.16: Table → 3D Sync

```pseudo
WORKFLOW TableToThreeDSync_Implementation {
  TRIGGER: "User clicks row in data table"

  FLOW: |
    clickRowTable = (meshCode) => {
      dispatch(changeMeshActiveListMesh(meshCode))
      dispatch(setShippingFromMesh({ type: toggleDirection, meshCode }))
    }

  THREE_D_REACTION: |
    # In Model component:
    isMeshActive = listMeshActiveTable.includes(item.code)

    IF isMeshActive THEN
      color = '#53616E'  # Dark gray-blue highlight
      opacity = 1.0      # Fully opaque
    END IF

  CRITICAL_RULES: [
    "Same Redux action (changeMeshActiveListMesh) used both directions",
    "3D highlight color = #53616E (Priority 1 in color chain)",
    "Selection is TOGGLE — click same row/mesh again to deselect"
  ]
}
```

---

## Pattern 3.17: changeMeshActiveListMesh Reducer

```pseudo
REDUCER_LOGIC: |
  changeMeshActiveListMesh(state, action: PayloadAction<string>) {
    meshCode = action.payload
    index = state.listMeshActiveTable.indexOf(meshCode)

    IF index === -1 THEN
      state.listMeshActiveTable.push(meshCode)    # Add
    ELSE
      state.listMeshActiveTable.splice(index, 1)  # Remove (toggle)
    END IF
  }

  changeMeshActiveList(state, action: { type: 1|2, meshCodes: string[] }) {
    IF action.payload.type === 1 THEN
      # Batch add
      state.listMeshActiveTable = [...state.listMeshActiveTable, ...action.payload.meshCodes]
    ELSE IF action.payload.type === 2 THEN
      # Batch remove
      state.listMeshActiveTable = state.listMeshActiveTable.filter(
        code => !action.payload.meshCodes.includes(code)
      )
    END IF
  }
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_DIRECT_DOM_SCROLL: "Use React refs + scrollIntoView — not document.querySelector",
  NO_SEPARATE_SELECTION_STATE: "Single listMeshActiveTable array — not separate 3D and table states",
  NO_TABLE_SYNC_IN_CONSTRUCTION: "Construction viewer uses modals — table sync is Home viewer only"
}
```
